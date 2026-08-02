// The session bridge between the app's web build and the Towinly website.
//
// On towinly.com/app/ the two are the SAME ORIGIN, so they share one
// localStorage — and today they keep two different tokens in it: the website
// under 'token', the app under 'towin-token'. Left alone that means signing in
// on a phone leaves the marketing pages thinking you're a stranger, and worse,
// tapping "Log out" in the app leaves the website session wide open on a
// shared phone. That last one is a safety fault, not a convenience gap.
//
// So: read the website's token when the app has none, keep it in step on
// sign-in, delete it on sign-out, and listen for the browser's `storage`
// event so another tab (or the website itself) signing out takes this tab with
// it.
//
// On a phone every function here is a no-op — the keychain is the only store
// and there is no second product sharing it.
import { Platform } from 'react-native';
import { KEYS, SHARED_SESSION_TOKEN } from './storageKeys';

const isWeb = Platform.OS === 'web';

// Keys whose change means "the signed-in session changed somewhere else".
const SESSION_KEYS = [SHARED_SESSION_TOKEN, KEYS.authToken];

/**
 * The website's stored JWT, or null when absent, unreadable, or on native.
 * @returns {string|null}
 */
export function readWebsiteToken() {
  if (!isWeb) return null;
  try {
    return window.localStorage.getItem(SHARED_SESSION_TOKEN);
  } catch {
    // private mode / storage blocked — behave as if signed out
    return null;
  }
}

/**
 * Sign the website in alongside the app.
 * @param {string} token
 */
export function writeWebsiteToken(token) {
  if (!isWeb) return;
  try {
    window.localStorage.setItem(SHARED_SESSION_TOKEN, token);
  } catch {
    // storage blocked — the app session still holds for this tab
  }
}

/** Sign the website out alongside the app. Never skipped on logout. */
export function clearWebsiteToken() {
  if (!isWeb) return;
  try {
    window.localStorage.removeItem(SHARED_SESSION_TOKEN);
  } catch {
    // storage blocked — nothing was persisted to clear
  }
}

/**
 * Hear about sign-in/sign-out that happened in ANOTHER tab or document of this
 * origin (the browser never fires `storage` in the tab that did the writing).
 *
 * @param {(token: string|null) => void} handler called with the new token, or
 *   null when the session was cleared elsewhere
 * @returns {() => void} unsubscribe
 */
export function subscribeSessionChanges(handler) {
  if (!isWeb) return () => {};
  const onStorage = (event) => {
    // key === null means localStorage.clear() — nothing specific to react to.
    if (event.key === null) return;
    if (!SESSION_KEYS.includes(event.key)) return;
    handler(event.newValue ?? null);
  };
  window.addEventListener('storage', onStorage);
  return () => window.removeEventListener('storage', onStorage);
}
