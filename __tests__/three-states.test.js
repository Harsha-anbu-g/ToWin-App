// UX-706: every fetch has three honest states: a skeleton while it loads,
// an empty state with a next step, and LoadError with retry when it fails.
//
// The failure mode this file exists to stop is the masquerade: a failed fetch
// dressed up as "nothing here yet" (AUD-102), an eternal skeleton, or a blank
// screen. Same two-layer convention as pull-to-refresh.test.js: render pins on
// the screens this story fixed, then source scans so a NEW screen cannot ship
// with a bare spinner or a query that has no error surface.
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, waitFor } from '@testing-library/react-native';
import fs from 'fs';
import path from 'path';
import { ThemeProvider } from '../src/theme/ThemeContext';
import { ToastProvider } from '../src/context/ToastContext';
import { ConfirmProvider } from '../src/context/ConfirmContext';
import api from '../src/api/client';
import { SEALED_ITEMS, SETUP, SHEET, STORY_BOX } from '../src/lib/passOnLocks';
import ChatThread from '../app/chat/[connectionId]';
import PassOn from '../app/pass-on/index';
import PassOnSheet from '../app/pass-on/sheet';
import ProfileEdit from '../app/profile-edit';
import FamilyParent from '../app/family/parent/[elderId]';

let mockParams = {};
let mockRole = 'ELDER';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: () => false, setParams: jest.fn() }),
  useFocusEffect: () => {},
  useLocalSearchParams: () => mockParams,
  Redirect: () => null,
}));

jest.mock('../src/api/client', () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn(async () => ({ data: {} })), put: jest.fn(), delete: jest.fn() },
  setTokenGetter: jest.fn(),
  setOnSessionExpired: jest.fn(),
  friendlyWriteError: (_e, fallback) => fallback,
}));

jest.mock('../src/context/AuthContext', () => ({
  __esModule: true,
  AuthProvider: ({ children }) => children,
  useAuth: () => ({ user: { role: mockRole, userId: 'me', emailVerified: true }, booted: true }),
}));

jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: jest.fn(async () => ({ granted: true })),
  launchImageLibraryAsync: jest.fn(async () => ({ canceled: true })),
  MediaTypeOptions: { Images: 'Images' },
}));

const wrap = (ui) =>
  render(
    <ThemeProvider>
      <QueryClientProvider
        client={new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } })}
      >
        <ToastProvider>
          <ConfirmProvider>{ui}</ConfirmProvider>
        </ToastProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );

// Route-shaped api.get: exact-prefix overrides, sensible defaults elsewhere.
// FAIL rejects, HANG never settles: the two states this story is about.
const FAIL = Symbol('fail');
const HANG = Symbol('hang');
const routeGet = (over = {}) => (url) => {
  for (const [prefix, value] of Object.entries(over)) {
    if (url.startsWith(prefix)) {
      if (value === FAIL) return Promise.reject(new Error('network down'));
      if (value === HANG) return new Promise(() => {});
      return Promise.resolve({ data: value });
    }
  }
  return Promise.resolve({ data: {} });
};

beforeEach(() => {
  mockParams = {};
  mockRole = 'ELDER';
  api.get.mockImplementation(routeGet());
});
afterEach(() => jest.clearAllMocks());

// ---------- chat: the highest-traffic screen must never open blank ----------

test('chat shows bubble skeletons while messages load, never a blank thread', async () => {
  mockParams = { connectionId: 'c1' };
  api.get.mockImplementation(
    routeGet({ '/connections': [], '/messages': HANG, '/chat': HANG })
  );
  const r = await wrap(<ChatThread />);
  await waitFor(() => expect(r.getByTestId('chat-skeleton')).toBeTruthy());
  expect(r.queryByText(/Say hello/)).toBeNull();
});

// ---------- pass-on hub: a failed load must not read as an empty box ----------

test('pass-on stories: failed load shows LoadError with retry, not the empty box', async () => {
  api.get.mockImplementation(routeGet({ '/passon/mine': FAIL, '/family/links': { activeLinks: [] }, '/connections': [] }));
  const r = await wrap(<PassOn />);
  await waitFor(() => expect(r.getByText('Try again')).toBeTruthy());
  expect(r.getByText(/your stories/)).toBeTruthy();
  expect(r.queryByText(STORY_BOX.empty)).toBeNull();
});

test('pass-on sealed tab: failed setup load shows LoadError, not the set-up teaching', async () => {
  mockParams = { tab: 'sealed' };
  api.get.mockImplementation(routeGet({ '/passon/setup': FAIL, '/family/links': { activeLinks: [] }, '/connections': [] }));
  const r = await wrap(<PassOn />);
  await waitFor(() => expect(r.getByText('Try again')).toBeTruthy());
  expect(r.getByText(/your Sealed box/)).toBeTruthy();
  expect(r.queryByText(SETUP.start)).toBeNull();
});

test('pass-on sealed tab: an armed box whose items load fails shows LoadError, never a false empty (D2-01)', async () => {
  mockParams = { tab: 'sealed' };
  api.get.mockImplementation(
    routeGet({
      '/passon/setup': { armed: true, releaseContactEmail: 'help@towinly.com' },
      '/passon/sealed': FAIL,
      '/family/links': { activeLinks: [] },
      '/connections': [],
    })
  );
  const r = await wrap(<PassOn />);
  await waitFor(() => expect(r.getByText(/your sealed items/)).toBeTruthy());
  // The one page she opens to check her things are still there must never say
  // the box is empty when the fetch simply failed.
  expect(r.queryByText(SEALED_ITEMS.nothingInside)).toBeNull();
});

