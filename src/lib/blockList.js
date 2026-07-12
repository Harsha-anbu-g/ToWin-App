// Device-side block list (Apple UGC 1.2 — STORE-204). The backend has report
// + end-connection but no block endpoint (read-only reference repo), so the
// block lives on this phone: a blocked person's requests, rails, and
// conversations disappear for the blocker. Persisted with SecureStore like
// the theme/onboarding flags — the app's one storage mechanism. Consumers
// read it through react-query (queryKey ['block-list']) so every screen
// refreshes when it changes.
import * as SecureStore from 'expo-secure-store';

const KEY = 'towin-blocked-users';

async function persist(list) {
  try {
    await SecureStore.setItemAsync(KEY, JSON.stringify(list));
  } catch {
    // persistence failed — the block still applies for this session via the
    // returned list; worst case it's forgotten on restart, never a crash
  }
  return list;
}

/** @returns {Promise<Array<{id: string, name: string}>>} */
export async function getBlocked() {
  try {
    const raw = await SecureStore.getItemAsync(KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    // unreadable or corrupt — treat as nobody blocked rather than crash
    return [];
  }
}

/** Adds a person (idempotent) and returns the new list — never mutates. */
export async function blockUser({ id, name } = {}) {
  const list = await getBlocked();
  if (!id || list.some((person) => person.id === id)) return list;
  return persist([...list, { id, name: name ?? '' }]);
}

/** Removes a person by id and returns the new list — never mutates. */
export async function unblockUser(id) {
  const list = await getBlocked();
  const next = list.filter((person) => person.id !== id);
  return next.length === list.length ? list : persist(next);
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
