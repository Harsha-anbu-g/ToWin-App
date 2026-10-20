# Towinly MCP Server Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:executing-plans to implement this plan in the current session (the owner's rules forbid auto-starting subagent-driven-development). Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expose the 94 user actions in `src/api/` (101 exports minus 7 phone-only ones) as MCP tools over stdio, generated from their doc comments and executed through the app's own functions.

**Architecture:** `mcp/` is a small standalone Node package inside the app repo. At start it bundles `src/api/*.js` with esbuild (three phone-only imports swapped for stubs), reads the same files' doc comments into a tool catalog, registers each entry on an `McpServer`, and talks stdio. A session object signs in from environment variables and retries once on 401.

**Tech Stack:** Node 24 (ESM, `node --test`), `@modelcontextprotocol/server` 2.3.1 + `@modelcontextprotocol/client` 2.3.1 (tests), `zod` 4.6.x (`zod/v4` import), `esbuild` 0.28.x, `axios` 1.18.x.

**Spec:** `docs/superpowers/plans/../specs/2026-10-19-mcp-server-design.md`. Read it first.

**Working directory for every command:** `/Users/aghar/Documents/Projects/ToWin App/.worktrees/App-mcp-server/mcp` unless a step says otherwise. Branch `feat/mcp-server`. Commit after every task, staging only the files the task names. Never push.

**Skills to load as you go:** `test-driven-development` before Task 2; `security-review` and `code-review` in Task 11; `humanizer` then `stop-slop` on `README.md` in Task 10; `verification-before-completion` before telling the owner anything is done.

---

## File structure

| Path (under `mcp/`) | Responsibility |
|---|---|
| `package.json`, `package-lock.json`, `.gitignore` | own package; pins; ignore `node_modules/` and `.bundle/` |
| `paths.mjs` | every filesystem path the server uses |
| `exclude.mjs` | the 7 excluded functions with reasons; the 2 plumbing files |
| `catalog.mjs` | source files → tool definitions (pure) ; `--write` rewrites the snapshot |
| `schema.mjs` | doc type string → zod; entry → input schema |
| `stubs/expo-constants.mjs`, `stubs/expo-crypto.mjs`, `stubs/react.mjs`, `stubs/storage.mjs` | laptop stand-ins for phone imports |
| `bundle.mjs` | esbuild call; imports the bundle and returns its namespace |
| `session.mjs` | token in memory; sign in from env; retry once on 401 |
| `tools.mjs` | registers catalog entries on `McpServer`; confirm guard; result and error shaping |
| `server.mjs` | entry: bundle, catalog, session, server, stdio |
| `catalog.snapshot.json` | generated; committed |
| `test/fakeApi.mjs` | scripted axios adapter |
| `test/catalog.test.mjs`, `test/schema.test.mjs`, `test/snapshot.test.mjs`, `test/bundle.test.mjs`, `test/session.test.mjs`, `test/server.test.mjs` | the suite |
| `README.md` | run it, env vars, add to Claude Code |

Outside `mcp/`: `package.json` (App) gets `"/mcp/"` in jest `testPathIgnorePatterns` (Task 8). Doc-comment fixes in `src/api/*.js` only if Task 2's coverage test names a function (Task 2, step 9).

---

## Chunk 1: Package and catalog

### Task 1: Package scaffold

**Files:**
- Create: `mcp/package.json`, `mcp/.gitignore`, `mcp/paths.mjs`, `mcp/exclude.mjs`

- [ ] **Step 1: Create the folder and package.json**

```bash
mkdir -p "/Users/aghar/Documents/Projects/ToWin App/.worktrees/App-mcp-server/mcp/stubs" "/Users/aghar/Documents/Projects/ToWin App/.worktrees/App-mcp-server/mcp/test"
```

`mcp/package.json`:
```json
{
  "name": "towinly-mcp-server",
  "version": "0.1.0",
  "private": true,
  "description": "Towinly's app functions as MCP tools, over stdio, for an assistant on this machine.",
  "type": "module",
  "bin": { "towinly-mcp-server": "server.mjs" },
  "scripts": {
    "start": "node server.mjs",
    "test": "node --test 'test/*.test.mjs'",
    "catalog": "node catalog.mjs --write"
  },
  "engines": { "node": ">=20" },
  "dependencies": {
    "@modelcontextprotocol/server": "2.3.1",
    "axios": "^1.18.1",
    "esbuild": "0.28.2",
    "zod": "^4.6.7"
  },
  "devDependencies": {
    "@modelcontextprotocol/client": "2.3.1"
  }
}
```

`mcp/.gitignore`:
```
node_modules/
.bundle/
```

- [ ] **Step 2: Write paths.mjs**

```js
// One place for every path the server needs, so no other file computes
// "../src/api" on its own.
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const MCP_DIR = path.dirname(fileURLToPath(import.meta.url));
export const APP_DIR = path.resolve(MCP_DIR, '..');
export const API_DIR = path.join(APP_DIR, 'src', 'api');
export const STUBS_DIR = path.join(MCP_DIR, 'stubs');
export const BUNDLE_DIR = path.join(MCP_DIR, '.bundle');
export const SNAPSHOT_PATH = path.join(MCP_DIR, 'catalog.snapshot.json');
```

- [ ] **Step 3: Write exclude.mjs**

```js
// Functions that only make sense on a phone or in a browser, each with its
// reason. catalog.mjs skips these; the coverage test asserts every other
// export is a tool. Plumbing files hold the axios client, not actions.
export const PLUMBING_FILES = new Set(['client.js', 'config.js']);

export const EXCLUDED = Object.freeze({
  logIn: 'the server signs in itself from TOWINLY_IDENTIFIER and TOWINLY_PASSWORD',
  registerPushToken: "registers a phone's push token; the server has no phone",
  unregisterPushToken: "removes a phone's push token",
  exchangeOAuthCode: 'second half of a Google sign-in that starts in a browser',
  completeOAuthSignup: 'finishes a Google sign-up; needs the browser flow above',
  submitIdPhoto: 'multipart photo upload from a phone camera',
  syncBlockedPeople: "one-time migration of a phone's old local block list",
});
```

- [ ] **Step 4: Install**

Run: `npm install`
Expected: `node_modules/` appears, `package-lock.json` written, no errors. Check: `node -p "require('@modelcontextprotocol/server/package.json').version"` → `2.3.1`.

- [ ] **Step 5: Commit**

