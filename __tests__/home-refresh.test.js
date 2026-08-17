// Deep audit 2026-08-11, the "home-refresh" group (DEEP-10 and what sat next
// to it). Home's pull-to-refresh does not invalidate everything — it reloads a
// hand-written list of keys, on purpose, so a pull on Home cannot stampede
// every other mounted screen. The cost of that choice is that a card added to
// Home later is stale for the whole session unless somebody remembers the
// list, and three of them were missed:
//
//   passon-mine / passon-setup  My boxes on the elder's Home (MyBoxesCard)
//   family-behind               who stands behind each elder (MyEldersPanel)
//   passon-asked-of-me          the keyholder ask on the family Home
//
// These tests read the keys the handler really passes to invalidateQueries, so
// a card added to Home without a key added here fails instead of shipping.
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render } from '@testing-library/react-native';
import { ThemeProvider } from '../src/theme/ThemeContext';
import { ToastProvider } from '../src/context/ToastContext';
import { ConfirmProvider } from '../src/context/ConfirmContext';

let mockUser = { role: 'ELDER', userId: 'me', emailVerified: true };

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: () => true }),
  useFocusEffect: (effect) => require('react').useEffect(effect, [effect]),
  Redirect: () => null,
}));

jest.mock('../src/api/client', () => ({
  __esModule: true,
  default: {
    post: jest.fn(async () => ({ data: {} })),
    get: jest.fn(async () => ({ data: {} })),
    delete: jest.fn(async () => ({ data: {} })),
  },
  setTokenGetter: jest.fn(),
  setOnSessionExpired: jest.fn(),
  friendlyWriteError: (_err, fallback) => fallback,
}));

// Role comes from the signed JWT in the real provider; the stub picks the seat
// each test is about, since Home renders a different set of cards per role.
jest.mock('../src/context/AuthContext', () => ({
  __esModule: true,
  AuthProvider: ({ children }) => children,
  useAuth: () => ({ user: mockUser, booted: true }),
}));

// The once-a-day check-in walk is not what these tests are about, and it would
// navigate away mid-refresh.
jest.mock('../src/lib/checkinGate', () => ({
  getPromptedDay: jest.fn(async () => null),
  markPromptedToday: jest.fn(async () => {}),
  shouldPromptCheckin: () => false,
}));

// The drawer exercises safe-area insets and its own nav — not under test here.
jest.mock('../src/components/home/MenuSheet', () => () => null);

// Reduce motion pins FamilyShareToggle's knob to setValue (the app convention)
// so the helper cards render without pending Animated timers.
jest.mock('../src/lib/useReducedMotion', () => ({ useReducedMotion: () => true }));

import api from '../src/api/client';
import HomeScreen from '../app/(tabs)/home';

const stubGet = () =>
  api.get.mockImplementation(async (url) => {
    if (url === '/connections') return { data: [] };
    if (url === '/trust/my-score') return { data: { totalScore: 3, customers: [] } };
    if (url === '/streaks/me') return { data: { currentStreak: 0 } };
    if (url === '/profile/me') return { data: { name: 'Margaret Reyes' } };
    if (url === '/passon/mine') return { data: { stories: [], letters: [] } };
    if (url === '/passon/setup') return { data: { armed: false } };
    if (url === '/family/links')
      return { data: { activeLinks: [], incomingRequests: [], outgoingRequests: [] } };
    if (url === '/family/journey') return { data: { elders: [] } };
    if (url === '/family/alerts') return { data: { alerts: [] } };
    if (url === '/family/behind-me') return { data: { entries: [] } };
    if (url === '/passon/keyholders/asked-of-me') return { data: [] };
    return { data: {} };
  });

const newClient = () =>
  new QueryClient({
    // gcTime: Infinity — the default 5-min gc timer is scheduled at unmount and
    // keeps the Jest worker alive until force-exit.
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity },
      mutations: { retry: false, gcTime: Infinity },
    },
  });

const wrap = (ui, client) =>
  render(
    <ThemeProvider>
      <QueryClientProvider client={client}>
        <ToastProvider>
          <ConfirmProvider>{ui}</ConfirmProvider>
        </ToastProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );

// Home rolls its own scroller, so there is no `screen-scroll` testID to read.
// RNTL 14 dropped the UNSAFE_ queries; the refresh control rides the host
// ScrollView as a prop (the pull-to-refresh.test.js precedent), so the handler
// is read off that prop rather than off a platform-specific rendered box.
const hostNodes = (node, out = []) => {
  if (!node || typeof node !== 'object') return out;
  out.push(node);
  for (const child of node.children ?? []) hostNodes(child, out);
  return out;
};

const pullToRefresh = async (r) => {
  const scroller = hostNodes(r.root).find((node) => node.props?.refreshControl != null);
  expect(scroller).toBeTruthy();
  await act(async () => {
    await scroller.props.refreshControl.props.onRefresh();
  });
};

/** Every queryKey the handler asked React Query to invalidate, flattened. */
const invalidatedKeys = async (role) => {
  mockUser = { role, userId: 'me', emailVerified: true };
  stubGet();
  const client = newClient();
  const spy = jest.spyOn(client, 'invalidateQueries');
  const r = await wrap(<HomeScreen />, client);
  await act(async () => {}); // let the first fetches settle before the pull
  spy.mockClear();
  await pullToRefresh(r);
  return spy.mock.calls.map(([arg]) => (arg?.queryKey ?? []).join('/'));
};

afterEach(() => jest.clearAllMocks());

test('elder pull-to-refresh reloads the My boxes counts', async () => {
  const keys = await invalidatedKeys('ELDER');
  // MyBoxesCard left Home (owner call 2026-08-17), so its 'passon-mine'
  // counts key left the refresh list with it; a key nothing on the page
  // reads is a wasted request per pull. 'passon-setup' stays: the family
  // panel's KeyholderAsk still reads it.
  expect(keys).not.toContain('passon-mine');
  expect(keys).toContain('passon-setup');
});

test('helper pull-to-refresh reloads who stands behind each elder', async () => {
  const keys = await invalidatedKeys('HELPER');
  expect(keys).toContain('family-behind');
});

test('family pull-to-refresh reloads the keyholder ask', async () => {
  const keys = await invalidatedKeys('FAMILY');
  expect(keys).toContain('passon-asked-of-me');
});

test('pull-to-refresh still reloads the greeting, the score and the ladders', async () => {
  const keys = await invalidatedKeys('ELDER');
  expect(keys).toContain('profile-me');
  expect(keys).toContain('trust-my-score');
  expect(keys).toContain('connections');
  expect(keys).toContain('streak-me');
});
