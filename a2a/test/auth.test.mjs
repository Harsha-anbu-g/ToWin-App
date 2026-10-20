import test from 'node:test';
import assert from 'node:assert/strict';
import { authorized } from '../auth.mjs';

test('only the exact bearer key passes; a missing key never does', () => {
  assert.equal(authorized('Bearer s3cret', 's3cret'), true);
  assert.equal(authorized('Bearer s3cre', 's3cret'), false);
  assert.equal(authorized('Bearer s3cret!', 's3cret'), false);
  assert.equal(authorized(undefined, 's3cret'), false);
  assert.equal(authorized('Bearer anything', ''), false);
});
