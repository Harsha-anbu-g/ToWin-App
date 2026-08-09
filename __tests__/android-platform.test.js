// UX-712 — Android answers the platform: ripple, back button, status bar.
//
// The press language from UX-703 is an instant opacity dip — the iOS idiom.
// Android's idiom is the bounded Material ripple, so every touchable in the
// shared chrome also carries android_ripple with the themed overlay token.
// The prop is inherently Android-scoped: iOS and web ignore it, so their
// rendering stays pixel-identical. Scrims are exempt — a backdrop dims, it
// does not ripple.
//
// Hardware back: React Native's Modal maps the Android back button to
// onRequestClose, so every Modal in the app must carry it — back closes the
// sheet first and never falls through to navigation underneath. Nested
// screens are the native stack's own job.
//
// Status bar: Expo SDK 54 enforces edge-to-edge on Android. The root layout
// is the bar's single owner (mode-driven style, no dead backgroundColor —
// edge-to-edge ignores it and warns). A transparent Modal must opt into
// statusBarTranslucent + navigationBarTranslucent or its scrim stops short
// of the system bars, leaving un-dimmed strips of the screen behind it.
//
// Same two-layer convention as press-feedback.test.js: render pins for the
// behavior, source scans so a new touchable or Modal cannot ship without
// the platform answers. No elevation: the no-shadow law wins over Material
// defaults, pinned repo-wide below.
import { fireEvent, render } from '@testing-library/react-native';
import LegalModal from '../src/components/LegalModal';
import { ThemeProvider, useTheme } from '../src/theme/ThemeContext';
import { light, dark } from '../src/theme/tokens';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

function wrap(ui) {
  return render(<ThemeProvider>{ui}</ThemeProvider>);
}

// ---------- the themed overlay token ----------

// Subtle by contract: a state layer, not a flash. Both themes must define it
// as a translucent rgba so it works on every surface it lands on.
const OVERLAY_RE = /^rgba\(\d+, ?\d+, ?\d+, ?(0?\.\d+)\)$/;

test('both themes define a translucent ripple overlay token', () => {
  for (const t of [light, dark]) {
    const m = String(t.ripple).match(OVERLAY_RE);
    expect(m).not.toBeNull();
    expect(Number(m[1])).toBeLessThanOrEqual(0.16);
  }
});

// ---------- render pins ----------

test('the theme hands every touchable one themed ripple config', async () => {
  // RNTL 14 dropped the UNSAFE_ queries and iOS-platform tests strip
  // android_ripple before it reaches the host, so the pin lives at the
  // source of truth: the context object every primitive passes through.
  let seen;
  function Probe() {
    seen = useTheme().pressRipple;
    return null;
  }
  await wrap(<Probe />);
  expect(seen).toEqual({ color: light.ripple });
});

test('hardware back reaches LegalModal as onRequestClose and closes it', async () => {
  const onClose = jest.fn();
  const r = await wrap(<LegalModal title="Terms" sections={[]} visible onClose={onClose} />);
  const modal = r.getByTestId('legal-modal');
  // The same event Android's back button raises (confirm.test.js precedent).
  fireEvent(modal, 'requestClose');
  expect(onClose).toHaveBeenCalledTimes(1);
  // Edge-to-edge: the scrim must cover both system bars, not stop short.
  expect(modal.props.statusBarTranslucent).toBe(true);
  expect(modal.props.navigationBarTranslucent).toBe(true);
});

// ---------- source scans ----------

// Comments stripped so prose about the rule can't satisfy (or trip) the scan.
function readCode(file) {
  return fs
    .readFileSync(file, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/\/\/[^\n]*/g, '');
}

