// The Create Account page uses the kit rather than its own copies of it.
//
// The owner's report was "the create new account page is not uniform". An audit
// found ten drifts; the ones with behaviour behind them are pinned here, so a
// later edit cannot quietly hand-roll these controls again.
//
// The password fields are the sharp end: they used to define a local eye
// toggle, hold their own show/hide state, and pass it as a rightSlot. Moving
// to the kit PasswordInput changed who owns that state and added a hop for the
// ref that carries the return-key focus chain, so both are asserted here.
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render } from '@testing-library/react-native';
import { ThemeProvider } from '../src/theme/ThemeContext';
import { ToastProvider } from '../src/context/ToastContext';
import { AuthProvider } from '../src/context/AuthContext';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: () => true }),
  useFocusEffect: (effect) => require('react').useEffect(effect, [effect]),
  Redirect: () => null,
}));

jest.mock('../src/api/client', () => ({
  __esModule: true,
  default: { post: jest.fn(async () => ({ data: {} })), get: jest.fn(async () => ({ data: [] })) },
  setTokenGetter: jest.fn(),
  setOnSessionExpired: jest.fn(),
}));

import Register from '../app/(auth)/register';

const wrap = (ui) =>
  render(
    <ThemeProvider>
      <QueryClientProvider
        client={new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } })}
      >
        <AuthProvider>
          <ToastProvider>{ui}</ToastProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );

describe('create account page uniformity', () => {
  test('both password fields carry the kit eye toggle', async () => {
    // Arrange / Act
    const r = await wrap(<Register />);
    // Assert — one per field, from PasswordInput rather than a local copy
    expect(r.getAllByRole('button', { name: 'Show password' })).toHaveLength(2);
  });

  test('the eye toggles are independent, so revealing one keeps the other hidden', async () => {
    // Arrange
    const r = await wrap(<Register />);
    const eyes = r.getAllByRole('button', { name: 'Show password' });

    // Act — reveal only the first field
    await fireEvent.press(eyes[0]);

    // Assert — the pair now reads one shown, one hidden
    expect(r.getAllByRole('button', { name: 'Hide password' })).toHaveLength(1);
    expect(r.getAllByRole('button', { name: 'Show password' })).toHaveLength(1);
  });

  test('typing still reaches both password fields through the kit control', async () => {
    // The state moved into PasswordInput; the value must still be the page's.
    const r = await wrap(<Register />);
    await fireEvent.changeText(r.getByLabelText('Password'), 'longenough1');
    await fireEvent.changeText(r.getByLabelText('Re-enter password'), 'longenough1');
    expect(r.getByText('Passwords match')).toBeOnTheScreen();
  });

  test('the password rule is stated before it can be broken', async () => {
    // Username, Email and Date of birth all state their rule up front; the
    // password field used to reveal its 8-character rule only after a failure.
    const r = await wrap(<Register />);
    expect(r.getByText('At least 8 characters.')).toBeOnTheScreen();
  });

  test('the legal link is styled exactly like "Log in" on the same page', async () => {
    // This was two hand-rolled underlined Pressables while the footer used
    // TextLink: one page, two link languages. It is now ONE link opening one
    // sheet with both documents (owner call 2026-08-19, "too many buttons").
    // Compare the rendered TEXT nodes, not the pressables — a pressable
    // carries no fontSize, so reading style off it would compare undefined to
    // undefined and pass while proving nothing.
    const r = await wrap(<Register />);
    const styleOf = (label) => {
      const flat = [r.getByText(label).props.style].flat(Infinity).filter(Boolean);
      return Object.assign({}, ...flat);
    };
    const login = styleOf('Log in');
    expect(r.queryByText('Read the Privacy Policy')).toBeNull();
    for (const label of ['Read the Terms and Privacy Policy']) {
      const link = styleOf(label);
      expect(link.fontSize).toBe(login.fontSize);
      expect(link.fontWeight).toBe(login.fontWeight);
      expect(link.color).toBe(login.color);
      // The underline was the visible half of the old inconsistency.
      expect(link.textDecorationLine).toBe(login.textDecorationLine);
    }
    // and the size is the page's body token, not a legacy scale
    expect(login.fontSize).toBe(16);
  });

  test('every role card names itself at least as large as its own description', async () => {
    // The card label was 14 while the sentence under it was 16, so each card
    // read upside-down.
    const r = await wrap(<Register />);
    const label = r.getByText('Elder');
    const desc = r.getByText('Looking for friends or help');
    const sizeOf = (node) =>
      [node.props.style].flat(Infinity).filter(Boolean).find((s) => s && s.fontSize)?.fontSize;
    expect(sizeOf(label)).toBeGreaterThanOrEqual(sizeOf(desc));
  });
});
