#!/usr/bin/env node
// Take one store screenshot, at the one frame the store screenshots are
// allowed to be taken at.
//
// Why this file exists at all. The recipe used to live in prose, in
// docs/store/screenshot-inventory.md, and every capture pass wrote its own
// throwaway driver from that prose. On 2026-08-15 one pass read the sentence
// "1320 x 2868" and set the browser viewport to 1320 x 2868. Every mechanical
// check that day passed: the files were the right size, RGB, no alpha, exactly
// what Apple asks for. The picture was a desktop web page, a narrow centred
// column with type at a third of its phone size. Three of those next to five
// real phone shots is the tell a listing cannot recover from.
//
// The frame is 440 x 956 CSS at deviceScaleFactor 3, which lands on the same
// 1320 x 2868 file and looks like an iPhone. Those three numbers are constants
// below and there is no flag that changes them. The mistake this file exists
// to prevent cannot be made through its interface.
//
// Usage:
//   capture-store-shots.mjs --verify <file.png>
//   capture-store-shots.mjs --route <path> --out <file.png> [--seat elder|helper|family]
//                           [--wait "text"] [--tap "text"] [--page <testid>@<n>] [--pause <ms>]
//
// Step flags keep their command line order, so they run in the order typed.
//
// Exit codes, deliberately three and not two:
//   0  captured or measured, and it holds
//   1  captured or measured, and it does NOT hold (wrong frame, alpha, too light)
//   2  could not observe at all: bad flags, no browser, no network, no file
// A caller that reads 2 as success is doing the exact thing this file stops.

import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import hideRefresh from './lib/hide-refresh.js';

const OK = 0;
const DOES_NOT_HOLD = 1;
const COULD_NOT_OBSERVE = 2;

// The pinned frame. Not configurable. See the header.
const VIEWPORT = { width: 440, height: 956 };
const DEVICE_SCALE_FACTOR = 3;
const COLOR_SCHEME = 'light';

const EXPECT_WIDTH = VIEWPORT.width * DEVICE_SCALE_FACTOR;   // 1320
const EXPECT_HEIGHT = VIEWPORT.height * DEVICE_SCALE_FACTOR; // 2868

// The weight floor that separates a phone render from a desktop one, in bytes.
// Measured, not guessed. Every desktop-scale file kept in
// screenshots/superseded/ weighs 58,589 to 107,542. Every phone-scale raw on
// disk weighs 131,624 to 460,063. 120,000 sits in the gap with room on both
// sides. A phone render carries roughly three times the ink, so it cannot be
// this light unless the page failed to draw.
const PHONE_SCALE_FLOOR_BYTES = 120000;

const BASE = process.env.TOWINLY_STORE_BASE || 'https://www.towinly.com/app';

// The three demo seats, as documented in docs/store/console-answers.md. A real
// password can be handed in through the environment when one is rotated, so
// the fallback here never becomes the only copy.
const SEATS = {
  elder: { user: process.env.TOWINLY_ELDER_USER || 'elder', pass: process.env.TOWINLY_ELDER_PASS || '12345678' },
  helper: { user: process.env.TOWINLY_HELPER_USER || 'helper', pass: process.env.TOWINLY_HELPER_PASS || '123456789' },
  family: {
    user: process.env.TOWINLY_FAMILY_USER || 'demo.sarah@towin.app',
    pass: process.env.TOWINLY_FAMILY_PASS || 'DemoSarah!2026',
  },
};

const NAV_TIMEOUT_MS = 45000;
const STEP_TIMEOUT_MS = 20000;

function die(code, message) {
  console.error(message);
  process.exit(code);
}

/* ------------------------------------------------------------------ */
/* The tape measure                                                    */
/* ------------------------------------------------------------------ */

/** Reads width, height and alpha out of sips. Returns null when sips cannot read the file. */
function measure(file) {
  const out = spawnSync('sips', ['-g', 'pixelWidth', '-g', 'pixelHeight', '-g', 'hasAlpha', file], {
    encoding: 'utf8',
  });
  if (out.status !== 0) return null;
  const read = (key) => {
    const hit = out.stdout.match(new RegExp(`${key}:\\s*(\\S+)`));
    return hit ? hit[1] : null;
  };
  return {
    width: Number(read('pixelWidth')),
    height: Number(read('pixelHeight')),
    hasAlpha: read('hasAlpha'),
    bytes: fs.statSync(file).size,
  };
}

