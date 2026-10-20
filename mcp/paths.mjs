// One place for every path the server needs, so no other file computes
// "../src/api" on its own.
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const MCP_DIR = path.dirname(fileURLToPath(import.meta.url));
export const APP_DIR = path.resolve(MCP_DIR, '..');
export const API_DIR = path.join(APP_DIR, 'src', 'api');
export const STUBS_DIR = path.join(MCP_DIR, 'stubs');
export const BUNDLE_DIR = path.join(MCP_DIR, '.bundle');
export const SNAPSHOT_PATH = path.join(MCP_DIR, 'catalog.snapshot.json');
