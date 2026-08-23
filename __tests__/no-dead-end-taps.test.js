// HARD-107. Four one-tap actions with no way back, or no way forward.
//
// Nielsen heuristic 3, user control and freedom, which HCI-RULES.md makes
// binding for every screen in this app.
//
//  1. Log out fired on a single tap. For this audience, being asked for a
//     username and password again is the single most likely way to lose an
//     account for good, and the app already owns the tool: useConfirm(), used
//     twice over for account deletion.
//  2. The onboarding story's one primary button said "Start" and landed a
//     brand-new person on the LOGIN form, a door they have no key to.
//  3. Two empty inbox tabs told the person to go to a "dashboard".
//     app/(tabs)/dashboard.jsx is a redirect stub kept for old links and
//     carries href: null in the tab bar, so no one can navigate to it and no
//     one can see it. The instruction named a place that is not there.
//  4. The Find list showed "Connect" to somebody who had already invited YOU.
//     The pair already has a pending request, so the backend refuses a second
//     one: the row offered the one action that cannot succeed.
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { ThemeProvider } from '../src/theme/ThemeContext';
import { ToastProvider } from '../src/context/ToastContext';
import { ConfirmProvider } from '../src/context/ConfirmContext';
import api from '../src/api/client';
import ProfileScreen from '../app/(tabs)/profile';
import AdminScreen from '../app/admin';
import Landing from '../app/(auth)/landing';
import Messages from '../app/(tabs)/messages';
import FriendsScreen from '../app/friends/index';

// The landing story mounts TortoiseMark's intro lockup, which asks reanimated
// for useReducedMotion; the library's own jest mock does not ship it.
jest.mock('react-native-reanimated', () => ({
  ...require('react-native-reanimated/mock'),
  useReducedMotion: () => true,
}));

const mockPush = jest.fn();
const mockReplace = jest.fn();
let mockRole = 'ELDER';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace, back: jest.fn(), canGoBack: () => true }),
  useLocalSearchParams: () => ({}),
  useFocusEffect: (effect) => require('react').useEffect(effect, [effect]),
  Redirect: () => null,
  Link: ({ children }) => children,
}));

jest.mock('../src/api/client', () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn(async () => ({ data: {} })), put: jest.fn(), delete: jest.fn() },
  friendlyWriteError: (_e, fallback) => fallback,
  friendlyAuthError: (_e, fallback) => fallback,
  setTokenGetter: jest.fn(),
  setOnSessionExpired: jest.fn(),
}));

