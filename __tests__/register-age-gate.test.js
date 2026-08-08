// Signup collects a date of birth and refuses under-18s.
//
// Before this existed, the Terms said Towinly was not for under-18s and the privacy
// policy said a date of birth was collected at signup. Neither was true: the form
// asked for username, email, password and role only. Google Play also looks for a
// real gate behind an adults-only target-audience answer.
// See docs/audit/2026-08-07-presubmission-audit.md finding R13.
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
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
  default: {
    post: jest.fn(async () => ({ data: {} })),
    get: jest.fn(async () => ({ data: [] })),
  },
  setTokenGetter: jest.fn(),
  setOnSessionExpired: jest.fn(),
}));

import api from '../src/api/client';
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

// Fill every field except the date of birth, which each test supplies.
const fillAndSubmit = async (r, dob) => {
  await fireEvent.press(r.getByRole('radio', { name: /I'm here for a family member/ }));
  await fireEvent.changeText(r.getByLabelText('Username'), 'sarah_lee');
  await fireEvent.changeText(r.getByLabelText('Email'), 'sarah@example.com');
  if (dob !== undefined) await fireEvent.changeText(r.getByLabelText('Date of birth'), dob);
  await fireEvent.changeText(r.getByLabelText('Password'), 'longenough1');
  await fireEvent.changeText(r.getByLabelText('Re-enter password'), 'longenough1');
  await fireEvent.press(r.getByRole('checkbox'));
  await fireEvent.press(r.getByRole('button', { name: 'Create Account' }));
};

// Any of the rejection messages the date field can show. Deliberately NOT loose
// enough to match the field's own helper ("...You have to be 18 or over to join."),
// which is always on screen and would make the assertion vacuous. The under-18
// error is distinguished by its trailing "Towinly".
const findError = (r) =>
  r.queryByText(
    /Enter your date of birth|does not exist|is in the future|check the year you typed|18 or over to join Towinly/i,
  );

// Ages relative to today, so the test never ages out.
const yearsAgo = (n) => {
  const d = new Date();
  return `${d.getFullYear() - n}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

describe('signup age gate', () => {
  beforeEach(() => jest.clearAllMocks());

  test('the field exists and says the rule out loud', async () => {
    // Arrange / Act
    const r = await wrap(<Register />);

    // Assert
    expect(r.getByLabelText('Date of birth')).toBeTruthy();
    expect(r.getByText(/18 or over to join/i)).toBeTruthy();
  });

  test.each([
    ['left blank', ''],
    ['a date that does not exist', '31 February 1980'],
    ['a date in the future', `${new Date().getFullYear() + 1}-01-01`],
    ['someone under 18', yearsAgo(17)],
  ])('refuses to register with %s', async (_label, dob) => {
    // Arrange
    const r = await wrap(<Register />);

    // Act
    await fillAndSubmit(r, dob);

    // Assert — a visible error proves validation actually ran. Without this, the
    // "no call was made" check below could pass for any unrelated reason.
    await waitFor(() => expect(findError(r)).toBeTruthy());

    // And the account must not be requested at all.
    const registerCalls = api.post.mock.calls.filter((c) => c[0] === '/auth/register');
    expect(registerCalls).toHaveLength(0);
  });

  test('an under-18 is told why, in plain words', async () => {
    // Arrange
    const r = await wrap(<Register />);

    // Act
    await fillAndSubmit(r, yearsAgo(17));

    // Assert
    await waitFor(() => expect(r.getByText(/have to be 18 or over/i)).toBeTruthy());
  });

  test('an adult gets through, with the date normalised to ISO', async () => {
    // Arrange
    const r = await wrap(<Register />);

    // Act — free-typed, not ISO.
    await fillAndSubmit(r, '12 March 1980');

    // Assert
    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith(
        '/auth/register',
        expect.objectContaining({ dateOfBirth: '1980-03-12' }),
      ),
    );
  });

  test('accepts an elder typing their birthday the long way round', async () => {
    // Arrange
    const r = await wrap(<Register />);

    // Act
    await fillAndSubmit(r, 'May 14, 1953');

    // Assert
    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith(
        '/auth/register',
        expect.objectContaining({ dateOfBirth: '1953-05-14' }),
      ),
    );
  });
});
