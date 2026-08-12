// Device-side block list (Apple UGC 1.2 — STORE-204). The backend has report
// + end-connection but no block endpoint (read-only reference repo), so the
// block lives on this phone: a blocked person's requests, rails, and
// conversations disappear for the blocker. Persisted with src/lib/storage like
// the theme/onboarding flags — the app's one storage mechanism. Consumers
// read it through react-query (queryKey ['block-list', userId]) so every
// screen refreshes when it changes.
//
// Scoped per account like the AI-consent and seen-token stores: the list is
// the elder's, not the phone's. On a shared phone — and on the web build,
// where towinly.com/app/ shares one localStorage with the family computer's
// browser — the next person to sign in must not read the names an elder
// blocked, nor be able to unblock a harasser and remove that protection.
import * as Store from './storage';
import { blockedKey, KEYS } from './storageKeys';

function parseList(raw) {
  const list = raw ? JSON.parse(raw) : [];
  return Array.isArray(list) ? list : [];
}

async function persist(userId, list) {
  try {
    await Store.setItemAsync(blockedKey(userId), JSON.stringify(list));
  } catch {
    // persistence failed — the block still applies for this session via the
    // returned list; worst case it's forgotten on restart, never a crash
  }
  return list;
}

/**
 * One-time move of the old device-wide list (KEYS.blockedUsers) into the
 * account reading it. Dropping those blocks instead would silently return a
 * harasser to an elder's feed, the worse of the two failures; adopting them
 * can expose the list to at most one account, which is exactly what the device
 * already did for every account before this change. Signed-out reads never
 * adopt it — see getBlocked — so the list waits for a real account.
 */
async function adoptDeviceList(userId, list) {
  try {
    await Store.setItemAsync(blockedKey(userId), JSON.stringify(list));
    // Only after the account's own copy is safely stored: a failed write must
    // never be the moment an elder loses their blocks.
    await Store.deleteItemAsync(KEYS.blockedUsers);
  } catch {
    // storage refused — the device-wide copy stays and the next read retries
  }
}

/**
 * @param {string|undefined|null} userId the signed-in account
 * @returns {Promise<Array<{id: string, name: string}>>}
 */
export async function getBlocked(userId) {
  try {
    const raw = await Store.getItemAsync(blockedKey(userId));
    if (raw !== null && raw !== undefined) return parseList(raw);
    if (!userId) return []; // nobody signed in: no list to claim
    const legacy = await Store.getItemAsync(KEYS.blockedUsers);
    if (legacy === null || legacy === undefined) return [];
    const list = parseList(legacy);
    await adoptDeviceList(userId, list);
    return list;
  } catch {
    // unreadable or corrupt — treat as nobody blocked rather than crash
    return [];
  }
}

/** Adds a person (idempotent) and returns the new list — never mutates. */
export async function blockUser(userId, { id, name } = {}) {
  const list = await getBlocked(userId);
  if (!id || list.some((person) => person.id === id)) return list;
  return persist(userId, [...list, { id, name: name ?? '' }]);
}

/** Removes a person by id and returns the new list — never mutates. */
export async function unblockUser(userId, id) {
  const list = await getBlocked(userId);
  const next = list.filter((person) => person.id !== id);
  return next.length === list.length ? list : persist(userId, next);
}

/** Pure: is this user id on the block list? */
export function isBlocked(list, id) {
  return Boolean(id) && (list ?? []).some((person) => person.id === id);
}

/** Pure: drop items whose owner (via getId) is blocked. */
export function filterBlocked(items, list, getId) {
  if (!items?.length) return items ?? [];
  if (!list?.length) return items;
  return items.filter((item) => !isBlocked(list, getId(item)));
}
