// Peekaboo game logic — ported from Towinly/frontend/src/pages/PeekabooGame.jsx.
// 6 numbered pairs, 12 cards; flip two, matches lock in, misses flip back.
export const PAIRS = 6;
export const TIME = 60;

export function shuffle(arr, random = Math.random) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function initCards(random = Math.random) {
  const nums = Array.from({ length: PAIRS }, (_, i) => i + 1);
  return shuffle([...nums, ...nums], random).map((num, i) => ({
    id: i,
    num,
    flipped: false,
    matched: false,
  }));
}

// Resolve a two-card selection: matches lock in (matched), misses flip back.
export function resolvePair(cards, a, b) {
  const hit = cards[a].num === cards[b].num;
  return cards.map((c, i) =>
    i === a || i === b ? (hit ? { ...c, matched: true, flipped: false } : { ...c, flipped: false }) : c
  );
}

export const won = (cards) => cards.every((c) => c.matched);