/**
 * Measures a file and says whether it holds. Prints what it saw either way,
 * because a number on the screen is the evidence a story writes down.
 */
function verify(file) {
  if (!fs.existsSync(file)) {
    die(COULD_NOT_OBSERVE, `COULD NOT OBSERVE: no file at ${file}. Nothing was checked.`);
  }
  const m = measure(file);
  if (!m) {
    die(COULD_NOT_OBSERVE, `COULD NOT OBSERVE: sips could not read ${file}. Nothing was checked.`);
  }

  const faults = [];
  if (m.width !== EXPECT_WIDTH || m.height !== EXPECT_HEIGHT) {
    faults.push(`frame is ${m.width} x ${m.height}, and the store set is ${EXPECT_WIDTH} x ${EXPECT_HEIGHT}`);
  }
  if (m.hasAlpha !== 'no') {
    faults.push(`carries an alpha channel (hasAlpha: ${m.hasAlpha}); both stores refuse transparency`);
  }
  if (m.bytes < PHONE_SCALE_FLOOR_BYTES) {
    faults.push(
      `weighs ${m.bytes} bytes, under the ${PHONE_SCALE_FLOOR_BYTES} floor. `
      + 'That is the desktop-width mistake: the frame measures right and the page '
      + 'rendered as a desktop column, or it did not draw at all. Re-shoot at '
      + `${VIEWPORT.width} x ${VIEWPORT.height} CSS at scale ${DEVICE_SCALE_FACTOR}.`
    );
  }

  console.log(`${path.basename(file)}`);
  console.log(`  frame  : ${m.width} x ${m.height}`);
  console.log(`  alpha  : ${m.hasAlpha}`);
  console.log(`  bytes  : ${m.bytes}`);

  if (faults.length) {
    console.error(`\nDOES NOT HOLD: ${file}`);
    for (const f of faults) console.error(`  ${f}`);
    process.exit(DOES_NOT_HOLD);
  }
  console.log('  holds  : yes');
  return m;
}

/* ------------------------------------------------------------------ */
/* Flags                                                               */
/* ------------------------------------------------------------------ */

function parseArgs(argv) {
  const opts = { route: null, out: null, seat: null, verify: null, 'dump-text': null, steps: [], headed: false };
  const needsValue = new Set([
    '--route', '--out', '--seat', '--verify', '--dump-text', '--wait', '--tap', '--page', '--pause',
  ]);
  const stepFlags = new Set(['--wait', '--tap', '--page', '--pause']);

  for (let i = 0; i < argv.length; i += 1) {
    const flag = argv[i];
    if (flag === '--headed') {
      opts.headed = true;
      continue;
    }
    if (flag === '--viewport' || flag === '--scale' || flag === '--color-scheme') {
      die(
        COULD_NOT_OBSERVE,
        `${flag} is not a flag here on purpose. The frame is pinned at `
        + `${VIEWPORT.width} x ${VIEWPORT.height} CSS, scale ${DEVICE_SCALE_FACTOR}, ${COLOR_SCHEME}. `
        + 'A 1320 wide viewport measures right and renders a desktop page, which is the '
        + 'one mistake this script exists to make impossible.'
      );
    }
    if (!needsValue.has(flag)) {
      die(COULD_NOT_OBSERVE, `unknown flag ${flag}. See the header of ${path.basename(import.meta.url)}.`);
    }
    const value = argv[i + 1];
    if (value === undefined) die(COULD_NOT_OBSERVE, `${flag} needs a value.`);
    i += 1;
    if (stepFlags.has(flag)) opts.steps.push({ kind: flag.slice(2), value });
    else opts[flag.slice(2)] = value;
  }
  return opts;
}

/* ------------------------------------------------------------------ */
/* The browser                                                         */
/* ------------------------------------------------------------------ */

