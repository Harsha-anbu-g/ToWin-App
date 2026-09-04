// src/api/auth.js — the email-verification, OAuth, and ID-check calls as
// named tools (Rule 6). Each test pins the exact wire shape the screens (and
// the website before them) send, so a refactor cannot drift the body.
import api from '../src/api/client';
import {
  completeOAuthSignup,
  exchangeOAuthCode,
  resendSignupEmail,
  submitIdPhoto,
  verifyEmail,
} from '../src/api/auth';

jest.mock('../src/api/client', () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn(), put: jest.fn() },
  friendlyWriteError: (_e, fallback) => fallback,
  setTokenGetter: jest.fn(),
  setOnSessionExpired: jest.fn(),
}));

beforeEach(() => jest.clearAllMocks());

describe('auth API module (verification + OAuth)', () => {
  test('resendSignupEmail posts the email', async () => {
    // Arrange
    api.post.mockResolvedValue({});

    // Act
    await resendSignupEmail({ email: 'rose@example.com' });

    // Assert
    expect(api.post).toHaveBeenCalledWith('/auth/resend-verification', {
      email: 'rose@example.com',
    });
  });

  test('resendSignupEmail refuses a missing email before the wire', async () => {
    // Act / Assert
    await expect(resendSignupEmail({})).rejects.toThrow(
      'email is required to resend the verification link.'
    );
    expect(api.post).not.toHaveBeenCalled();
  });

  test('verifyEmail posts the link token', async () => {
    // Arrange
    api.post.mockResolvedValue({});

    // Act
    await verifyEmail({ token: 'tok-123' });

    // Assert
    expect(api.post).toHaveBeenCalledWith('/auth/verify-email', { token: 'tok-123' });
  });

  test('verifyEmail rejects with the axios error untranslated', async () => {
    // Arrange - callers split "dead link" (err.response) from "unreachable"
    // (no response), so the module must hand the raw error through.
    const netErr = new Error('Network Error');
    api.post.mockRejectedValue(netErr);

    // Act / Assert
    await expect(verifyEmail({ token: 'tok-123' })).rejects.toBe(netErr);
  });

  test('verifyEmail refuses a missing token before the wire', async () => {
    await expect(verifyEmail({})).rejects.toThrow('token is required to verify an email link.');
    expect(api.post).not.toHaveBeenCalled();
  });

  test('exchangeOAuthCode posts code, state, and PKCE verifier and returns the reply', async () => {
    // Arrange
    api.post.mockResolvedValue({ data: { status: 'READY', token: 'jwt' } });

    // Act
    const result = await exchangeOAuthCode({ code: 'c1', state: 's1', codeVerifier: 'v1' });

    // Assert
    expect(api.post).toHaveBeenCalledWith('/auth/oauth/exchange', {
      code: 'c1',
      state: 's1',
      codeVerifier: 'v1',
    });
    expect(result).toEqual({ status: 'READY', token: 'jwt' });
  });

  test('exchangeOAuthCode refuses a call without code or verifier', async () => {
    await expect(exchangeOAuthCode({ state: 's1' })).rejects.toThrow(
      'code and codeVerifier are required to complete a Google sign-in.'
    );
    expect(api.post).not.toHaveBeenCalled();
  });

  test('completeOAuthSignup posts the onboarding fields and returns the session', async () => {
    // Arrange
    api.post.mockResolvedValue({ data: { token: 'jwt' } });

    // Act
    const result = await completeOAuthSignup({
      onboardingToken: 'ob-1',
      role: 'ELDER',
      phone: '+14165550123',
      username: 'rose_g',
    });

    // Assert
    expect(api.post).toHaveBeenCalledWith('/auth/oauth/complete', {
      onboardingToken: 'ob-1',
      role: 'ELDER',
      phone: '+14165550123',
      username: 'rose_g',
    });
    expect(result).toEqual({ token: 'jwt' });
  });

  test('completeOAuthSignup refuses a missing onboarding token before the wire', async () => {
    await expect(completeOAuthSignup({ role: 'ELDER' })).rejects.toThrow(
      'onboardingToken is required to finish a Google signup.'
    );
    expect(api.post).not.toHaveBeenCalled();
  });

  test('submitIdPhoto posts the file as multipart form data', async () => {
    // Arrange
    api.post.mockResolvedValue({});
    const file = { uri: 'file:///id.jpg', name: 'id.jpg', type: 'image/jpeg' };

    // Act
    await submitIdPhoto({ file });

    // Assert
    const [path, body, opts] = api.post.mock.calls[0];
    expect(path).toBe('/auth/verify-id');
    expect(body).toBeInstanceOf(FormData);
    expect(opts).toEqual({ headers: { 'Content-Type': 'multipart/form-data' } });
  });

  test('submitIdPhoto refuses a missing file before the wire', async () => {
    await expect(submitIdPhoto({})).rejects.toThrow('file is required to submit an ID photo.');
    expect(api.post).not.toHaveBeenCalled();
  });
});
