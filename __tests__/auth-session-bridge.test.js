// AuthContext's half of the session bridge. web-session.test.js proves the
// lib; this proves it is actually WIRED — the failure that would ship silently
// is "Log out" leaving the website signed in on a shared phone.
import { Text } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, waitFor } from '@testing-library/react-native';
import { AuthProvider, useAuth } from '../src/context/AuthContext';

jest.mock('../src/lib/webSession', () => ({
  readWebsiteToken: jest.fn(() => null),
  writeWebsiteToken: jest.fn(),
  clearWebsiteToken: jest.fn(),
  subscribeSessionChanges: jest.fn(() => () => {}),
}));

const mockStore = new Map();
jest.mock('../src/lib/storage', () => ({
  getItemAsync: jest.fn(async (k) => (mockStore.has(k) ? mockStore.get(k) : null)),
  setItemAsync: jest.fn(async (k, v) => void mockStore.set(k, v)),
  deleteItemAsync: jest.fn(async (k) => void mockStore.delete(k)),
}));

const webSession = require('../src/lib/webSession');

const b64 = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64url');
const makeToken = (sub = 'u-1') =>
  `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({
    sub,
    role: 'ELDER',
    exp: Math.floor(Date.now() / 1000) + 3600,
  })}.fake-signature`;

const expiredToken = () =>
  `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({
    sub: 'u-old',
    role: 'ELDER',
    exp: Math.floor(Date.now() / 1000) - 3600,
  })}.fake-signature`;

let auth;
function Probe() {
  auth = useAuth();
  return <Text>{auth.booted ? 'booted' : 'booting'}</Text>;
}

const wrap = () => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  });
  return render(
    <QueryClientProvider client={client}>
      <AuthProvider>
        <Probe />
      </AuthProvider>
    </QueryClientProvider>
  );
};

beforeEach(() => {
  mockStore.clear();
  auth = undefined;
  jest.clearAllMocks();
  webSession.readWebsiteToken.mockReturnValue(null);
  webSession.subscribeSessionChanges.mockReturnValue(() => {});
});

test('signing in writes the website token too', async () => {
  const { findByText } = await wrap();
  await findByText('booted');

  const token = makeToken();
  await act(async () => {
    await auth.login(token);
  });

  expect(webSession.writeWebsiteToken).toHaveBeenCalledWith(token);
  expect(mockStore.get('towin-token')).toBe(token);
});

test('logging out clears the website token too', async () => {
  const { findByText } = await wrap();
  await findByText('booted');

  await act(async () => {
    await auth.login(makeToken());
  });
  await act(async () => {
    await auth.logout();
  });

  expect(webSession.clearWebsiteToken).toHaveBeenCalled();
  expect(mockStore.has('towin-token')).toBe(false);
  expect(auth.user).toBeNull();
});

test('boot adopts the website session when the app has none', async () => {
  const token = makeToken('u-website');
  webSession.readWebsiteToken.mockReturnValue(token);

  const { findByText } = await wrap();
  await findByText('booted');

  await waitFor(() => expect(auth.user?.userId).toBe('u-website'));
  expect(mockStore.get('towin-token')).toBe(token);
});

test('boot ignores an expired website session', async () => {
  webSession.readWebsiteToken.mockReturnValue(expiredToken());

  const { findByText } = await wrap();
  await findByText('booted');

  expect(auth.user).toBeNull();
  expect(mockStore.has('towin-token')).toBe(false);
});

test("boot prefers the app's own token and never reads the website's", async () => {
  const appToken = makeToken('u-app');
  mockStore.set('towin-token', appToken);

  const { findByText } = await wrap();
  await findByText('booted');

  await waitFor(() => expect(auth.user?.userId).toBe('u-app'));
  expect(webSession.readWebsiteToken).not.toHaveBeenCalled();
});

test('another tab signing out signs this one out', async () => {
  const { findByText } = await wrap();
  await findByText('booted');

  await act(async () => {
    await auth.login(makeToken());
  });
  expect(auth.user).not.toBeNull();

  // fire the handler AuthContext registered with subscribeSessionChanges
  const onChange = webSession.subscribeSessionChanges.mock.calls.at(-1)[0];
  await act(async () => {
    onChange(null);
  });

  await waitFor(() => expect(auth.user).toBeNull());
});

test('another tab signing in signs this one in', async () => {
  const { findByText } = await wrap();
  await findByText('booted');

  const onChange = webSession.subscribeSessionChanges.mock.calls.at(-1)[0];
  const token = makeToken('u-other-tab');
  await act(async () => {
    onChange(token);
  });

  await waitFor(() => expect(auth.user?.userId).toBe('u-other-tab'));
});
