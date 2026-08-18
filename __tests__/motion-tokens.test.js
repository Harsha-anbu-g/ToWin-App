// UX-713 — Motion pass: everything under 300ms, ease-out or a custom curve,
// transform and opacity only, reduced motion honoured everywhere.
//
// The beats live in ONE place. tokens.motion holds the named durations
// (fast, base, slow — all under 300ms) and the cubic-bezier control points
// as pure data; src/theme/motion.js builds the ready-made Animated easings
// from those numbers, and Reanimated files build their own from the same
// data. Call sites may not carry their own numbers: a magic duration or an
// inline bezier is exactly how a 400ms ease-in sneaks in two months from
// now.
//
// TortoiseMark is the ONE duration exception, documented in the file: the
// intro draw is a brand beat ported verbatim from the website (a logo
// drawing itself in is not a UI response, so the <300ms law does not bind
// it). Even it must build its curves from the shared control points.
//
// Same two-layer convention as android-platform.test.js: value pins on the
// tokens, then source scans so a new animation cannot ship with default
// easing, a magic number, a bounce, or no reduced-motion path.
import { motion } from '../src/theme/tokens';
import { DURATION, EASE } from '../src/theme/motion';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

// ---------- value pins ----------

test('named durations: fast < base < slow, every one under 300ms', () => {
  expect(motion.duration).toEqual({ fast: 150, base: 220, slow: 280 });
  const { fast, base, slow } = motion.duration;
  expect(fast).toBeLessThan(base);
  expect(base).toBeLessThan(slow);
  expect(slow).toBeLessThan(300);
});

test('easing control points are the locked strong curves, as pure data', () => {
  expect(motion.easing).toEqual({
    out: [0.23, 1, 0.32, 1], // strong ease-out — everything that arrives
    inOut: [0.77, 0, 0.175, 1], // strong ease-in-out — on-screen draw/morph
    exit: [0.3, 0, 0.8, 0.15], // accelerate-away — exits only
  });
  // An ease-out family curve leaves the gate fast: x1 well under y1. This is
  // what makes "never ease-in" checkable on the data itself.
  const [x1, y1] = motion.easing.out;
  expect(y1).toBeGreaterThan(x1);
});

test('theme/motion exposes the ready-made Animated easings built from the tokens', () => {
  expect(DURATION).toBe(motion.duration);
  for (const name of ['out', 'inOut', 'exit']) {
    expect(typeof EASE[name]).toBe('function');
  }
});

// ---------- source scans ----------

// Comments stripped so prose about the rule can't satisfy (or trip) the scan.
function readCode(file) {
  return fs
    .readFileSync(file, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/\/\/[^\n]*/g, '');
}

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '__tests__') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (/\.(jsx|js)$/.test(entry.name)) out.push(full);
  }
  return out;
}

const APP_FILES = [...walk(path.join(ROOT, 'app')), ...walk(path.join(ROOT, 'src'))];

// The full argument span of a call, parenthesis-balanced, so the scan sees
// every prop of the call no matter how the lines wrap.
function callSpan(code, idx) {
  const open = code.indexOf('(', idx);
  let depth = 0;
  for (let i = open; i < code.length; i += 1) {
    if (code[i] === '(') depth += 1;
    else if (code[i] === ')') {
      depth -= 1;
      if (depth === 0) return code.slice(open, i + 1);
    }
  }
  return code.slice(open);
}

