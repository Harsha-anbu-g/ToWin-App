import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildApiBundle, entrySource } from '../bundle.mjs';
import { buildCatalog } from '../catalog.mjs';

const LIVE_URL = /^https:\/\/backend-/;

test('entrySource re-exports the client namespace and every action file', () => {
  const src = entrySource(['needs.js', 'trust.js']);
  assert.equal(src, "export * as client from './client.js';\nexport * from './needs.js';\nexport * from './trust.js';\n");
});

test('the bundle exports every catalog function, logIn and the client hooks', async () => {
  delete process.env.TOWINLY_API_BASE_URL;
  const bundle = await buildApiBundle();
  for (const e of buildCatalog()) assert.equal(typeof bundle[e.fn], 'function', e.fn);
  assert.equal(typeof bundle.logIn, 'function');
  assert.equal(typeof bundle.client.setTokenGetter, 'function');
  assert.equal(typeof bundle.client.setOnSessionExpired, 'function');
  assert.match(bundle.client.default.defaults.baseURL, LIVE_URL);
});

test('TOWINLY_API_BASE_URL overrides the base URL and a stray LAN variable never leaks in', async () => {
  process.env.TOWINLY_API_BASE_URL = 'https://example.test/api';
  const overridden = await buildApiBundle();
  assert.equal(overridden.client.default.defaults.baseURL, 'https://example.test/api');

  delete process.env.TOWINLY_API_BASE_URL;
  process.env.EXPO_PUBLIC_API_BASE_URL = 'http://192.168.1.20:8080/api';
  const live = await buildApiBundle();
  assert.match(live.client.default.defaults.baseURL, LIVE_URL);
  assert.equal(process.env.EXPO_PUBLIC_API_BASE_URL, undefined);
});