/**
 * Finds a usable playwright. This repo does not depend on it: adding a browser
 * driver to a React Native app for a script run a handful of times a year is a
 * poor trade, and this worktree shares its node_modules with a sibling
 * checkout, so installing into it would reach outside this branch. It is
 * already on the machine under the npx cache, so look there.
 *
 * Usable means the browser binary is on disk, not merely that the package
 * imports. The cache holds several versions and the newest one here is a
 * 1.63 alpha whose chromium was never downloaded: it imports cleanly and then
 * fails at launch. The pinned driver is PINNED_PLAYWRIGHT, whose chromium is
 * present, so it is tried first and any candidate whose executable is missing
 * is skipped. Finding nothing is could-not-observe, never a pass.
 */
const PINNED_PLAYWRIGHT = '1.62.1';

async function loadChromium() {
  const require = createRequire(import.meta.url);
  const roots = [];
  if (process.env.PLAYWRIGHT_MODULE) roots.push(process.env.PLAYWRIGHT_MODULE);
  const npxCache = path.join(os.homedir(), '.npm', '_npx');
  if (fs.existsSync(npxCache)) {
    for (const dir of fs.readdirSync(npxCache)) {
      roots.push(path.join(npxCache, dir, 'node_modules', 'playwright'));
    }
  }
  const version = (root) => {
    try {
      return JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')).version;
    } catch {
      return '';
    }
  };
  // The pinned version first, then the rest in whatever order the cache lists.
  roots.sort((a, b) => Number(version(b) === PINNED_PLAYWRIGHT) - Number(version(a) === PINNED_PLAYWRIGHT));

  const skipped = [];
  for (const candidate of ['playwright', ...roots]) {
    let chromium;
    try {
      const specifier = candidate === 'playwright' ? 'playwright' : `file://${require.resolve(candidate)}`;
      const mod = await import(specifier);
      chromium = mod.chromium ?? mod.default?.chromium;
    } catch {
      continue;
    }
    if (!chromium) continue;
    let exe = '';
    try {
      exe = chromium.executablePath();
    } catch {
      continue;
    }
    if (!exe || !fs.existsSync(exe)) {
      skipped.push(`${candidate} (${version(candidate) || 'unknown'}): no browser at ${exe}`);
      continue;
    }
    console.log(`playwright ${version(candidate) || 'bundled'} at ${exe.split('/').slice(-3).join('/')}`);
    return chromium;
  }
  die(
    COULD_NOT_OBSERVE,
    'COULD NOT OBSERVE: no playwright on this machine has its chromium downloaded. '
    + `Nothing was captured.${skipped.length ? `\n  skipped: ${skipped.join('\n  skipped: ')}` : ''}`
    + '\nRun npx playwright install chromium and re-run.'
  );
  return null;
}

/**
 * The rule for taking the web-only Refresh control off the page lives in
 * scripts/lib/hide-refresh.js, where a jsdom test can reach it. It runs in the
 * browser, so it is handed over as source and called against that document.
 */
const hideRefreshInPage = `(${hideRefresh.toString()})(document)`;

async function signIn(page, seatName) {
  const seat = SEATS[seatName];
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded', timeout: NAV_TIMEOUT_MS });
  await page.getByLabel('Username, Gmail, or phone').fill(seat.user, { timeout: STEP_TIMEOUT_MS });
  await page.getByLabel('Password', { exact: true }).fill(seat.pass, { timeout: STEP_TIMEOUT_MS });
  await page.getByText('Log In', { exact: true }).click({ timeout: STEP_TIMEOUT_MS });
  await page.waitForFunction(() => !window.location.pathname.endsWith('/login'), null, {
    timeout: NAV_TIMEOUT_MS,
  });
}

async function runStep(page, step) {
  if (step.kind === 'wait') {
    await page.getByText(step.value, { exact: false }).first().waitFor({ state: 'visible', timeout: STEP_TIMEOUT_MS });
    return;
  }
  if (step.kind === 'tap') {
    await page.getByText(step.value, { exact: false }).first().click({ timeout: STEP_TIMEOUT_MS });
    return;
  }
  if (step.kind === 'pause') {
    await page.waitForTimeout(Number(step.value));
    return;
  }
  if (step.kind === 'page') {
    const [testid, index] = step.value.split('@');
    const moved = await page.evaluate(
      ([id, n]) => {
        const start = document.querySelector(`[data-testid="${id}"]`);
        if (!start) return false;
        let el = start;
        // The paged list may be the element carrying the testid or the
        // scroller inside it; take the first ancestor-or-self that scrolls.
        while (el && el.scrollHeight <= el.clientHeight) el = el.firstElementChild;
        if (!el) return false;
        el.scrollTop = el.clientHeight * Number(n);
        return true;
      },
      [testid, index]
    );
    if (!moved) die(COULD_NOT_OBSERVE, `COULD NOT OBSERVE: no scroller under [data-testid="${testid}"].`);
    return;
  }
  die(COULD_NOT_OBSERVE, `unknown step ${step.kind}`);
}