```bash
git add mcp/package.json mcp/package-lock.json mcp/.gitignore mcp/paths.mjs mcp/exclude.mjs
git commit -m "feat(mcp): scaffold the towinly-mcp-server package"
```

### Task 2: Catalog generator

Load `test-driven-development` before this task.

**Files:**
- Create: `mcp/catalog.mjs`, `mcp/test/catalog.test.mjs`
- Maybe modify: `src/api/*.js` doc comments (step 9 only)

- [ ] **Step 1: Write the failing tests**

`mcp/test/catalog.test.mjs`:
```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  buildCatalog, buildEntry, findExports, listApiFiles, parseDocBlock, parseSignature, toToolName,
} from '../catalog.mjs';
import { API_DIR } from '../paths.mjs';
import { EXCLUDED } from '../exclude.mjs';

test('toToolName adds the prefix and snake_cases', () => {
  assert.equal(toToolName('postHelpRequest'), 'towinly_post_help_request');
  assert.equal(toToolName('sendSos'), 'towinly_send_sos');
  assert.equal(toToolName('listKeyholderAsksOfMe'), 'towinly_list_keyholder_asks_of_me');
});

test('parseSignature tells none, object and positional apart', () => {
  assert.deepEqual(parseSignature(''), { kind: 'none', names: [] });
  assert.deepEqual(parseSignature('{ title, description } = {}'), { kind: 'object', names: [] });
  assert.deepEqual(parseSignature('reportedUserId, reason'), { kind: 'positional', names: ['reportedUserId', 'reason'] });
  assert.deepEqual(parseSignature('timeoutMs = PROBE_TIMEOUT_MS'), { kind: 'positional', names: ['timeoutMs'] });
});

test('parseDocBlock reads the first paragraph and every @param', () => {
  const doc = `/**
 * Post a new help request. Family members pass onBehalfOfElderId to ask for
 * their parent.
 *
 * A second paragraph that is not part of the description.
 * @param {object} params
 * @param {string} params.title short title of the request (required)
 * @param {string|null} [params.description] longer detail, or null
 * @param {{askId: string, accept: boolean}} input the answer,
 *   continued on the next line
 * @returns {Promise<object>} the created request
 */`;
  const { description, params } = parseDocBlock(doc);
  assert.equal(description, 'Post a new help request. Family members pass onBehalfOfElderId to ask for their parent.');
  assert.deepEqual(params.map((p) => [p.type, p.name, p.optional]), [
    ['object', 'params', false],
    ['string', 'params.title', false],
    ['string|null', 'params.description', true],
    ['{askId: string, accept: boolean}', 'input', false],
  ]);
  assert.equal(params[3].text, 'the answer, continued on the next line');
});

test('findExports pairs each export with its doc block and body', () => {
  const src = `import api from './client';\n\n/**\n * One.\n */\nexport async function one(userId) {\n  const res = await api.get('/x');\n  return res?.data;\n}\n\nexport async function undocumented() {\n  await api.post('/y');\n}\n`;
  const [one, two] = findExports(src);
  assert.equal(one.name, 'one');
  assert.equal(one.signature, 'userId');
  assert.match(one.doc, /One\./);
  assert.match(one.body, /api\.get/);
  assert.equal(two.name, 'undocumented');
  assert.equal(two.doc, null);
});

test('buildEntry fails loudly on a missing doc block', () => {
  assert.throws(
    () => buildEntry('ghost', { signature: '', doc: null, body: 'api.get(' }, 'needs.js'),
    /needs\.js: ghost has no doc block/
  );
});

test('buildEntry fails when docs and signature disagree', () => {
  const doc = '/**\n * Block one person.\n * @param {string} userId who\n */';
  assert.throws(
    () => buildEntry('blockPerson', { signature: 'targetId', doc, body: 'api.post(' }, 'blocks.js'),
    /blocks\.js: blockPerson documents \[userId\] but its signature is \(targetId\)/
  );
});

test('every export outside the exclusions is a tool exactly once', () => {
  const catalog = buildCatalog();
  const expected = [];
  for (const file of listApiFiles()) {
    const source = fs.readFileSync(path.join(API_DIR, file), 'utf8');
    for (const ex of findExports(source)) if (!(ex.name in EXCLUDED)) expected.push(ex.name);
  }
  assert.deepEqual(catalog.map((e) => e.fn).sort(), expected.sort());
  assert.equal(new Set(catalog.map((e) => e.tool)).size, catalog.length);
  for (const e of catalog) {
    assert.match(e.tool, /^towinly_[a-z0-9_]+$/, e.fn);
    assert.ok(e.description.length > 10, `${e.fn} has a description`);
    assert.ok(['none', 'object', 'positional'].includes(e.shape), e.fn);
  }
});

test('read, write and destructive flags follow the body and the name', () => {
  const by = Object.fromEntries(buildCatalog().map((e) => [e.fn, e]));
  assert.equal(by.listMyHelpRequests.readOnly, true);
  assert.equal(by.postHelpRequest.readOnly, false);
  assert.equal(by.deleteMyAccount.destructive, true);
  assert.equal(by.sendSos.destructive, true);
  assert.equal(by.removeHelpRequest.destructive, true);
  assert.equal(by.pauseTrustSteps.destructive, false);
  assert.equal(by.unblockPerson.destructive, false);
});

test('call shapes match the three signature styles', () => {
  const by = Object.fromEntries(buildCatalog().map((e) => [e.fn, e]));
  assert.equal(by.sendSos.shape, 'none');
  assert.equal(by.blockPerson.shape, 'positional');
  assert.deepEqual(by.blockPerson.params.map((p) => p.name), ['userId']);
  assert.equal(by.reportUser.shape, 'positional');
  assert.deepEqual(by.reportUser.params.map((p) => p.name), ['reportedUserId', 'reason']);
  assert.equal(by.postHelpRequest.shape, 'object');
  const fields = Object.fromEntries(by.postHelpRequest.params[0].children.map((c) => [c.name, c]));
  assert.equal(fields.title.optional, false);
  assert.equal(fields.description.optional, true);
});
```

- [ ] **Step 2: Run the tests to see them fail**

Run: `npm test -- test/catalog.test.mjs` (or `node --test test/catalog.test.mjs`)
Expected: FAIL, `Cannot find module '../catalog.mjs'`.

- [ ] **Step 3: Write catalog.mjs**

