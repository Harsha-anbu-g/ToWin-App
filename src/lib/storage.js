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

/**
 * @param {string} key
 * @returns {Promise<string|null>} the stored value, or null when absent
 */
export async function getItemAsync(key) {
  if (!isWeb) return SecureStore.getItemAsync(key);
  return window.localStorage.getItem(key);
}

/**
 * @param {string} key
 * @param {string} value
 * @returns {Promise<void>}
 */
export async function setItemAsync(key, value) {
  if (!isWeb) return SecureStore.setItemAsync(key, value);
  window.localStorage.setItem(key, value);
}

/**
 * @param {string} key
 * @returns {Promise<void>}
 */
export async function deleteItemAsync(key) {
  if (!isWeb) return SecureStore.deleteItemAsync(key);
  window.localStorage.removeItem(key);
}
