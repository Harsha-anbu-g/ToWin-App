// HARD-104. Three screens told the person a dropped network was their mistake.
//
// src/api/client.js re-rejects the original axios error, so an offline phone,
// a DNS failure and the 15 second timeout all arrive with `error.response`
// undefined. A handler that reads only the status treats all three as a
// refusal.
//
// What that looked like on a real phone. An elder on weak wifi taps Log in,
// the request never lands, and the screen says "Invalid username or password."
// The next thing that person does is change a password that was never wrong.
// The reset screen had the same shape: a blip read as a dead link, and off
// they went to ask for another link that would fail the same way. And Updates
// fed six queries into one `items.length === 0`, so a total fetch failure and
// a genuinely quiet week were the same screen.
//
// The right shape already existed in this codebase at
// app/(auth)/forgot-password.jsx, which has always branched on the ABSENCE of
// a response, and in app/(tabs)/messages.jsx, which renders a LoadError rather
// than "no conversations yet". Nothing new was invented; friendlyAuthError is
// forgot-password's branch, named, with 429 and 5xx added.
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { ThemeProvider } from '../src/theme/ThemeContext';
import { ToastProvider } from '../src/context/ToastContext';
import { ConfirmProvider } from '../src/context/ConfirmContext';
import api, { friendlyAuthError } from '../src/api/client';
import Login from '../app/(auth)/login';
import ResetPassword from '../app/(auth)/reset-password';
import UpdatesScreen from '../app/updates';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: () => true }),
  useLocalSearchParams: () => ({ token: 'tok-1' }),
  useFocusEffect: (effect) => require('react').useEffect(effect, [effect]),
  Redirect: () => null,
  Link: ({ children }) => children,
}));

jest.mock('../src/api/client', () => {
  const actual = jest.requireActual('../src/api/client');
  return {
    __esModule: true,
    default: { get: jest.fn(), post: jest.fn(), put: jest.fn(), delete: jest.fn() },
    friendlyAuthError: actual.friendlyAuthError,
    friendlyWriteError: (_e, fallback) => fallback,
    setTokenGetter: jest.fn(),
    setOnSessionExpired: jest.fn(),
  };
});

jest.mock('../src/context/AuthContext', () => ({
  __esModule: true,
  AuthProvider: ({ children }) => children,
  useAuth: () => ({
    user: { role: 'ELDER', userId: 'u1', emailVerified: true },
    booted: true,
    login: jest.fn(),
    logout: jest.fn(),
  }),
}));

