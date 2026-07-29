// Grouped inbox (FAM-510), locked by tests: chats split by who they're with
// (Family / Elders / Helpers), shared friendships surface their group updates
// thread under Groups, a helper sees whose family a person is, and a single
// group renders with no tabs at all. Mirrors web MessagesInbox.jsx.
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render } from '@testing-library/react-native';
import React from 'react';
import MessagesInbox from '../app/(tabs)/messages';
import { ToastProvider } from '../src/context/ToastContext';
import { ThemeProvider } from '../src/theme/ThemeContext';

const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
  useFocusEffect: () => {},
}));

jest.mock('../src/api/client', () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn(), delete: jest.fn() },
  setTokenGetter: jest.fn(),
  setOnSessionExpired: jest.fn(),
  friendlyWriteError: (_e, fallback) => fallback,
}));

jest.mock('../src/context/AuthContext', () => ({
  useAuth: () => ({ user: { role: 'HELPER', userId: 'me', emailVerified: true }, booted: true }),
}));

// Block list reads AsyncStorage in the real module — pin it empty.
jest.mock('../src/lib/blockList', () => ({
  getBlocked: jest.fn(async () => []),
  filterBlocked: (list) => list,
}));

import api from '../src/api/client';

const conn = (over = {}) => ({
  id: 'c1',
  otherUserId: 'u1',
  otherUserName: 'Margaret',
  otherUserRole: 'ELDER',
  otherUserContext: null,
  type: 'HELP',
  status: 'ACTIVE',
  sharedWithFamily: false,
  ...over,
});

function stubGet(connections, journey = { elders: [] }) {
  api.get.mockImplementation((url) => {
    if (url === '/connections') return Promise.resolve({ data: connections });
    if (url === '/family/journey') return Promise.resolve({ data: journey });
    return Promise.resolve({ data: {} });
  });
}

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
        <ToastProvider>{ui}</ToastProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

afterEach(() => jest.clearAllMocks());

test('a single group renders its rows with no tabs at all', async () => {
  stubGet([conn(), conn({ id: 'c2', otherUserId: 'u2', otherUserName: 'George' })]);
  const r = await wrap(<MessagesInbox />);

  await r.findByText('Margaret');
  r.getByText('George');
  expect(r.queryByRole('tab')).toBeNull();
});

test('family chats split from elder chats; only present groups get tabs', async () => {
  stubGet([
    conn(), // an elder chat
    conn({
      id: 'c3',
      otherUserId: 'u3',
      otherUserName: 'Sarah',
      otherUserRole: 'FAMILY',
      otherUserContext: "Margaret's family",
    }),
  ]);
  const r = await wrap(<MessagesInbox />);

  // Two groups → two tabs; the first (Family or Elders order fixed) shows.
  await r.findByRole('tab', { name: 'Family' });
  r.getByRole('tab', { name: 'Elders' });
  expect(r.queryByRole('tab', { name: 'Helpers' })).toBeNull();
  expect(r.queryByRole('tab', { name: 'Groups' })).toBeNull();

  // The Family tab shows Sarah with whose family she is (web parity).
  await fireEvent.press(r.getByRole('tab', { name: 'Family' }));
  r.getByText('Sarah');
  r.getByText("Margaret's family");
  expect(r.queryByText('Margaret')).toBeNull(); // the elder chat lives on its own tab
});

test('a shared friendship surfaces its group updates thread under Groups', async () => {
  stubGet(
    [conn({ sharedWithFamily: true })],
    {
      elders: [
        {
          elderId: 'e9',
          elderName: 'Rosa',
          sharedHelpers: [{ connectionId: 'c9', helperName: 'Priya' }],
        },
      ],
    }
  );
  const r = await wrap(<MessagesInbox />);

  await fireEvent.press(await r.findByRole('tab', { name: 'Groups' }));
  r.getByText('Rosa & Priya'); // a parent's thread, readable as family
  r.getByText('You & Margaret'); // my own shared friendship's thread

  await fireEvent.press(r.getByLabelText('Updates thread: Rosa & Priya'));
  expect(mockPush).toHaveBeenCalledWith('/chat/c9?channel=family');
});

test('the journey thread wins the dedupe when it is my own connection too', async () => {
  // BOTH seat: my shared connection c1 is ALSO in my journey as a parent's
  // shared helper — one row, the journey's naming.
  stubGet(
    [conn({ sharedWithFamily: true })],
    {
      elders: [
        {
          elderId: 'e1',
          elderName: 'Margaret',
          sharedHelpers: [{ connectionId: 'c1', helperName: 'Harsha' }],
        },
      ],
    }
  );
  const r = await wrap(<MessagesInbox />);

  await fireEvent.press(await r.findByRole('tab', { name: 'Groups' }));
  r.getByText('Margaret & Harsha');
  expect(r.queryByText('You & Margaret')).toBeNull();
});
