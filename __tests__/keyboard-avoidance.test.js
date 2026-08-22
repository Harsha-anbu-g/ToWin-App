// UX-702 — the keyboard never covers what you are typing.
//
// Every screen with a text field keeps the focused input visible above the
// keyboard: forms opt in with <Screen keyboard> (which wraps the body in
// KeyboardAvoider), and the chat composer rides the keyboard inside its own
// KeyboardAvoider. An elder typing into a field they cannot see is the
// failure this file exists to prevent.
//
// Two layers of guard, same convention as font-scaling.test.js: render pins
// on the auth forms and the chat composer (the wrapper cannot silently drop
// out of the tree), and a source scan that walks every screen under app/ and
// fails any input-bearing screen that ships without keyboard handling — a
// NEW form cannot ship uncovered.
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, waitFor, within } from '@testing-library/react-native';
import { ThemeProvider } from '../src/theme/ThemeContext';
import { ToastProvider } from '../src/context/ToastContext';
import { ConfirmProvider } from '../src/context/ConfirmContext';
import api from '../src/api/client';
import Login from '../app/(auth)/login';
import Register from '../app/(auth)/register';
import ForgotPassword from '../app/(auth)/forgot-password';
import ResetPassword from '../app/(auth)/reset-password';
import FinishSetup from '../app/(auth)/finish-setup';
import { setPendingOnboarding } from '../src/lib/pendingOnboarding';
import ChatThread from '../app/chat/[connectionId]';

let mockUser = null;

jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    canGoBack: () => false,
  }),
  useFocusEffect: () => {},
  useLocalSearchParams: () => ({
    connectionId: 'c1',
    token: 'tok',
    onboardingToken: 'ob',
  }),
  Redirect: () => null,
}));

jest.mock('../src/api/client', () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn(), delete: jest.fn() },
  setTokenGetter: jest.fn(),
  setOnSessionExpired: jest.fn(),
  friendlyWriteError: (_e, fallback) => fallback,
}));

jest.mock('../src/context/AuthContext', () => ({
  useAuth: () => ({
    user: mockUser,
    booted: true,
    login: jest.fn(),
    sessionExpired: false,
  }),
}));

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

function wrap(ui) {
  const qc = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity },
      mutations: { retry: false, gcTime: Infinity },
    },
  });
  return render(
    <ThemeProvider>
      <QueryClientProvider client={qc}>
        <ToastProvider>
          <ConfirmProvider>{ui}</ConfirmProvider>
        </ToastProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

// ---------- render pins: the wrapper is really in the tree ----------

beforeEach(() => {
  mockUser = null;
  api.get.mockResolvedValue({ data: [] });
});

test.each([
  ['login', Login],
  ['register', Register],
  ['forgot-password', ForgotPassword],
  ['reset-password', ResetPassword],
  ['finish-setup', FinishSetup],
])('%s form renders inside a keyboard avoider', async (name, Form) => {
  // finish-setup no longer takes its identity off the URL (HARD-105): a link
  // with params and no pending flow gets the refusal card, which has no form
  // and so no keyboard avoider. The real flow is seeded here instead, which is
  // what oauth-callback does after a successful exchange.
  if (name === 'finish-setup') {
    setPendingOnboarding({ onboardingToken: 'ob', email: 'm@example.com', name: 'Margaret' });
  }
  const r = await wrap(<Form />);
  expect(r.getAllByTestId('keyboard-avoider').length).toBeGreaterThan(0);
});

test('chat composer rides the keyboard', async () => {
  mockUser = { role: 'ELDER', userId: 'me', emailVerified: true };
  api.get.mockImplementation((url) => {
    if (url === '/connections')
      return Promise.resolve({
        data: [
          {
            id: 'c1',
            otherUserId: 'u1',
            otherUserName: 'Priya',
            otherUserRole: 'HELPER',
            type: 'HELP',
            status: 'ACTIVE',
            currentTrustLevel: 'MESSAGING',
            confirmedByMe: true,
            confirmedByOther: true,
            sharedWithFamily: false,
          },
        ],
      });
    if (url.startsWith('/messages/c1')) return Promise.resolve({ data: { content: [] } });
    return Promise.resolve({ data: {} });
  });

  const r = await wrap(<ChatThread />);
  await waitFor(() => expect(r.getByLabelText('Message')).toBeTruthy());

  // The composer must sit INSIDE the avoider, not merely beside one.
  const avoiders = r.getAllByTestId('keyboard-avoider');
  const holdsComposer = avoiders.some(
    (kav) => within(kav).queryByLabelText('Message') !== null
  );
  expect(holdsComposer).toBe(true);
});

// ---------- source scan: no input-bearing screen ships uncovered ----------

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else if (/\.(jsx?|tsx?)$/.test(entry.name)) files.push(full);
  }
  return files;
}

// Comments stripped so prose about keyboards can't satisfy (or trip) the scan.
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

const rendersAnyOf = (code, names) =>
  names.some((n) => new RegExp(`<${n}\\b`).test(code));

/**
 * Component names that put a text field on screen, found transitively:
 * seeded with the primitives, then any src/components file that renders one
 * of them (and does not wrap itself in KeyboardAvoider) joins the set under
 * its own filename, until nothing new turns up.
 */
function inputBearingNames() {
  const names = new Set(['TextInput', 'Input', 'PasswordInput', 'ChipsField']);
  const files = walk(path.join(ROOT, 'src', 'components'));
  let grew = true;
  while (grew) {
    grew = false;
    for (const file of files) {
      const name = path.basename(file).replace(/\.(jsx?|tsx?)$/, '');
      if (names.has(name)) continue;
      const code = readCode(file);
      if (code.includes('KeyboardAvoider')) continue; // wraps itself
      if (rendersAnyOf(code, [...names])) {
        names.add(name);
        grew = true;
      }
    }
  }
  return [...names];
}

function hasKeyboardHandling(code) {
  if (code.includes('<KeyboardAvoider')) return true;
  const re = /<Screen\b/g;
  let m;
  while ((m = re.exec(code))) {
    if (/\bkeyboard\b/.test(elementAround(code, m.index))) return true;
  }
  return false;
}

test('every input-bearing screen keeps its fields above the keyboard', () => {
  const bearing = inputBearingNames();
  const offenders = [];
  for (const file of walk(path.join(ROOT, 'app'))) {
    const code = readCode(file);
    if (!rendersAnyOf(code, bearing)) continue;
    if (!hasKeyboardHandling(code)) offenders.push(path.relative(ROOT, file));
  }
  expect(offenders).toEqual([]);
});
