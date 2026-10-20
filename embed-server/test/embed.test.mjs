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
