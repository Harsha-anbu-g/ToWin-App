import axios from 'axios';
import api, {
  friendlyWriteError,
  probeApiReachable,
  setOnResponseSeen,
  setOnSessionExpired,
  setTokenGetter,
} from '../src/api/client';

const requestHandler = () => api.interceptors.request.handlers[0].fulfilled;
const responseFulfilled = () => api.interceptors.response.handlers[0].fulfilled;
const responseReject = () => api.interceptors.response.handlers[0].rejected;

afterEach(() => {
  setTokenGetter(() => null);
  setOnSessionExpired(() => {});
  setOnResponseSeen(() => {});
  if (jest.isMockFunction(axios.get)) axios.get.mockRestore();
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

// Reachability (2026-08-28): the offline gate trusts these two signals over the
// OS's own "no internet" verdict — see __tests__/offline-gate.test.js.

test('a successful response reports the network as alive', () => {
  const seen = jest.fn();
  setOnResponseSeen(seen);
  const res = { status: 200, config: { headers: {} } };
  expect(responseFulfilled()(res)).toBe(res);
  expect(seen).toHaveBeenCalledTimes(1);
});

test('a refused request still proves the server answered', async () => {
  const seen = jest.fn();
  setOnResponseSeen(seen);
  const err = { response: { status: 403 }, config: { headers: {} } };
  await expect(responseReject()(err)).rejects.toBe(err);
  expect(seen).toHaveBeenCalledTimes(1);
});

test('a request that never got an answer says nothing about the network', async () => {
  const seen = jest.fn();
  setOnResponseSeen(seen);
  const err = { message: 'Network Error', config: { headers: {} } };
  await expect(responseReject()(err)).rejects.toBe(err);
  expect(seen).not.toHaveBeenCalled();
});

test('probeApiReachable: any answer from the API host counts, even a refusal', async () => {
  jest.spyOn(axios, 'get').mockResolvedValueOnce({ status: 401 });
  await expect(probeApiReachable()).resolves.toBe(true);
  const [url, cfg] = axios.get.mock.calls[0];
  expect(url).toMatch(/\/api\/health$/);
  // No token goes out: a 401 here can never be mistaken for a dead session.
  expect(cfg.headers?.Authorization).toBeUndefined();
  expect(cfg.validateStatus(500)).toBe(true);
  expect(cfg.timeout).toBeGreaterThan(0);
});

test('probeApiReachable: no answer at all means unreachable', async () => {
  jest.spyOn(axios, 'get').mockRejectedValueOnce(new Error('Network Error'));
  await expect(probeApiReachable()).resolves.toBe(false);
});
