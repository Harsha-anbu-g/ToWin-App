import test from 'node:test';
import assert from 'node:assert/strict';
import { clean, cosine, evaluate, formatReport } from '../evaluate.mjs';
import { discover, ask } from '../a2a-client.mjs';

const okJson = (body) => ({ ok: true, status: 200, json: async () => body });

test('cosine is 1 for the same direction, 0 for orthogonal, 0 for an empty vector', () => {
  assert.equal(cosine([1, 0], [2, 0]), 1);
  assert.equal(cosine([1, 0], [0, 1]), 0);
  assert.equal(cosine([], []), 0);
});

test('discover reads the JSON-RPC url from the card; ask returns the artifact text or null on a failed task', async () => {
  const card = { name: 'Towinly helper', supportedInterfaces: [{ url: 'http://127.0.0.1:7421/a2a/v1', protocolBinding: 'JSONRPC' }] };
  const d = await discover('http://127.0.0.1:7421/', async () => okJson(card));
  assert.equal(d.url, 'http://127.0.0.1:7421/a2a/v1');
  const completed = { result: { task: { status: { state: 'TASK_STATE_COMPLETED' }, artifacts: [{ parts: [{ text: 'Seven.' }] }] } } };
  assert.equal(await ask('http://x/a2a/v1', 'k', 'q', async (url, init) => {
    assert.equal(init.headers.Authorization, 'Bearer k');
    assert.equal(JSON.parse(init.body).method, 'SendMessage');
    return okJson(completed);
  }, 'http://x'), 'Seven.');
  assert.equal(await ask('http://x/a2a/v1', 'k', 'q', async () => okJson({ result: { task: { status: { state: 'TASK_STATE_FAILED' } } } })), null);
});

test('evaluate scores each case, flags below the threshold, and scores a failed ask as 0', async () => {
  const cases = [
    { id: 'good', question: 'q1', reference: 'seven stages' },
    { id: 'weak', question: 'q2', reference: 'free to use' },
    { id: 'down', question: 'q3', reference: 'anything' },
  ];
  const vectors = { 'seven stages': [1, 0], 'There are seven stages.': [0.9, 0.1], 'free to use': [0, 1], 'Trust takes time.': [1, 0.2] };
  const report = await evaluate({
    cases,
    discover: async () => ({ card: { name: 'T' }, url: 'u' }),
    ask: async (url, q) => (q === 'q1' ? 'There are seven stages.' : q === 'q2' ? 'Trust takes time.' : null),
    embed: async (texts) => texts.map((t) => vectors[t]),
    threshold: 0.6,
  });
  assert.equal(report.passed, 1);
  assert.deepEqual(report.rows.map((r) => r.pass), [true, false, false]);
  assert.equal(report.rows[2].score, 0);
  assert.match(formatReport(report), /^T: 1\/3 at threshold 0.6\ngood/);
});

test('a card that points at another origin is refused, so the key never leaves', async () => {
  const card = { name: 'x', supportedInterfaces: [{ url: 'https://evil.example/rpc', protocolBinding: 'JSONRPC' }] };
  await assert.rejects(discover('http://127.0.0.1:7421', async () => okJson(card)), /refused/);
  const plain = { name: 'x', supportedInterfaces: [{ url: 'http://agent.example/a2a/v1', protocolBinding: 'JSONRPC' }] };
  await assert.rejects(discover('http://agent.example', async () => okJson(plain)), /https/);
});

test('remote text loses control and escape characters before it is logged or reported', () => {
  assert.equal(clean('ok\u001b[2Jdone\nnext'), 'ok [2Jdone next');
  assert.equal(clean('x'.repeat(900)).length, 500);
});

test('ask attaches the key only for the configured origin', async () => {
  const done = { result: { task: { status: { state: 'TASK_STATE_COMPLETED' }, artifacts: [{ parts: [{ text: 'ok' }] }] } } };
  let headers;
  await ask('https://evil.example/rpc', 'k', 'q', async (url, init) => { headers = init.headers; return okJson(done); }, 'http://127.0.0.1:7421');
  assert.equal(headers.Authorization, undefined);
  await ask('http://127.0.0.1:7421/a2a/v1', 'k', 'q', async (url, init) => { headers = init.headers; return okJson(done); });
  assert.equal(headers.Authorization, undefined);
});
