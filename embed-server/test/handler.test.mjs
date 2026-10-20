import test from 'node:test';
import assert from 'node:assert/strict';
import { handleEmbeddings } from '../handler.mjs';

const embedder = {
  model: 'Xenova/all-MiniLM-L6-v2',
  dimension: 3,
  embed: async (texts) => texts.map((t, i) => [i + 1, 0, 0]),
};

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
