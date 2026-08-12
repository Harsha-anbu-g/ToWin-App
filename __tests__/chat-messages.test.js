// Deep audit 2026-08-11, chat + inbox group (DEEP-09, DEEP-25, DEEP-32,
// DEEP-28). Four promises locked here: reading a thread clears the inbox row
// that sent you there; a friendship whose state failed to load never opens a
// composer that cannot send; the failed-send recovery line is readable; and
// the Groups tab never reports "no group chats" because a request dropped.
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import React from 'react';
import { StyleSheet } from 'react-native';
import ChatThread from '../app/chat/[connectionId]';
import MessagesInbox from '../app/(tabs)/messages';
import { ConfirmProvider } from '../src/context/ConfirmContext';
import { ToastProvider } from '../src/context/ToastContext';
import { ThemeProvider } from '../src/theme/ThemeContext';

let mockRole = 'ELDER';

jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    back: jest.fn(),
    canGoBack: () => false,
    replace: jest.fn(),
  }),
  useFocusEffect: () => {},
  useLocalSearchParams: () => ({ connectionId: 'c1' }),
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
  otherUserName: 'Priya',
  otherUserRole: 'HELPER',
  otherUserContext: null,
  type: 'HELP',
  status: 'ACTIVE',
  currentTrustLevel: 'MESSAGING',
  confirmedByMe: false,
  confirmedByOther: false,
  sharedWithFamily: false,
  unreadCount: 0,
  ...over,
});

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

const callsTo = (url) => api.get.mock.calls.filter(([u]) => u === url).length;

beforeEach(() => {
  mockRole = 'ELDER';
});
afterEach(() => jest.clearAllMocks());

describe('DEEP-09: reading a thread clears the inbox row that sent you there', () => {
  const incoming = {
    id: 'm1',
    senderId: 'u1',
    content: 'Are we still on for Thursday?',
    createdAt: new Date().toISOString(),
  };

  test('the mark-seen write refreshes the conversations the unread count is drawn from', async () => {
    api.get.mockImplementation((url) => {
      if (url === '/connections') return Promise.resolve({ data: [conn({ unreadCount: 2 })] });
      if (url.startsWith('/messages/c1')) return Promise.resolve({ data: { content: [incoming] } });
      return Promise.resolve({ data: {} });
    });
    api.post.mockResolvedValue({ data: {} });

    const r = await wrap(<ChatThread />);
    await r.findByText('Are we still on for Thursday?');
    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/messages/c1/seen'));

    // The inbox row's bold text and count pill read conn.unreadCount out of
    // ['connections']; tab screens never remount, so without this refetch the
    // row stays bold with a stale count for the rest of the session.
    await waitFor(() => expect(callsTo('/connections')).toBe(2));

    r.unmount();
  });
});

describe('DEEP-25: a friendship whose state failed to load never opens a dead composer', () => {
  test('a failed connections fetch keeps the composer shut and offers a retry', async () => {
    api.get.mockImplementation((url) => {
      if (url === '/connections') return Promise.reject(new Error('offline'));
      if (url.startsWith('/messages/c1'))
        return Promise.resolve({
          data: { content: [{ id: 'm1', senderId: 'u1', content: 'Hello', createdAt: new Date().toISOString() }] },
        });
      return Promise.resolve({ data: {} });
    });
    api.post.mockResolvedValue({ data: {} });

    const r = await wrap(<ChatThread />);
    await r.findByText('Hello');

    // Paused or below-Messaging is unknowable now, so an open composer can
    // only produce a send that bounces off the server and can never succeed.
    await waitFor(() => expect(r.queryByLabelText('Message')).toBeNull());
    // And a footer that is simply missing explains nothing — say why, and
    // give the way back.
    expect(
      await r.findByText(
        "We couldn't load this friendship right now. Please check your connection and try again."
      )
    ).toBeTruthy();
    expect(r.getByText('Try again')).toBeTruthy();

    r.unmount();
  });

  test('once the friendship loads, the composer is back', async () => {
    api.get.mockImplementation((url) => {
      if (url === '/connections') return Promise.resolve({ data: [conn()] });
      if (url.startsWith('/messages/c1')) return Promise.resolve({ data: { content: [] } });
      return Promise.resolve({ data: {} });
    });

    const r = await wrap(<ChatThread />);
    expect(await r.findByLabelText('Message')).toBeTruthy();

    r.unmount();
  });
});

describe('DEEP-32: the failed-send recovery line is readable', () => {
  test("\"Didn't send. Tap to try again.\" clears the actionable-text floor", async () => {
    api.get.mockImplementation((url) => {
      if (url === '/connections') return Promise.resolve({ data: [conn()] });
      if (url.startsWith('/messages/c1')) return Promise.resolve({ data: { content: [] } });
      return Promise.resolve({ data: {} });
    });
    api.post.mockRejectedValue({ response: { status: 500 } });

    const r = await wrap(<ChatThread />);
    await fireEvent.changeText(await r.findByLabelText('Message'), 'hello there');
    await fireEvent.press(r.getByLabelText('Send message'));

    const caption = await r.findByText("Didn't send. Tap to try again.");
    // type.meta (14) is the floor for secondary text that asks for an action;
    // this line is the ONLY instruction for rescuing an unsent message.
    expect(StyleSheet.flatten(caption.props.style).fontSize).toBeGreaterThanOrEqual(14);

    r.unmount();
  });
});

describe('DEEP-28: the Groups tab never reports emptiness a dropped request caused', () => {
  const stubInbox = (connections, journey) => {
    api.get.mockImplementation((url) => {
      if (url === '/connections') return Promise.resolve({ data: connections });
      if (url === '/family/journey') return journey();
      return Promise.resolve({ data: {} });
    });
  };

  test('a failed journey fetch shows the retry row in Groups, not "No group chats yet"', async () => {
    mockRole = 'HELPER';
    stubInbox([conn({ otherUserRole: 'ELDER', otherUserName: 'Margaret' })], () =>
      Promise.reject(new Error('offline'))
    );

    const r = await wrap(<MessagesInbox />);
    await fireEvent.press(await r.findByRole('tab', { name: 'Groups' }));

    expect(
      r.getByText(
        "We couldn't load your group chats right now. Please check your connection and try again."
      )
    ).toBeTruthy();
    expect(
      r.queryByText(
        'No group chats yet. When a friendship is shared with family, its updates will show here.'
      )
    ).toBeNull();
    // The person tabs keep working through it.
    await fireEvent.press(r.getByRole('tab', { name: 'Elders' }));
    r.getByText('Margaret');

    r.unmount();
  });

  test('a family member whose threads all come from the journey is not told they have no conversations', async () => {
    mockRole = 'FAMILY';
    stubInbox([], () => Promise.reject(new Error('offline')));

    const r = await wrap(<MessagesInbox />);
    await r.findByRole('tab', { name: 'Groups' });
    expect(r.queryByText('No conversations yet')).toBeNull();

    await fireEvent.press(r.getByRole('tab', { name: 'Groups' }));
    r.getByText(
      "We couldn't load your group chats right now. Please check your connection and try again."
    );

    r.unmount();
  });

  test('a journey that really is empty still says so plainly', async () => {
    mockRole = 'HELPER';
    stubInbox([conn({ otherUserRole: 'ELDER', otherUserName: 'Margaret' })], () =>
      Promise.resolve({ data: { elders: [] } })
    );

    const r = await wrap(<MessagesInbox />);
    await fireEvent.press(await r.findByRole('tab', { name: 'Groups' }));
    r.getByText(
      'No group chats yet. When a friendship is shared with family, its updates will show here.'
    );

    r.unmount();
  });
});
