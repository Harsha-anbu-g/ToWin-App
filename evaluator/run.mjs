#!/usr/bin/env node
// Usage: A2A_SERVER_KEY=... node run.mjs   (A2A_URL and EMBED_URL default to the local servers)
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { discover, ask } from './a2a-client.mjs';
import { embed } from './embed-client.mjs';
import { evaluate, formatReport } from './evaluate.mjs';

const a2aUrl = process.env.A2A_URL || 'http://127.0.0.1:7421';
const key = process.env.A2A_SERVER_KEY || '';
const embedUrl = process.env.EMBED_URL || 'http://127.0.0.1:7422/v1';
const cases = JSON.parse(readFileSync(new URL('./cases.json', import.meta.url), 'utf8'));

const report = await evaluate({
  cases,
  discover: () => discover(a2aUrl),
  ask: (url, text) => ask(url, key, text),
  embed: (texts) => embed(texts, { url: embedUrl, key: process.env.EMBED_SERVER_KEY || '' }),
  threshold: Number(process.env.EVAL_THRESHOLD || 0.6),
  log: (line) => console.log(line),
});
mkdirSync(new URL('./reports/', import.meta.url), { recursive: true });
const file = new URL(`./reports/${new Date().toISOString().replace(/[:.]/g, '-')}.json`, import.meta.url);
// Replies can quote the signed-in account's own data: owner-only, and only scores unless asked.
const saved = process.env.EVAL_KEEP_REPLIES === '1' ? report : { ...report, rows: report.rows.map(({ reply, ...r }) => r) };
writeFileSync(file, JSON.stringify(saved, null, 2), { mode: 0o600 });
console.log(`\n${formatReport(report)}\n(report: ${file.pathname})`);
process.exit(report.passed === report.total ? 0 : 1);
