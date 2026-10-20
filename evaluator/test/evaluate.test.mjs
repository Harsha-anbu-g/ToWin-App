import test from 'node:test';
import assert from 'node:assert/strict';
import { cosine, evaluate, formatReport } from '../evaluate.mjs';
import { discover, ask } from '../a2a-client.mjs';

const okJson = (body) => ({ ok: true, status: 200, json: async () => body });

test('cosine is 1 for the same direction, 0 for orthogonal, 0 for an empty vector', () => {
  assert.equal(cosine([1, 0], [2, 0]), 1);
  assert.equal(cosine([1, 0], [0, 1]), 0);
  assert.equal(cosine([], []), 0);
});

test('discover reads the JSON-RPC url from the card; ask returns the artifact text or null on a failed task', async () => {
  const card = { name: 'Towinly helper', supportedInterfaces: [{ url: 'http://x/a2a/v1', protocolBinding: 'JSONRPC' }] };
  const d = await discover('http://x/', async () => okJson(card));
  assert.equal(d.url, 'http://x/a2a/v1');
  const completed = { result: { task: { status: { state: 'TASK_STATE_COMPLETED' }, artifacts: [{ parts: [{ text: 'Seven.' }] }] } } };
  assert.equal(await ask('http://x/a2a/v1', 'k', 'q', async (url, init) => {
    assert.equal(init.headers.Authorization, 'Bearer k');
    assert.equal(JSON.parse(init.body).method, 'SendMessage');
    return okJson(completed);
  }), 'Seven.');
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
