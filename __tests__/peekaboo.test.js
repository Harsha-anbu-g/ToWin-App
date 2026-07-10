import { initCards, resolvePair, won, PAIRS } from '../src/lib/peekaboo';

test('deck has 12 cards — each number exactly twice', () => {
  const cards = initCards(() => 0.5);
  expect(cards).toHaveLength(PAIRS * 2);
  const counts = {};
  for (const c of cards) counts[c.num] = (counts[c.num] ?? 0) + 1;
  expect(Object.values(counts)).toEqual(Array(PAIRS).fill(2));
});

test('a matching pair locks in; a miss flips both back', () => {
  const cards = [
    { id: 0, num: 1, flipped: true, matched: false },
    { id: 1, num: 1, flipped: true, matched: false },
    { id: 2, num: 2, flipped: true, matched: false },
  ];
  const hit = resolvePair(cards, 0, 1);
  expect(hit[0]).toMatchObject({ matched: true, flipped: false });
  expect(hit[1]).toMatchObject({ matched: true, flipped: false });

  const miss = resolvePair(cards, 0, 2);
  expect(miss[0]).toMatchObject({ matched: false, flipped: false });
  expect(miss[2]).toMatchObject({ matched: false, flipped: false });
});

test('won only when every card is matched', () => {
  const done = initCards(() => 0.1).map((c) => ({ ...c, matched: true }));
  expect(won(done)).toBe(true);
  done[3].matched = false;
  expect(won(done)).toBe(false);
});
