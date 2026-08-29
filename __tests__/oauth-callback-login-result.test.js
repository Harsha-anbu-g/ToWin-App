// The last DEEP-29 site. oauth-callback did `await login(data.token)` and
// navigated no matter what came back, so a phone with a mis-set clock (or a
// malformed 200) bounced the person from Google straight back to Login with
// nothing said. login.jsx, finish-setup.jsx and DemoAccountsCard.jsx already
// stop and explain (auth.test.js, auth-followthrough.test.js); this file
// holds the fourth seat to the same behaviour, and pins the sentence to the
// one shared constant so the four sites cannot drift apart.
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, waitFor } from '@testing-library/react-native';
import { ThemeProvider } from '../src/theme/ThemeContext';
import { ToastProvider } from '../src/context/ToastContext';
import { AuthProvider } from '../src/context/AuthContext';

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

// The state check (refuse unsolicited or replayed links) is proven in
// oauthFlow.test.js; here the flow is always one this app started, so the
// exchange runs and the login() result is what's under test.
jest.mock('../src/lib/oauthFlow', () => ({
  consumeOAuthFlow: jest.fn(async () => 'verifier-abc'),
}));

import api from '../src/api/client';
import OAuthCallback from '../app/(auth)/oauth-callback';
import { SIGN_IN_DEVICE_ERROR } from '../src/lib/copy';

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

// A token the app can really use: signed shape, role claim, expiry ahead of now.
const goodToken = () => {
  const payload = { sub: 'u1', role: 'ELDER', ev: true, exp: Math.floor(Date.now() / 1000) + 3600 };
  return `h.${Buffer.from(JSON.stringify(payload)).toString('base64url')}.s`;
};

beforeEach(() => {
  mockParams = { code: 'code-1', state: 'state-1' };
  api.post.mockReset();
  api.post.mockResolvedValue({ data: {} });
});
afterEach(() => {
  jest.clearAllMocks();
});

describe('DEEP-29: oauth-callback stops on a token this device cannot use', () => {
  test('the four sign-in screens share one sentence, word for word', () => {
    // login.jsx, finish-setup.jsx and DemoAccountsCard.jsx said exactly this
    // as a literal; the constant is the single home all four now read from.
    expect(SIGN_IN_DEVICE_ERROR).toBe(
      "Could not sign you in on this device. Please check your phone's date and time."
    );
  });

  test('a rejected token is explained instead of a silent bounce to Login', async () => {
    // What a clock set far ahead, or a malformed 200, really looks like here.
    api.post.mockResolvedValue({ data: { status: 'READY', token: 'not-a-jwt' } });

    const r = await wrap(<OAuthCallback />);

    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith('/auth/oauth/exchange', {
        code: 'code-1',
        state: 'state-1',
        codeVerifier: 'verifier-abc',
      })
    );
    // Navigating drops a logged-out person on the index route, which redirects
    // them straight back to Login with nothing said.
    await waitFor(() => expect(r.getByText(SIGN_IN_DEVICE_ERROR)).toBeTruthy());
    expect(mockReplace).not.toHaveBeenCalled();
  });

  test('a good token still lands on the role router', async () => {
    api.post.mockResolvedValue({ data: { status: 'READY', token: goodToken() } });

    await wrap(<OAuthCallback />);

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/'));
  });
});