const mockLogout = jest.fn();
jest.mock('../src/context/AuthContext', () => ({
  __esModule: true,
  AuthProvider: ({ children }) => children,
  useAuth: () => ({
    user: { role: mockRole, userId: 'me', emailVerified: true },
    booted: true,
    logout: mockLogout,
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

beforeEach(() => {
  mockRole = 'ELDER';
  jest.clearAllMocks();
  api.get.mockResolvedValue({ data: [] });
});

// ---------- 1. log out ----------

describe('log out asks first', () => {
  test('one tap opens a question instead of ending the session', async () => {
    const r = await wrap(<ProfileScreen />);
    await waitFor(() => expect(r.getByRole('button', { name: 'Log out' })).toBeTruthy());

    await fireEvent.press(r.getByRole('button', { name: 'Log out' }));

    await waitFor(() => expect(r.getByText('Log out?')).toBeTruthy());
    expect(mockLogout).not.toHaveBeenCalled();
  });

  test('the question names what is needed to get back in', async () => {
    const r = await wrap(<ProfileScreen />);
    await fireEvent.press(r.getByRole('button', { name: 'Log out' }));

    await waitFor(() =>
      expect(
        r.getByText(
          'You will need your username and password to get back in. If you are not sure you have them, stay logged in.'
        )
      ).toBeTruthy()
    );
  });

  test('both answers say what they do, and staying really stays', async () => {
    const r = await wrap(<ProfileScreen />);
    await fireEvent.press(r.getByRole('button', { name: 'Log out' }));
    await waitFor(() => expect(r.getByText('Log out?')).toBeTruthy());

    // Never a bare Cancel and Continue.
    expect(r.getByRole('button', { name: 'Stay logged in' })).toBeTruthy();
    await fireEvent.press(r.getByRole('button', { name: 'Stay logged in' }));

    expect(mockLogout).not.toHaveBeenCalled();
  });

  // The admin landing stub has the app's only other Log out button; it must
  // ask the same question the profile screen does.
  test('the admin screen asks first too, and yes still logs out', async () => {
    const r = await wrap(<AdminScreen />);
    await waitFor(() => expect(r.getByRole('button', { name: 'Log out' })).toBeTruthy());

    await fireEvent.press(r.getByRole('button', { name: 'Log out' }));

    await waitFor(() => expect(r.getByText('Log out?')).toBeTruthy());
    expect(mockLogout).not.toHaveBeenCalled();

    const answers = r.getAllByRole('button', { name: 'Log out' });
    await fireEvent.press(answers[answers.length - 1]);
    await waitFor(() => expect(mockLogout).toHaveBeenCalled());
  });

  test('saying yes still logs out', async () => {
    const r = await wrap(<ProfileScreen />);
    await fireEvent.press(r.getByRole('button', { name: 'Log out' }));
    await waitFor(() => expect(r.getByText('Log out?')).toBeTruthy());

    // The dialog's own confirm, not the row that opened it.
    const answers = r.getAllByRole('button', { name: 'Log out' });
    await fireEvent.press(answers[answers.length - 1]);

    await waitFor(() => expect(mockLogout).toHaveBeenCalled());
  });
});

// ---------- 2. the story's last button ----------

describe('the first-run story ends at a door that opens', () => {
  test('the primary button opens account creation, not the login form', async () => {
    const r = await wrap(<Landing />);

    await waitFor(() => expect(r.getByRole('button', { name: 'Create my account' })).toBeTruthy());
    await fireEvent.press(r.getByRole('button', { name: 'Create my account' }));

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/(auth)/register'));
    expect(mockReplace).not.toHaveBeenCalledWith('/(auth)/login');
  });

  test('the returning-user route to log in is still there and still obvious', async () => {
    const r = await wrap(<Landing />);

    const login = r.getByLabelText('Log in');
    await fireEvent.press(login);

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/(auth)/login'));
  });

  test('the word Start no longer sits on a button that goes to login', async () => {
    const r = await wrap(<Landing />);
    expect(r.queryByRole('button', { name: 'Start' })).toBeNull();
  });
});

// ---------- 3. the empty inbox tabs ----------

describe('the empty inbox tabs name a place that exists', () => {
  test('no tab sends anyone to a dashboard', () => {
    const fs = require('fs');
    const path = require('path');
    const source = fs.readFileSync(
      path.join(__dirname, '..', 'app', '(tabs)', 'messages.jsx'),
      'utf8'
    );
    const copy = source.slice(source.indexOf('const EMPTY_TAB_COPY'), source.indexOf('const timeAgo'));
    expect(copy).not.toMatch(/dashboard/i);
  });

  // The per-tab copy only shows when the inbox has SOME conversation and this
  // tab has none; a completely empty inbox gets the "No conversations yet"
  // card above it. So one family chat is seeded and the empty tab is opened.
  const withOneFamilyChat = () => {
    api.get.mockImplementation(async (url) => {
      if (url === '/connections') {
        return {
          data: [
            {
              id: 'fam-1',
              otherUserId: 'sarah',
              otherUserName: 'Sarah',
              otherUserRole: 'FAMILY',
              status: 'ACTIVE',
              type: 'FAMILY',
            },
          ],
        };
      }
      return { data: [] };
    });
  };

  test("an elder's empty helpers tab offers Find friends and goes there", async () => {
    withOneFamilyChat();
    const r = await wrap(<Messages />);
    await waitFor(() => expect(r.getByText('Sarah')).toBeTruthy());

    await fireEvent.press(r.getByText('Helpers'));

    await waitFor(() =>
      expect(
        r.getByText(
          'No chats with helpers yet. A chat opens when someone offers to help, or when you become friends.'
        )
      ).toBeTruthy()
    );
    await fireEvent.press(r.getByRole('button', { name: 'Find friends' }));
    expect(mockPush).toHaveBeenCalledWith('/friends');
  });

  test("a helper's empty elders tab offers Offer help and goes there", async () => {
    mockRole = 'HELPER';
    withOneFamilyChat();
    const r = await wrap(<Messages />);
    await waitFor(() => expect(r.getByText('Sarah')).toBeTruthy());

    await fireEvent.press(r.getByText('Elders'));

    await waitFor(() =>
      expect(
        r.getByText('No chats with elders yet. A chat opens when you offer to help with a request.')
      ).toBeTruthy()
    );
    await fireEvent.press(r.getByRole('button', { name: 'Offer help' }));
    expect(mockPush).toHaveBeenCalledWith('/(tabs)/action');
  });

  test('every destination named in the copy is a route that exists', () => {
    const fs = require('fs');
    const path = require('path');
    const app = path.join(__dirname, '..', 'app');
    // '/friends' is app/friends/index.jsx; '/(tabs)/action' is app/(tabs)/action.jsx.
    expect(fs.existsSync(path.join(app, 'friends', 'index.jsx'))).toBe(true);
    expect(fs.existsSync(path.join(app, '(tabs)', 'action.jsx'))).toBe(true);
  });
});

// ---------- 4. the Find row for somebody who already invited you ----------

describe('a row never offers the one action that cannot work', () => {
  const DALE = { userId: 'dale-9', name: 'Dale', trustScore: 3 };
  const THEIR_INVITE = {
    id: 'conn-7',
    otherUserId: 'dale-9',
    otherUserName: 'Dale',
    status: 'PENDING',
    initiatedByMe: false,
  };

  beforeEach(() => {
    api.get.mockImplementation(async (url) => {
      if (url.startsWith('/discover')) return { data: [DALE] };
      if (url === '/connections') return { data: [THEIR_INVITE] };
      return { data: [] };
    });
  });

  test('somebody who invited you gets Accept, never Connect', async () => {
    const r = await wrap(<FriendsScreen />);

    await waitFor(() => expect(r.getAllByText('Accept').length).toBeGreaterThan(0));
    expect(r.queryByText('Connect')).toBeNull();
  });

  test('tapping it answers the invite that already exists', async () => {
    const r = await wrap(<FriendsScreen />);
    await waitFor(() => expect(r.getAllByText('Accept').length).toBeGreaterThan(0));

    await fireEvent.press(r.getAllByText('Accept')[0]);

    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith('/connections/conn-7/respond', { accept: true })
    );
    // Never the request endpoint, which is what Connect would have called and
    // what the backend would have refused.
    expect(api.post).not.toHaveBeenCalledWith('/connections/request', expect.anything());
  });

  test('a stranger still gets Connect', async () => {
    api.get.mockImplementation(async (url) => {
      if (url.startsWith('/discover')) return { data: [DALE] };
      return { data: [] }; // no connection at all
    });
    const r = await wrap(<FriendsScreen />);

    await waitFor(() => expect(r.getAllByText('Connect').length).toBeGreaterThan(0));
    expect(r.queryByText('Accept')).toBeNull();
  });
});
