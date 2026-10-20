// Reads src/api/*.js and turns each exported function's doc comment into a
// tool definition. Pure: no network, no SDK. What it returns is what
// tools.mjs registers and what catalog.snapshot.json stores.
//
//   { fn, tool, file, description, argNote, readOnly, destructive,
//     shape: 'none' | 'object' | 'positional',
//     params: [{ type, name, optional, text, children? }] }
//
// shape 'object' has exactly one param (the destructured argument) whose
// `children` are its documented fields; when the fields are only described
// in prose, that prose is kept as `argNote`. shape 'positional' lists the
// arguments in order.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { API_DIR, SNAPSHOT_PATH } from './paths.mjs';
import { EXCLUDED, PLUMBING_FILES } from './exclude.mjs';

export const TOOL_PREFIX = 'towinly_';
// Destructive: no undo, or a change to who may act on the account (credentials,
// delegated powers, the sealed box, the phone number friends see). Every
// destructive tool asks for confirm: true (tools.mjs).
const DESTRUCTIVE_VERBS = /^(delete|remove|end|block|revoke|withdraw|undo)[A-Z]/;
const DESTRUCTIVE_NAMES = new Set([
  'sendSos',
  'deleteMyAccount',
  'changePassword',
  'setPassword',
  'resetPassword',
  'setDelegatedPowers',
  'armPassOn',
  'revealSealedItem',
  'updatePhoneNumber',
]);
const EXPORT_RE = /^export (?:async )?(?:function (\w+)\s*\(([^)]*)\)|const (\w+)\s*=)/gm;
const API_CALL_RE = /\bapi\.(get|post|put|patch|delete)\(/g;

/** postHelpRequest -> towinly_post_help_request */
export function toToolName(fnName) {
  return TOOL_PREFIX + fnName.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase();
}

/** The api files that hold actions: everything but the plumbing. */
export function listApiFiles(dir = API_DIR) {
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.js') && !PLUMBING_FILES.has(f))
    .sort();
}

/**
 * Every exported function in one source file, with the doc block directly
 * above it (null when there is none) and its body up to the next export.
 */
export function findExports(source) {
  const out = [];
  for (const m of source.matchAll(EXPORT_RE)) {
    const before = source.slice(0, m.index).trimEnd();
    const doc = before.endsWith('*/') ? before.slice(before.lastIndexOf('/**')) : null;
    const after = m.index + m[0].length;
    const next = source.indexOf('\nexport ', after);
    out.push({
      name: m[1] ?? m[3],
      signature: m[2] ?? '',
      doc,
      body: source.slice(after, next < 0 ? undefined : next),
    });
  }
  return out;
}

/** "a, b = 1" -> positional [a, b]; "{ a, b } = {}" -> object; "" -> none. */
export function parseSignature(signature) {
  const s = signature.trim();
  if (!s) return { kind: 'none', names: [] };
  if (s.startsWith('{')) return { kind: 'object', names: [] };
  return { kind: 'positional', names: s.split(',').map((p) => p.split('=')[0].trim()) };
}

/** A doc block -> its first paragraph and every @param, continuation lines joined. */
export function parseDocBlock(doc) {
  const lines = doc
    .replace(/^\/\*\*\s*/, '')
    .replace(/\s*\*\/$/, '')
    .split('\n')
    .map((l) => l.replace(/^\s*\* ?/, ''));
  const descLines = [];
  const tags = [];
  let descDone = false;
  for (const line of lines) {
    if (line.startsWith('@')) {
      tags.push(line);
      descDone = true;
    } else if (tags.length) {
      tags[tags.length - 1] += ' ' + line.trim();
    } else if (descDone) {
      // later paragraphs are for developers, not for the tool description
    } else if (line.trim() === '') {
      if (descLines.length) descDone = true;
    } else {
      descLines.push(line.trim());
    }
  }
  return {
    description: descLines.join(' ').replace(/\s+/g, ' ').trim(),
    params: tags.filter((t) => t.startsWith('@param')).map(parseParamTag),
  };
}

function parseParamTag(tag) {
  let rest = tag.slice('@param'.length).trim();
  let type = null;
  if (rest.startsWith('{')) {
    let depth = 0;
    let i = 0;
    for (; i < rest.length; i++) {
      if (rest[i] === '{') depth++;
      else if (rest[i] === '}' && --depth === 0) break;
    }
    type = rest.slice(1, i).trim();
    rest = rest.slice(i + 1).trim();
  }
  const optional = rest.startsWith('[');
  const nameMatch = /^\[?([\w.]+)(?:=[^\]]*)?\]?/.exec(rest);
  if (!nameMatch) throw new Error(`@param without a name: "${tag}"`);
  const name = nameMatch[1];
  const text = rest.slice(nameMatch[0].length).trim().replace(/\s+/g, ' ');
  return { type, name, optional: optional && !/\(required\)/i.test(text), text };
}

