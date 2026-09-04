// UX-704 — pull-to-refresh on every screen that shows remote data.
//
// Elders read the pull gesture as "check again". Every data-backed screen
// answers it: Screen grows an `onRefresh` prop that mounts the shared themed
// RefreshControl on its own ScrollView, and screens with hand-rolled scrollers
// (home, messages, friends, the needs lists) render the same ui-kit control so
// the spinner is sky-blue everywhere, on both platforms, never default gray.
//
// Two layers of guard, same convention as keyboard-avoidance.test.js: render
// pins on the Screen primitive and two live screens (the wiring cannot
// silently drop out of the tree), and a source scan that fails any app screen
// querying remote data without a refresh path — a NEW data screen cannot ship
// without one.
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, waitFor } from '@testing-library/react-native';
import { Text } from 'react-native';
import { ThemeProvider } from '../src/theme/ThemeContext';
import { ToastProvider } from '../src/context/ToastContext';
import { ConfirmProvider } from '../src/context/ConfirmContext';
import api from '../src/api/client';
import Screen from '../src/components/ui/Screen';
import TrustScreen from '../app/trust/index';
import ProfileScreen from '../app/(tabs)/profile';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: () => true }),
  useFocusEffect: (effect) => require('react').useEffect(effect, [effect]),
  Redirect: () => null,
}));

jest.mock('../src/api/client', () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn(async () => ({ data: {} })), delete: jest.fn() },
  setTokenGetter: jest.fn(),
  setOnSessionExpired: jest.fn(),
}));

jest.mock('../src/context/AuthContext', () => ({
  __esModule: true,
  AuthProvider: ({ children }) => children,
  useAuth: () => ({ user: { role: 'ELDER', userId: 'u1', emailVerified: true }, booted: true }),
}));

const wrap = (ui) =>
  render(
    <ThemeProvider>
      {/* gcTime: Infinity — the default 5-min gc timer is scheduled at unmount
          and keeps the Jest worker alive until force-exit. */}
      <QueryClientProvider
        client={new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } })}
      >
        <ToastProvider>
          <ConfirmProvider>{ui}</ConfirmProvider>
        </ToastProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );

beforeEach(() => {
  api.get.mockResolvedValue({ data: {} });
});
afterEach(() => jest.clearAllMocks());

// ---------- render pins: the Screen primitive owns the gesture ----------

// RNTL 14 dropped the UNSAFE_ queries and the refresh control's props never
// reach its host element here, so the spinner is read off the host
// ScrollView's own `refreshControl` prop — the posted-help.test.js precedent.
// Re-read it each time: the element is replaced on every render.
const spinnerOn = (r) => () => r.getByTestId('screen-scroll').props.refreshControl?.props;

test('Screen without onRefresh mounts no refresh control', async () => {
  const r = await wrap(
    <Screen>
      <Text>quiet page</Text>
    </Screen>
  );
  expect(r.getByTestId('screen-scroll').props.refreshControl).toBeUndefined();
});

test('pulling calls the reload and the spinner stops when it settles', async () => {
  let resolveReload;
  const reload = jest.fn(() => new Promise((resolve) => { resolveReload = resolve; }));
  const r = await wrap(
    <Screen onRefresh={reload}>
      <Text>data page</Text>
    </Screen>
  );
  const spinner = spinnerOn(r);
  expect(spinner().refreshing).toBe(false);

  let pull;
  await act(async () => {
    pull = spinner().onRefresh();
  });
  expect(reload).toHaveBeenCalledTimes(1);
  expect(spinner().refreshing).toBe(true);

  await act(async () => {
    resolveReload();
    await pull;
  });
  expect(spinner().refreshing).toBe(false);
});

test('the spinner stops even when the reload fails (poor WiFi)', async () => {
  const reload = jest.fn().mockRejectedValue(new Error('offline'));
  const r = await wrap(
    <Screen onRefresh={reload}>
      <Text>data page</Text>
    </Screen>
  );
  const spinner = spinnerOn(r);

  await act(async () => {
    await spinner().onRefresh();
  });
  expect(reload).toHaveBeenCalledTimes(1);
  expect(spinner().refreshing).toBe(false);
});

