// The MCP catalog (App/mcp/catalog.snapshot.json) as Groq function tools, plus
// the read-only flag the agent uses to decide when to ask.
import { readFileSync } from 'node:fs';

const CATALOG_PATH = new URL('../mcp/catalog.snapshot.json', import.meta.url);

export function loadCatalog(path = CATALOG_PATH) {
  const raw = JSON.parse(readFileSync(path, 'utf8'));
  return Array.isArray(raw) ? raw : raw.tools;
}

const jsonType = (t) => {
  const base = String(t || 'string').split('|')[0].trim();
  if (base === 'number' || base === 'integer') return 'number';
  if (base === 'boolean') return 'boolean';
  if (base === 'object') return 'object';
  if (base.endsWith('[]') || base.startsWith('Array')) return 'array';
  return 'string';
};

function schemaFor(entry) {
  const fields = entry.shape === 'object' ? (entry.params[0]?.children ?? []) : entry.shape === 'positional' ? entry.params : [];
  const properties = {};
  const required = [];
  for (const f of fields) {
    properties[f.name] = { type: jsonType(f.type), description: f.text || '' };
    if (!f.optional) required.push(f.name);
  }
  return { type: 'object', properties, required };
}

/** Groq tool definitions, one per catalog entry. */
export function toGroqTools(catalog) {
  return catalog.map((e) => ({
    type: 'function',
    function: { name: e.tool, description: e.description + (e.readOnly ? '' : ' (writes; the person will be asked first)'), parameters: schemaFor(e) },
  }));
}

export const entryFor = (catalog, toolName) => catalog.find((e) => e.tool === toolName) ?? null;
export const isReadOnly = (catalog, toolName) => Boolean(entryFor(catalog, toolName)?.readOnly);

/** Positional functions take their arguments in doc order; object ones take the object. */
export function argsFor(entry, args) {
  if (!entry || entry.shape === 'none') return [];
  if (entry.shape === 'object') return [args ?? {}];
  return entry.params.map((p) => args?.[p.name]);
}
