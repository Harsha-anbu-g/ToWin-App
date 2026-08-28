// HARD-100, defect 3: the Updates focus effect ran once per RENDER, not once
// per focus, and past 300 tokens that became a spin.
//
// The loop was: the focus effect marked every row seen, markSeen notified,
// the badge hook re-rendered its subscribers, an unmemoized feed handed the
// screen a new `items` array, the focus effect's callback changed identity,
// and it ran again. Two fixes closed it (a memoized feed, an identity-aware
// cap in seen-ids.test.js). Since 2026-08-28 the screen marks NOTHING on
// focus — a row is seen only when tapped (owner call) — so the effect that
// fed the loop is gone. These probes pin the shape that keeps it gone: no
// write on arrival, no focus effect to re-run, and a seen-store notification
// that re-renders the screen without touching the feed.
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, waitFor } from '@testing-library/react-native';
import { ThemeProvider } from '../src/theme/ThemeContext';
import { ToastProvider } from '../src/context/ToastContext';
import { ConfirmProvider } from '../src/context/ConfirmContext';
import api from '../src/api/client';
import { markSeen, _resetSeenForTests } from '../src/lib/seenIds';
import { seenKey } from '../src/lib/storageKeys';
import UpdatesScreen from '../app/updates';

jest.mock('../src/lib/storage', () => {
  const backing = new Map();
  return {
    __esModule: true,
    getItemAsync: jest.fn(async (k) => backing.get(k) ?? null),
    setItemAsync: jest.fn(async (k, v) => {
      backing.set(k, v);
    }),
    deleteItemAsync: jest.fn(async (k) => {
      backing.delete(k);
    }),
    _backing: backing,
  };
});

// Counts how many times the focus effect body actually ran. The identity
// semantics here are the real ones: react-navigation re-runs a focus effect
// when its callback identity changes, which is exactly what useEffect on
// [effect] does.
const mockFocusRuns = { count: 0 };
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: () => true }),
  useFocusEffect: (effect) => {
    const { useEffect } = require('react');
    useEffect(() => {
      mockFocusRuns.count += 1;
      return effect();
    }, [effect]);
  },
  Redirect: () => null,
}));

jest.mock('../src/api/client', () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn(async () => ({ data: {} })), delete: jest.fn() },
  friendlyWriteError: () => 'Something went wrong.',
  setTokenGetter: jest.fn(),
  setOnSessionExpired: jest.fn(),
}));

jest.mock('../src/context/AuthContext', () => ({
  __esModule: true,
  AuthProvider: ({ children }) => children,
  useAuth: () => ({
    user: { role: 'ELDER', userId: 'u1', emailVerified: true },
    booted: true,
    logout: jest.fn(),
  }),
}));

// requireMock, not a namespace import: the mock's `_backing` handle does not
// exist on the real module, and a static `import * as Store` makes eslint's
// import/namespace rule fail on it.
const Store = jest.requireMock('../src/lib/storage');

// Two friend requests waiting: enough rows for the feed to have tokens to mark.
const CONNECTIONS = [
  { id: 'c1', status: 'PENDING', initiatedByMe: false, otherUserName: 'Priya', createdAt: '2026-08-20T10:00:00' },
  { id: 'c2', status: 'PENDING', initiatedByMe: false, otherUserName: 'Ethan', createdAt: '2026-08-20T09:00:00' },
];

const tree = (ui) => (
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

beforeEach(() => {
  mockFocusRuns.count = 0;
  _resetSeenForTests();
  Store._backing.clear();
  jest.clearAllMocks();
  api.get.mockImplementation(async (url) => {
    if (url === '/connections') return { data: CONNECTIONS };
    return { data: [] };
  });
});

test('a seen-state notification re-renders the screen without re-running any focus effect', async () => {
  const r = await render(tree(<UpdatesScreen />));

  // Wait for the rows, which means the queries settled and the seen store
  // has hydrated for this screen.
  await waitFor(() => expect(r.getByText('Priya wants to be your friend')).toBeTruthy());
  await waitFor(() => expect(Store.getItemAsync).toHaveBeenCalled());
  const settled = mockFocusRuns.count;

  // The screen subscribes to the seen store (useUnseenTokens, plus the badge
  // hook inside the feed), so ANY markSeen anywhere notifies it and
  // re-renders it. This is the exact link that used to close the loop:
  // notify, re-render, new `items` identity, the focus effect again, markSeen
  // again. A different category is used on purpose, so no feed data changes.
  // Only the render happens.
  await act(async () => {
    await markSeen(seenKey('u1', 'applicants'), ['n9:h9']);
  });

  expect(mockFocusRuns.count).toBe(settled);
  // The re-render really happened: the rows are still painted from it.
  expect(r.getByText('Priya wants to be your friend')).toBeTruthy();
});

test('arriving on the screen writes nothing to the seen store', async () => {
  // The write on focus was the first link of the loop, and since the owner
  // call of 2026-08-28 it would also be wrong: nothing is read until tapped.
  const r = await render(tree(<UpdatesScreen />));
  await waitFor(() => expect(r.getByText('Priya wants to be your friend')).toBeTruthy());
  await new Promise((resolve) => setTimeout(resolve, 50));

  expect(Store.setItemAsync).not.toHaveBeenCalled();
  // And no focus effect is left on this screen to run at all.
  expect(mockFocusRuns.count).toBe(0);
});

test('a re-render with unchanged data does not re-run the focus effect', async () => {
  const r = await render(tree(<UpdatesScreen />));
  await waitFor(() => expect(r.getByText('Priya wants to be your friend')).toBeTruthy());
  const afterFirstFocus = mockFocusRuns.count;

  // Same screen, same data: a plain re-render, the thing that used to multiply
  // the effect.
  await r.rerender(tree(<UpdatesScreen />));

  expect(mockFocusRuns.count).toBe(afterFirstFocus);
});
