// The seen-token store behind the red tab badges (web useSeenIds parity):
// tokens are unseen until marked, the set persists via src/lib/storage under
// the app-owned towin-seen- prefix, hydration never flashes a false count,
// and the stored set is capped at 300 so storage can't grow unbounded.
jest.mock('../src/lib/storage', () => {
  const backing = new Map();
  return {
    __esModule: true,
    getItemAsync: jest.fn(async (k) => backing.get(k) ?? null),
    setItemAsync: jest.fn(async (k, v) => {
      backing.set(k, v);
    }),
    deleteItemAsync: jest.fn(async (k) => {
      backing.delete(k);
    }),
    _backing: backing,
  };
});

import * as Store from '../src/lib/storage';
import { loadSeen, markSeen, unseenCount, _resetSeenForTests } from '../src/lib/seenIds';
import { seenKey } from '../src/lib/storageKeys';

const KEY = seenKey('u1', 'applicants');

beforeEach(() => {
  _resetSeenForTests();
  Store._backing.clear();
  jest.clearAllMocks();
});

test('tokens count as unseen until marked, then drop to zero', async () => {
  await loadSeen(KEY);
  expect(unseenCount(KEY, ['n1:h1', 'n1:h2'])).toBe(2);

  await markSeen(KEY, ['n1:h1', 'n1:h2']);
  expect(unseenCount(KEY, ['n1:h1', 'n1:h2'])).toBe(0);
  // A new applicant on the same need is new again.
  expect(unseenCount(KEY, ['n1:h1', 'n1:h3'])).toBe(1);
});

test('before hydration the count is 0 — never a false flash', () => {
  expect(unseenCount(KEY, ['n1:h1'])).toBe(0);
});

test('seen tokens persist through storage and hydrate back', async () => {
  await markSeen(KEY, ['n1:h1']);
  expect(Store.setItemAsync).toHaveBeenCalledWith(KEY, JSON.stringify(['n1:h1']));

  // A fresh session hydrates the same set from storage.
  _resetSeenForTests();
  await loadSeen(KEY);
  expect(unseenCount(KEY, ['n1:h1', 'n1:h2'])).toBe(1);
});

test('the stored set is capped at 300 tokens, oldest dropped', async () => {
  const tokens = Array.from({ length: 310 }, (_, i) => `t${i}`);
  await markSeen(KEY, tokens);

  const stored = JSON.parse(Store._backing.get(KEY));
  expect(stored).toHaveLength(300);
  expect(stored).not.toContain('t0'); // oldest dropped
  expect(stored).toContain('t309');
});

test('marking already-seen tokens writes nothing', async () => {
  await markSeen(KEY, ['n1:h1']);
  Store.setItemAsync.mockClear();
  await markSeen(KEY, ['n1:h1']);
  expect(Store.setItemAsync).not.toHaveBeenCalled();
});

test('the app seen key never collides with the website seen prefix', () => {
  expect(KEY.startsWith('towin-seen-')).toBe(true);
  expect(KEY.startsWith('towinly_seen_')).toBe(false);
});