test('pass-on sealed tab: a failed refetch keeps a good list on screen, never a false error (D2-01)', async () => {
  mockParams = { tab: 'sealed' };
  api.get.mockImplementation(
    routeGet({
      '/passon/setup': { armed: true, releaseContactEmail: 'help@towinly.com' },
      '/passon/sealed': FAIL,
      '/family/links': { activeLinks: [] },
      '/connections': [],
    })
  );
  // A previous success left a real item in the cache; the mount refetch fails.
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
  qc.setQueryData(['passon-sealed'], [{ id: 's1', label: 'Bank details', kindHint: 'MONEY' }]);
  const r = await render(
    <ThemeProvider>
      <QueryClientProvider client={qc}>
        <ToastProvider>
          <ConfirmProvider>
            <PassOn />
          </ConfirmProvider>
        </ToastProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
  await waitFor(() => expect(r.getByText('Bank details')).toBeTruthy());
  // The stale-but-good list stays; a transient refetch failure must not hide it.
  expect(r.queryByText(/your sealed items/)).toBeNull();
});

// ---------- one-page copy sheet: the error card must carry its retry ----------

test('pass-on sheet: failed load shows LoadError with retry', async () => {
  api.get.mockImplementation(routeGet({ '/passon': FAIL, '/profile': FAIL }));
  const r = await wrap(<PassOnSheet />);
  await waitFor(() => expect(r.getByText('Try again')).toBeTruthy());
  expect(r.queryByText(SHEET.failed)).toBeNull();
});

// ---------- profile-edit: a failed prefill must never hand back a blank form ----------
// Saving a form that prefill never filled would overwrite the real profile
// with empty strings, so this guard is data-loss prevention, not decoration.

test('profile-edit holds a skeleton (no form) while the profile loads', async () => {
  api.get.mockImplementation(routeGet({ '/profile/me': HANG }));
  const r = await wrap(<ProfileEdit />);
  await waitFor(() => expect(r.getByTestId('profile-edit-loading')).toBeTruthy());
  expect(r.queryByText('Save Changes')).toBeNull();
});

test('profile-edit shows LoadError with retry (no form) when the profile fails to load', async () => {
  api.get.mockImplementation(routeGet({ '/profile/me': FAIL }));
  const r = await wrap(<ProfileEdit />);
  await waitFor(() => expect(r.getByText('Try again')).toBeTruthy());
  expect(r.getByText(/your profile/)).toBeTruthy();
  expect(r.queryByText('Save Changes')).toBeNull();
});

// ---------- family parent page: a failed links fetch is not "link removed" ----------

test('family parent: failed links load shows LoadError, never the unlinked state or an eternal skeleton', async () => {
  mockRole = 'FAMILY';
  mockParams = { elderId: 'e1' };
  api.get.mockImplementation(
    routeGet({ '/family/links': FAIL, '/family/journey': { elders: [] }, '/family/standings': { standings: [] } })
  );
  const r = await wrap(<FamilyParent />);
  await waitFor(() => expect(r.getByText('Try again')).toBeTruthy());
  expect(r.queryByText('This parent is no longer linked to you')).toBeNull();
  expect(r.queryByLabelText('Loading')).toBeNull();
});

// ---------- source scans: the next screen cannot ship dishonest states ----------

const APP_ROOT = path.join(__dirname, '..');
const listJsx = (dir) => {
  const out = [];
  for (const entry of fs.readdirSync(path.join(APP_ROOT, dir), { withFileTypes: true })) {
    const rel = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listJsx(rel));
    else if (entry.name.endsWith('.jsx')) out.push(rel);
  }
  return out;
};
const src = (rel) => fs.readFileSync(path.join(APP_ROOT, rel), 'utf8');

// A lone spinner is only honest where no content layout exists to sketch.
// Everywhere a layout is known, loading draws a Skeleton in its shape.
const SPINNER_LEDGER = {
  'src/components/ui/Button.jsx': 'in-control spinner: the pressed button itself is the layout',
  'app/(auth)/oauth-callback.jsx': 'token-exchange transition: no content layout exists yet',
  'app/(auth)/verify-email.jsx': 'verification transition: no content layout exists yet',
};

test('no bare ActivityIndicator outside the reasoned ledger', () => {
  const offenders = [...listJsx('app'), ...listJsx('src')].filter(
    (rel) => src(rel).includes('ActivityIndicator') && !SPINNER_LEDGER[rel]
  );
  expect(offenders).toEqual([]);
});

// Every screen or component that fetches must surface failure through
// LoadError, or carry a written reason here for why it degrades instead.
const NO_LOADERROR_LEDGER = {
  'app/(tabs)/_layout.jsx': 'tab chrome: badge counts fold to zero, never an error surface',
  'app/(tabs)/home.jsx': 'composition shell: every card it mounts owns its three states',
  'app/checkin.jsx': 'CheckinCard owns the states; the streak query only words the exit link',
  'src/components/home/GreetingHeader.jsx': 'greeting falls back to a plain hello, never blocks',
  'src/components/passon/MyBoxesCard.jsx': 'doorway card (web parity): renders only once real counts arrive',
  'src/components/passon/KeyholderAsk.jsx': 'doorway card: renders only when an ask is waiting',
};

test('every fetching screen surfaces failure via LoadError or is in the reasoned ledger', () => {
  const fetches = (text) => /\buseQuery\(|\buseInfiniteQuery\(/.test(text);
  const offenders = [...listJsx('app'), ...listJsx(path.join('src', 'components'))].filter((rel) => {
    const text = src(rel);
    return fetches(text) && !text.includes('LoadError') && !NO_LOADERROR_LEDGER[rel];
  });
  expect(offenders).toEqual([]);
});