```js
// Reads src/api/*.js and turns each exported function's doc comment into a
// tool definition. Pure: no network, no SDK. What it returns is what
// tools.mjs registers and what catalog.snapshot.json stores.
//
//   { fn, tool, file, description, readOnly, destructive,
//     shape: 'none' | 'object' | 'positional',
//     params: [{ type, name, optional, text, children? }] }
//
// shape 'object' has exactly one param (the destructured argument) whose
// `children` are its documented fields. shape 'positional' lists the
// arguments in order.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { API_DIR, SNAPSHOT_PATH } from './paths.mjs';
import { EXCLUDED, PLUMBING_FILES } from './exclude.mjs';

export const TOOL_PREFIX = 'towinly_';
const DESTRUCTIVE_VERBS = /^(delete|remove|end|block|revoke|withdraw|undo)[A-Z]/;
const DESTRUCTIVE_NAMES = new Set(['sendSos', 'deleteMyAccount']);
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
```

- [ ] **Step 4: Run the tests**

Run: `node --test test/catalog.test.mjs`
Expected: the unit tests (toToolName, parseSignature, parseDocBlock, findExports, the two failure tests) PASS. The three `buildCatalog()` tests may FAIL with a message naming a real function in `src/api/`. That is the generator doing its job; go to step 5.

- [ ] **Step 5: Fix any function the coverage test names**

For each error like `family.js: openFamilyChat documents [] but its signature is (otherUserId)`: open the file, read the function, and add or correct the `@param` line in its doc block so the docs match the signature. Doc-only edits, no behaviour change. Typical fixes: a missing `@param {string} otherUserId ...`, an `@param` named differently from the argument, a doc block separated from its export by a stray comment line.

Keep a list of what you changed for the commit message.

- [ ] **Step 6: Run the tests until green**

Run: `node --test test/catalog.test.mjs`
Expected: all PASS. Then `node -e "import('./catalog.mjs').then(m => console.log(m.buildCatalog().length))"` prints `94` (or the true count after exclusions; note it).

- [ ] **Step 7: Commit**

```bash
git add mcp/catalog.mjs mcp/test/catalog.test.mjs
git commit -m "feat(mcp): generate the tool catalog from the api doc comments"
```
If step 5 touched `src/api/*.js`, commit those separately first:
```bash
git add src/api/<files>
git commit -m "docs(api): complete @param lines so every action documents its arguments"
```

### Task 3: Schema mapper

**Files:**
- Create: `mcp/schema.mjs`, `mcp/test/schema.test.mjs`

- [ ] **Step 1: Write the failing tests**

`mcp/test/schema.test.mjs`:
```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { inputSchemaFor, zodFromDocType } from '../schema.mjs';
import { buildCatalog } from '../catalog.mjs';

const ok = (schema, value) => assert.deepEqual(schema.parse(value), value);
const bad = (schema, value) => assert.throws(() => schema.parse(value));

test('primitives', () => {
  ok(zodFromDocType('string', 't'), 'a');
  bad(zodFromDocType('string', 't'), 1);
  ok(zodFromDocType('number', 't'), 2);
  ok(zodFromDocType('boolean', 't'), true);
});

test('arrays, both spellings', () => {
  ok(zodFromDocType('string[]', 't'), ['a']);
  ok(zodFromDocType('Array<{role: string, content: string}>', 't'), [{ role: 'user', content: 'hi' }]);
  bad(zodFromDocType('Array<{role: string, content: string}>', 't'), [{ role: 'user' }]);
});

test('quoted alternatives become an enum', () => {
  const s = zodFromDocType("'ELDER'|'HELPER'|'FAMILY'", 't');
  ok(s, 'ELDER');
  bad(s, 'ADMIN');
});

test('T|null is nullable and optional', () => {
  const s = zodFromDocType('string|null', 't');
  ok(s, null);
  ok(s, undefined);
  ok(s, 'x');
});

test('inline objects, ? marks optional', () => {
  const s = zodFromDocType('{a: string, b?: number}', 't');
  ok(s, { a: 'x' });
  ok(s, { a: 'x', b: 1 });
  bad(s, { b: 1 });
});

test('bare object is any record', () => {
  ok(zodFromDocType('object', 't'), { anything: ['goes'] });
});

test('an unknown type fails naming the place', () => {
  assert.throws(() => zodFromDocType('Date', 'needs.js postHelpRequest.when'), /postHelpRequest\.when: unsupported doc type "Date"/);
});

test('inputSchemaFor builds the three shapes from real entries', () => {
  const by = Object.fromEntries(buildCatalog().map((e) => [e.fn, e]));
  assert.equal(inputSchemaFor(by.sendSos), null);
  ok(inputSchemaFor(by.blockPerson), { userId: 'u1' });
  bad(inputSchemaFor(by.blockPerson), {});
  const post = inputSchemaFor(by.postHelpRequest);
  ok(post, { title: 'Groceries', category: 'ERRANDS', urgency: 'NORMAL' });
  bad(post, { category: 'ERRANDS', urgency: 'NORMAL' });
  for (const e of Object.values(by)) inputSchemaFor(e); // every entry maps without throwing
});
```

- [ ] **Step 2: Run to see it fail**

Run: `node --test test/schema.test.mjs`
Expected: FAIL, `Cannot find module '../schema.mjs'`.

- [ ] **Step 3: Write schema.mjs**

```js
// Doc type strings -> zod schemas, and a catalog entry -> its tool input
// schema. Covers every type the api files use today; anything else throws
// naming the function and field, so the test tells you what to add.
import * as z from 'zod/v4';

const ENUM_RE = /^'[^']*'(\|'[^']*')*$/;

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
    const s = zodFromDocType(m[3], `${where}.${m[1]}`);
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

  let schema;
  if (t === 'string') schema = z.string();
  else if (t === 'number') schema = z.number();
  else if (t === 'boolean') schema = z.boolean();
  else if (t === 'object') schema = z.record(z.string(), z.unknown());
  else if (t.endsWith('[]')) schema = z.array(zodFromDocType(t.slice(0, -2), where));
  else if (t.startsWith('Array<') && t.endsWith('>')) schema = z.array(zodFromDocType(t.slice(6, -1), where));
  else if (t.startsWith('{') && t.endsWith('}')) schema = z.object(fieldsFromInline(t, where));
  else if (ENUM_RE.test(t)) schema = z.enum(splitTop(t, '|').map((s) => s.slice(1, -1)));
  else throw new Error(`${where}: unsupported doc type "${type}"`);

  return nullable ? schema.nullable().optional() : schema;
}

function fieldSchema(p, where) {
  const s = zodFromDocType(p.type, `${where}.${p.name}`).describe(p.text || p.name);
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
```

