// The seen-token store behind the red tab badges (web useSeenIds parity):
// tokens are unseen until marked, the set persists via src/lib/storage under
// the app-owned towin-seen- prefix, hydration never flashes a false count,
// and the stored set is capped at 300 so storage can't grow unbounded.
//
// HARD-100 changed one thing about that cap and this file records why. The cap
// used to be a blind `.slice(-300)` by position, which could drop a token out
// of the very batch the caller had just marked seen. When that happens the
// `tokens.every(seen.has)` early return in markSeen is false forever: every
// call writes and notifies, every notify re-renders each badge subscriber, and
// the Updates focus effect calls markSeen again. An infinite spin, reachable
// on any account whose feed carries more than 300 items. The cap now trims by
// identity and never drops a token from the batch in hand, so a batch larger
// than the cap is stored whole. That is deliberate: keeping it whole is what
// makes the early return reachable on the next call. Storage still cannot grow
// without bound, because the batch is whatever one screen currently shows.
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

import { capTokens, loadSeen, markSeen, unseenCount, _resetSeenForTests } from '../src/lib/seenIds';
import { seenKey } from '../src/lib/storageKeys';

// requireMock, not `import * as Store`: the `_backing` handle below lives only
// on the mock, and a static namespace import makes eslint's import/namespace
// rule fail on every use of it.
const Store = jest.requireMock('../src/lib/storage');

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
  // Two batches, each under the cap, 350 tokens between them. The cap holds
  // and the oldest go first, which is what it was always for.
  await markSeen(KEY, Array.from({ length: 200 }, (_, i) => `t${i}`));
  await markSeen(KEY, Array.from({ length: 150 }, (_, i) => `t${200 + i}`));

  const stored = JSON.parse(Store._backing.get(KEY));
  expect(stored).toHaveLength(300);
  expect(stored).not.toContain('t0'); // oldest dropped
  expect(stored).not.toContain('t49');
  expect(stored).toContain('t50'); // 350 - 300 = the first 50 go
  expect(stored).toContain('t349');
});

test('a batch bigger than the cap is kept whole, and marking it again writes nothing', async () => {
  // The loop that HARD-100 closed. Under the old blind slice this stored 300
  // of the 310, so the ten dropped tokens were unseen again on the very next
  // call: markSeen wrote and notified every time it was asked, forever.
  const tokens = Array.from({ length: 310 }, (_, i) => `t${i}`);
  await markSeen(KEY, tokens);

  const stored = JSON.parse(Store._backing.get(KEY));
  expect(stored).toHaveLength(310);
  expect(unseenCount(KEY, tokens)).toBe(0);

  Store.setItemAsync.mockClear();
  await markSeen(KEY, tokens);
  expect(Store.setItemAsync).not.toHaveBeenCalled();
});

test('the cap drops the oldest tokens that are not in the batch in hand', () => {
  // capTokens is the rule on its own: 300 already seen, a batch of 5 of which
  // 3 are old ones sitting at the very front of the set. The trim has to skip
  // those three and take the next-oldest instead.
  const seen = Array.from({ length: 300 }, (_, i) => `old${i}`);
  const batch = ['old0', 'old1', 'old2', 'new1', 'new2'];

  const next = capTokens(new Set(seen), batch);

  expect(next).toHaveLength(300);
  for (const token of batch) expect(next).toContain(token);
  // Two new tokens arrived, so exactly two old ones make room, and they are
  // the oldest that the batch does not name.
  expect(next).not.toContain('old3');
  expect(next).not.toContain('old4');
  expect(next).toContain('old5');
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
