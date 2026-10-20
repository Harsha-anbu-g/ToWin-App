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
