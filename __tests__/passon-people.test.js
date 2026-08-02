// Who an elder can write to, and who may hold a key (web PassOn.jsx parity).
import { herFamilyList, peopleSheKnows } from '../src/lib/passOnPeople';

const LINKS = [
  { status: 'ACTIVE', otherUserId: 'f1', otherUserName: 'Sarah', relationship: 'Daughter' },
  { status: 'ACTIVE', otherUserId: 'f2', otherUserName: 'David', relationship: null },
  { status: 'PENDING', otherUserId: 'f3', otherUserName: 'Ruth', relationship: 'Niece' },
];

const CONNECTIONS = [
  { status: 'ACTIVE', type: 'HELP', currentTrustLevel: 'TRUSTED', otherUserId: 'h1', otherUserName: 'Tom' },
  { status: 'ACTIVE', type: 'HELP', currentTrustLevel: 'MESSAGING', otherUserId: 'h2', otherUserName: 'Ana' },
  // Family links echo back on /connections as FAMILY chats — never helpers.
  { status: 'ACTIVE', type: 'FAMILY', currentTrustLevel: 'TRUSTED', otherUserId: 'f1', otherUserName: 'Sarah' },
];

test('writes to family plus TRUSTED helpers, never a pending link or a mid-ladder helper', () => {
  expect(peopleSheKnows(LINKS, CONNECTIONS)).toEqual([
    { id: 'f1', name: 'Sarah', note: 'Daughter' },
    { id: 'f2', name: 'David', note: 'Family' },
    { id: 'h1', name: 'Tom', note: 'Helper you trust' },
  ]);
});

test('keyholders come from the family list and nowhere else', () => {
  expect(herFamilyList(LINKS).map((p) => p.id)).toEqual(['f1', 'f2']);
});

test('empty inputs stay calm', () => {
  expect(peopleSheKnows(null, null)).toEqual([]);
  expect(herFamilyList(undefined)).toEqual([]);
});