- [ ] **Step 4: Run the tests**

Run: `node --test test/schema.test.mjs`
Expected: PASS. If the last test throws for a real function, its type is outside the table: either fix the doc comment in `src/api/` (preferred when the doc is simply wrong) or extend the table, and add a row to the spec's type table.

- [ ] **Step 5: Commit**

```bash
git add mcp/schema.mjs mcp/test/schema.test.mjs
git commit -m "feat(mcp): map doc types to zod input schemas"
```

### Task 4: Committed snapshot

**Files:**
- Create: `mcp/catalog.snapshot.json`, `mcp/test/snapshot.test.mjs`

- [ ] **Step 1: Write the failing test**

`mcp/test/snapshot.test.mjs`:
```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { buildCatalog } from '../catalog.mjs';
import { SNAPSHOT_PATH } from '../paths.mjs';

test('catalog.snapshot.json matches the generated catalog (run `npm run catalog` after changing src/api)', () => {
  const saved = JSON.parse(fs.readFileSync(SNAPSHOT_PATH, 'utf8'));
  const fresh = JSON.parse(JSON.stringify(buildCatalog()));
  assert.deepEqual(saved, fresh);
});
```

- [ ] **Step 2: Run to see it fail**

Run: `node --test test/snapshot.test.mjs`
Expected: FAIL, `ENOENT ... catalog.snapshot.json`.

- [ ] **Step 3: Generate the snapshot and read it**

Run: `npm run catalog && node -e "const c=require('./catalog.snapshot.json'); console.log(c.length, 'tools;', c.filter(e=>e.readOnly).length, 'read-only;', c.filter(e=>e.destructive).length, 'destructive'); for (const e of c) console.log(e.tool.padEnd(44), e.shape.padEnd(10), (e.shape==='object'? e.params[0].children.map(p=>p.name+(p.optional?'?':'')).join(',') : e.params.map(p=>p.name).join(',')))"`

Read every line. This is the one human review of the generator's output the spec promises. Anything odd (a field that should be optional, a description that trails off) is a doc fix in `src/api/`, then `npm run catalog` again.

- [ ] **Step 4: Run the test**

Run: `node --test test/snapshot.test.mjs`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add mcp/catalog.snapshot.json mcp/test/snapshot.test.mjs
git commit -m "feat(mcp): commit the generated tool catalog snapshot"
```

---

## Chunk 2: Runtime

### Task 5: Stubs and bundle

**Files:**
- Create: `mcp/stubs/expo-constants.mjs`, `mcp/stubs/expo-crypto.mjs`, `mcp/stubs/react.mjs`, `mcp/stubs/storage.mjs`, `mcp/bundle.mjs`, `mcp/test/bundle.test.mjs`

- [ ] **Step 1: Write the failing test**

`mcp/test/bundle.test.mjs`:
```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildApiBundle, entrySource } from '../bundle.mjs';
import { buildCatalog } from '../catalog.mjs';

test('entrySource re-exports the client namespace and every action file', () => {
  const src = entrySource(['needs.js', 'trust.js']);
  assert.equal(src, "export * as client from './client.js';\nexport * from './needs.js';\nexport * from './trust.js';\n");
});

