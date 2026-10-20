// Bundles src/api for Node with esbuild and imports the result. One entry
// that re-exports every action file, so the whole bundle shares a single
// axios instance (the one setTokenGetter configures).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import { API_DIR, MCP_DIR, STUBS_DIR } from './paths.mjs';
import { listApiFiles } from './catalog.mjs';

// The one relative import that must not be followed: i18n lazily requires
// ../lib/storage, which imports react-native.
const storageStub = {
  name: 'towinly-storage-stub',
  setup(b) {
    b.onResolve({ filter: /(^|\/)lib\/storage$/ }, () => ({ path: path.join(STUBS_DIR, 'storage.mjs') }));
  },
};

// Bundled axios pulls in form-data, which calls require('util'); ESM output
// has no require unless we give it one.
const REQUIRE_BANNER = "import { createRequire as __cr } from 'node:module'; const require = __cr(import.meta.url);";

export function entrySource(files = listApiFiles()) {
  return [`export * as client from './client.js';`, ...files.map((f) => `export * from './${f}';`)].join('\n') + '\n';
}

/** Build and import the api bundle. Returns its module namespace: every action plus `client`. */
export async function buildApiBundle() {
  const result = await build({
    stdin: { contents: entrySource(), resolveDir: API_DIR, sourcefile: 'towinly-api.entry.js', loader: 'js' },
    bundle: true,
    write: false,
    format: 'esm',
    platform: 'node',
    target: 'node22',
    logLevel: 'silent',
    banner: { js: REQUIRE_BANNER },
    alias: {
      'expo-constants': path.join(STUBS_DIR, 'expo-constants.mjs'),
      'expo-crypto': path.join(STUBS_DIR, 'expo-crypto.mjs'),
      react: path.join(STUBS_DIR, 'react.mjs'),
    },
    nodePaths: [path.join(MCP_DIR, 'node_modules')],
    plugins: [storageStub],
  });
  // A fresh folder per build: the test runner builds from several processes
  // at once, and two of them sharing one output path can import a file the
  // other is still writing.
  const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'towinly-mcp-')), 'api.mjs');
  fs.writeFileSync(out, result.outputFiles[0].text);

  // config.js reads EXPO_PUBLIC_API_BASE_URL. The documented variable is
  // TOWINLY_API_BASE_URL; anything else in the shell (a developer's LAN URL)
  // must not reach the server.
  if (process.env.TOWINLY_API_BASE_URL) process.env.EXPO_PUBLIC_API_BASE_URL = process.env.TOWINLY_API_BASE_URL;
  else delete process.env.EXPO_PUBLIC_API_BASE_URL;

  return import(pathToFileURL(out).href);
}
