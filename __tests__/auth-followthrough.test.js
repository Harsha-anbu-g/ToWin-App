// The auth-followthrough group of docs/audit/audit-2026-08-11-deep.md — the two
// findings that were only half delivered when the auth suite landed:
//   DEEP-16  register was raised to the body floor; finish-setup was not
//   DEEP-29  login.jsx checks what login() returned; its two siblings did not
//
// Sizes are read off the style the component actually rendered, and the two
// signup screens are compared against each other, so the twins cannot drift
// apart again the way the audit caught them.
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { ThemeProvider } from '../src/theme/ThemeContext';
import { ToastProvider } from '../src/context/ToastContext';
import { AuthProvider } from '../src/context/AuthContext';
import { fontFamily, type } from '../src/theme/tokens';

const mockReplace = jest.fn();
let mockParams = {};

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: mockReplace, back: jest.fn(), canGoBack: () => true }),
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
import FinishSetup from '../app/(auth)/finish-setup';
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

const styleOf = (node) => StyleSheet.flatten(node.props.style) ?? {};

// A token the app can really use: signed shape, role claim, expiry ahead of now.
const goodToken = () => {
  const payload = { sub: 'u1', role: 'ELDER', ev: true, exp: Math.floor(Date.now() / 1000) + 3600 };
  return `h.${Buffer.from(JSON.stringify(payload)).toString('base64url')}.s`;
};

// What a clock set far ahead, or a malformed 200, really looks like here.
const REJECTED = { data: { token: 'not-a-jwt' } };

// Google hands finish-setup an onboarding token; without one the screen is only
// the "sign in with Google first" guard.
const ONBOARDING = { onboardingToken: 'ob-123', email: 'margaret@example.com', name: 'Margaret Lee' };

beforeEach(() => {
  mockParams = { ...ONBOARDING };
  api.post.mockReset();
  api.post.mockResolvedValue({ data: {} });
});
afterEach(() => jest.clearAllMocks());

describe('DEEP-16: finish-setup asks the role question the way register does', () => {
  const DESCRIPTIONS = ['Looking for friends or help', 'Want to help others'];

  test('every role description clears the 16px body floor', async () => {
    const r = await wrap(<FinishSetup />);
    const tooSmall = DESCRIPTIONS.map((d) => [d, styleOf(r.getByText(d)).fontSize])
      .filter(([, size]) => size < type.body)
      .map(([d, size]) => `${d}: ${size}px`);
    // This is the copy that decides ELDER vs HELPER on the Google path, and a
    // misread signs the person up as somebody they are not.
    expect(tooSmall).toEqual([]);
  });

  test('the question above the cards sits at body size', async () => {
    const r = await wrap(<FinishSetup />);
    expect(styleOf(r.getByText('I am joining as')).fontSize).toBeGreaterThanOrEqual(type.body);
  });

  test('the two signup screens set the same role copy the same way', async () => {
    const finish = await wrap(<FinishSetup />);
    const register = await wrap(<Register />);
    const shared = 'Looking for friends or help';

    // The audit caught these twins drifting: same words, two different sizes.
    expect(styleOf(finish.getByText(shared)).fontSize).toBe(styleOf(register.getByText(shared)).fontSize);
    expect(styleOf(finish.getByText('I am joining as')).fontWeight).toBe(
      styleOf(register.getByText('First, who are you joining as?')).fontWeight
    );
  });

  test('the heading stays Newsreader 400 — the serif ships no bold', async () => {
    const r = await wrap(<FinishSetup />);
    const heading = styleOf(r.getByText('One last step'));
    expect(heading.fontFamily).toBe(fontFamily.display);
    expect(heading.fontWeight).toBeUndefined();
  });
});

describe('DEEP-29: finish-setup stops on a token this device cannot use', () => {
  const complete = async (r) => {
    await fireEvent.press(r.getByRole('radio', { name: /^Elder\./ }));
    await fireEvent.changeText(r.getByLabelText('Username'), 'margaret');
    await fireEvent.changeText(r.getByLabelText('Phone number'), '+1 416 555 0123');
    await fireEvent.press(r.getByRole('button', { name: 'Sign In' }));
  };

  test('a rejected token is explained instead of bouncing back to log in', async () => {
    api.post.mockResolvedValue(REJECTED);

    const r = await wrap(<FinishSetup />);
    await complete(r);

    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith('/auth/oauth/complete', {
        onboardingToken: 'ob-123',
        role: 'ELDER',
        phone: '+14165550123',
        username: 'margaret',
      })
    );
    await waitFor(() => expect(r.getByText(/date and time/)).toBeTruthy());
    // Navigating drops a logged-out person straight back on Login with nothing
    // said, after they finished the whole form.
    expect(mockReplace).not.toHaveBeenCalled();
  });

  test('a good token still finishes the account and lands on the role router', async () => {
    api.post.mockResolvedValue({ data: { token: goodToken() } });

    const r = await wrap(<FinishSetup />);
    await complete(r);

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/'));
  });
});

describe('DEEP-29: the demo seats stop on a token this device cannot use', () => {
  // App Review reaches elder, helper and guardian mode through these three
  // taps, so the happy path is checked seat by seat, not just once.
  const SEATS = [
    ['Try as an Elder', { identifier: 'elder', password: '12345678' }],
    ['Try as a Helper', { identifier: 'helper', password: '123456789' }],
    ['Try as Family', { identifier: 'demo.sarah@towin.app', password: 'DemoSarah!2026' }],
  ];

  test.each(SEATS)('%s still logs in one tap and lands on the role router', async (label, credentials) => {
    api.post.mockResolvedValue({ data: { token: goodToken() } });

    const r = await wrap(<DemoAccountsCard />);
    await fireEvent.press(r.getByRole('button', { name: label }));

    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/auth/login', credentials));
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/'));
  });

  test('a rejected token says so on the login screen instead of navigating', async () => {
    api.post.mockResolvedValue(REJECTED);
    const onError = jest.fn();

    const r = await wrap(<DemoAccountsCard onError={onError} />);
    await fireEvent.press(r.getByRole('button', { name: 'Try as an Elder' }));

    await waitFor(() => expect(onError).toHaveBeenCalledWith(expect.stringMatching(/date and time/)));
    expect(mockReplace).not.toHaveBeenCalled();
  });

  test('the chip stops saying "Opening…" once a rejected token has been handled', async () => {
    api.post.mockResolvedValue(REJECTED);

    const r = await wrap(<DemoAccountsCard />);
    await fireEvent.press(r.getByRole('button', { name: 'Try as an Elder' }));

    // A seat left spinning is a second dead end on top of the first.
    await waitFor(() => expect(r.getByText('Try as an Elder')).toBeTruthy());
  });
});
