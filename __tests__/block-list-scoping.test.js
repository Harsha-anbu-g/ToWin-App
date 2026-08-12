// DEEP-03: the block list belongs to the account, not to the phone.
//
// Blocks were stored under one device-wide key, so on a shared phone — or the
// web build's shared localStorage on a family computer — the next person to
// sign in saw the elder's blocked people by name and could unblock a harasser
// the elder had hidden. These tests hold the per-account scoping, and the
// one-time move of an existing device-wide list, in place.
import * as SecureStore from 'expo-secure-store';
import { blockUser, getBlocked, unblockUser } from '../src/lib/blockList';
import { KEYS, blockedKey } from '../src/lib/storageKeys';

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

const DALE = { id: 'harasser-9', name: 'Dale' };

beforeEach(() => {
  Object.keys(mockStore).forEach((key) => delete mockStore[key]);
  jest.clearAllMocks();
});

test('the next account to sign in cannot see the previous account blocks', async () => {
  // Arrange — the elder blocks someone on this phone, then signs out.
  await blockUser('elder-1', DALE);

  // Act — a different person signs in on the same phone.
  const theirs = await getBlocked('helper-2');

  // Assert — the elder's list is not theirs to read.
  expect(await getBlocked('elder-1')).toEqual([DALE]);
  expect(theirs).toEqual([]);
});

test('the next account cannot unblock someone the previous account blocked', async () => {
  await blockUser('elder-1', DALE);

  await unblockUser('helper-2', DALE.id);

  // The elder's protection survives whatever the next account does.
  expect(await getBlocked('elder-1')).toEqual([DALE]);
});

test('each account list is stored under its own key', async () => {
  await blockUser('elder-1', DALE);

  expect(JSON.parse(mockStore[blockedKey('elder-1')])).toEqual([DALE]);
  expect(mockStore[blockedKey('helper-2')]).toBeUndefined();
});

test('an existing device-wide list moves to the account that reads it, and leaves the device', async () => {
  // Arrange — a phone updating from the version that stored blocks device-wide.
  await SecureStore.setItemAsync(KEYS.blockedUsers, JSON.stringify([DALE]));

  // Act — the elder signs in and opens a screen that reads the list.
  const mine = await getBlocked('elder-1');

  // Assert — the elder keeps their blocks, and nobody else inherits them.
  expect(mine).toEqual([DALE]);
  expect(JSON.parse(mockStore[blockedKey('elder-1')])).toEqual([DALE]);
  expect(mockStore[KEYS.blockedUsers]).toBeUndefined();
  expect(await getBlocked('helper-2')).toEqual([]);
});

test('a signed-out read never adopts the device-wide list', async () => {
  await SecureStore.setItemAsync(KEYS.blockedUsers, JSON.stringify([DALE]));

  expect(await getBlocked(undefined)).toEqual([]);

  // Still there for whoever actually owns it.
  expect(mockStore[KEYS.blockedUsers]).toBeDefined();
  expect(await getBlocked('elder-1')).toEqual([DALE]);
});
