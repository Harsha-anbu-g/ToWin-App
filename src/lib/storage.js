// One key-value store for both platforms.
//
// Phone → expo-secure-store (OS keychain, encrypted at rest).
// Browser → localStorage. A browser has no keychain, so the web build is
// genuinely weaker: anything able to run script on the page can read what is
// stored here. This is the same place the Towinly website already keeps its
// token (Towinly/frontend/src/context/AuthContext.jsx), so the web build adds
// no new exposure — but nothing may be written here that the phone build
// wouldn't also write, and the web build stays a companion to the store apps.
//
// The surface is deliberately identical to the three expo-secure-store calls
// the app already makes, so callers keep their existing behaviour unchanged:
// a throw still means "storage unavailable", and every caller already catches
// that and degrades to in-session-only.
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const isWeb = Platform.OS === 'web';

// What lives behind these three calls is the session JWT, the OAuth PKCE verifier
// and state, and the block list — the list of people an elder is hiding from.
// expo-secure-store defaults to kSecAttrAccessibleWhenUnlocked, which travels in
// encrypted device backups and can restore onto a different phone. Pinning the
// ThisDeviceOnly class keeps all of it on the handset that wrote it
// (OWASP MASTG-BEST-0023). The class MUST be identical on write and read or the
// read silently misses, so it is declared once here and shared by all three.
const KEYCHAIN_OPTIONS = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

/**
 * @param {string} key
 * @returns {Promise<string|null>} the stored value, or null when absent
 */
export async function getItemAsync(key) {
  if (!isWeb) return SecureStore.getItemAsync(key, KEYCHAIN_OPTIONS);
  return window.localStorage.getItem(key);
}

/**
 * @param {string} key
 * @param {string} value
 * @returns {Promise<void>}
 */
export async function setItemAsync(key, value) {
  if (!isWeb) return SecureStore.setItemAsync(key, value, KEYCHAIN_OPTIONS);
  window.localStorage.setItem(key, value);
}

/**
 * @param {string} key
 * @returns {Promise<void>}
 */
export async function deleteItemAsync(key) {
  if (!isWeb) return SecureStore.deleteItemAsync(key, KEYCHAIN_OPTIONS);
  window.localStorage.removeItem(key);
}
