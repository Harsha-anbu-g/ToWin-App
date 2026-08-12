// The website links a family updates thread as /messages/:id?channel=family
// (ToWin/frontend/src/components/FamilyThreadLink.jsx:12 and
// pages/MessagesInbox.jsx:157). Once phones are served the app under
// towinly.com/app/, that whole URL, query string included, arrives at the
// alias in app/messages/[connectionId].jsx. Forwarding only the id drops the
// reader into the private MAIN chat, which for a FAMILY-role reader is a
// conversation the server refuses them. So the alias has to carry every param
// it was given, and the real chat screen has to open the group thread from it.
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, waitFor } from '@testing-library/react-native';
import React from 'react';
import MessagesByConnection from '../app/messages/[connectionId]';
import ChatThread from '../app/chat/[connectionId]';
import { ConfirmProvider } from '../src/context/ConfirmContext';
import { ToastProvider } from '../src/context/ToastContext';
import { ThemeProvider } from '../src/theme/ThemeContext';

let mockParams = {};
let mockRedirects = [];

jest.mock('expo-router', () => ({
  Redirect: ({ href }) => {
    mockRedirects.push(href);
    return null;
  },
  useLocalSearchParams: () => mockParams,
  useRouter: () => ({
    push: jest.fn(),
    back: jest.fn(),
    canGoBack: () => false,
    replace: jest.fn(),
  }),
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
  useAuth: () => ({ user: { role: 'FAMILY', userId: 'me', emailVerified: true }, booted: true }),
}));

import api from '../src/api/client';

const conn = {
  id: 'c1',
  otherUserId: 'u1',
  otherUserName: 'Priya',
  otherUserRole: 'HELPER',
  type: 'FAMILY',
  status: 'ACTIVE',
  currentTrustLevel: 'DISCOVERED',
  confirmedByMe: false,
  confirmedByOther: false,
  sharedWithFamily: true,
};

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

// The URL as a browser hands it over: path segment plus query string.
const arriveAt = (url) => {
  const [path, search = ''] = url.split('?');
  const params = { connectionId: path.split('/').filter(Boolean).pop() };
  new URLSearchParams(search).forEach((value, key) => {
    params[key] = value;
  });
  return params;
};

beforeEach(() => {
  mockParams = {};
  mockRedirects = [];
});
afterEach(() => jest.clearAllMocks());

test('the /messages alias carries ?channel=family through to the chat screen', async () => {
  mockParams = arriveAt('/messages/c1?channel=family');
  await wrap(<MessagesByConnection />);

  expect(mockRedirects).toEqual(['/chat/c1?channel=family']);
});

test('the alias forwards every param it is given, not just the channel', async () => {
  mockParams = arriveAt('/messages/c1?channel=family&from=email');
  await wrap(<MessagesByConnection />);

  expect(mockRedirects[0]).toContain('/chat/c1?');
  expect(mockRedirects[0]).toContain('channel=family');
  expect(mockRedirects[0]).toContain('from=email');
});

test('a plain /messages/:id link still lands on the private chat with no query', async () => {
  mockParams = arriveAt('/messages/c1');
  await wrap(<MessagesByConnection />);

  expect(mockRedirects).toEqual(['/chat/c1']);
});

test('following the redirect opens the family updates thread, not the private one', async () => {
  mockParams = arriveAt('/messages/c1?channel=family');
  await wrap(<MessagesByConnection />);

  // Whatever the alias emitted is the URL the chat screen is handed next.
  api.get.mockImplementation((url) => {
    if (url === '/connections') return Promise.resolve({ data: [conn] });
    if (url.startsWith('/messages/c1')) return Promise.resolve({ data: { content: [] } });
    return Promise.resolve({ data: {} });
  });
  mockParams = arriveAt(mockRedirects[0]);
  await wrap(<ChatThread />);

  await waitFor(() =>
    expect(api.get).toHaveBeenCalledWith('/messages/c1?size=50&channel=FAMILY_UPDATES')
  );
});
