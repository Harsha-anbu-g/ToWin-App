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

test('a union of plain types accepts each part', () => {
  const s = zodFromDocType('number|string', 't');
  ok(s, 5);
  ok(s, '5');
  bad(s, true);
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
  assert.throws(
    () => zodFromDocType('Date', 'needs.js postHelpRequest.when'),
    /postHelpRequest\.when: unsupported doc type "Date"/
  );
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
