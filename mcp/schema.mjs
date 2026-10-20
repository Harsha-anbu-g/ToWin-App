// Doc type strings -> zod schemas, and a catalog entry -> its tool input
// schema. Covers every type the api files use today; anything else throws
// naming the function and field, so the test tells you what to add.
import * as z from 'zod/v4';

const ENUM_RE = /^'[^']*'(\|'[^']*')*$/;

// Towinly ids are UUIDs. Anything named ...Id or ...Ids takes id characters
// only, so an argument can never carry a path into the request URL.
const ID_RE = /^[A-Za-z0-9_-]{1,64}$/;
const idString = () => z.string().regex(ID_RE, 'must be an id: letters, digits, _ or -');
const isIdName = (name) => /Ids?$/.test(name);

/** The schema for one named field: the id rule when the name says id, the doc type otherwise. */
function schemaFor(type, name, where) {
  const t = (type ?? '').trim();
  if (isIdName(name) && t === 'string') return idString();
  if (isIdName(name) && t === 'string[]') return z.array(idString());
  return zodFromDocType(t, `${where}.${name}`);
}

/** Split at `sep` outside braces, angle brackets, parentheses and quotes. */
function splitTop(s, sep) {
  const out = [];
  let depth = 0;
  let cur = '';
  let quote = null;
  for (const ch of s) {
    if (quote) {
      cur += ch;
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === "'" || ch === '"') quote = ch;
    else if ('{<('.includes(ch)) depth++;
    else if ('}>)'.includes(ch)) depth--;
    if (ch === sep && depth === 0) {
      out.push(cur.trim());
      cur = '';
    } else {
      cur += ch;
    }
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

/** "{a: string, b?: number}" -> { a: z.string(), b: z.number().optional() } */
export function fieldsFromInline(type, where) {
  const shape = {};
  for (const field of splitTop(type.slice(1, -1), ',')) {
    const m = /^(\w+)(\?)?\s*:\s*(.+)$/.exec(field);
    if (!m) throw new Error(`${where}: cannot read inline field "${field}"`);
    const s = schemaFor(m[3], m[1], where);
    shape[m[1]] = m[2] ? s.optional() : s;
  }
  return shape;
}

/** One doc type -> one zod schema. `where` names the function and field for errors. */
export function zodFromDocType(type, where) {
  let t = (type ?? '').trim();
  if (!t) throw new Error(`${where}: missing type`);
  const parts = splitTop(t, '|');
  const nullable = parts.length > 1 && parts.includes('null');
  if (nullable) t = parts.filter((p) => p !== 'null').join('|');
  const alts = splitTop(t, '|');

  let schema;
  if (alts.length > 1 && !ENUM_RE.test(t)) schema = z.union(alts.map((a) => zodFromDocType(a, where)));
  else if (t === 'string') schema = z.string();
  else if (t === 'number') schema = z.number();
  else if (t === 'boolean') schema = z.boolean();
  else if (t === 'object') schema = z.record(z.string(), z.unknown());
  else if (t.endsWith('[]')) schema = z.array(zodFromDocType(t.slice(0, -2), where));
  else if (t.startsWith('Array<') && t.endsWith('>')) schema = z.array(zodFromDocType(t.slice(6, -1), where));
  else if (t.startsWith('{') && t.endsWith('}')) schema = z.object(fieldsFromInline(t, where));
  else if (ENUM_RE.test(t)) schema = z.enum(alts.map((s) => s.slice(1, -1)));
  else throw new Error(`${where}: unsupported doc type "${type}"`);

  return nullable ? schema.nullable().optional() : schema;
}

function fieldSchema(p, where) {
  const s = schemaFor(p.type, p.name, where).describe(p.text || p.name);
  return p.optional ? s.optional() : s;
}

/**
 * A catalog entry -> the zod object the tool accepts, or null for a tool
 * that takes nothing. Positional arguments become one field each; the
 * destructured object's documented fields become the fields.
 */
export function inputSchemaFor(entry) {
  if (entry.shape === 'none') return null;
  const where = entry.fn;
  if (entry.shape === 'positional') {
    return z.object(Object.fromEntries(entry.params.map((p) => [p.name, fieldSchema(p, where)])));
  }
  const [head] = entry.params;
  if (head.children?.length) {
    return z.object(Object.fromEntries(head.children.map((p) => [p.name, fieldSchema(p, where)])));
  }
  if (head.type.startsWith('{')) return z.object(fieldsFromInline(head.type, `${where}.${head.name}`));
  if (head.type === 'object') return z.looseObject({});
  throw new Error(`${where}: single argument "${head.name}" has type "${head.type}", which is not an object`);
}
