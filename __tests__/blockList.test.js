// STORE-204 (Apple UGC 1.2): device-side block list contract.
import * as SecureStore from 'expo-secure-store';
import { blockUser, filterBlocked, getBlocked, isBlocked, unblockUser } from '../src/lib/blockList';

const mockStore = {};

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async (key) => mockStore[key] ?? null),
  setItemAsync: jest.fn(async (key, value) => {
    mockStore[key] = value;
  }),
}));

beforeEach(() => {
  Object.keys(mockStore).forEach((key) => delete mockStore[key]);
  jest.clearAllMocks();
});

test('returns empty list when nothing is stored', async () => {
  expect(await getBlocked()).toEqual([]);
});

test('returns empty list when the stored value is corrupt', async () => {
  await SecureStore.setItemAsync('towin-blocked-users', 'not json {');
  expect(await getBlocked()).toEqual([]);
});

test('blockUser adds a person and persists them', async () => {
  // Arrange + Act
  const next = await blockUser({ id: 'u-1', name: 'Pat' });

  // Assert — returned list and a fresh read agree
  expect(next).toEqual([{ id: 'u-1', name: 'Pat' }]);
  expect(await getBlocked()).toEqual([{ id: 'u-1', name: 'Pat' }]);
});

test('blockUser ignores duplicates and missing ids', async () => {
  await blockUser({ id: 'u-1', name: 'Pat' });
  const afterDuplicate = await blockUser({ id: 'u-1', name: 'Pat again' });
  const afterMissingId = await blockUser({ name: 'Nobody' });

  expect(afterDuplicate).toHaveLength(1);
  expect(afterMissingId).toHaveLength(1);
});

test('unblockUser removes only that person', async () => {
  await blockUser({ id: 'u-1', name: 'Pat' });
  await blockUser({ id: 'u-2', name: 'Sam' });

  const next = await unblockUser('u-1');

  expect(next).toEqual([{ id: 'u-2', name: 'Sam' }]);
  expect(await getBlocked()).toEqual([{ id: 'u-2', name: 'Sam' }]);
});

test('isBlocked matches by id and tolerates empty input', () => {
  const list = [{ id: 'u-1', name: 'Pat' }];
  expect(isBlocked(list, 'u-1')).toBe(true);
  expect(isBlocked(list, 'u-2')).toBe(false);
  expect(isBlocked(undefined, 'u-1')).toBe(false);
  expect(isBlocked(list, undefined)).toBe(false);
});

test('filterBlocked drops blocked items using the id getter', () => {
  const list = [{ id: 'u-1', name: 'Pat' }];
  const needs = [
    { id: 'n-1', elderId: 'u-1' },
    { id: 'n-2', elderId: 'u-9' },
  ];

  const visible = filterBlocked(needs, list, (need) => need.elderId);

  expect(visible).toEqual([{ id: 'n-2', elderId: 'u-9' }]);
});

test('filterBlocked leaves items untouched when nobody is blocked', () => {
  const needs = [{ id: 'n-1', elderId: 'u-1' }];
  expect(filterBlocked(needs, [], (need) => need.elderId)).toEqual(needs);
  expect(filterBlocked(undefined, [], (need) => need.elderId)).toEqual([]);
});