function timingCalls(code) {
  const spans = [];
  const re = /\b(?:Animated\.timing|withTiming)\s*\(/g;
  let m = re.exec(code);
  while (m !== null) {
    spans.push(callSpan(code, m.index));
    m = re.exec(code);
  }
  return spans;
}

const animatedFiles = () => APP_FILES.filter((f) => timingCalls(readCode(f)).length > 0);

// The brand-beat ledger: intro draw timings ported verbatim from the web,
// documented in the file header. Durations only — curves still come from
// the shared control points.
const DURATION_EXEMPT = ['src/components/TortoiseMark.jsx'];

test('every timing call declares BOTH duration and easing: no library defaults', () => {
  // Animated.timing defaults to 500ms ease-in-out and withTiming to 300ms —
  // an omitted key is a silent rule break, so both must be explicit.
  const failures = [];
  for (const file of animatedFiles()) {
    const rel = path.relative(ROOT, file);
    for (const span of timingCalls(readCode(file))) {
      if (!/\bduration\b/.test(span)) failures.push(`${rel} timing call without duration`);
      if (!/\beasing\b/.test(span)) failures.push(`${rel} timing call without easing`);
    }
  }
  expect(failures).toEqual([]);
});

test('no magic durations: every duration is a named beat (brand ledger aside)', () => {
  const failures = [];
  for (const file of animatedFiles()) {
    const rel = path.relative(ROOT, file);
    if (DURATION_EXEMPT.includes(rel)) continue;
    if (/duration:\s*\d/.test(readCode(file))) failures.push(rel);
  }
  expect(failures).toEqual([]);
});

// The glass lens (owner call 2026-08-17: "like the WhatsApp slider") glides
// with a CRITICALLY DAMPED Animated.spring — high damping, no visible
// overshoot, so the no-bounce law's intent holds while the glide tracks the
// finger organically. Only these two files carry that exemption; anything
// else reaching for a spring still fails here.
const SPRING_EXEMPT = [
  path.join('app', '(tabs)', '_layout.jsx'),
  path.join('src', 'components', 'ui', 'SegmentedControl.jsx'),
];

test('no inline curves, no weak built-ins, no bounce, no layout animation', () => {
  const BANNED = [
    /Easing\.bezier\(\s*\d/, // inline control points — the data lives in tokens
    /Easing\.(?:in|out|inOut)\s*\(/, // weak built-in wrappers (Easing.out(Easing.cubic) era)
    /Easing\.(?:ease|quad|cubic|sin|circle|exp|linear)\b/, // bare built-ins
    /Easing\.(?:bounce|elastic|back)\b/, // never bounce
    /\bAnimated\.spring\b|\bwithSpring\b/, // spring = bounce family, banned here
    /\bwithRepeat\b|\bLayoutAnimation\b/, // loops and layout-property animation
  ];
  const SPRING = BANNED[4];
  const failures = [];
  for (const file of APP_FILES) {
    const rel = path.relative(ROOT, file);
    if (rel === path.join('src', 'theme', 'motion.js')) continue; // the one builder
    const code = readCode(file);
    for (const re of BANNED) {
      if (re === SPRING && SPRING_EXEMPT.includes(rel)) {
        // The lens files may spring, but never with visible bounce: every
        // spring they declare must keep damping in the critical range.
        const dampings = [...code.matchAll(/damping:\s*(\d+)/g)].map((m) => Number(m[1]));
        if (/\bAnimated\.spring\b/.test(code) && (dampings.length === 0 || dampings.some((d) => d < 20))) {
          failures.push(`${rel} springs with visible bounce (damping < 20)`);
        }
        continue;
      }
      if (re.test(code)) failures.push(`${rel} matches ${re}`);
    }
  }
  expect(failures).toEqual([]);
});

test('every animated file reads the reduce-motion setting', () => {
  const failures = [];
  for (const file of animatedFiles()) {
    const code = readCode(file);
    if (!/useReducedMotion/.test(code)) failures.push(path.relative(ROOT, file));
  }
  expect(failures).toEqual([]);
});

test('every system Modal animation goes quiet under reduced motion', () => {
  // MenuSheet runs its own tween (animationType="none"); the rest lean on the
  // system fade/slide and must swap to 'none' when motion is reduced.
  const failures = [];
  for (const file of APP_FILES) {
    const code = readCode(file);
    const rel = path.relative(ROOT, file);
    const re = /animationType=(?:"none"|\{reducedMotion \? 'none' : '(?:fade|slide)'\})/;
    if (code.includes('animationType') && !re.test(code)) failures.push(rel);
  }
  expect(failures).toEqual([]);
});