// Opening tag around a match index — enough to see sibling props. Brace-aware
// so a style={({ pressed }) => ...} arrow inside the tag does not end it.
function elementAround(code, index) {
  const start = code.lastIndexOf('<', index);
  let depth = 0;
  for (let i = start; i < code.length; i += 1) {
    const ch = code[i];
    if (ch === '{') depth += 1;
    else if (ch === '}') depth -= 1;
    else if (ch === '>' && depth === 0) return code.slice(start, i + 1);
  }
  return code.slice(start);
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

// The shared chrome closure: every ui primitive, plus the shell surfaces that
// render on every screen (tab bar FAB, Ask AI, the drawer and shared modals).
const UI_DIR = path.join(ROOT, 'src', 'components', 'ui');
const RIPPLE_SCOPE = [
  ...fs
    .readdirSync(UI_DIR)
    .filter((f) => f.endsWith('.jsx'))
    .map((f) => path.join(UI_DIR, f)),
  path.join(ROOT, 'app', '(tabs)', '_layout.jsx'),
  path.join(ROOT, 'src', 'components', 'AskAiAssistant.jsx'),
  path.join(ROOT, 'src', 'components', 'home', 'MenuSheet.jsx'),
  path.join(ROOT, 'src', 'components', 'LegalModal.jsx'),
  path.join(ROOT, 'src', 'context', 'ConfirmContext.jsx'),
];

// Backdrops dim, they don't ripple — and they must stay ripple-free.
const SCRIM_IDS = ['menu-scrim', 'legal-scrim', 'confirm-scrim'];

test('every Pressable in the shared chrome carries android_ripple (scrims exempt)', () => {
  const missing = [];
  const rippledScrims = [];
  for (const file of RIPPLE_SCOPE) {
    const code = readCode(file);
    const rel = path.relative(ROOT, file);
    let idx = code.indexOf('<Pressable');
    while (idx !== -1) {
      const tag = elementAround(code, idx);
      const isScrim = SCRIM_IDS.some((id) => tag.includes(id));
      if (isScrim && tag.includes('android_ripple')) rippledScrims.push(rel);
      if (!isScrim && !tag.includes('android_ripple')) missing.push(`${rel}:${idx}`);
      idx = code.indexOf('<Pressable', idx + 1);
    }
  }
  expect(missing).toEqual([]);
  expect(rippledScrims).toEqual([]);
});

test('every Modal answers hardware back and covers the system bars', () => {
  const failures = [];
  for (const file of APP_FILES) {
    const code = readCode(file);
    const rel = path.relative(ROOT, file);
    const re = /<Modal[\s>]/g;
    let m = re.exec(code);
    while (m !== null) {
      const tag = elementAround(code, m.index);
      for (const prop of ['onRequestClose', 'statusBarTranslucent', 'navigationBarTranslucent']) {
        if (!tag.includes(prop)) failures.push(`${rel} lacks ${prop}`);
      }
      m = re.exec(code);
    }
  }
  expect(failures).toEqual([]);
});

test('the root layout is the status bar single owner, mode-driven, no dead backgroundColor', () => {
  // Exactly one file may render the bar.
  const owners = APP_FILES.filter((f) => readCode(f).includes("from 'expo-status-bar'"));
  expect(owners.map((f) => path.relative(ROOT, f))).toEqual(['app/_layout.jsx']);

  const code = readCode(path.join(ROOT, 'app', '_layout.jsx'));
  const tag = elementAround(code, code.indexOf('<StatusBar'));
  // Night mode is opt-in and the bar follows it — never the OS scheme.
  expect(tag).toMatch(/style=\{mode === 'dark' \? 'light' : 'dark'\}/);
  // Edge-to-edge ignores backgroundColor and warns; a dead prop invites the
  // next reader to trust it.
  expect(tag).not.toMatch(/backgroundColor/);
});

test('no shadow or elevation props anywhere: hairlines are the only elevation', () => {
  const offenders = [];
  for (const file of APP_FILES) {
    const code = readCode(file);
    if (/\b(shadowColor|shadowOffset|shadowOpacity|shadowRadius|elevation)\s*:/.test(code)) {
      offenders.push(path.relative(ROOT, file));
    }
  }
  expect(offenders).toEqual([]);
});
