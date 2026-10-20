import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCatalog, toGroqTools, isReadOnly, argsFor, entryFor } from '../tools.mjs';

const catalog = loadCatalog();

test('every catalog entry becomes one Groq tool with an object schema', () => {
  const tools = toGroqTools(catalog);
  assert.equal(tools.length, catalog.length);
  for (const t of tools) {
    assert.equal(t.type, 'function');
    assert.equal(t.function.parameters.type, 'object');
  }
  const post = tools.find((t) => t.function.name === 'towinly_post_help_request');
  assert.deepEqual(Object.keys(post.function.parameters.properties).sort(), ['category', 'description', 'onBehalfOfElderId', 'title', 'urgency']);
  assert.deepEqual(post.function.parameters.required.sort(), ['category', 'title', 'urgency']);
  assert.match(post.function.description, /writes; the person will be asked first/);
});

test('read-only is read from the catalog; unknown tools are not read-only', () => {
  assert.equal(isReadOnly(catalog, 'towinly_export_my_data'), true);
  assert.equal(isReadOnly(catalog, 'towinly_post_help_request'), false);
  assert.equal(isReadOnly(catalog, 'towinly_nope'), false);
});

test('arguments follow the entry shape: none, one object, or positional in doc order', () => {
  assert.deepEqual(argsFor(entryFor(catalog, 'towinly_export_my_data'), {}), []);
  assert.deepEqual(argsFor(entryFor(catalog, 'towinly_post_help_request'), { title: 'x' }), [{ title: 'x' }]);
  const positional = catalog.find((e) => e.shape === 'positional' && e.params.length >= 2);
  const args = Object.fromEntries(positional.params.map((p, i) => [p.name, i]));
  assert.deepEqual(argsFor(positional, args), positional.params.map((p, i) => i));
});
