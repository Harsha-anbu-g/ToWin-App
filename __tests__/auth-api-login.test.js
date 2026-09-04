// src/api/auth.js — login, reset, and resend-verification as named tools
// (Rule 6). Each test pins the exact wire shape the inline calls used, so the
// migration to named functions cannot drift the method, path, or body.
import api from '../src/api/client';
import {
  logIn,
  requestPasswordReset,
  resendVerificationEmail,
  resetPassword,
} from '../src/api/auth';

jest.mock('../src/api/client', () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn(), delete: jest.fn() },
  friendlyAuthError: (_e, fallback) => fallback,
  friendlyWriteError: (_e, fallback) => fallback,
  setTokenGetter: jest.fn(),
  setOnSessionExpired: jest.fn(),
}));

beforeEach(() => jest.clearAllMocks());

describe('auth API module — login and recovery', () => {
  test('logIn posts identifier and password and returns the payload', async () => {
    // Arrange
    api.post.mockResolvedValue({ data: { token: 'jwt-123' } });

    // Act
    const result = await logIn({ identifier: 'elder', password: '12345678' });

    // Assert
    expect(api.post).toHaveBeenCalledWith('/auth/login', {
      identifier: 'elder',
      password: '12345678',
    });
    expect(result).toEqual({ token: 'jwt-123' });
  });

  test('logIn fails fast without touching the network when a field is missing', async () => {
    await expect(logIn({ identifier: '', password: 'x' })).rejects.toThrow(
      'logIn needs an identifier and a password'
    );
    expect(api.post).not.toHaveBeenCalled();
  });

  test('logIn rejects with the axios error untranslated', async () => {
    // Arrange - callers own the wording; the module hands the error through.
    const err = { response: { status: 401 } };
    api.post.mockRejectedValue(err);

    // Act + Assert
    await expect(logIn({ identifier: 'elder', password: 'wrong-pass' })).rejects.toBe(err);
  });

  test('requestPasswordReset posts the email to /auth/forgot-password', async () => {
    // Arrange
    api.post.mockResolvedValue({});

    // Act
    await requestPasswordReset({ email: 'margaret@example.com' });

    // Assert
    expect(api.post).toHaveBeenCalledWith('/auth/forgot-password', {
      email: 'margaret@example.com',
    });
  });

  test('requestPasswordReset fails fast without an email', async () => {
    await expect(requestPasswordReset({ email: '' })).rejects.toThrow(
      'requestPasswordReset needs an email'
    );
    expect(api.post).not.toHaveBeenCalled();
  });

  test('resetPassword posts the token and new password', async () => {
    // Arrange
    api.post.mockResolvedValue({});

    // Act
    await resetPassword({ token: 'tok-9', newPassword: 'brand-new-8' });

    // Assert
    expect(api.post).toHaveBeenCalledWith('/auth/reset-password', {
      token: 'tok-9',
      newPassword: 'brand-new-8',
    });
  });

  test('resetPassword fails fast when the token or password is missing', async () => {
    await expect(resetPassword({ token: '', newPassword: 'brand-new-8' })).rejects.toThrow(
      'resetPassword needs a token and a new password'
    );
    expect(api.post).not.toHaveBeenCalled();
  });

  test('resendVerificationEmail posts to /auth/resend-verification with no body', async () => {
    // Arrange
    api.post.mockResolvedValue({});

    // Act
    await resendVerificationEmail();

    // Assert
    expect(api.post).toHaveBeenCalledWith('/auth/resend-verification');
  });
});