// ---------- render pins: live screens are really wired ----------

test('trust screen refreshes its real score query on pull', async () => {
  api.get.mockImplementation(async (url) => {
    if (url === '/trust/my-score')
      return { data: { totalScore: 10, tier: 'Getting Started', customers: [] } };
    return { data: {} };
  });

  const r = await wrap(<TrustScreen />);
  const spinner = spinnerOn(r);
  await waitFor(() => expect(spinner()).toBeTruthy());

  const scoreCalls = () => api.get.mock.calls.filter(([url]) => url === '/trust/my-score').length;
  const before = scoreCalls();
  await act(async () => {
    await spinner().onRefresh();
  });
  expect(scoreCalls()).toBeGreaterThan(before);
});

test('profile tab answers the pull gesture', async () => {
  // Real feed shapes — the screen filters /connections as an array.
  const FEEDS = {
    '/profile/me': { name: 'Margaret', city: 'Montreal' },
    '/trust/my-score': { total: 15 },
    '/connections': [],
    '/streaks/me': {},
    '/reviews/mine': [],
  };
  api.get.mockImplementation(async (url) => ({ data: FEEDS[url] ?? {} }));

  const r = await wrap(<ProfileScreen />);
  const spinner = spinnerOn(r);
  await waitFor(() => expect(spinner()).toBeTruthy());
});

// ---------- source scan: no data screen ships without a refresh path ----------

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else if (/\.(jsx?|tsx?)$/.test(entry.name)) files.push(full);
  }
  return files;
}

// Comments stripped so prose about refreshing can't satisfy (or trip) the scan.
function readCode(file) {
  return fs
    .readFileSync(file, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/\/\/[^\n]*/g, '');
}

// Opening tag around a match index — enough to see sibling props.
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

function screenHasOnRefresh(code) {
  const re = /<Screen\b/g;
  let m;
  while ((m = re.exec(code))) {
    if (/\bonRefresh=/.test(elementAround(code, m.index))) return true;
  }
  return false;
}

/**
 * Screens that query remote data but deliberately carry no pull-to-refresh.
 * Every entry needs a reason a reviewer can check.
 */
const EXEMPT = {
  'app/(tabs)/_layout.jsx': 'tab bar chrome, not a screen; badge counts refresh with their tabs',
  'app/chat/[connectionId].jsx': 'inverted thread; a pull there means load older messages, a feature the website does not have',
  'app/profile-edit.jsx': 'prefilled form; a pull would reload the profile underneath text being edited',
  'app/change-password.jsx':
    'password form; its one read (hasPassword via profile-me) is cached, and a pull would yank the screen under a half-typed secret',
};

test('every app screen that queries remote data has a refresh path', () => {
  const offenders = [];
  for (const file of walk(path.join(ROOT, 'app'))) {
    const rel = path.relative(ROOT, file);
    if (EXEMPT[rel]) continue;
    const code = readCode(file);
    if (!/\buse(Infinite)?Query\(/.test(code)) continue;
    if (screenHasOnRefresh(code) || /<RefreshControl\b/.test(code)) continue;
    offenders.push(rel);
  }
  expect(offenders).toEqual([]);
});

test('every refresh control is the themed ui-kit one, with no local colour overrides', () => {
  const KIT = path.join('src', 'components', 'ui', 'RefreshControl.jsx');
  const offenders = [];
  for (const file of [...walk(path.join(ROOT, 'app')), ...walk(path.join(ROOT, 'src'))]) {
    const rel = path.relative(ROOT, file);
    if (rel === KIT) continue;
    const code = readCode(file);
    const re = /<RefreshControl\b/g;
    let m = re.exec(code);
    if (!m) continue;
    if (!/import\s+RefreshControl\s+from\s+'[^']*(ui|\.)\/RefreshControl'/.test(code)) {
      offenders.push(`${rel} renders RefreshControl but not the ui-kit one`);
      continue;
    }
    do {
      const element = elementAround(code, m.index);
      if (/tintColor=|colors=|progressBackgroundColor=/.test(element)) {
        offenders.push(`${rel} overrides the shared refresh colours in place`);
      }
    } while ((m = re.exec(code)));
  }
  expect(offenders).toEqual([]);
});
