// The auth group of docs/audit/audit-2026-08-11-deep.md, locked by tests:
//   DEEP-12  a dropped connection is not a dead verification link
//   DEEP-15  "Passwords match" was 13px at 2.93:1
//   DEEP-16  the role cards decide the whole account and were set at 13px
//   DEEP-29  a token this device rejects bounced back to Login saying nothing
//
// Colour is measured here, never eyeballed: the ratio helper below reads the
// style the component actually rendered, so a token swap that quietly drops
// under AA fails instead of shipping.
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { ThemeProvider } from '../src/theme/ThemeContext';
import { ToastProvider } from '../src/context/ToastContext';
import { AuthProvider } from '../src/context/AuthContext';
import { dark, light } from '../src/theme/tokens';

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

// The demo card runs its own login path — not what these tests are about.
jest.mock('../src/components/DemoAccountsCard', () => () => null);

import api from '../src/api/client';
import Login from '../app/(auth)/login';
import Register from '../app/(auth)/register';
import VerifyEmail from '../app/(auth)/verify-email';

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

// WCAG relative luminance / contrast, same maths as contrast-tokens.test.js.
const channel = (v) => {
  const s = v / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};
const luminance = (hex) => {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? [...h].map((c) => c + c).join('') : h;
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16));
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
};
const contrast = (fg, bg) => {
  const [hi, lo] = [luminance(fg), luminance(bg)].sort((a, b) => b - a);
  return (hi + 0.05) / (lo + 0.05);
};

// A token the app can really use: signed shape, role claim, expiry ahead of now.
const goodToken = () => {
  const payload = { sub: 'u1', role: 'ELDER', ev: true, exp: Math.floor(Date.now() / 1000) + 3600 };
  return `h.${Buffer.from(JSON.stringify(payload)).toString('base64url')}.s`;
};

beforeEach(() => {
  mockParams = {};
  api.post.mockReset();
  api.post.mockResolvedValue({ data: {} });
});
afterEach(() => jest.clearAllMocks());

describe('DEEP-12: verify-email tells a dropped connection from a dead link', () => {
  test('a network failure offers a retry instead of sending the elder back to sign up', async () => {
    mockParams = { token: 'tok-123' };
    // Axios network errors and timeouts carry no `response` at all.
    api.post.mockRejectedValueOnce(new Error('Network Error')).mockResolvedValueOnce({ data: {} });

    const r = await wrap(<VerifyEmail />);
    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith('/auth/verify-email', { token: 'tok-123' })
    );

    // The link is fine; the connection was not. Saying "sign up again" throws
    // away a working link and asks for the most laborious recovery there is.
    await waitFor(() => expect(r.getByRole('button', { name: 'Try again' })).toBeTruthy());
    expect(r.queryByText(/sign up again/)).toBeNull();

    await fireEvent.press(r.getByRole('button', { name: 'Try again' }));
    await waitFor(() => expect(api.post).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(r.getByText('Email verified!')).toBeTruthy());
  });

  test('a token the server itself rejects still reads as a dead link', async () => {
    mockParams = { token: 'stale-token' };
    api.post.mockRejectedValue({ response: { status: 400, data: {} } });

    const r = await wrap(<VerifyEmail />);
    await waitFor(() => expect(r.getByText(/sign up again/)).toBeTruthy());
    expect(r.queryByRole('button', { name: 'Try again' })).toBeNull();
  });

  test('no token in the link is a dead link, not a connection problem', async () => {
    mockParams = {};
    const r = await wrap(<VerifyEmail />);
    await waitFor(() => expect(r.getByText(/sign up again/)).toBeTruthy());
    expect(api.post).not.toHaveBeenCalled();
  });
});

describe('DEEP-15: the "Passwords match" confirmation is readable', () => {
  test('it clears the 16px body floor and 4.5:1 on the page it sits on', async () => {
    const r = await wrap(<Register />);
    await fireEvent.changeText(r.getByLabelText('Password'), 'longenough1');
    await fireEvent.changeText(r.getByLabelText('Re-enter password'), 'longenough1');

    const style = StyleSheet.flatten(r.getByText('Passwords match').props.style);
    expect(style.fontSize).toBeGreaterThanOrEqual(16);
    expect(contrast(style.color, light.surface)).toBeGreaterThanOrEqual(4.5);
  });

  test('it paints a theme token, so night mode clears the floor too', async () => {
    const r = await wrap(<Register />);
    await fireEvent.changeText(r.getByLabelText('Password'), 'longenough1');
    await fireEvent.changeText(r.getByLabelText('Re-enter password'), 'longenough1');

    // A fixed hex would read fine by day and strand this line at night.
    expect(StyleSheet.flatten(r.getByText('Passwords match').props.style).color).toBe(light.greenDeep);
    expect(contrast(dark.greenDeep, dark.surface)).toBeGreaterThanOrEqual(4.5);
  });
});

describe('DEEP-16: the role cards carry their decision at the body floor', () => {
  const DESCRIPTIONS = [
    'Looking for friends or help',
    'Want to help others',
    "You'll link to your parent inside the app after you sign up.",
  ];

  test('every role description clears 16px', async () => {
    const r = await wrap(<Register />);
    const tooSmall = DESCRIPTIONS.map((d) => [d, StyleSheet.flatten(r.getByText(d).props.style).fontSize])
      .filter(([, size]) => size < 16)
      .map(([d, size]) => `${d}: ${size}px`);
    // This is the copy that decides ELDER vs HELPER vs FAMILY, and a misread
    // costs the elder their whole tab shell plus a support ticket to undo.
    expect(tooSmall).toEqual([]);
  });

  test('the question above the cards stays at body size', async () => {
    const r = await wrap(<Register />);
    const prompt = StyleSheet.flatten(r.getByText('First, who are you joining as?').props.style);
    expect(prompt.fontSize).toBeGreaterThanOrEqual(16);
  });
});

describe('DEEP-29: a token this device cannot use says so', () => {
  const fillLogin = async (r) => {
    await fireEvent.changeText(r.getByLabelText('Username, Gmail, or phone'), 'margaret');
    await fireEvent.changeText(r.getByLabelText('Password'), 'longenough1');
    await fireEvent.press(r.getByRole('button', { name: 'Log In' }));
  };

  test('a rejected token shows a message instead of bouncing back to Login empty-handed', async () => {
    // What a clock set far ahead, or a malformed 200, really looks like here.
    api.post.mockResolvedValue({ data: { token: 'not-a-jwt' } });

    const r = await wrap(<Login />);
    await fillLogin(r);

    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/auth/login', {
      identifier: 'margaret',
      password: 'longenough1',
    }));
    await waitFor(() => expect(r.getByText(/date and time/)).toBeTruthy());
    // Navigating would drop them on Login again with nothing to go on.
    expect(mockReplace).not.toHaveBeenCalled();
  });

  test('a good token still lands on the role router', async () => {
    api.post.mockResolvedValue({ data: { token: goodToken() } });

    const r = await wrap(<Login />);
    await fillLogin(r);

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/'));
  });
});
