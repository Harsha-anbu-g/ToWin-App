// Owner call 2026-08-26: "the updates, it all goes when I click it, why? It
// should stay always, no clears in notification updates." The list is
// permanent; only the bell's badge clears when the screen opens (the WhatsApp
// and Instagram grammar). This retires the 2026-08-22 new-only rule that
// emptied the screen on the second visit.
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, waitFor } from '@testing-library/react-native';
import { ThemeProvider } from '../src/theme/ThemeContext';
import { ToastProvider } from '../src/context/ToastContext';
import { ConfirmProvider } from '../src/context/ConfirmContext';
import api from '../src/api/client';
import { markSeen, _resetSeenForTests, unseenCount } from '../src/lib/seenIds';
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

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: () => true }),
  useFocusEffect: (effect) => {
    const { useEffect } = require('react');
    useEffect(() => effect(), [effect]);
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

const Store = jest.requireMock('../src/lib/storage');

const CONNECTIONS = [
  { id: 'c1', status: 'PENDING', initiatedByMe: false, otherUserName: 'Priya', createdAt: '2026-08-20T10:00:00' },
  { id: 'c2', status: 'ACTIVE', otherUserName: 'Ethan', createdAt: '2026-08-20T09:00:00' },
];
const TOKENS = ['conn:c1:PENDING', 'conn:c2:ACTIVE'];
const KEY = seenKey('u1', 'updates');

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
  _resetSeenForTests();
  Store._backing.clear();
  jest.clearAllMocks();
  api.get.mockImplementation(async (url) => {
    if (url === '/connections') return { data: CONNECTIONS };
    return { data: [] };
  });
});

test('rows already seen on a past visit are still on the list', async () => {
  // Arrange: a previous visit marked everything seen.
  await act(async () => {
    await markSeen(KEY, TOKENS);
  });

  // Act
  const r = await render(tree(<UpdatesScreen />));

  // Assert: the list holds; the empty state never shows for a read feed.
  await waitFor(() => expect(r.getByText('Priya wants to be your friend')).toBeTruthy());
  r.getByText('You and Ethan are now friends');
  expect(r.queryByText(/Nothing new right now/)).toBeNull();
  // Read on a past visit, so neither row is announced as new.
  expect(r.queryByLabelText(/^New\. /)).toBeNull();
});

test('opening the screen clears the badge, not the list', async () => {
  const r = await render(tree(<UpdatesScreen />));

  await waitFor(() => expect(r.getByText('Priya wants to be your friend')).toBeTruthy());
  // Unseen when this visit started: both rows are announced as new.
  r.getByLabelText('New. Priya wants to be your friend');
  r.getByLabelText('New. You and Ethan are now friends');
  // The badge count behind the bell has gone to zero...
  await waitFor(() => expect(unseenCount(KEY, TOKENS)).toBe(0));
  // ...and the rows are still there.
  r.getByText('Priya wants to be your friend');
  r.getByText('You and Ethan are now friends');
});
