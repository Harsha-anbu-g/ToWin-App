#!/usr/bin/env node
// Towinly MCP server over stdio. Stdout is the protocol; every log line goes
// to stderr. Start: node server.mjs (see README.md for the environment).
import { createRequire } from 'node:module';
import { serveStdio } from '@modelcontextprotocol/server/stdio';
import { buildApiBundle } from './bundle.mjs';
import { buildCatalog } from './catalog.mjs';
import { createSession } from './session.mjs';
import { buildServer } from './tools.mjs';

const { version } = createRequire(import.meta.url)('./package.json');
const bundle = await buildApiBundle();
const catalog = buildCatalog();
const session = createSession({ client: bundle.client, logIn: bundle.logIn });

serveStdio(() => buildServer({ catalog, bundle, session, version }), {
  onerror: (error) => process.stderr.write(`towinly-mcp-server: ${error.message}\n`),
});
process.stderr.write(`towinly-mcp-server ${version}: ${catalog.length} tools ready\n`);