async function capture(opts) {
  const chromium = await loadChromium();
  const browser = await chromium.launch({ headless: !opts.headed });
  try {
    const context = await browser.newContext({
      viewport: VIEWPORT,
      deviceScaleFactor: DEVICE_SCALE_FACTOR,
      colorScheme: COLOR_SCHEME,
    });
    const page = await context.newPage();
    page.setDefaultTimeout(STEP_TIMEOUT_MS);

    if (opts.seat) await signIn(page, opts.seat);

    const target = opts.route === '/' ? BASE : `${BASE}${opts.route}`;
    await page.goto(target, { waitUntil: 'domcontentloaded', timeout: NAV_TIMEOUT_MS });
    await page.waitForTimeout(1500);

    for (const step of opts.steps) await runStep(page, step);

    await page.evaluate(hideRefreshInPage);
    await page.waitForTimeout(300);

    fs.mkdirSync(path.dirname(opts.out), { recursive: true });
    await page.screenshot({ path: opts.out });

    // The address AFTER the steps ran, not the one asked for. A shot meant to
    // be a chat thread and taken on the conversation list is the kind of thing
    // that survives every check but the one that matters, so the proof of
    // which screen was photographed is printed next to the file.
    console.log(`captured ${page.url()} -> ${opts.out}`);

    if (opts['dump-text']) {
      // Every string a person can read IN THE FRAME. Three filters, each
      // earning its place: head content (title, style, font faces) is text a
      // querySelectorAll finds and nobody sees; an element with children would
      // repeat its descendants' words; anything outside the viewport box is
      // off the photograph. A sweep that reports words nobody can see cannot
      // answer the question it is asked, which is whether a phone number is
      // visible in a store screenshot.
      const strings = await page.evaluate(() => {
        const skip = new Set(['STYLE', 'SCRIPT', 'TITLE', 'NOSCRIPT', 'HEAD', 'META', 'LINK']);
        const w = window.innerWidth;
        const h = window.innerHeight;
        return Array.from(document.body.querySelectorAll('*'))
          .filter((el) => !skip.has(el.tagName))
          .filter((el) => el.children.length === 0)
          .filter((el) => (el.textContent || '').trim())
          .filter((el) => {
            const r = el.getBoundingClientRect();
            if (r.width === 0 || r.height === 0) return false;
            if (r.bottom <= 0 || r.top >= h || r.right <= 0 || r.left >= w) return false;
            const style = window.getComputedStyle(el);
            return style.visibility !== 'hidden' && style.display !== 'none' && style.opacity !== '0';
          })
          .map((el) => el.textContent.trim());
      });
      fs.writeFileSync(opts['dump-text'], `${strings.join('\n')}\n`);
      console.log(`  ${strings.length} strings visible in the frame -> ${opts['dump-text']}`);
    }
  } finally {
    await browser.close();
  }
  verify(opts.out);
}

/* ------------------------------------------------------------------ */

const opts = parseArgs(process.argv.slice(2));

if (opts.verify) {
  verify(opts.verify);
  process.exit(OK);
}

if (!opts.route) die(COULD_NOT_OBSERVE, 'missing --route. Nothing was captured.');
if (!opts.out) die(COULD_NOT_OBSERVE, 'missing --out. Nothing was captured.');
if (opts.seat && !SEATS[opts.seat]) {
  die(COULD_NOT_OBSERVE, `--seat must be one of ${Object.keys(SEATS).join(', ')}. Got ${opts.seat}.`);
}

try {
  await capture(opts);
  process.exit(OK);
} catch (err) {
  die(COULD_NOT_OBSERVE, `COULD NOT OBSERVE: ${err.name}: ${err.message}\nNothing was captured. This is not a pass.`);
}
