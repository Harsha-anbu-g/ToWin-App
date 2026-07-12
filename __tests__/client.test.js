import api, { friendlyWriteError, setTokenGetter, setOnSessionExpired } from '../src/api/client';

const requestHandler = () => api.interceptors.request.handlers[0].fulfilled;
const responseReject = () => api.interceptors.response.handlers[0].rejected;

afterEach(() => {
  setTokenGetter(() => null);
  setOnSessionExpired(() => {});
});

test('attaches Bearer token when a token exists', async () => {
  setTokenGetter(() => 'tok-123');
  const cfg = await requestHandler()({ headers: {} });
  expect(cfg.headers.Authorization).toBe('Bearer tok-123');
});

test('sends no auth header when there is no token', async () => {
  setTokenGetter(() => null);
  const cfg = await requestHandler()({ headers: {} });
  expect(cfg.headers.Authorization).toBeUndefined();
});

test('401 with a token fires onSessionExpired (dead session)', async () => {
  const expired = jest.fn();
  setOnSessionExpired(expired);
  const err = { response: { status: 401 }, config: { headers: { Authorization: 'Bearer x' } } };
  await expect(responseReject()(err)).rejects.toBe(err);
  expect(expired).toHaveBeenCalledTimes(1);
});

test('401 without a token does NOT fire onSessionExpired', async () => {
  const expired = jest.fn();
  setOnSessionExpired(expired);
  const err = { response: { status: 401 }, config: { headers: {} } };
  await expect(responseReject()(err)).rejects.toBe(err);
  expect(expired).not.toHaveBeenCalled();
});

test('403 (authenticated but not allowed) does NOT log out', async () => {
  const expired = jest.fn();
  setOnSessionExpired(expired);
  const err = { response: { status: 403 }, config: { headers: { Authorization: 'Bearer x' } } };
  await expect(responseReject()(err)).rejects.toBe(err);
  expect(expired).not.toHaveBeenCalled();
});

test('friendlyWriteError names the verify-email fix on 403', () => {
  const err = { response: { status: 403 } };
  expect(friendlyWriteError(err, 'Could not post right now.')).toMatch(/verify your email/i);
});

test('friendlyWriteError keeps the fallback for other failures', () => {
  expect(friendlyWriteError({ response: { status: 500 } }, 'Could not post right now.')).toBe(
    'Could not post right now.'
  );
  expect(friendlyWriteError(new Error('network down'), 'Could not post right now.')).toBe(
    'Could not post right now.'
  );
});
