// Grouped inbox (FAM-510 + web f6e5e84), locked by tests: chats split by who
// they're with, and every heading the account can ever fill stays on screen
// even while empty — one-to-one chats first, then Groups, then Family. An
// empty tab explains itself instead of disappearing, and the inbox lands on
// the first tab that has a conversation. Only a bucket the role can never
// fill (e.g. a helper chatting with another helper) is left out. Mirrors web
// MessagesInbox.jsx.
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render } from '@testing-library/react-native';
import React from 'react';
import MessagesInbox from '../app/(tabs)/messages';
import { ToastProvider } from '../src/context/ToastContext';
import { ThemeProvider } from '../src/theme/ThemeContext';

const mockPush = jest.fn();
let mockRole = 'HELPER';

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
  useAuth: () => ({ user: { role: mockRole, userId: 'me', emailVerified: true }, booted: true }),
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

beforeEach(() => {
  mockRole = 'HELPER';
});
afterEach(() => jest.clearAllMocks());

test('the tabs stay on screen even when only one bucket has chats', async () => {
  stubGet([conn(), conn({ id: 'c2', otherUserId: 'u2', otherUserName: 'George' })]);
  const r = await wrap(<MessagesInbox />);

  // A helper's fixed set, left to right: people first, then Groups, then Family.
  await r.findByRole('tab', { name: 'Elders' });
  r.getByRole('tab', { name: 'Groups' });
  r.getByRole('tab', { name: 'Family' });
  expect(r.queryByRole('tab', { name: 'Helpers' })).toBeNull();
  r.getByText('Margaret');
  r.getByText('George');
});

test('an empty tab explains itself instead of disappearing', async () => {
  stubGet([conn()]);
  const r = await wrap(<MessagesInbox />);

  await fireEvent.press(await r.findByRole('tab', { name: 'Groups' }));
  r.getByText(
    'No group chats yet. When a friendship is shared with family, its updates will show here.'
  );

  await fireEvent.press(r.getByRole('tab', { name: 'Family' }));
  r.getByText(
    'No family chats yet. When a family member joins you here, your chat with them will show up.'
  );
});

test('the inbox lands on the first tab that has a conversation, not an empty one', async () => {
  // Only a family chat: Elders (first tab) is empty, so Family opens active.
  stubGet([
    conn({
      id: 'c3',
      otherUserId: 'u3',
      otherUserName: 'Sarah',
      otherUserRole: 'FAMILY',
      otherUserContext: "Margaret's family",
    }),
  ]);
  const r = await wrap(<MessagesInbox />);

  await r.findByText('Sarah');
  expect(r.queryByText(/No chats with elders yet/)).toBeNull();
});

test('an elder gets Helpers, Groups and Family — never an Elders tab', async () => {
  mockRole = 'ELDER';
  stubGet([conn({ otherUserName: 'Priya', otherUserRole: 'HELPER' })]);
  const r = await wrap(<MessagesInbox />);

  await r.findByRole('tab', { name: 'Helpers' });
  r.getByRole('tab', { name: 'Groups' });
  r.getByRole('tab', { name: 'Family' });
  expect(r.queryByRole('tab', { name: 'Elders' })).toBeNull();
  r.getByText('Priya');
});

test('no conversations at all keeps the full-page empty state, with no tabs', async () => {
  stubGet([]);
  const r = await wrap(<MessagesInbox />);

  await r.findByText('No conversations yet');
  expect(r.queryByRole('tab')).toBeNull();
});

test('family chats split from elder chats across the fixed tabs', async () => {
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

  // Lands on Elders (first with content); the Family tab shows Sarah with
  // whose family she is (web parity).
  await r.findByText('Margaret');
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

  await fireEvent.press(r.getByLabelText('Group: Rosa & Priya'));
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

// Owner call 2026-08-26: the Helpers tab read 7 when four helpers had written
// ("it should be 4"). A tab badge counts PEOPLE waiting, the same unit the
// Messages badge in the bar already uses, so the tabs add up to it.
test('a tab badge counts the people waiting, not the messages they sent', async () => {
  mockRole = 'ELDER';
  stubGet([
    conn({ id: 'h1', otherUserId: 'u1', otherUserName: 'Priya', otherUserRole: 'HELPER', unreadCount: 2 }),
    conn({ id: 'h2', otherUserId: 'u2', otherUserName: 'Tom', otherUserRole: 'HELPER', unreadCount: 1 }),
    conn({ id: 'h3', otherUserId: 'u3', otherUserName: 'Claire', otherUserRole: 'HELPER', unreadCount: 0 }),
    conn({ id: 'f1', otherUserId: 'u4', otherUserName: 'Sarah', otherUserRole: 'FAMILY', unreadCount: 4 }),
  ]);
  const r = await wrap(<MessagesInbox />);

  // Two helpers wrote, three messages between them — the tab says two.
  await r.findByRole('tab', { name: 'Helpers, 2 unread' });
  expect(r.queryByRole('tab', { name: 'Helpers, 3 unread' })).toBeNull();
  // One family member wrote, four messages — the tab says one.
  r.getByRole('tab', { name: 'Family, 1 unread' });
  // Nobody is waiting in Groups, so it carries no count at all.
  r.getByRole('tab', { name: 'Groups' });
});

test('a single row still shows how many messages that one person sent', async () => {
  mockRole = 'ELDER';
  stubGet([
    conn({ id: 'h1', otherUserId: 'u1', otherUserName: 'Priya', otherUserRole: 'HELPER', unreadCount: 2 }),
  ]);
  const r = await wrap(<MessagesInbox />);

  await r.findByText('Priya');
  r.getByText('2'); // the row's own badge, unchanged
});
