// Screen-level interaction rules, locked by tests: web-exact validation copy,
// the terms gate, and the chat composer's disabled send.
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render } from '@testing-library/react-native';
import { ThemeProvider } from '../src/theme/ThemeContext';
import { ToastProvider } from '../src/context/ToastContext';
import { ConfirmProvider } from '../src/context/ConfirmContext';
import { AuthProvider } from '../src/context/AuthContext';

let mockParams = { connectionId: 'c1' };

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: () => true }),
  useLocalSearchParams: () => mockParams,
  // Screens under test behave as the focused screen (runs the effect on mount).
  useFocusEffect: (effect) => require('react').useEffect(effect, [effect]),
  Redirect: () => null,
}));

jest.mock('../src/api/client', () => ({
  __esModule: true,
  default: {
    post: jest.fn(async () => ({ data: {} })),
    get: jest.fn(async () => ({ data: [] })),
  },
  setTokenGetter: jest.fn(),
  setOnSessionExpired: jest.fn(),
}));

// The demo card exercises its own API path — not under test here.
jest.mock('../src/components/DemoAccountsCard', () => () => null);

import api from '../src/api/client';
import Login from '../app/(auth)/login';
import CreateAccount from '../app/(auth)/create-account';
import ChatThread from '../app/chat/[connectionId]';

const wrap = (ui) =>
  render(
    <ThemeProvider>
      {/* gcTime: Infinity — the default 5-min gc timer is scheduled at unmount
          and keeps the Jest worker alive until force-exit (the teardown warning) */}
      <QueryClientProvider
        client={new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } })}
      >
        <AuthProvider>
          <ToastProvider>
            <ConfirmProvider>{ui}</ConfirmProvider>
          </ToastProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );

afterEach(() => {
  jest.clearAllMocks();
  mockParams = { connectionId: 'c1' };
});

test('login: empty fields show the exact web messages and fire NO api call', async () => {
  const { getByRole, getByText } = await wrap(<Login />);
  await fireEvent.press(getByRole('button', { name: 'Log In' }));
  getByText('Enter your username, Gmail, or phone number');
  // 8, matching the register rule (rulebook pass) — 6 described a password
  // that cannot exist on any account.
  getByText('Password must be at least 8 characters');
  expect(api.post).not.toHaveBeenCalled();
});

test('create-account: submit stays disabled until the terms are agreed', async () => {
  // The role was answered on the page before (2026-08-28 split), so the
  // terms box is the one gate left on this page.
  mockParams = { role: 'ELDER' };
  const { getByRole, getByText } = await wrap(<CreateAccount />);
  expect(getByRole('button', { name: 'Create Account' })).toBeDisabled();
  getByText("You're joining as an elder.");
  await fireEvent.press(getByRole('checkbox'));
  expect(getByRole('button', { name: 'Create Account' })).not.toBeDisabled();
});

test('create-account: no role in the link means no form, only the way back to the question', async () => {
  // A stale or hand-typed link cannot reach a form the backend would refuse:
  // the page renders the Redirect (mocked to nothing here) and nothing else.
  mockParams = {};
  const { queryByLabelText, queryByRole } = await wrap(<CreateAccount />);
  expect(queryByLabelText('Username')).toBeNull();
  expect(queryByRole('button', { name: 'Create Account' })).toBeNull();
});

test('create-account: invalid fields show the exact web messages, no api call', async () => {
  mockParams = { role: 'ELDER' };
  const { getByRole, getByText } = await wrap(<CreateAccount />);
  await fireEvent.press(getByRole('checkbox')); // agree
  await fireEvent.press(getByRole('button', { name: 'Create Account' }));
  getByText('Username must be 3-20 characters: lowercase letters, numbers, underscores only');
  getByText('Enter a valid email address');
  getByText('Password must be at least 8 characters');
  expect(api.post).not.toHaveBeenCalled();
});

test('chat: send is disabled while the composer is empty, enabled with text', async () => {
  const { getByLabelText } = await wrap(<ChatThread />);
  expect(getByLabelText('Send message')).toBeDisabled();
  await fireEvent.changeText(getByLabelText('Message'), 'Hello Margaret');
  expect(getByLabelText('Send message')).not.toBeDisabled();
});
