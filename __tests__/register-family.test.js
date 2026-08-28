// FAM-406, locked by tests: the FAMILY signup row (web-exact copy, one touch
// opens the form carrying role FAMILY), the role:'FAMILY' register payload,
// and the Sarah demo chip's seeded credentials. Since 2026-08-28 the role is
// its own page (register.jsx) and the form is create-account.jsx.
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { ThemeProvider } from '../src/theme/ThemeContext';
import { ToastProvider } from '../src/context/ToastContext';
import { AuthProvider } from '../src/context/AuthContext';

const mockReplace = jest.fn();
const mockPush = jest.fn();
let mockParams = {};
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace, back: jest.fn(), canGoBack: () => true }),
  useLocalSearchParams: () => mockParams,
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
import CreateAccount from '../app/(auth)/create-account';
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

afterEach(() => {
  jest.clearAllMocks();
  mockParams = {};
});

test('register: the three roles are rows that open the form; FAMILY carries the web copy', async () => {
  const { getByRole } = await wrap(<Register />);

  // Buttons that navigate, not radios that select: one touch opens the form
  // (owner call 2026-08-26, "no double clicking"), and a screen reader hears
  // the name with the sentence that decides it.
  getByRole('button', { name: 'Elder. Looking for friends or help' });
  getByRole('button', { name: 'Helper. Want to help others' });
  const family = getByRole('button', {
    name: "I'm here for a family member. You'll link to your parent inside the app after you sign up.",
  });

  await fireEvent.press(family);
  expect(mockPush).toHaveBeenCalledWith({
    pathname: '/(auth)/create-account',
    params: { role: 'FAMILY' },
  });
});

test('create-account: arriving as FAMILY submits role FAMILY and routes to check-email', async () => {
  mockParams = { role: 'FAMILY' };
  const r = await wrap(<CreateAccount />);
  // The choice is named back, so nobody fills the form as the wrong person.
  r.getByText("You're joining as a family member.");
  await fireEvent.changeText(r.getByLabelText('Username'), 'sarah_lee');
  await fireEvent.changeText(r.getByLabelText('Email'), 'sarah@example.com');
  await fireEvent.changeText(r.getByLabelText('Date of birth'), '12 March 1980');
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
      // Normalised to ISO from the free-typed "12 March 1980"; the backend's
      // RegisterRequest binds it to a LocalDate.
      dateOfBirth: '1980-03-12',
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
  // A token the app can really use. The card now checks what login() gives
  // back, so a 200 carrying no token is a refusal, not a landing — this seat is
  // what Apple App Review taps, and it has to be the real happy path.
  const payload = { sub: 'sarah', role: 'FAMILY', ev: true, exp: Math.floor(Date.now() / 1000) + 3600 };
  api.post.mockResolvedValue({
    data: { token: `h.${Buffer.from(JSON.stringify(payload)).toString('base64url')}.s` },
  });

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
