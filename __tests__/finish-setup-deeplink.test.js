// HARD-105. A crafted deep link used to drive the finish-setup screen.
//
// app/(auth)/finish-setup.jsx read onboardingToken, email and name straight off
// useLocalSearchParams(), behind a bare "is the token present" check. It then
// rendered the supplied name and email as the app's own claim about who the
// person is, and POSTed the supplied token to /auth/oauth/complete, logging the
// device in with whatever JWT came back.
//
// So anyone who could get somebody to tap
//   towinly://finish-setup?onboardingToken=...&email=...&name=...
// chose what that screen said and which token it spent.
//
// The defence already existed one screen away. app/(auth)/oauth-callback.jsx
// refuses any deep link this app did not start: consumeOAuthFlow matches the
// `state` against a pending flow and hands back the PKCE verifier
// (src/lib/oauthFlow.js). All that was missing was carrying that guarantee
// across the handoff, which src/lib/pendingOnboarding.js now does in memory.
//
// The two halves of the AC are the two halves of this file: a link with params
// and no pending flow must be refused and must POST nothing, and the real flow
// must still reach the form.
import { render, waitFor } from '@testing-library/react-native';
import { ThemeProvider } from '../src/theme/ThemeContext';
import api from '../src/api/client';
import FinishSetup from '../app/(auth)/finish-setup';
import {
  clearPendingOnboarding,
  getPendingOnboarding,
  setPendingOnboarding,
} from '../src/lib/pendingOnboarding';

// What the attacker controls: the whole URL.
const CRAFTED = {
  onboardingToken: 'attacker-supplied-token',
  email: 'security@apple.com',
  name: 'Tim Cook',
};
let mockParams = { ...CRAFTED };
const mockReplace = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: mockReplace, back: jest.fn(), canGoBack: () => false }),
  useLocalSearchParams: () => mockParams,
  Redirect: () => null,
}));

jest.mock('../src/api/client', () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn(async () => ({ data: {} })), delete: jest.fn() },
  friendlyWriteError: (_e, fallback) => fallback,
  friendlyAuthError: (_e, fallback) => fallback,
  setTokenGetter: jest.fn(),
  setOnSessionExpired: jest.fn(),
}));

const mockLogin = jest.fn(async () => true);
jest.mock('../src/context/AuthContext', () => ({
  __esModule: true,
  AuthProvider: ({ children }) => children,
  useAuth: () => ({ user: null, booted: true, login: mockLogin }),
}));

const wrap = (ui) => render(<ThemeProvider>{ui}</ThemeProvider>);

const REFUSAL = 'This page is only accessible after signing in with Google.';

beforeEach(() => {
  mockParams = { ...CRAFTED };
  clearPendingOnboarding();
  jest.clearAllMocks();
});

// ---------- the attack ----------

test('a crafted link with full params and no pending flow is refused', async () => {
  const r = await wrap(<FinishSetup />);

  expect(r.getByText(REFUSAL)).toBeTruthy();
  expect(r.getByRole('button', { name: 'Go to log in' })).toBeTruthy();
});

test('the refused screen posts nothing and logs nobody in', async () => {
  await wrap(<FinishSetup />);
  // Give any effect a chance to fire before asserting the absence.
  await waitFor(() => expect(api.post).not.toHaveBeenCalled());
  expect(mockLogin).not.toHaveBeenCalled();
});

test('the attacker chosen name and email never reach the screen', async () => {
  const r = await wrap(<FinishSetup />);

  expect(r.queryByText(/Tim/)).toBeNull();
  expect(r.queryByText(/security@apple.com/)).toBeNull();
  // Nor does the form itself, which is the thing that spends the token.
  expect(r.queryByText('One last step')).toBeNull();
});

test('a link cannot plant a pending flow, only the exchange can', async () => {
  // Rendering with params does not write the record. Only
  // setPendingOnboarding does, and only oauth-callback calls it, with the
  // server's own exchange response.
  await wrap(<FinishSetup />);
  expect(getPendingOnboarding()).toBeNull();
});

// ---------- the real flow ----------

const REAL = {
  onboardingToken: 'server-issued-token',
  email: 'margaret@example.com',
  name: 'Margaret Lee',
};

test('the real flow still reaches the form', async () => {
  setPendingOnboarding(REAL);
  const r = await wrap(<FinishSetup />);

  expect(r.getByText('One last step')).toBeTruthy();
  expect(r.queryByText(REFUSAL)).toBeNull();
});

test('the form greets the person from the stored record, not the URL', async () => {
  // The URL still carries the attacker's values here. They must lose.
  setPendingOnboarding(REAL);
  const r = await wrap(<FinishSetup />);

  expect(r.getByText(/Welcome, Margaret!/)).toBeTruthy();
  expect(r.getByText('margaret@example.com')).toBeTruthy();
  expect(r.queryByText(/Tim/)).toBeNull();
  expect(r.queryByText('security@apple.com')).toBeNull();
});

test('the token it would spend is the stored one, not the URL one', async () => {
  const { fireEvent } = require('@testing-library/react-native');
  setPendingOnboarding(REAL);
  api.post.mockResolvedValue({ data: { token: 'jwt' } });

  const r = await wrap(<FinishSetup />);
  await fireEvent.press(r.getByRole('radio', { name: /Elder/ }));
  await fireEvent.changeText(r.getByLabelText('Username'), 'margaret');
  await fireEvent.changeText(r.getByLabelText('Phone number'), '5145550101');
  await fireEvent.press(r.getByRole('button', { name: 'Sign In' }));

  await waitFor(() => expect(api.post).toHaveBeenCalled());
  const [, body] = api.post.mock.calls[0];
  expect(body.onboardingToken).toBe('server-issued-token');
  expect(body.onboardingToken).not.toBe('attacker-supplied-token');
});

test('walking away drops the record instead of leaving it in memory', async () => {
  const { fireEvent } = require('@testing-library/react-native');
  setPendingOnboarding(REAL);
  const r = await wrap(<FinishSetup />);

  await fireEvent.press(r.getByText('Cancel and use a different account'));

  expect(getPendingOnboarding()).toBeNull();
  expect(mockReplace).toHaveBeenCalledWith('/(auth)/login');
});

// ---------- the source itself ----------

test('the screen no longer reads the URL at all', () => {
  const fs = require('fs');
  const path = require('path');
  const source = fs.readFileSync(
    path.join(__dirname, '..', 'app', '(auth)', 'finish-setup.jsx'),
    'utf8'
  );
  // A future edit that reaches for the params again fails here rather than in
  // the wild. There is nothing on that URL this screen may trust.
  expect(source).not.toContain('useLocalSearchParams(');
  expect(source).not.toMatch(/import[^;]*useLocalSearchParams[^;]*from 'expo-router'/);
  expect(source).toContain('getPendingOnboarding');
});

test('oauth-callback hands off in memory rather than in the URL', () => {
  const fs = require('fs');
  const path = require('path');
  const source = fs.readFileSync(
    path.join(__dirname, '..', 'app', '(auth)', 'oauth-callback.jsx'),
    'utf8'
  );
  expect(source).toContain('setPendingOnboarding(data)');
  expect(source).not.toMatch(/params:\s*\{\s*onboardingToken/);
});
