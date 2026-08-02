// Screen-level interaction rules, locked by tests: web-exact validation copy,
// the terms gate, and the chat composer's disabled send.
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render } from '@testing-library/react-native';
import { ThemeProvider } from '../src/theme/ThemeContext';
import { ToastProvider } from '../src/context/ToastContext';
import { ConfirmProvider } from '../src/context/ConfirmContext';
import { AuthProvider } from '../src/context/AuthContext';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: () => true }),
  useLocalSearchParams: () => ({ connectionId: 'c1' }),
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
import Register from '../app/(auth)/register';
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

afterEach(() => jest.clearAllMocks());

test('login: empty fields show the exact web messages and fire NO api call', async () => {
  const { getByRole, getByText } = await wrap(<Login />);
  await fireEvent.press(getByRole('button', { name: 'Log In' }));
  getByText('Enter your username, Gmail, or phone number');
  // 8, matching the register rule (rulebook pass) — 6 described a password
  // that cannot exist on any account.
  getByText('Password must be at least 8 characters');
  expect(api.post).not.toHaveBeenCalled();
});

test('register: submit stays disabled until a role is chosen AND terms agreed', async () => {
  const { getByRole } = await wrap(<Register />);
  // No preselected identity (rulebook): agreeing alone is not enough.
  expect(getByRole('button', { name: 'Create Account' })).toBeDisabled();
  await fireEvent.press(getByRole('checkbox'));
  expect(getByRole('button', { name: 'Create Account' })).toBeDisabled();
  await fireEvent.press(getByRole('radio', { name: /Elder\./ }));
  expect(getByRole('button', { name: 'Create Account' })).not.toBeDisabled();
});

test('register: invalid fields show the exact web messages, no api call', async () => {
  const { getByRole, getByText } = await wrap(<Register />);
  await fireEvent.press(getByRole('radio', { name: /Elder\./ })); // choose a role
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