const isObjectType = (type) => type === 'object' || (type ?? '').startsWith('{');

/** One export -> one catalog entry, or an Error naming the function and what is missing. */
export function buildEntry(fnName, { signature, doc, body }, file) {
  const where = `${file}: ${fnName}`;
  if (!doc) throw new Error(`${where} has no doc block directly above its export`);
  const { description, params } = parseDocBlock(doc);
  if (!description) throw new Error(`${where} has an empty description`);

  const verbs = [...body.matchAll(API_CALL_RE)].map((m) => m[1]);
  if (!verbs.length) throw new Error(`${where} makes no api call the generator can see`);

  const heads = new Set(params.filter((p) => p.name.includes('.')).map((p) => p.name.split('.')[0]));
  const top = params.filter((p) => !p.name.includes('.'));
  const sig = parseSignature(signature);
  let shape;
  let entryParams;
  let argNote = null;
  if (top.length === 0) {
    if (sig.kind !== 'none') throw new Error(`${where} takes (${signature}) but documents no @param`);
    shape = 'none';
    entryParams = [];
  } else if (top.length === 1 && (heads.has(top[0].name) || isObjectType(top[0].type))) {
    if (sig.kind !== 'object' && sig.names.length !== 1) {
      throw new Error(`${where} documents one object argument but its signature is (${signature})`);
    }
    const head = top[0];
    const children = params
      .filter((p) => p.name.startsWith(head.name + '.'))
      .map((p) => ({ ...p, name: p.name.slice(head.name.length + 1) }));
    shape = 'object';
    entryParams = [{ ...head, children }];
    // A bare `object` whose fields live only in prose keeps that prose, so
    // the assistant still learns the field names.
    argNote = !children.length && head.type === 'object' ? head.text || null : null;
  } else {
    const documented = top.map((p) => p.name);
    if (sig.kind !== 'positional' || sig.names.join() !== documented.join()) {
      throw new Error(`${where} documents [${documented}] but its signature is (${signature})`);
    }
    shape = 'positional';
    entryParams = top;
  }

  return {
    fn: fnName,
    tool: toToolName(fnName),
    file,
    description,
    argNote,
    readOnly: verbs.every((v) => v === 'get'),
    destructive: DESTRUCTIVE_VERBS.test(fnName) || DESTRUCTIVE_NAMES.has(fnName),
    shape,
    params: entryParams,
  };
}

/** The whole catalog, in file then source order. Throws on the first unreadable export. */
export function buildCatalog(dir = API_DIR) {
  const entries = [];
  for (const file of listApiFiles(dir)) {
    const source = fs.readFileSync(path.join(dir, file), 'utf8');
    for (const ex of findExports(source)) {
      if (ex.name in EXCLUDED) continue;
      entries.push(buildEntry(ex.name, ex, file));
    }
  }
  const seen = new Set();
  for (const e of entries) {
    if (seen.has(e.tool)) throw new Error(`duplicate tool name ${e.tool}`);
    seen.add(e.tool);
  }
  return entries;
}

// `node catalog.mjs --write` rewrites the committed snapshot.
const runDirectly = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (runDirectly && process.argv.includes('--write')) {
  fs.writeFileSync(SNAPSHOT_PATH, JSON.stringify(buildCatalog(), null, 2) + '\n');
  process.stderr.write(`wrote ${SNAPSHOT_PATH}\n`);
}
