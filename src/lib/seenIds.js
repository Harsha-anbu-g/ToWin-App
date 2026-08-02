// Which item "tokens" a user has already seen, so tab badges can show a red
// count for new activity — no backend needed (web lib/useSeenIds.js; badges
// red since web b37420d). A token is any string that changes when the item
// becomes notification-worthy (e.g. `${connectionId}:${status}` so a
// pending→active accept shows as new).
//
// The sets live at module level with subscribers (same reasoning as
// chatDrafts): the tab bar computes counts while the screens mark seen, and
// both must read one state. Persistence rides src/lib/storage — the app's one
// storage mechanism — under the app-owned `towin-seen-` prefix, never the
// website's `towinly_seen_` (shared localStorage on the web build).
import { useEffect, useSyncExternalStore } from 'react';
import * as Store from './storage';
import { seenKey } from './storageKeys';

// Web parity: the stored set is capped so storage can't grow unbounded.
const MAX_TOKENS = 300;

const sets = new Map(); // storageKey -> Set<token>, absent until hydrated
const loads = new Map(); // storageKey -> in-flight hydration promise
const listeners = new Set();
let version = 0;

const notify = () => {
  version += 1;
  for (const listener of listeners) listener();
};
const subscribe = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
const getVersion = () => version;

// Hydrate once per key. Counts stay 0 until the stored set arrives — a badge
// that flashes and then vanishes is worse than one that appears a beat late.
export function loadSeen(storageKey) {
  if (!loads.has(storageKey)) {
    loads.set(
      storageKey,
      (async () => {
        try {
          const raw = await Store.getItemAsync(storageKey);
          sets.set(storageKey, new Set(raw ? JSON.parse(raw) : []));
        } catch {
          // Storage unavailable — seen-state is in-session only (storage.js contract).
          sets.set(storageKey, new Set());
        }
        notify();
      })()
    );
  }
  return loads.get(storageKey);
}

/** How many of these tokens the user has NOT seen yet. 0 until hydrated. */
export function unseenCount(storageKey, tokens) {
  const seen = sets.get(storageKey);
  if (!seen) return 0;
  return tokens.reduce((n, token) => (seen.has(token) ? n : n + 1), 0);
}

/** Record these tokens as seen and persist (oldest dropped past the cap). */
export async function markSeen(storageKey, tokens) {
  await loadSeen(storageKey);
  const seen = sets.get(storageKey);
  if (tokens.every((token) => seen.has(token))) return; // no change → no write
  const next = [...new Set([...seen, ...tokens])].slice(-MAX_TOKENS);
  sets.set(storageKey, new Set(next));
  notify();
  try {
    await Store.setItemAsync(storageKey, JSON.stringify(next));
  } catch {
    // Storage full/blocked — seen-state just won't persist (web parity).
  }
}

/**
 * The red badge count for a tab: hydrates the store, re-renders on any
 * seen-state change, and returns how many tokens are new to this user.
 */
export function useUnseenBadge(userId, category, tokens) {
  const storageKey = seenKey(userId, category);
  useEffect(() => {
    loadSeen(storageKey);
  }, [storageKey]);
  useSyncExternalStore(subscribe, getVersion, getVersion);
  return unseenCount(storageKey, tokens);
}

/** Tests only: forget everything, including hydration state. */
export function _resetSeenForTests() {
  sets.clear();
  loads.clear();
  listeners.clear();
  version = 0;
}
