// HARD-100, defect 3: the Updates focus effect ran once per RENDER, not once
// per focus, and past 300 tokens that became a spin.
//
// src/lib/updatesFeed.js built the feed with an unmemoized buildFeed, so
// `items` was a brand new array on every render. app/updates.jsx puts `items`
// in the deps of the useCallback it hands to useFocusEffect, and a focus
// effect re-runs whenever its callback identity changes. So every render
// re-ran the effect, the effect called markSeen, markSeen notified, the badge
// hook re-rendered its subscribers, and round it went.
//
// It converged only because markSeen returns early once every token is seen.
// Past MAX_TOKENS the old blind `.slice(-300)` dropped tokens out of the very
// batch just marked, so that early return was never reachable again and the
// spin had nothing to stop it. Both halves are fixed: the feed is memoized on
// its six query results here, and the cap is identity-aware, pinned in
// seen-ids.test.js.
//
// The probe below is the real sequence rather than a synthetic one: mount, let
// the effect mark the rows seen, and count how many times the effect body ran.
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

test('a seen-state notification re-renders the screen without re-running the focus effect', async () => {
  const r = await render(tree(<UpdatesScreen />));

  // Wait for the rows, which means the queries settled and the effect has had
  // its chance to mark them seen and write.
  await waitFor(() => expect(r.getByText('Priya wants to be your friend')).toBeTruthy());
  await waitFor(() => expect(Store.setItemAsync).toHaveBeenCalled());
  const settled = mockFocusRuns.count;

  // The screen subscribes to the seen store through useUnseenBadge, so ANY
  // markSeen anywhere notifies it and re-renders it. This is the exact link
  // that used to close the loop: notify, re-render, new `items` identity, the
  // focus effect again, markSeen again. A different category is used on
  // purpose, so no feed data changes. Only the render happens.
  await act(async () => {
    await markSeen(seenKey('u1', 'applicants'), ['n9:h9']);
  });

  expect(mockFocusRuns.count).toBe(settled);
  // The re-render really happened: the rows are still painted from it.
  expect(r.getByText('Priya wants to be your friend')).toBeTruthy();
});

test('the effect runs only when the feed itself changes', async () => {
  const r = await render(tree(<UpdatesScreen />));
  await waitFor(() => expect(r.getByText('Priya wants to be your friend')).toBeTruthy());
  await waitFor(() => expect(Store.setItemAsync).toHaveBeenCalled());

  // Two feeds exist across this mount and no more: the empty one before the
  // queries answer, and the two-row one after. Anything above 2 is a render
  // that re-ran the effect for no new content.
  expect(mockFocusRuns.count).toBeLessThanOrEqual(2);
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
