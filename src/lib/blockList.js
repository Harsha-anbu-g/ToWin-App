// Block list (Apple UGC 1.2, STORE-204; server-side since HARD-106). The
// server holds the list (src/api/blocks.js), so a block survives a reinstall,
// reaches a second device and applies on the web. This phone keeps a cache
// under a per-account key so protection holds offline, and it uploads once
// whatever it already held from the days the list lived only on the device.
// Consumers read it through react-query (queryKey ['block-list', userId]) so
// every screen refreshes when it changes.
//
// Scoped per account like the AI-consent and seen-token stores: the list is
// the elder's, not the phone's. On a shared phone (and on the web build,
// where towinly.com/app/ shares one localStorage with the family computer's
// browser) the next person to sign in must not read the names an elder
// blocked, nor be able to unblock a harasser and remove that protection.
import * as Store from './storage';
import { blockedKey, KEYS } from './storageKeys';
import { blockPerson, listBlockedPeople, syncBlockedPeople, unblockPerson } from '../api/blocks';

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

/** The list this phone holds for the account: the cache, plus the one-time legacy adoption. */
async function readDeviceList(userId) {
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

const fromServer = (rows) => rows.map((row) => ({ id: row.userId, name: row.name ?? '' }));

// How long a phone with NOTHING cached waits for the server before answering
// with its empty list. A fresh install gets its blocks on the first read when
// the network is quick; a slow one is not held hostage.
const FRESH_PHONE_WAIT_MS = 800;

/**
 * Asks the server for the list, sends up any ids this phone holds that the
 * server lacks, and writes the merged result into the cache. Resolves with the
 * merged list, or null when the server gave no usable answer. Never throws.
 */
async function refreshFromServer(userId, device) {
  try {
    const rows = await listBlockedPeople();
    if (!Array.isArray(rows)) return null; // not an answer, keep what we hold
    const serverIds = new Set(rows.map((row) => row.userId));
    const missing = device.filter((person) => !serverIds.has(person.id)).map((person) => person.id);
    const all = missing.length ? await syncBlockedPeople(missing) : rows;
    const merged = fromServer(Array.isArray(all) ? all : rows);
    await persist(userId, merged);
    return merged;
  } catch {
    // offline, timed out, or refused: the phone's copy still protects
    return null;
  }
}

/**
 * The account's block list. The phone's cached copy is the answer whenever it
 * holds anything: a blocked person must never flash into a list while the
 * network is slow. The server is asked in the background and the cache updated
 * for the next read (react-query refetches on mount and focus). A phone with
 * nothing cached waits briefly for the server, so a reinstall gets its list on
 * the first read when the network is quick. Ids the phone holds that the
 * server lacks are sent up once, so a block set before the list moved to the
 * server is never lost.
 * @param {string|undefined|null} userId the signed-in account
 * @returns {Promise<Array<{id: string, name: string}>>}
 */
export async function getBlocked(userId) {
  const device = await readDeviceList(userId);
  if (!userId) return device; // nobody signed in: nothing to ask the server for
  const refresh = refreshFromServer(userId, device);
  if (device.length) return device; // protection now; the refresh lands in the cache
  const quick = await Promise.race([
    refresh,
    new Promise((resolve) => setTimeout(() => resolve(null), FRESH_PHONE_WAIT_MS)),
  ]);
  return quick ?? device;
}

/**
 * Adds a person (idempotent) and returns the new list; never mutates. The phone
 * is written first so protection starts now; the server is told next, and if
 * it cannot be reached the next getBlocked uploads the id.
 */
export async function blockUser(userId, { id, name } = {}) {
  const list = await readDeviceList(userId);
  if (!id) return list;
  const next = list.some((person) => person.id === id) ? list : await persist(userId, [...list, { id, name: name ?? '' }]);
  try {
    await blockPerson(id);
  } catch {
    // the phone holds the block; getBlocked sends it up once the server answers
  }
  return next;
}

/**
 * Removes a person by id and returns the new list; never mutates. The server is
 * asked first and the phone forgets only after it agrees, so a failed unblock
 * cannot leave the two disagreeing and quietly bring the person back.
 * Rejects when the server cannot be reached; the caller says so.
 */
export async function unblockUser(userId, id) {
  await unblockPerson(id);
  const list = await readDeviceList(userId);
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
