// Owner call 2026-08-26: "the updates, it all goes when I click it, why? It
// should stay always, no clears in notification updates." The list is
// permanent. Owner call 2026-08-28 sharpened what "new" means: a row keeps
// its wash, and the bell keeps counting it, until the person taps THAT row —
// "it should only disappear if they click that update, not just by opening
// the updates". Nothing clears on arrival any more.
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { ThemeProvider } from '../src/theme/ThemeContext';
import { ToastProvider } from '../src/context/ToastContext';
import { ConfirmProvider } from '../src/context/ConfirmContext';
import api from '../src/api/client';
import { markSeen, _resetSeenForTests, unseenCount } from '../src/lib/seenIds';
import { seenKey } from '../src/lib/storageKeys';
import { light } from '../src/theme/tokens';
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

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn(), back: jest.fn(), canGoBack: () => true }),
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

const rowStyle = (node) => StyleSheet.flatten(typeof node.props.style === 'function' ? node.props.style({ pressed: false }) : node.props.style);

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

test('opening the screen clears nothing: every row stays new and the bell keeps its count', async () => {
  const r = await render(tree(<UpdatesScreen />));

  await waitFor(() => expect(r.getByLabelText('New. Priya wants to be your friend')).toBeTruthy());
  r.getByLabelText('New. You and Ethan are now friends');

  // Give a focus-time mark-all every chance to fire, then check it never did.
  await new Promise((resolve) => setTimeout(resolve, 50));
  expect(unseenCount(KEY, TOKENS)).toBe(2);
  expect(Store.setItemAsync).not.toHaveBeenCalled();
  // Still announced as new, still washed.
  expect(rowStyle(r.getByLabelText('New. Priya wants to be your friend')).backgroundColor).toBe(light.blueWash);
});

test('tapping a row clears that row only: its wash goes, the count drops by one, the list holds', async () => {
  const r = await render(tree(<UpdatesScreen />));
  await waitFor(() => expect(r.getByLabelText('New. Priya wants to be your friend')).toBeTruthy());

  await fireEvent.press(r.getByLabelText('New. Priya wants to be your friend'));

  // That row is read: no "New" prefix, no wash, one fewer behind the bell.
  await waitFor(() => expect(r.queryByLabelText('New. Priya wants to be your friend')).toBeNull());
  expect(rowStyle(r.getByLabelText('Priya wants to be your friend')).backgroundColor).toBe('transparent');
  await waitFor(() => expect(unseenCount(KEY, TOKENS)).toBe(1));
  // The other row is untouched, and the tap still went where the row points.
  r.getByLabelText('New. You and Ethan are now friends');
  expect(mockPush).toHaveBeenCalledWith('/friends');
  // Persisted with only the tapped token, so the next visit agrees.
  await waitFor(() => expect(Store.setItemAsync).toHaveBeenCalledWith(KEY, JSON.stringify(['conn:c1:PENDING'])));
  // The list holds: the tapped row is still there to read again.
  r.getByText('Priya wants to be your friend');
  r.getByText('You and Ethan are now friends');
});

test('the wash spans the whole row: the list is edge to edge and each row carries the gutter', async () => {
  // A negative margin inside a scroll view is clipped at the scroll view's
  // edge, which is how the wash came to stop short of the phone (owner
  // report 2026-08-28: "it is like half of the tab"). The page padding is
  // zero and the row pads itself instead.
  const r = await render(tree(<UpdatesScreen />));
  await waitFor(() => expect(r.getByLabelText('New. Priya wants to be your friend')).toBeTruthy());

  const style = rowStyle(r.getByLabelText('New. Priya wants to be your friend'));
  expect(style.marginHorizontal).toBeUndefined();
  expect(style.paddingHorizontal).toBe(20);
});
