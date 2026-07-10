import api, { setTokenGetter, setOnSessionExpired } from '../src/api/client';

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
