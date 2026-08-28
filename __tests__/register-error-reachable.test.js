// HARD-109. "Create Account" that appears to do nothing.
//
// Register is the longest page in the app. The submit error banner renders near
// the TOP, above the role cards; the button that triggers it sits at the very
// bottom. So the one screen state that says "your account was not created"
// appeared somewhere the person pressing the button could not see, and said
// nothing out loud while it did. A duplicate email read as a dead button.
//
// accessibilityRole="alert" was already on the banner and was not enough: on
// iOS and Android that role is a trait, not a live region, so it speaks to
// nobody on a phone. The fix is two plain things: scroll it under the person's
// eyes, and say it.
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { ScrollView } from 'react-native';
import { ThemeProvider } from '../src/theme/ThemeContext';
import { ToastProvider } from '../src/context/ToastContext';
import { AuthProvider } from '../src/context/AuthContext';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: () => true }),
  // The form page reads the role the question page answered (2026-08-28 split).
  useLocalSearchParams: () => ({ role: 'ELDER' }),
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

jest.mock('../src/lib/announce', () => ({ announce: jest.fn(), setAnnouncer: jest.fn(() => () => {}) }));

import api from '../src/api/client';
import { announce } from '../src/lib/announce';
import CreateAccount from '../app/(auth)/create-account';

const wrap = (ui) =>
  render(
    <ThemeProvider>
      {/* gcTime: Infinity: the default 5-min gc timer keeps the Jest worker
          alive until force-exit (the convention in auth-followthrough). */}
      <QueryClientProvider
        client={new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } })}
      >
        <AuthProvider>
          <ToastProvider>{ui}</ToastProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );

// What the backend really returns when the address is already taken.
const TAKEN = { response: { data: { message: 'That email address is already registered.' } } };

// A signup that passes every client-side rule, so the only thing left to fail
// is the request itself. Anything less and the test would be asserting on
// field validation instead of the submit banner.
async function fillValidForm(view) {
  // Awaited one at a time: the repo's convention on this screen (see
  // input-semantics.test.js). Firing them unawaited overlaps React's act()
  // scopes and the form never reaches a submittable state.
  await fireEvent.changeText(view.getByLabelText('Username'), 'eleanor_r');
  await fireEvent.changeText(view.getByLabelText('Email'), 'eleanor@example.com');
  await fireEvent.changeText(view.getByLabelText('Date of birth'), 'May 14, 1953');
  await fireEvent.changeText(view.getByLabelText('Password'), 'longenough1');
  await fireEvent.changeText(view.getByLabelText('Re-enter password'), 'longenough1');
  await fireEvent.press(view.getByRole('checkbox'));
}

async function submit(view) {
  await fireEvent.press(view.getByRole('button', { name: /Create Account/i }));
  await waitFor(() => expect(api.post).toHaveBeenCalled());
}

beforeEach(() => {
  api.post.mockReset();
  announce.mockClear();
});

test('a rejected signup is said out loud, not just coloured red', async () => {
  api.post.mockRejectedValue(TAKEN);
  const view = await wrap(<CreateAccount />);
  await fillValidForm(view);

  await submit(view);

  await waitFor(() => view.getByTestId('register-error'));
  expect(announce).toHaveBeenCalledWith('That email address is already registered.');
});

test('the banner scrolls itself back under the person pressing the button', async () => {
  api.post.mockRejectedValue(TAKEN);
  // Screen hands register the ScrollView through the new scrollRef prop; this
  // is the method it calls on it.
  const scrollTo = jest.spyOn(ScrollView.prototype, 'scrollTo').mockImplementation(() => {});

  const view = await wrap(<CreateAccount />);
  await fillValidForm(view);
  await submit(view);

  const banner = await waitFor(() => view.getByTestId('register-error'));
  scrollTo.mockClear();

  // onLayout is what a real device fires once the banner has a position, which
  // is the first moment there is anywhere to scroll to.
  await fireEvent(banner, 'layout', { nativeEvent: { layout: { y: 412, x: 0, width: 320, height: 64 } } });

  expect(scrollTo).toHaveBeenCalledWith(expect.objectContaining({ y: 412, animated: true }));
  scrollTo.mockRestore();
});

test('the banner is an alert a screen reader can land on', async () => {
  api.post.mockRejectedValue(TAKEN);
  const view = await wrap(<CreateAccount />);
  await fillValidForm(view);
  await submit(view);

  const banner = await waitFor(() => view.getByTestId('register-error'));
  expect(banner.props.accessible).toBe(true);
  expect(banner.props.accessibilityRole).toBe('alert');
});
