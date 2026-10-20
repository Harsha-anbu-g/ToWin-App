#!/usr/bin/env node
// Usage: GROQ_API_KEY=... TOWINLY_IDENTIFIER=... TOWINLY_PASSWORD=... node run.mjs "find me a helper who can drive"
import { createInterface } from 'node:readline/promises';
import { writeFileSync, mkdirSync } from 'node:fs';
import { buildApiBundle } from '../mcp/bundle.mjs';
import { createSession } from '../mcp/session.mjs';
import { callEntry } from '../mcp/tools.mjs';
import { runAgent } from './agent.mjs';
import { createComplete } from './groq.mjs';
import { loadCatalog, toGroqTools, entryFor, isReadOnly } from './tools.mjs';

const goal = process.argv.slice(2).join(' ').trim();
if (!goal) {
  console.error('Give the goal in plain words, in quotes.');
  process.exit(1);
}
const catalog = loadCatalog();
const bundle = await buildApiBundle();
const session = createSession({ client: bundle.client, logIn: bundle.logIn });
const rl = createInterface({ input: process.stdin, output: process.stdout });

const result = await runAgent({
  goal,
  complete: createComplete(),
  tools: toGroqTools(catalog),
  catalogLookup: (name) => isReadOnly(catalog, name),
  runTool: (name, args) => session.run(() => callEntry(entryFor(catalog, name), bundle, args)),
  confirm: async (name, args) => {
    const answer = await rl.question(`\nThe agent wants to run ${name} with ${JSON.stringify(args)}. Type yes to allow: `);
    return answer.trim().toLowerCase() === 'yes';
  },
  log: (line) => console.log(line),
});
rl.close();
mkdirSync(new URL('./traces/', import.meta.url), { recursive: true });
const file = new URL(`./traces/${new Date().toISOString().replace(/[:.]/g, '-')}.json`, import.meta.url);
writeFileSync(file, JSON.stringify({ goal, ...result }, null, 2));
console.log(`\n${result.outcome}\n(trace: ${file.pathname})`);
