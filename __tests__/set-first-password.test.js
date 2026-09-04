// Set-first-password port (website ChangePassword.jsx): a Google-signup
// account has no password. The website reads hasPassword from GET /profile/me
// and, when it is false, swaps the form to a "Set a Password" flow that posts
// to /auth/set-password with no current-password field. The app screen must
// mirror the condition (hasPassword === false, anything else counts as
// having one), the copy, and the endpoint — through the named API functions
// (Rule 6), never inline api.post.
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import ChangePassword from '../app/change-password';
import { changePassword, setPassword } from '../src/api/auth';
import api from '../src/api/client';
import { ToastProvider } from '../src/context/ToastContext';
import { ThemeProvider } from '../src/theme/ThemeContext';

const mockBack = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: (...args) => mockBack(...args),
    canGoBack: () => true,
  }),
}));

jest.mock('../src/api/client', () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn(), put: jest.fn(), delete: jest.fn() },
}));

const wrap = (ui) =>
  render(
    <ThemeProvider>
      <ToastProvider>{ui}</ToastProvider>
    </ThemeProvider>
  );

const FIRST_PASSWORD_COPY =
  'Choose a password so you can also sign in with your username. Signing in with Google will keep working.';

beforeEach(() => {
  jest.clearAllMocks();
  api.post.mockResolvedValue({ data: {} });
});

describe('named API functions (Rule 6)', () => {
  test('setPassword posts only the new password to /auth/set-password', async () => {
    // Act
    await setPassword('longenough1');

    // Assert: the exact website payload — no currentPassword key at all.
    expect(api.post).toHaveBeenCalledWith('/auth/set-password', {
      newPassword: 'longenough1',
    });
  });

  test('changePassword posts current and new to /auth/change-password', async () => {
    // Act
    await changePassword({ currentPassword: 'old-secret', newPassword: 'longenough1' });

    // Assert
    expect(api.post).toHaveBeenCalledWith('/auth/change-password', {
      currentPassword: 'old-secret',
      newPassword: 'longenough1',
    });
  });
});

describe('Google-signup account (hasPassword false)', () => {
  beforeEach(() => {
    api.get.mockResolvedValue({ data: { hasPassword: false } });
  });

  test('shows the Set a Password flow with no current-password field', async () => {
    // Act
    const r = await wrap(<ChangePassword />);

    // Assert: website heading + explainer copy, current field gone.
    await r.findByText('Set a Password');
    expect(r.getByText(FIRST_PASSWORD_COPY)).toBeTruthy();
    expect(r.queryByLabelText('Current password')).toBeNull();
    expect(r.getByText('Set password')).toBeTruthy();
  });

  test('submits through setPassword: POST /auth/set-password, newPassword only', async () => {
    // Arrange
    const r = await wrap(<ChangePassword />);
    await r.findByText('Set a Password');

    // Act
    await fireEvent.changeText(
      r.getByLabelText('New password (at least 8 characters)'),
      'longenough1'
    );
    await fireEvent.changeText(r.getByLabelText('Re-enter new password'), 'longenough1');
    await fireEvent.press(r.getByText('Set password'));

    // Assert
    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith('/auth/set-password', {
        newPassword: 'longenough1',
      })
    );
    expect(mockBack).toHaveBeenCalled();
  });

  test('a failed set shows the server message, or the website fallback', async () => {
    // Arrange: server refuses without a message body.
    api.post.mockRejectedValue(new Error('network down'));
    const r = await wrap(<ChangePassword />);
    await r.findByText('Set a Password');

    // Act
    await fireEvent.changeText(
      r.getByLabelText('New password (at least 8 characters)'),
      'longenough1'
    );
    await fireEvent.changeText(r.getByLabelText('Re-enter new password'), 'longenough1');
    await fireEvent.press(r.getByText('Set password'));

    // Assert: the website's exact fallback phrase.
    await r.findByText('Could not set password.');
    expect(mockBack).not.toHaveBeenCalled();
  });
});

describe('account with a password (the existing change flow)', () => {
  test('keeps the current-password field and posts to /auth/change-password', async () => {
    // Arrange
    api.get.mockResolvedValue({ data: { hasPassword: true } });
    const r = await wrap(<ChangePassword />);

    // Act
    await fireEvent.changeText(await r.findByLabelText('Current password'), 'old-secret');
    await fireEvent.changeText(
      r.getByLabelText('New password (at least 8 characters)'),
      'longenough1'
    );
    await fireEvent.changeText(r.getByLabelText('Re-enter new password'), 'longenough1');
    await fireEvent.press(r.getByText('Update password'));

    // Assert
    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith('/auth/change-password', {
        currentPassword: 'old-secret',
        newPassword: 'longenough1',
      })
    );
  });

  test('a profile without the hasPassword field counts as having one', async () => {
    // Arrange: older backend shape — website condition is hasPassword !== false.
    api.get.mockResolvedValue({ data: { username: 'ruth' } });

    // Act
    const r = await wrap(<ChangePassword />);

    // Assert
    await r.findByLabelText('Current password');
    expect(r.queryByText('Set a Password')).toBeNull();
  });

  test('a failed profile read falls back to the change flow', async () => {
    // Arrange: website .catch(() => setHasPassword(true)).
    api.get.mockRejectedValue(new Error('offline'));

    // Act
    const r = await wrap(<ChangePassword />);

    // Assert
    await r.findByLabelText('Current password');
    expect(r.queryByText('Set a Password')).toBeNull();
  });
});
