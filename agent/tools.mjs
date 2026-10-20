// The Towinly API catalog (App/mcp/catalog.snapshot.json, one entry per src/api
// export) as function-calling tool definitions. Destructive tools (account
// deletion, SOS, blocking) are left out unless the caller asks for them.
import { readFileSync } from 'node:fs';

export const CATALOG_PATH = new URL('../mcp/catalog.snapshot.json', import.meta.url);

export function loadCatalog(path = CATALOG_PATH) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

const SIMPLE = { string: 'string', number: 'number', boolean: 'boolean', integer: 'integer' };

/** One doc param as a JSON-schema property. `string|null` is a string; unknown shapes carry no type. */
function property(param) {
  const base = String(param.type ?? '').split('|').map((t) => t.trim()).filter((t) => t !== 'null');
  const prop = {};
  if (base.length === 1 && SIMPLE[base[0]]) prop.type = SIMPLE[base[0]];
  else if (base.length === 1 && /\[\]$|^Array</.test(base[0])) prop.type = 'array';
  if (param.text) prop.description = param.text;
  return prop;
}

function parametersFor(entry) {
  const fields = entry.shape === 'object' ? (entry.params[0]?.children ?? []) : entry.shape === 'positional' ? entry.params : [];
  return {
    type: 'object',
    properties: Object.fromEntries(fields.map((p) => [p.name, property(p)])),
    required: fields.filter((p) => !p.optional).map((p) => p.name),
  };
}

/**
 * @param {object[]} catalog the snapshot entries
 * @param {{allowDestructive?: boolean, only?: string[]}} [options] `only` lists src/api function names
 * @returns {{definitions: object[], lookup: (toolName: string) => object|undefined}}
 */
export function toolsFromCatalog(catalog, { allowDestructive = false, only = null } = {}) {
  const kept = catalog.filter((e) => (allowDestructive || !e.destructive) && (!only || only.includes(e.fn)));
  const byName = new Map(kept.map((e) => [e.tool, e]));
  return {
    definitions: kept.map((e) => ({
      type: 'function',
      function: { name: e.tool, description: e.description, parameters: parametersFor(e) },
    })),
    lookup: (name) => byName.get(name),
  };
}
