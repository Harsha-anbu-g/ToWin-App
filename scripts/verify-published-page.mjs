#!/usr/bin/env node
// Observe a published page. Nothing in the test suite can do this.
//
// Audit finding V9, and the lesson of the whole SHIP-601 story: every check in
// that story compared the repo to itself, so a page that did not exist in
// production passed twenty tests, a rendered-content check at 320pt and a
// screenshot. A build artifact on disk is not a deployment.
//
// Two things make an HTTP check useless here on their own:
//   1. towinly.com serves an SPA catch-all. Every path under /app returns 200,
//      including paths that do not exist, so a status code proves nothing.
//   2. The page is client-rendered. The HTML shell is identical for every
//      route, so grepping the HTML proves nothing either.
// The only honest signal is the JavaScript bundle the shell loads: if the route
// was in the build, its strings are in the bundle.
//
// Usage:
//   node scripts/verify-published-page.mjs <url> --expect "some string" [--expect ...]
//
// Exit codes, deliberately three and not two:
//   0  observed, and the page is published
//   1  observed, and it is NOT published (or the strings are stale)
//   2  could not observe at all: no network, DNS failure, timeout
// A caller that treats 2 as success is doing the exact thing this script exists
// to stop.

const TIMEOUT_MS = 20000;
const OK = 0;
const NOT_PUBLISHED = 1;
const COULD_NOT_OBSERVE = 2;

const argv = process.argv.slice(2);
const url = argv.find((a) => !a.startsWith('--'));
const expected = argv.reduce(
  (acc, a, i) => (argv[i - 1] === '--expect' ? [...acc, a] : acc),
  []
);

if (!url || expected.length === 0) {
  console.error('usage: verify-published-page.mjs <url> --expect "string" [--expect "string"]');
  process.exit(COULD_NOT_OBSERVE);
}

const get = async (target) => {
  const res = await fetch(target, {
    redirect: 'follow',
    signal: AbortSignal.timeout(TIMEOUT_MS),
    headers: { 'user-agent': 'towinly-publish-check' },
  });
  return { res, body: await res.text() };
};

try {
  const { res, body: html } = await get(url);
  console.log(`GET ${url}`);
  console.log(`  final url : ${res.url}`);
  console.log(`  status    : ${res.status}   (an SPA catch-all answers 200 for anything)`);
  console.log(`  robots    : ${res.headers.get('x-robots-tag') ?? 'not set'}`);

  const entry = html.match(/src="([^"]*entry-[^"]*\.js)"/);
  if (!entry) {
    console.error('  FAIL: no expo entry bundle in the HTML. This is not the app shell.');
    process.exit(NOT_PUBLISHED);
  }

  const bundleUrl = new URL(entry[1], res.url).toString();
  const { body: bundle } = await get(bundleUrl);
  console.log(`  bundle    : ${entry[1].split('/').pop()} (${Math.round(bundle.length / 1024)}KB)`);

  const missing = expected.filter((s) => !bundle.includes(s) && !html.includes(s));
  for (const s of expected) {
    console.log(`  ${missing.includes(s) ? 'MISSING' : 'present'}: ${JSON.stringify(s)}`);
  }

  if (missing.length) {
    console.error(
      `\nNOT PUBLISHED. ${missing.length} of ${expected.length} strings are absent from the `
      + 'deployed bundle. The URL answers 200 because every path does. Redeploy the web '
      + 'export before pasting this address into a store console.'
    );
    process.exit(NOT_PUBLISHED);
  }

  console.log('\nPUBLISHED. Every expected string is in the deployed bundle.');
  process.exit(OK);
} catch (err) {
  console.error(`COULD NOT OBSERVE: ${err.name}: ${err.message}`);
  console.error('This is not a pass. Nothing was checked. Re-run with a network.');
  process.exit(COULD_NOT_OBSERVE);
}
