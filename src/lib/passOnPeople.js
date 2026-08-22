// Who an elder can write to, and who may hold a key — pure, unit-tested
// (web PassOn.jsx parity: peopleSheKnows / herFamilyList).
//
// Every list argument is checked with Array.isArray, never `|| []`. These take
// raw query results, and a captive portal on public wifi answers 200 with an
// HTML page, so what arrives can be a string. `|| []` passes a string straight
// through to .filter and throws inside the caller's render (HARD-100).
const asList = (value) => (Array.isArray(value) ? value : []);

/**
 * Who she can write to: the family on her list, and the helpers she has built
 * real trust with. Family links also come back on /connections as type FAMILY —
 * those are family chats, not helpers — so they are dropped here and the
 * family list is the single source for family.
 */
export function peopleSheKnows(links, connections) {
  const family = asList(links)
    .filter((l) => l.status === 'ACTIVE' && l.otherUserId)
    .map((l) => ({ id: l.otherUserId, name: l.otherUserName, note: l.relationship || 'Family' }));

  const helpers = asList(connections)
    .filter(
      (c) =>
        c.status === 'ACTIVE' &&
        c.type !== 'FAMILY' &&
        c.currentTrustLevel === 'TRUSTED' &&
        c.otherUserId
    )
    .map((c) => ({ id: c.otherUserId, name: c.otherUserName, note: 'Helper you trust' }));

  const seen = new Set();
  return [...family, ...helpers].filter((p) => !seen.has(p.id) && seen.add(p.id));
}

/**
 * Her family list on its own, for Keyholders. Deliberately not the list above:
 * a Keyholder can only ever be somebody on the family list — no outside
 * friend, no notary, and no helper however well she trusts them.
 */
export function herFamilyList(links) {
  return asList(links)
    .filter((l) => l.status === 'ACTIVE' && l.otherUserId)
    .map((l) => ({ id: l.otherUserId, name: l.otherUserName, note: l.relationship || 'Family' }));
}
