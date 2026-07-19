// FAM-406, locked by tests: the FAMILY signup card (web-exact copy, radio
// semantics, full-width row), the role:'FAMILY' register payload, and the
// Sarah demo chip's seeded credentials.
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { ThemeProvider } from '../src/theme/ThemeContext';
import { ToastProvider } from '../src/context/ToastContext';
import { AuthProvider } from '../src/context/AuthContext';

const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: mockReplace, back: jest.fn(), canGoBack: () => true }),
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

import api from '../src/api/client';
import Register from '../app/(auth)/register';
import DemoAccountsCard from '../src/components/DemoAccountsCard';

const wrap = (ui) =>
  render(
    <ThemeProvider>
      {/* gcTime: Infinity — the default 5-min gc timer is scheduled at unmount
          and keeps the Jest worker alive until force-exit (the teardown warning) */}
      <QueryClientProvider
        client={new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } })}
      >
        <AuthProvider>
          <ToastProvider>{ui}</ToastProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );

afterEach(() => jest.clearAllMocks());

test('register: FAMILY card carries the web copy, spans the full row, keeps radio semantics', async () => {
  const { getByRole } = await wrap(<Register />);

  // The 2-across pair is untouched.
  getByRole('radio', { name: 'Elder. Looking for friends or help' });
  getByRole('radio', { name: 'Helper. Want to help others' });

  const family = getByRole('radio', {
    name: "I'm here for a family member. You'll link to your parent inside the app after you sign up.",
  });
  // Full row below the pair — the halves keep flex:1, FAMILY takes width 100%.
  expect(StyleSheet.flatten(family.props.style).width).toBe('100%');

  await fireEvent.press(family);
  getByRole('radio', { name: /I'm here for a family member/, selected: true });
  getByRole('radio', { name: /^Elder\./, selected: false });
});

test('register: selecting FAMILY submits role FAMILY and routes to check-email', async () => {
  const r = await wrap(<Register />);
  await fireEvent.press(r.getByRole('radio', { name: /I'm here for a family member/ }));
  await fireEvent.changeText(r.getByLabelText('Username'), 'sarah_lee');
  await fireEvent.changeText(r.getByLabelText('Email'), 'sarah@example.com');
  await fireEvent.changeText(r.getByLabelText('Password'), 'longenough1');
  await fireEvent.changeText(r.getByLabelText('Re-enter password'), 'longenough1');
  await fireEvent.press(r.getByRole('checkbox'));
  await fireEvent.press(r.getByRole('button', { name: 'Create Account' }));

  await waitFor(() =>
    expect(api.post).toHaveBeenCalledWith('/auth/register', {
      username: 'sarah_lee',
      email: 'sarah@example.com',
      password: 'longenough1',
      role: 'FAMILY',
    })
  );
  await waitFor(() =>
    expect(mockReplace).toHaveBeenCalledWith({
      pathname: '/(auth)/check-email',
      params: { email: 'sarah@example.com' },
    })
  );
});

test('demo card: Try as Family logs in with the seeded Sarah credentials and lands on /', async () => {
  const { getByRole, getByText } = await wrap(<DemoAccountsCard />);
  getByText("Sarah, Margaret's daughter");

  await fireEvent.press(getByRole('button', { name: 'Try as Family' }));
  await waitFor(() =>
    expect(api.post).toHaveBeenCalledWith('/auth/login', {
      identifier: 'demo.sarah@towin.app',
      password: 'DemoSarah!2026',
    })
  );
  // '/' is the role router — a FAMILY JWT lands on the (tabs) home, My Parents.
  await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/'));
});
