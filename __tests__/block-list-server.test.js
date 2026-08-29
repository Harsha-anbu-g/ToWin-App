// HARD-106, the phone half. Blocks now live on the server (POST/GET/DELETE
// /blocks), so a block survives a reinstall, reaches a second device and
// applies on the web. The phone keeps a cache so protection holds offline,
// and uploads once whatever it already held before this change, so nobody
// loses a block they set while the list lived only on their device.
import * as SecureStore from 'expo-secure-store';
import api from '../src/api/client';
import { blockUser, getBlocked, unblockUser } from '../src/lib/blockList';

const mockStore = {};
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async (key) => mockStore[key] ?? null),
  setItemAsync: jest.fn(async (key, value) => {
    mockStore[key] = value;
  }),
  deleteItemAsync: jest.fn(async (key) => {
    delete mockStore[key];
  }),
}));
jest.mock('../src/api/client', () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn(), delete: jest.fn() },
  setTokenGetter: jest.fn(),
  setOnSessionExpired: jest.fn(),
  friendlyWriteError: (_e, fallback) => fallback,
}));

const ME = 'user-7';
const KEY = 'towin-blocked-user-7';
const offline = () => Object.assign(new Error('Network Error'), { response: undefined });

beforeEach(() => {
  Object.keys(mockStore).forEach((key) => delete mockStore[key]);
  jest.clearAllMocks();
  api.get.mockResolvedValue({ data: [] });
  api.post.mockResolvedValue({ data: [] });
  api.delete.mockResolvedValue({ data: {} });
});

test('the server list wins and is cached on the phone', async () => {
  api.get.mockResolvedValue({ data: [{ userId: 'u-9', name: 'Ivy', createdAt: '2026-08-28T10:00:00' }] });

  const list = await getBlocked(ME);

  expect(api.get).toHaveBeenCalledWith('/blocks');
  expect(list).toEqual([{ id: 'u-9', name: 'Ivy' }]);
  expect(JSON.parse(mockStore[KEY])).toEqual([{ id: 'u-9', name: 'Ivy' }]);
});

test('ids the phone held but the server lacks are uploaded once', async () => {
  await SecureStore.setItemAsync(KEY, JSON.stringify([{ id: 'u-1', name: 'Pat' }]));
  api.get.mockResolvedValueOnce({ data: [] });
  api.post.mockResolvedValueOnce({ data: [{ userId: 'u-1', name: 'Pat' }] });

  const first = await getBlocked(ME);

  expect(api.post).toHaveBeenCalledWith('/blocks/sync', { blockedUserIds: ['u-1'] });
  expect(first).toEqual([{ id: 'u-1', name: 'Pat' }]);

  // The server holds it now, so the next read has nothing to upload.
  api.get.mockResolvedValueOnce({ data: [{ userId: 'u-1', name: 'Pat' }] });
  await getBlocked(ME);
  expect(api.post).toHaveBeenCalledTimes(1);
});

test('offline, the list the phone holds still protects', async () => {
  await SecureStore.setItemAsync(KEY, JSON.stringify([{ id: 'u-1', name: 'Pat' }]));
  api.get.mockRejectedValue(offline());

  expect(await getBlocked(ME)).toEqual([{ id: 'u-1', name: 'Pat' }]);
});

test('an answer that is not a list is treated as no answer', async () => {
  await SecureStore.setItemAsync(KEY, JSON.stringify([{ id: 'u-1', name: 'Pat' }]));
  api.get.mockResolvedValue({ data: {} });

  expect(await getBlocked(ME)).toEqual([{ id: 'u-1', name: 'Pat' }]);
  expect(api.post).not.toHaveBeenCalled();
});

test('nobody signed in means no list and no request', async () => {
  expect(await getBlocked(undefined)).toEqual([]);
  expect(api.get).not.toHaveBeenCalled();
});

test('blockUser protects on the phone first, then tells the server', async () => {
  const next = await blockUser(ME, { id: 'u-2', name: 'Sam' });

  expect(next).toEqual([{ id: 'u-2', name: 'Sam' }]);
  expect(JSON.parse(mockStore[KEY])).toEqual([{ id: 'u-2', name: 'Sam' }]);
  expect(api.post).toHaveBeenCalledWith('/blocks', { blockedUserId: 'u-2' });
});

test('blockUser still protects on the phone when the server is unreachable', async () => {
  api.post.mockRejectedValue(offline());

  const next = await blockUser(ME, { id: 'u-2', name: 'Sam' });

  expect(next).toEqual([{ id: 'u-2', name: 'Sam' }]);
  expect(JSON.parse(mockStore[KEY])).toEqual([{ id: 'u-2', name: 'Sam' }]);
});

test('unblockUser asks the server first and only then forgets on the phone', async () => {
  await SecureStore.setItemAsync(KEY, JSON.stringify([{ id: 'u-2', name: 'Sam' }]));

  const next = await unblockUser(ME, 'u-2');

  expect(api.delete).toHaveBeenCalledWith('/blocks/u-2');
  expect(next).toEqual([]);
  expect(JSON.parse(mockStore[KEY])).toEqual([]);
});

test('unblockUser refuses when the server refuses, so a block never silently comes back', async () => {
  await SecureStore.setItemAsync(KEY, JSON.stringify([{ id: 'u-2', name: 'Sam' }]));
  api.delete.mockRejectedValue(offline());

  await expect(unblockUser(ME, 'u-2')).rejects.toBeTruthy();
  expect(JSON.parse(mockStore[KEY])).toEqual([{ id: 'u-2', name: 'Sam' }]);
});
