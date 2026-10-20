# AI Steps 9 and 10: A2A Agent and Embedding Model Serving Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:executing-plans to implement this plan (subagents are off in this project unless the owner asks). Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Two small Node packages beside `App/mcp/`: an Agent2Agent (A2A) server that lets other agents talk to Towinly's assistant, and an OpenAI-compatible embeddings server that serves a local model, so the backend's embeddings can run on self-hosted model serving.

**Architecture:** Both packages are ES modules on `node:http` with pure, testable handlers and thin servers. `App/a2a/`: `agent-card.mjs` (the card), `towinly.mjs` (sign in and ask, over axios), `rpc.mjs` (JSON-RPC handler with an in-memory task store), `server.mjs`. `App/embed-server/`: `embed.mjs` (pipeline wrapper with padding), `handler.mjs` (the `/v1/embeddings` shape), `server.mjs`. Tests use `node --test` with fakes; no network in tests.

**Tech Stack:** Node 24, axios, `@huggingface/transformers` (pinned to the registry's current version), A2A protocol 1.0 JSON-RPC binding (spec read 2026-10-20 through Context7: `AgentCard` with `supportedInterfaces`, `capabilities`, `defaultInputModes`, `skills`; `SendMessage` params `{message: {role, parts: [{text}], messageId}}`; result `{task: {id, contextId, status: {state: "TASK_STATE_COMPLETED"}, artifacts: [{artifactId, name, parts: [{text}]}]}}`).

Spec: `App/docs/superpowers/specs/2026-10-19-ai-roadmap-design.md`, section "Steps 9 and 10".

Test commands: `cd App/a2a && npm test` and `cd App/embed-server && npm test`.

---

## Chunk 1: A2A agent

### Task 1: Package, card, RPC handler

- [ ] **Step 1: Scaffold** `App/a2a/package.json` (`type: module`, `start`, `test`, deps axios pinned), `.gitignore` (node_modules), and the failing tests `test/agent-card.test.mjs` and `test/rpc.test.mjs`:

```js
// test/agent-card.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { agentCard } from '../agent-card.mjs';

test('the card names Towinly, one text skill, and the JSON-RPC interface at the public url', () => {
  const card = agentCard({ A2A_PUBLIC_URL: 'https://agent.example.com/a2a/v1' });
  assert.equal(card.name, 'Towinly helper');
  assert.deepEqual(card.supportedInterfaces, [{ url: 'https://agent.example.com/a2a/v1', protocolBinding: 'JSONRPC', protocolVersion: '1.0' }]);
  assert.deepEqual(card.defaultInputModes, ['text/plain']);
  assert.deepEqual(card.defaultOutputModes, ['text/plain']);
  assert.equal(card.skills.length, 1);
  assert.equal(card.skills[0].id, 'ask-towinly');
  assert.equal(card.capabilities.streaming, false);
});

test('without a public url it points at localhost', () => {
  assert.match(agentCard({}).supportedInterfaces[0].url, /^http:\/\/localhost:7421\/a2a\/v1$/);
});
```

```js
// test/rpc.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRpc } from '../rpc.mjs';

const towinly = { ask: async (text) => ({ reply: `You said: ${text}`, action: text.includes('check') ? { name: 'checkInToday', arguments: {} } : null }) };

const send = (rpc, text, extra = {}) => rpc.handle({
  jsonrpc: '2.0', id: 'r1', method: 'SendMessage',
  params: { message: { role: 'ROLE_USER', parts: [{ text }], messageId: 'm1' }, ...extra },
});

test('SendMessage returns a completed task whose artifact is the reply', async () => {
  const rpc = createRpc({ towinly });
  const res = await send(rpc, 'How does trust work?');
  assert.equal(res.jsonrpc, '2.0');
  assert.equal(res.id, 'r1');
  const task = res.result.task;
  assert.equal(task.status.state, 'TASK_STATE_COMPLETED');
  assert.equal(task.artifacts[0].parts[0].text, 'You said: How does trust work?');
  assert.ok(task.id && task.contextId);
});

test('a proposed action rides in the task metadata and is never performed', async () => {
  const rpc = createRpc({ towinly });
  const res = await send(rpc, 'please check me in');
  assert.deepEqual(res.result.task.metadata.proposedAction, { name: 'checkInToday', arguments: {} });
});

test('the older message/send name is accepted; GetTask finds the task; unknown methods are -32601', async () => {
  const rpc = createRpc({ towinly });
  const res = await rpc.handle({ jsonrpc: '2.0', id: 2, method: 'message/send', params: { message: { role: 'user', parts: [{ text: 'hi' }], messageId: 'm2' } } });
  const id = res.result.task.id;
  const got = await rpc.handle({ jsonrpc: '2.0', id: 3, method: 'GetTask', params: { id } });
  assert.equal(got.result.task.id, id);
  const bad = await rpc.handle({ jsonrpc: '2.0', id: 4, method: 'Dance', params: {} });
  assert.equal(bad.error.code, -32601);
});

test('a message with no text is -32602, and a failed ask is a failed task, not a crash', async () => {
  const rpc = createRpc({ towinly: { ask: async () => { throw new Error('down'); } } });
  const empty = await rpc.handle({ jsonrpc: '2.0', id: 5, method: 'SendMessage', params: { message: { role: 'user', parts: [], messageId: 'm3' } } });
  assert.equal(empty.error.code, -32602);
  const failed = await send(rpc, 'anything');
  assert.equal(failed.result.task.status.state, 'TASK_STATE_FAILED');
});
```

- [ ] **Step 2: Run to see them fail** (`npm test` in `App/a2a`): modules not found.

- [ ] **Step 3: Implement** `agent-card.mjs`, `rpc.mjs` (task store is a `Map`; `contextId` from `params.message.contextId` or a new UUID; errors as JSON-RPC objects), `towinly.mjs` (`createTowinly({ env, http })`: token from `TOWINLY_TOKEN` or `POST /auth/login` with `TOWINLY_IDENTIFIER`/`TOWINLY_PASSWORD`, then `POST /assistant/chat {message, history: []}`; one retry on 401 by signing in again), and `server.mjs` (GET `/.well-known/agent-card.json` and `/.well-known/agent.json` serve the card; POST `/a2a/v1` parses JSON and answers with `application/json`; everything else 404). Port from `A2A_PORT` (default 7421).

- [ ] **Step 4: Run, green. Step 5: README** (how to run, env vars, how another agent discovers it) through humanizer then stop-slop. **Step 6: Commit** `feat(a2a): Towinly's assistant as an A2A agent`.

## Chunk 2: Embedding model serving

### Task 2: Package, embedder, handler

- [ ] **Step 1: Scaffold** `App/embed-server/package.json` (dep `@huggingface/transformers` pinned), `.gitignore` (node_modules, .cache), and failing tests:

```js
// test/embed.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { createEmbedder, padTo } from '../embed.mjs';

const fakePipeline = async (texts) => ({ tolist: () => texts.map((t, i) => [i + 1, 0, 0]) });

test('embeds a batch in order, with the model dimension', async () => {
  const e = createEmbedder({ loadPipeline: async () => fakePipeline, model: 'fake', dimension: 3 });
  const out = await e.embed(['a', 'b']);
  assert.deepEqual(out, [[1, 0, 0], [2, 0, 0]]);
});

test('padTo zero-pads a vector up, keeps it when equal, and refuses to cut it', () => {
  assert.deepEqual(padTo([1, 2], 4), [1, 2, 0, 0]);
  assert.deepEqual(padTo([1, 2], 2), [1, 2]);
  assert.throws(() => padTo([1, 2, 3], 2), /dimensions/);
});
```

```js
// test/handler.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { handleEmbeddings } from '../handler.mjs';

const embedder = { model: 'Xenova/all-MiniLM-L6-v2', dimension: 3, embed: async (texts) => texts.map((t, i) => [i + 1, 0, 0]) };

test('answers in the OpenAI shape, one row per input, in index order', async () => {
  const { status, body } = await handleEmbeddings({ input: ['x', 'y'] }, embedder);
  assert.equal(status, 200);
  assert.equal(body.object, 'list');
  assert.deepEqual(body.data.map((d) => d.index), [0, 1]);
  assert.deepEqual(body.data[1].embedding, [2, 0, 0]);
  assert.equal(body.model, 'Xenova/all-MiniLM-L6-v2');
  assert.ok(body.usage.prompt_tokens > 0);
});

test('a single string input, and dimensions larger than the model, are handled', async () => {
  const { body } = await handleEmbeddings({ input: 'x', dimensions: 5 }, embedder);
  assert.deepEqual(body.data[0].embedding, [1, 0, 0, 0, 0]);
});

test('bad input is a 400 with an OpenAI-style error', async () => {
  for (const bad of [{}, { input: [] }, { input: [1] }, { input: 'x', dimensions: 2 }]) {
    const { status, body } = await handleEmbeddings(bad, embedder);
    assert.equal(status, 400, JSON.stringify(bad));
    assert.ok(body.error.message);
  }
});
```

- [ ] **Step 2: Run to see them fail.** **Step 3: Implement** `embed.mjs` (`createEmbedder({ loadPipeline, model, dimension })`, default `loadPipeline` imports `@huggingface/transformers`, sets `env.cacheDir` to `./.cache`, and builds `pipeline('feature-extraction', model)`; `embed(texts)` calls it with `{ pooling: 'mean', normalize: true }` and returns `tolist()`; `padTo`), `handler.mjs` (validates `input` as a non-empty string or array of non-empty strings, at most 100; `dimensions` optional integer not below the model's; returns `{object: 'list', data, model, usage: {prompt_tokens, total_tokens}}` with a rough token count of characters divided by four), and `server.mjs` (POST `/v1/embeddings`, GET `/v1/models`, optional `Authorization: Bearer $EMBED_SERVER_KEY`, port `EMBED_PORT` default 7422; loads the model at start and logs the load time).

- [ ] **Step 4: Run, green. Step 5: Smoke run** (network permitting): `npm start` in the background, then `curl -s localhost:7422/v1/embeddings -d '{"input":["a slow walk","a lift to the clinic"],"dimensions":1536}'` and check two rows of 1536 numbers; note the load time and the per-request latency in the README. **Step 6: README** (humanizer, stop-slop) with the backend wiring: `EMBEDDINGS_BASE_URL=http://<this mac>:7422/v1`, `EMBEDDINGS_MODEL=Xenova/all-MiniLM-L6-v2`, `EMBEDDINGS_DIMENSIONS=1536`. **Step 7: Commit** `feat(embed-server): self-hosted embeddings behind the OpenAI shape`.

### Task 3: Close

- [ ] Keep the app's jest away from both packages (check `jest.testPathIgnorePatterns` or the root `package.json` jest block; the MCP package did the same). Mark steps 9 and 10 done in `App/tasks/todo.md`. Final report with the push commands the owner must run.

---

## Done when

- `GET /.well-known/agent-card.json` serves a valid card; `SendMessage` returns a completed task with the assistant's reply; proposals are metadata only.
- `POST /v1/embeddings` serves local MiniLM vectors in the OpenAI shape, padded to the requested size.
- Both test suites green with `node --test`; a smoke run of each recorded; nothing pushed by this session.
