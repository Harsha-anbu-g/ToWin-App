#!/usr/bin/env node
// towinly-agent "<goal>" [--only fnA,fnB] [--max-steps N]
// Signs in with TOWINLY_IDENTIFIER and TOWINLY_PASSWORD (or TOWINLY_TOKEN),
// plans with GROQ_API_KEY, asks in the terminal before every write, and writes
// the full trace to ./traces/.
import { mkdirSync, writeFileSync } from 'node:fs';
import readline from 'node:readline/promises';
import { buildApiBundle } from '../mcp/bundle.mjs';
import { createSession } from '../mcp/session.mjs';
import { callEntry } from '../mcp/tools.mjs';
import { runAgent } from './agent.mjs';
import { createComplete } from './groq.mjs';
import { loadCatalog, toolsFromCatalog } from './tools.mjs';

const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(name);
  return i === -1 ? null : args.splice(i, 2)[1];
};
const only = flag('--only')?.split(',').map((s) => s.trim()).filter(Boolean) ?? null;
const maxSteps = Number(flag('--max-steps') ?? 8);
const goal = args.join(' ').trim();
if (!goal) {
  console.error('Usage: towinly-agent "<goal>" [--only fnA,fnB] [--max-steps N]');
  process.exit(2);
}

const complete = createComplete({ apiKey: process.env.GROQ_API_KEY, model: process.env.GROQ_MODEL });
const tools = toolsFromCatalog(loadCatalog(), { only });
const bundle = await buildApiBundle();
const session = createSession({ client: bundle.client, logIn: bundle.logIn });
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

const confirm = async ({ entry, input }) => {
  console.log(`\nThe agent wants to: ${entry.description}`);
  console.log(`  ${entry.fn}(${JSON.stringify(input)})`);
  const answer = await rl.question('Allow it? Type yes to allow: ');
  return answer.trim().toLowerCase() === 'yes';
};

const out = await runAgent({
  goal,
  complete,
  tools,
  confirm,
  maxSteps,
  runTool: (entry, input) => session.run(() => callEntry(entry, bundle, input)),
});
rl.close();

mkdirSync(new URL('./traces/', import.meta.url), { recursive: true });
const file = new URL(`./traces/${new Date().toISOString().replace(/[:.]/g, '-')}.json`, import.meta.url);
writeFileSync(file, JSON.stringify(out, null, 2));
console.log(`\n${out.answer}\n\n(${out.status}; ${out.trace.length} trace entries in ${file.pathname})`);
