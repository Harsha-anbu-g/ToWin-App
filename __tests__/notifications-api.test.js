// src/api/notifications.js — push-token registration as named tools (Rule 6).
// The DELETE carries the token in the request body, which is the proof that
// lets an expired session still silence the phone.
import api from '../src/api/client';
import { registerPushToken, unregisterPushToken } from '../src/api/notifications';

jest.mock('../src/api/client', () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn(), delete: jest.fn() },
  friendlyWriteError: (_e, fallback) => fallback,
  setTokenGetter: jest.fn(),
  setOnSessionExpired: jest.fn(),
}));

beforeEach(() => jest.clearAllMocks());

describe('notifications API module', () => {
  test('registerPushToken posts the token and platform', async () => {
    // Arrange
    api.post.mockResolvedValue({});

    // Act
    await registerPushToken({ token: 'ExponentPushToken[abc]', platform: 'ios' });

    // Assert
    expect(api.post).toHaveBeenCalledWith('/notifications/token', {
      token: 'ExponentPushToken[abc]',
      platform: 'ios',
    });
  });

  test('registerPushToken refuses a missing token before the wire', async () => {
    // Act / Assert
    await expect(registerPushToken({ platform: 'ios' })).rejects.toThrow('token is required.');
    expect(api.post).not.toHaveBeenCalled();
  });

  test('unregisterPushToken deletes with the token in the body', async () => {
    // Arrange
    api.delete.mockResolvedValue({});

    // Act
    await unregisterPushToken('ExponentPushToken[abc]');

    // Assert
    expect(api.delete).toHaveBeenCalledWith('/notifications/token', {
      data: { token: 'ExponentPushToken[abc]' },
    });
  });

  test('unregisterPushToken refuses a missing token before the wire', async () => {
    // Act / Assert
    await expect(unregisterPushToken()).rejects.toThrow('token is required.');
    expect(api.delete).not.toHaveBeenCalled();
  });
});
