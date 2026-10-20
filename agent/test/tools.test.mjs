import test from 'node:test';
import assert from 'node:assert/strict';
import { toolsFromCatalog } from '../tools.mjs';

const catalog = [
  { fn: 'getMyTrustScore', tool: 'towinly_get_my_trust_score', description: 'Score.', readOnly: true, destructive: false, shape: 'none', params: [] },
  { fn: 'blockPerson', tool: 'towinly_block_person', description: 'Block one person.', readOnly: false, destructive: true, shape: 'positional',
    params: [{ type: 'string', name: 'userId', optional: false, text: 'the person to block' }] },
  { fn: 'postHelpRequest', tool: 'towinly_post_help_request', description: 'Post a request.', readOnly: false, destructive: false, shape: 'object',
    params: [{ type: 'object', name: 'params', children: [
      { type: 'string', name: 'title', optional: false, text: 'short title' },
      { type: 'string|null', name: 'description', optional: true, text: 'detail' },
      { type: 'number', name: 'count', optional: true, text: '' },
    ] }] },
  { fn: 'sendSos', tool: 'towinly_send_sos', description: 'SOS.', readOnly: false, destructive: true, shape: 'none', params: [] },
];

test('every entry becomes a function tool with a JSON schema from its doc params', () => {
  const t = toolsFromCatalog(catalog, { allowDestructive: true });
  assert.equal(t.definitions.length, 4);
  const post = t.definitions.find((d) => d.function.name === 'towinly_post_help_request');
  assert.deepEqual(post.function.parameters, {
    type: 'object',
    properties: {
      title: { type: 'string', description: 'short title' },
      description: { type: 'string', description: 'detail' },
      count: { type: 'number' },
    },
    required: ['title'],
  });
  const block = t.definitions.find((d) => d.function.name === 'towinly_block_person');
  assert.deepEqual(block.function.parameters.required, ['userId']);
  assert.deepEqual(t.definitions[0].function.parameters, { type: 'object', properties: {}, required: [] });
});

test('destructive tools are left out unless asked for, and lookup knows read from write', () => {
  const t = toolsFromCatalog(catalog);
  assert.deepEqual(t.definitions.map((d) => d.function.name), ['towinly_get_my_trust_score', 'towinly_post_help_request']);
  assert.equal(t.lookup('towinly_get_my_trust_score').readOnly, true);
  assert.equal(t.lookup('towinly_post_help_request').readOnly, false);
  assert.equal(t.lookup('towinly_send_sos'), undefined);
});

test('an only-list narrows the tools to the named functions', () => {
  const t = toolsFromCatalog(catalog, { only: ['getMyTrustScore'] });
  assert.deepEqual(t.definitions.map((d) => d.function.name), ['towinly_get_my_trust_score']);
});

test('the real catalog converts: every non-destructive entry, no destructive one', async () => {
  const { loadCatalog } = await import('../tools.mjs');
  const real = loadCatalog();
  const t = toolsFromCatalog(real);
  assert.equal(t.definitions.length, real.filter((e) => !e.destructive).length);
  assert.ok(t.definitions.every((d) => /^towinly_[a-z_]+$/.test(d.function.name)));
  assert.equal(t.lookup('towinly_delete_my_account'), undefined);
});