const wrap = (ui) =>
  render(
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

/** What axios hands back when nothing came back at all. */
const offline = () => Object.assign(new Error('Network Error'), { response: undefined });
const refused = (status, message) =>
  Object.assign(new Error('Request failed'), { response: { status, data: message ? { message } : {} } });

const OFFLINE_LINE = 'Check your connection and try again.';
const SERVER_LINE = 'Something is wrong on our side. Please try again in a minute.';

afterEach(() => jest.clearAllMocks());

// ---------- the helper on its own, every branch ----------

describe('friendlyAuthError', () => {
  test('no response at all is never the person1s fault'.replace('1', "'"), () => {
    expect(friendlyAuthError(offline(), 'Invalid username or password.')).toBe(OFFLINE_LINE);
    expect(friendlyAuthError(undefined, 'Invalid username or password.')).toBe(OFFLINE_LINE);
  });

  test('a server fault is not a wrong password', () => {
    expect(friendlyAuthError(refused(500), 'Invalid username or password.')).toBe(SERVER_LINE);
    expect(friendlyAuthError(refused(503), 'Invalid username or password.')).toBe(SERVER_LINE);
  });

  test('the 429 branch survives, server sentence first', () => {
    expect(friendlyAuthError(refused(429, 'Locked for 5 minutes.'), 'x')).toBe('Locked for 5 minutes.');
    expect(friendlyAuthError(refused(429), 'x')).toBe('Too many attempts. Please try again later.');
  });

  test('the refusal sentence is used for 400 and 401 and nothing else', () => {
    expect(friendlyAuthError(refused(400), 'Invalid username or password.')).toBe(
      'Invalid username or password.'
    );
    expect(friendlyAuthError(refused(401), 'Invalid username or password.')).toBe(
      'Invalid username or password.'
    );
    // 403 is a gated account, not a wrong password.
    expect(friendlyAuthError(refused(403), 'Invalid username or password.')).not.toBe(
      'Invalid username or password.'
    );
    expect(friendlyAuthError(refused(404), 'Invalid username or password.')).not.toBe(
      'Invalid username or password.'
    );
  });
});

// ---------- 1. log in ----------

const signIn = async (r) => {
  await fireEvent.changeText(r.getByLabelText('Username, Gmail, or phone'), 'elder');
  await fireEvent.changeText(r.getByLabelText('Password'), '12345678');
  await fireEvent.press(r.getByRole('button', { name: 'Log In' }));
};

describe('log in', () => {
  test('an offline phone is told about the connection, never about the password', async () => {
    api.post.mockRejectedValue(offline());
    const r = await wrap(<Login />);
    await signIn(r);

    await waitFor(() => expect(r.getByText(OFFLINE_LINE)).toBeTruthy());
    expect(r.queryByText('Invalid username or password.')).toBeNull();
  });

  test('a server fault is told apart from a wrong password', async () => {
    api.post.mockRejectedValue(refused(500));
    const r = await wrap(<Login />);
    await signIn(r);

    await waitFor(() => expect(r.getByText(SERVER_LINE)).toBeTruthy());
    expect(r.queryByText('Invalid username or password.')).toBeNull();
  });

  test('a real refusal still says the password is wrong', async () => {
    api.post.mockRejectedValue(refused(401));
    const r = await wrap(<Login />);
    await signIn(r);

    await waitFor(() => expect(r.getByText('Invalid username or password.')).toBeTruthy());
  });

  test('the rate limit still speaks in the server sentence', async () => {
    api.post.mockRejectedValue(refused(429, 'Too many attempts. Try again in 5 minutes.'));
    const r = await wrap(<Login />);
    await signIn(r);

    await waitFor(() => expect(r.getByText('Too many attempts. Try again in 5 minutes.')).toBeTruthy());
  });
});

// ---------- 2. reset the password ----------

const resetTo = async (r, pw) => {
  await fireEvent.changeText(r.getByLabelText('New password (at least 8 characters)'), pw);
  await fireEvent.changeText(r.getByLabelText('Re-enter new password'), pw);
  await fireEvent.press(r.getByRole('button', { name: 'Update password' }));
};

describe('reset the password', () => {
  test('a dropped request does not call the link dead', async () => {
    api.post.mockRejectedValue(offline());
    const r = await wrap(<ResetPassword />);
    await resetTo(r, 'longenough1');

    await waitFor(() => expect(r.getByText(OFFLINE_LINE)).toBeTruthy());
    expect(r.queryByText('This reset link is invalid or has expired.')).toBeNull();
  });

  test('a server fault does not call the link dead either', async () => {
    api.post.mockRejectedValue(refused(500));
    const r = await wrap(<ResetPassword />);
    await resetTo(r, 'longenough1');

    await waitFor(() => expect(r.getByText(SERVER_LINE)).toBeTruthy());
    expect(r.queryByText('This reset link is invalid or has expired.')).toBeNull();
  });

  test('a link the server really refused is still called expired', async () => {
    api.post.mockRejectedValue(refused(400));
    const r = await wrap(<ResetPassword />);
    await resetTo(r, 'longenough1');

    await waitFor(() =>
      expect(r.getByText('This reset link is invalid or has expired.')).toBeTruthy()
    );
  });

  test('the server sentence wins over ours when there is one', async () => {
    api.post.mockRejectedValue(refused(400, 'That link was already used.'));
    const r = await wrap(<ResetPassword />);
    await resetTo(r, 'longenough1');

    await waitFor(() => expect(r.getByText('That link was already used.')).toBeTruthy());
  });
});

// ---------- 3. updates ----------

const QUIET = /Nothing new right now/;

describe('updates', () => {
  test('a total fetch failure offers a retry instead of claiming quiet', async () => {
    api.get.mockRejectedValue(offline());
    const r = await wrap(<UpdatesScreen />);

    await waitFor(() => expect(r.getByText(/We couldn't load your updates right now/)).toBeTruthy());
    expect(r.queryByText(QUIET)).toBeNull();
    expect(r.getByRole('button', { name: 'Try again' })).toBeTruthy();
  });

  test('the retry re-asks for every source', async () => {
    api.get.mockRejectedValue(offline());
    const r = await wrap(<UpdatesScreen />);
    await waitFor(() => expect(r.getByRole('button', { name: 'Try again' })).toBeTruthy());

    const before = api.get.mock.calls.length;
    await fireEvent.press(r.getByRole('button', { name: 'Try again' }));

    await waitFor(() => expect(api.get.mock.calls.length).toBeGreaterThan(before));
  });

  test('a genuinely quiet week still says so', async () => {
    api.get.mockResolvedValue({ data: [] });
    const r = await wrap(<UpdatesScreen />);

    await waitFor(() => expect(r.getByText(QUIET)).toBeTruthy());
    expect(r.queryByText(/We couldn't load your updates right now/)).toBeNull();
  });

  test('rows that did arrive still show, with the gap named above them', async () => {
    // One source answers, one refuses. The person keeps what loaded.
    api.get.mockImplementation(async (url) => {
      if (url === '/connections') {
        return {
          data: [
            {
              id: 'c1',
              status: 'PENDING',
              initiatedByMe: false,
              otherUserName: 'Priya',
              createdAt: '2026-08-20T10:00:00',
            },
          ],
        };
      }
      throw offline();
    });
    const r = await wrap(<UpdatesScreen />);

    await waitFor(() => expect(r.getByText('Priya wants to be your friend')).toBeTruthy());
    expect(r.getByText(/We couldn't load all of your updates right now/)).toBeTruthy();
    expect(r.queryByText(QUIET)).toBeNull();
  });
});