test('the bundle exports every catalog function, logIn and the client hooks', async () => {
  const bundle = await buildApiBundle();
  for (const e of buildCatalog()) assert.equal(typeof bundle[e.fn], 'function', e.fn);
  assert.equal(typeof bundle.logIn, 'function');
  assert.equal(typeof bundle.client.setTokenGetter, 'function');
  assert.equal(typeof bundle.client.setOnSessionExpired, 'function');
  assert.equal(typeof bundle.client.default.defaults.adapter, 'undefined'); // axios default adapter chain
  assert.match(bundle.client.default.defaults.baseURL, /^https:\/\//);
});
```
(If the `adapter` assertion is wrong for this axios version, assert `bundle.client.default.defaults.baseURL` only; the point is that the axios instance is reachable.)

- [ ] **Step 2: Run to see it fail**

Run: `node --test test/bundle.test.mjs`
Expected: FAIL, `Cannot find module '../bundle.mjs'`.

- [ ] **Step 3: Write the four stubs**

Check the real storage exports first: `grep -nE '^export' ../src/lib/storage.js`. Mirror every exported name as a no-op (`async` functions returning `null` for reads and `undefined` for writes); keep the default export shape if there is one.

`mcp/stubs/expo-constants.mjs`:
```js
// config.js reads Constants.expoConfig?.extra?.apiBaseUrl; with nothing here it
// falls through to EXPO_PUBLIC_API_BASE_URL or the live URL, as on a phone.
export default { expoConfig: { extra: {} } };
```

`mcp/stubs/expo-crypto.mjs`:
```js
// idempotency.js asks for this only when Web Crypto is missing; Node has it,
// but the import must still resolve at bundle time.
export { randomUUID } from 'node:crypto';
```

`mcp/stubs/react.mjs`:
```js
// i18n exports a hook for screens. The server never renders, so the import
// only has to resolve.
export function useSyncExternalStore() {
  throw new Error('React hooks do not run inside the MCP server');
}
export default { useSyncExternalStore };
```

`mcp/stubs/storage.mjs` (adjust names to the grep above):
```js
// i18n requires ../lib/storage lazily to read a saved language choice. The
// server has no saved choice, so every read answers null.
export const getItem = async () => null;
export const setItem = async () => {};
export const removeItem = async () => {};
export default { getItem, setItem, removeItem };
```

- [ ] **Step 4: Write bundle.mjs**

```js
// Bundles src/api for Node with esbuild and imports the result. One entry
// that re-exports every action file, so the whole bundle shares a single
// axios instance (the one setTokenGetter configures).
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import { API_DIR, BUNDLE_DIR, MCP_DIR, STUBS_DIR } from './paths.mjs';
import { listApiFiles } from './catalog.mjs';

// The one relative import that must not be followed: i18n lazily requires
// ../lib/storage, which imports react-native.
const storageStub = {
  name: 'towinly-storage-stub',
  setup(b) {
    b.onResolve({ filter: /(^|\/)lib\/storage$/ }, () => ({ path: path.join(STUBS_DIR, 'storage.mjs') }));
  },
};

export function entrySource(files = listApiFiles()) {
  return [`export * as client from './client.js';`, ...files.map((f) => `export * from './${f}';`)].join('\n') + '\n';
}

/** Build and import the api bundle. Returns its module namespace: every action plus `client`. */
export async function buildApiBundle() {
  const result = await build({
    stdin: { contents: entrySource(), resolveDir: API_DIR, sourcefile: 'towinly-api.entry.js', loader: 'js' },
    bundle: true,
    write: false,
    format: 'esm',
    platform: 'node',
    target: 'node20',
    logLevel: 'silent',
    alias: {
      'expo-constants': path.join(STUBS_DIR, 'expo-constants.mjs'),
      'expo-crypto': path.join(STUBS_DIR, 'expo-crypto.mjs'),
      react: path.join(STUBS_DIR, 'react.mjs'),
    },
    nodePaths: [path.join(MCP_DIR, 'node_modules')],
    plugins: [storageStub],
  });
  fs.mkdirSync(BUNDLE_DIR, { recursive: true });
  const out = path.join(BUNDLE_DIR, 'api.mjs');
  fs.writeFileSync(out, result.outputFiles[0].text);
  return import(`${pathToFileURL(out).href}?t=${Date.now()}`);
}
```

- [ ] **Step 5: Run the test**

Run: `node --test test/bundle.test.mjs`
Expected: PASS. If esbuild reports `Could not resolve "<something>"`, that is a fourth phone-only import: add a stub and an alias (package) or an `onResolve` filter (relative path), and add a row to the spec's layout table.

- [ ] **Step 6: Commit**

```bash
git add mcp/stubs mcp/bundle.mjs mcp/test/bundle.test.mjs
git commit -m "feat(mcp): bundle src/api for Node with phone-only imports stubbed"
```

### Task 6: Session

**Files:**
- Create: `mcp/session.mjs`, `mcp/test/fakeApi.mjs`, `mcp/test/session.test.mjs`

- [ ] **Step 1: Write the fake adapter and the failing tests**

`mcp/test/fakeApi.mjs`:
```js
// A scripted axios adapter: records every request, answers from a queue.
// Replies default to 200 {} when the queue is empty.
import { AxiosError } from 'axios';

export function fakeAdapter() {
  const calls = [];
  const replies = [];
  const adapter = async (config) => {
    calls.push(config);
    const r = replies.shift() ?? { status: 200, data: {} };
    const response = { status: r.status, statusText: '', headers: {}, config, data: r.data };
    if (r.status >= 400) throw new AxiosError(`HTTP ${r.status}`, 'ERR_BAD_RESPONSE', config, null, response);
    return response;
  };
  return { adapter, calls, reply: (status, data) => replies.push({ status, data }) };
}

/** Point the bundle's axios instance at a fake. Returns the fake. */
export function wireFake(bundle) {
  const fake = fakeAdapter();
  bundle.client.default.defaults.adapter = fake.adapter;
  return fake;
}
```

`mcp/test/session.test.mjs`:
```js
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { buildApiBundle } from '../bundle.mjs';
import { createSession, SessionError } from '../session.mjs';
import { wireFake } from './fakeApi.mjs';

let bundle;
before(async () => {
  bundle = await buildApiBundle();
});

test('no credentials: a clear SessionError, no request sent', async () => {
  const fake = wireFake(bundle);
  const session = createSession({ client: bundle.client, logIn: bundle.logIn, env: {} });
  await assert.rejects(session.run(() => bundle.getMyProfile()), (e) => e instanceof SessionError && /TOWINLY_IDENTIFIER/.test(e.message));
  assert.equal(fake.calls.length, 0);
});

test('TOWINLY_TOKEN is used as is', async () => {
  const fake = wireFake(bundle);
  fake.reply(200, { id: 'me' });
  const session = createSession({ client: bundle.client, logIn: bundle.logIn, env: { TOWINLY_TOKEN: 'abc' } });
  const me = await session.run(() => bundle.getMyProfile());
  assert.deepEqual(me, { id: 'me' });
  assert.equal(fake.calls.length, 1);
  assert.equal(fake.calls[0].headers.Authorization, 'Bearer abc');
});

test('identifier and password sign in once, then a 401 signs in again and retries once', async () => {
  const fake = wireFake(bundle);
  fake.reply(200, { token: 't1' });
  fake.reply(401, { message: 'expired' });
  fake.reply(200, { token: 't2' });
  fake.reply(200, { id: 'me' });
  const session = createSession({ client: bundle.client, logIn: bundle.logIn, env: { TOWINLY_IDENTIFIER: 'elder', TOWINLY_PASSWORD: 'pw' } });
  const me = await session.run(() => bundle.getMyProfile());
  assert.deepEqual(me, { id: 'me' });
  assert.deepEqual(fake.calls.map((c) => c.url), ['/auth/login', '/profile/me', '/auth/login', '/profile/me']);
  assert.equal(fake.calls[3].headers.Authorization, 'Bearer t2');
  assert.equal(session.token, 't2');
});

test('a second 401 is reported, not retried forever', async () => {
  const fake = wireFake(bundle);
  fake.reply(200, { token: 't1' });
  fake.reply(401, {});
  fake.reply(200, { token: 't2' });
  fake.reply(401, {});
  const session = createSession({ client: bundle.client, logIn: bundle.logIn, env: { TOWINLY_IDENTIFIER: 'elder', TOWINLY_PASSWORD: 'pw' } });
  await assert.rejects(session.run(() => bundle.getMyProfile()), (e) => e?.response?.status === 401);
  assert.equal(fake.calls.length, 4);
});
```
Check the real path of `getMyProfile` first (`grep -n "api.get" ../src/api/profile.js | head -3`) and put it in the `url` assertions.

- [ ] **Step 2: Run to see it fail**

Run: `node --test test/session.test.mjs`
Expected: FAIL, `Cannot find module '../session.mjs'`.

- [ ] **Step 3: Write session.mjs**

```js
// Holds the one token in memory, signs in from the environment on first use,
// and on a 401 signs in once more and retries that one call. Nothing is
// written to disk.
export class SessionError extends Error {
  isSessionError = true;
}

const NO_LOGIN = 'No Towinly login configured. Set TOWINLY_IDENTIFIER and TOWINLY_PASSWORD, or TOWINLY_TOKEN.';

/**
 * @param {object} deps
 * @param {object} deps.client  the bundle's `client` namespace (setTokenGetter, setOnSessionExpired)
 * @param {Function} deps.logIn the bundle's logIn
 * @param {object} [deps.env]   defaults to process.env
 */
export function createSession({ client, logIn, env = process.env }) {
  let token = env.TOWINLY_TOKEN || null;
  const canSignIn = Boolean(env.TOWINLY_IDENTIFIER && env.TOWINLY_PASSWORD);
  client.setTokenGetter(() => token);
  client.setOnSessionExpired(() => {
    token = null;
  });

  async function ensureSignedIn() {
    if (token) return;
    if (!canSignIn) throw new SessionError(NO_LOGIN);
    const res = await logIn({ identifier: env.TOWINLY_IDENTIFIER, password: env.TOWINLY_PASSWORD });
    if (!res?.token) throw new SessionError('Sign-in did not return a token.');
    token = res.token;
  }

  /** Run one api call signed in; on a 401, sign in again and retry it once. */
  async function run(fn) {
    await ensureSignedIn();
    try {
      return await fn();
    } catch (error) {
      if (error?.response?.status !== 401 || !canSignIn) throw error;
      token = null;
      await ensureSignedIn();
      return await fn();
    }
  }

  return {
    run,
    ensureSignedIn,
    get token() {
      return token;
    },
  };
}
```

- [ ] **Step 4: Run the tests**

Run: `node --test test/session.test.mjs`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add mcp/session.mjs mcp/test/fakeApi.mjs mcp/test/session.test.mjs
git commit -m "feat(mcp): sign in from the environment and retry once on 401"
```

### Task 7: Tools on an McpServer

**Files:**
- Create: `mcp/tools.mjs`, `mcp/test/server.test.mjs`

- [ ] **Step 1: Write the failing tests**

`mcp/test/server.test.mjs`:
```js
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { Client, InMemoryTransport } from '@modelcontextprotocol/client';
import { buildApiBundle } from '../bundle.mjs';
import { buildCatalog } from '../catalog.mjs';
import { createSession } from '../session.mjs';
import { buildServer, describeTool, errorText, formatResult } from '../tools.mjs';
import { wireFake } from './fakeApi.mjs';

const ENV = { TOWINLY_IDENTIFIER: 'elder', TOWINLY_PASSWORD: 'pw' };
let bundle;
let catalog;
before(async () => {
  bundle = await buildApiBundle();
  catalog = buildCatalog();
});

async function connect(env = ENV) {
  const fake = wireFake(bundle);
  const session = createSession({ client: bundle.client, logIn: bundle.logIn, env });
  const server = buildServer({ catalog, bundle, session, log: () => {} });
  const client = new Client({ name: 'test', version: '0' });
  const [ct, st] = InMemoryTransport.createLinkedPair();
  await Promise.all([client.connect(ct), server.connect(st)]);
  return { client, fake };
}
const text = (res) => res.content[0].text;

test('lists every catalog entry with its annotations', async () => {
  const { client } = await connect();
  const { tools } = await client.listTools();
  assert.equal(tools.length, catalog.length);
  const sos = tools.find((t) => t.name === 'towinly_send_sos');
  assert.equal(sos.annotations.destructiveHint, true);
  assert.match(sos.description, /call emergency services first/);
  assert.ok(sos.inputSchema.properties.confirm, 'sos asks for confirm');
  const mine = tools.find((t) => t.name === 'towinly_list_my_help_requests');
  assert.equal(mine.annotations.readOnlyHint, true);
});

test('a positional read reaches the right path and query, signed in', async () => {
  const { client, fake } = await connect();
  fake.reply(200, { token: 't1' });
  fake.reply(200, { content: [{ id: 1 }] });
  const res = await client.callTool({ name: 'towinly_list_nearby_help_requests', arguments: { lat: 45.5, lng: -73.6, radiusKm: 5 } });
  assert.deepEqual(fake.calls.map((c) => c.url), ['/auth/login', '/needs/nearby']);
  assert.deepEqual(fake.calls[1].params, { lat: 45.5, lng: -73.6, radiusKm: 5 });
  assert.equal(fake.calls[1].headers.Authorization, 'Bearer t1');
  assert.deepEqual(res.structuredContent, { content: [{ id: 1 }] });
  assert.match(text(res), /"id": 1/);
});

test('an object-shaped write sends the documented body', async () => {
  const { client, fake } = await connect();
  fake.reply(200, { token: 't1' });
  fake.reply(200, { id: 'n1', title: 'Groceries' });
  const res = await client.callTool({ name: 'towinly_post_help_request', arguments: { title: 'Groceries', category: 'ERRANDS', urgency: 'NORMAL' } });
  assert.equal(fake.calls[1].url, '/needs');
  assert.equal(fake.calls[1].method, 'post');
  assert.deepEqual(JSON.parse(fake.calls[1].data), { title: 'Groceries', category: 'ERRANDS', urgency: 'NORMAL' });
  assert.equal(res.structuredContent.id, 'n1');
});

test('a 409 comes back as isError with the server words', async () => {
  const { client, fake } = await connect();
  fake.reply(200, { token: 't1' });
  fake.reply(409, { message: 'Finish trust step 3 before messaging.' });
  const res = await client.callTool({ name: 'towinly_send_message', arguments: { connectionId: 'c1', content: 'hello' } });
  assert.equal(res.isError, true);
  assert.equal(text(res), 'Finish trust step 3 before messaging.');
});

test('no credentials is a readable tool error', async () => {
  const { client, fake } = await connect({});
  const res = await client.callTool({ name: 'towinly_get_my_profile', arguments: {} });
  assert.equal(res.isError, true);
  assert.match(text(res), /TOWINLY_IDENTIFIER/);
  assert.equal(fake.calls.length, 0);
});

test('send_sos without confirm refuses and sends nothing', async () => {
  const { client, fake } = await connect();
  const res = await client.callTool({ name: 'towinly_send_sos', arguments: {} });
  assert.equal(res.isError, true);
  assert.match(text(res), /confirm: true/);
  assert.equal(fake.calls.length, 0);
});

test('a void answer says Done.', () => {
  assert.deepEqual(formatResult(undefined), { content: [{ type: 'text', text: 'Done.' }] });
  assert.deepEqual(formatResult([1, 2]).structuredContent, { items: [1, 2] });
});

test('error sentences by status', () => {
  assert.match(errorText({}), /could not be reached/);
  assert.match(errorText({ response: { status: 401 } }), /Sign-in failed/);
  assert.match(errorText({ response: { status: 403 } }), /verify your email/);
  assert.match(errorText({ response: { status: 503 } }), /Towinly's side/);
  assert.equal(errorText({ response: { status: 400, data: { message: 'Title is required.' } } }), 'Title is required.');
});

test('describeTool appends the safety note only where one exists', () => {
  const by = Object.fromEntries(catalog.map((e) => [e.tool, e]));
  assert.match(describeTool(by.towinly_report_user), /A human reads every report/);
  assert.equal(describeTool(by.towinly_get_my_profile), by.towinly_get_my_profile.description);
});
```
Check `sendMessage`'s documented argument names first (`grep -n "@param" ../src/api/messages.js`) and use them in the 409 test.

- [ ] **Step 2: Run to see it fail**

Run: `node --test test/server.test.mjs`
Expected: FAIL, `Cannot find module '../tools.mjs'`.

- [ ] **Step 3: Write tools.mjs**

```js
// Registers every catalog entry on an McpServer. The only file that knows
// the MCP SDK. Owns the confirm guard, the safety notes, and the shape of
// every result and error.
import { McpServer } from '@modelcontextprotocol/server';
import * as z from 'zod/v4';
import { inputSchemaFor } from './schema.mjs';

export const SERVER_NAME = 'towinly-mcp-server';

// The two actions nothing can take back. They refuse without confirm: true.
export const CONFIRM_REQUIRED = new Set(['towinly_delete_my_account', 'towinly_send_sos']);
const CONFIRM_FIELD = z.boolean().optional().describe('Must be true. This cannot be undone; pass true only after the person has agreed.');
const CONFIRM_REFUSAL = 'This cannot be undone. Call again with confirm: true after the person has agreed.';

// Lines the doc comments do not carry (trust-and-safety review, 2026-10-19).
const REPORT_NOTE = 'A human reads every report. Promise a process, never an outcome.';
export const DESCRIPTION_NOTES = Object.freeze({
  towinly_send_sos:
    "Danger right now: call emergency services first (911 in Canada and the US, 112 in India). This alerts the person's emergency contacts; it does not call them.",
  towinly_report_user: REPORT_NOTE,
  towinly_report_pass_on_story: REPORT_NOTE,
});

export function describeTool(entry) {
  const note = DESCRIPTION_NOTES[entry.tool];
  return note ? `${entry.description} ${note}` : entry.description;
}

/** Call the bundled function the way its signature expects. */
export function callEntry(entry, bundle, input = {}) {
  const fn = bundle[entry.fn];
  if (typeof fn !== 'function') throw new Error(`${entry.fn} is missing from the api bundle`);
  if (entry.shape === 'none') return fn();
  if (entry.shape === 'object') {
    const { confirm, ...rest } = input;
    return fn(rest);
  }
  return fn(...entry.params.map((p) => input[p.name]));
}

export function formatResult(result) {
  if (result === undefined || result === null || result === '') {
    return { content: [{ type: 'text', text: 'Done.' }] };
  }
  const text = typeof result === 'string' ? result : JSON.stringify(result, null, 2);
  const structured = Array.isArray(result) ? { items: result } : typeof result === 'object' ? result : null;
  return structured ? { content: [{ type: 'text', text }], structuredContent: structured } : { content: [{ type: 'text', text }] };
}

/** One plain sentence per failure, with the next step. Never a stack trace. */
export function errorText(error) {
  if (error?.isSessionError) return error.message;
  const res = error?.response;
  if (!res) return 'Towinly could not be reached. Check the connection and try again.';
  if (res.status === 401) return 'Sign-in failed. Check TOWINLY_IDENTIFIER and TOWINLY_PASSWORD.';
  if (res.status === 403) return 'Please verify your email first. Check your inbox for the link, then try again.';
  if (res.status >= 500) return "Something is wrong on Towinly's side. Please try again in a minute.";
  return res.data?.message || `Towinly refused the request (${res.status}).`;
}

const refuse = (text) => ({ isError: true, content: [{ type: 'text', text }] });

/**
 * @param {object} deps
 * @param {Array} deps.catalog   from buildCatalog()
 * @param {object} deps.bundle   from buildApiBundle()
 * @param {object} deps.session  from createSession()
 * @param {string} [deps.version]
 * @param {Function} [deps.log]  one line per call: tool, status, elapsed. Never arguments or bodies.
 */
export function buildServer({ catalog, bundle, session, version = '0.1.0', log = (line) => process.stderr.write(line + '\n') }) {
  const server = new McpServer({ name: SERVER_NAME, version });
  for (const entry of catalog) {
    const needsConfirm = CONFIRM_REQUIRED.has(entry.tool);
    let schema = inputSchemaFor(entry);
    if (needsConfirm) schema = (schema ?? z.object({})).extend({ confirm: CONFIRM_FIELD });
    const config = {
      title: entry.fn,
      description: describeTool(entry),
      annotations: {
        readOnlyHint: entry.readOnly,
        destructiveHint: entry.destructive,
        idempotentHint: entry.readOnly,
        openWorldHint: false,
      },
    };
    if (schema) config.inputSchema = schema;

    server.registerTool(entry.tool, config, async (input = {}) => {
      if (needsConfirm && input.confirm !== true) return refuse(CONFIRM_REFUSAL);
      const started = Date.now();
      try {
        const result = await session.run(() => callEntry(entry, bundle, input));
        log(`${entry.tool} ok ${Date.now() - started}ms`);
        return formatResult(result);
      } catch (error) {
        log(`${entry.tool} ${error?.response?.status ?? 'error'} ${Date.now() - started}ms`);
        return refuse(errorText(error));
      }
    });
  }
  return server;
}
```

- [ ] **Step 4: Run the tests**

Run: `node --test test/server.test.mjs`
Expected: PASS. Two things that can bite: (a) with no `inputSchema`, the SDK may hand the handler `extra` rather than `args` as the first parameter; `callEntry` ignores input for shape `none`, so only the confirm check reads it, and confirm tools always have a schema. (b) `structuredContent` without `outputSchema`: if the SDK rejects it, add `outputSchema: z.looseObject({})` to `config` for every tool and re-run.

- [ ] **Step 5: Run the whole suite**

Run: `npm test`
Expected: every file PASS.

- [ ] **Step 6: Commit**

```bash
git add mcp/tools.mjs mcp/test/server.test.mjs
git commit -m "feat(mcp): register the catalog as MCP tools with confirm guard and plain errors"
```

### Task 8: Entry point and smoke test

**Files:**
- Create: `mcp/server.mjs`
- Modify: `package.json` (App root) jest `testPathIgnorePatterns`

- [ ] **Step 1: Write server.mjs**

```js
#!/usr/bin/env node
// Towinly MCP server over stdio. Stdout is the protocol; every log line goes
// to stderr. Start: node server.mjs (see README.md for the environment).
import { createRequire } from 'node:module';
import { StdioServerTransport } from '@modelcontextprotocol/server/stdio';
import { buildApiBundle } from './bundle.mjs';
import { buildCatalog } from './catalog.mjs';
import { createSession } from './session.mjs';
import { buildServer } from './tools.mjs';

const { version } = createRequire(import.meta.url)('./package.json');
const bundle = await buildApiBundle();
const catalog = buildCatalog();
const session = createSession({ client: bundle.client, logIn: bundle.logIn });
const server = buildServer({ catalog, bundle, session, version });
await server.connect(new StdioServerTransport());
process.stderr.write(`towinly-mcp-server ${version}: ${catalog.length} tools ready\n`);
```
Run: `chmod +x server.mjs`

- [ ] **Step 2: Smoke test with the MCP Inspector**

Run: `npx -y @modelcontextprotocol/inspector --cli node server.mjs --method tools/list | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const t=JSON.parse(s).tools;console.log(t.length,'tools');console.log(t.slice(0,3).map(x=>x.name).join('\n'))})"`
Expected: the catalog count and three `towinly_*` names. If the inspector's CLI flags differ in its current version, run `npx -y @modelcontextprotocol/inspector --cli --help` and adapt.

- [ ] **Step 3: Keep the app's jest away from mcp/**

In the App root `package.json`, `jest.testPathIgnorePatterns`: change `["/node_modules/"]` to `["/node_modules/", "/mcp/"]`.

- [ ] **Step 4: Commit**

```bash
git add mcp/server.mjs package.json
git commit -m "feat(mcp): stdio entry point; keep jest out of mcp/"
```

---

## Chunk 3: Finish

### Task 9: README

**Files:**
- Create: `mcp/README.md`

- [ ] **Step 1: Write the README** (then run `humanizer`, then `stop-slop`; no em dashes; the four brand taglines are not in this file so nothing is exempt)

```markdown
# Towinly MCP server

Towinly's app functions as tools an AI assistant can call. Every tool runs the same code the phone app runs, so what the assistant can do is exactly what the signed-in person can do in the app, nothing more.

## Run it

Needs Node 20 or newer.

    cd mcp
    npm install
    TOWINLY_IDENTIFIER=you@example.com TOWINLY_PASSWORD=yourpassword node server.mjs

The server speaks MCP over stdio. It signs in on the first tool call, keeps the token in memory, and signs in again once if the session expires. It writes nothing to disk.

## Environment

| Variable | Meaning |
|---|---|
| `TOWINLY_IDENTIFIER`, `TOWINLY_PASSWORD` | the account the assistant acts as (username, email or phone, as on the login screen) |
| `TOWINLY_TOKEN` | a ready token instead of the pair above |
| `TOWINLY_API_BASE_URL` | optional; defaults to the live backend the app uses |

## Add it to Claude Code

    claude mcp add --scope user towinly \
      --env TOWINLY_IDENTIFIER=you@example.com --env TOWINLY_PASSWORD=yourpassword \
      -- node "/absolute/path/to/App/mcp/server.mjs"

Then, in a new session: "List my open help requests."

## Tools

Generated from the doc comments in `src/api/`. Read `catalog.snapshot.json` for the full list, or ask the server (`tools/list`). Names are `towinly_` plus the function name in snake case: `postHelpRequest` becomes `towinly_post_help_request`.

Two tools refuse to run without `confirm: true`: `towinly_delete_my_account` and `towinly_send_sos`.

Seven functions are not tools because they only make sense on a phone or in a browser; `exclude.mjs` lists each with its reason.

## When the app changes

    npm run catalog
    npm test

The first rewrites `catalog.snapshot.json`; the second fails on any function whose doc comment the generator cannot read, naming it.
```

- [ ] **Step 2: Prose passes**

Load `humanizer`, run it on `README.md`; then load `stop-slop` and run it. Then: `grep -c '—' README.md` must print `0`.

- [ ] **Step 3: Commit**

```bash
git add mcp/README.md
git commit -m "docs(mcp): README for running and registering the server"
```

### Task 10: Real call and review

- [ ] **Step 1: One real read against the live backend**

The demo elder seat's username and password are the fallbacks in `scripts/capture-store-shots.mjs` (the `SEATS.elder` entry). Run, from `mcp/`:

`TOWINLY_IDENTIFIER=<elder user> TOWINLY_PASSWORD=<elder pass> npx -y @modelcontextprotocol/inspector --cli node server.mjs --method tools/call --tool-name towinly_list_my_help_requests`

Expected: JSON with a `content` array (possibly empty) and no `isError`. Save the output to the scratchpad for the owner report. Do not run any write tool against the live backend.

- [ ] **Step 2: Security review**

Load `security-review` and walk `session.mjs`, `tools.mjs`, `server.mjs`: credentials only from env; token never logged; log lines carry no arguments or bodies; no eval of doc text; stubs cannot be reached from outside. Fix anything found, re-run `npm test`, commit as `fix(mcp): ...`.

- [ ] **Step 3: Code review**

Load `code-review` on the `mcp/` diff (`git diff origin/main...HEAD -- mcp`). Address CRITICAL and HIGH. Commit fixes.

- [ ] **Step 4: Verification before completion**

Load `verification-before-completion`. Run `npm test` and the inspector `tools/list` once more; paste the actual output into the owner report. Only then say it works.

### Task 11: Hand to the owner

- [ ] **Step 1: Report** (plain English, short): what was built, the tool count, the one real call's output, how to try it, and that nothing is pushed. Ask for review.

- [ ] **Step 2: On "looks good"**: merge `feat/mcp-server` into `main` in the main checkout only if the owner says so (fast-forward or merge commit; do not touch the other session's uncommitted files), run `npm run lint` and `npm test` in `App/` once to confirm the app's own checks still pass, then register the server for the owner:

`claude mcp add --scope user towinly --env TOWINLY_IDENTIFIER=... --env TOWINLY_PASSWORD=... -- node "/Users/aghar/Documents/Projects/ToWin App/App/mcp/server.mjs"`

(The owner supplies the account. Never put their password in a chat message or a file.)

- [ ] **Step 3: Push only when the owner says "push".** Update `tasks/todo.md` items 1 and 4 to `[x]`.
