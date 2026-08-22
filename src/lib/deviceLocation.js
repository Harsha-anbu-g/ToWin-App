// Where this phone is, rounded, and only ever while somebody is looking at
// the Add Friends screen.
//
// The app had no location at all before this (2026-08-19). The only position
// anyone had was the town they typed in Profile > Edit, geocoded to that
// town's single centre point, so everybody in one town sat on one dot and
// every card read "0 km". Signup never asked for a town either, so many
// members had no position whatsoever.
//
// Three rules this module exists to hold:
//   1. Nothing is read until the person has agreed on our own screen first.
//      iOS shows its system prompt ONCE per install; spending it before the
//      person knows why means a refusal we can never ask about again.
//   2. Whatever the phone returns is rounded by src/lib/coarseLocation before
//      it can reach the network. See that file for the reason.
//   3. Foreground only. No background permission, no tracking. An app for
//      elderly people has no business knowing where they are while it is shut.
//
// expo-location is required lazily inside each function, exactly like
// pushNotifications.js: the same bundle serves the web build at
// towinly.com/app/, and expo-location's entry point is a bare
// requireNativeModule('ExpoLocation') that throws the moment it is evaluated
// where the native module is absent. A static import here would take down
// every screen that reaches this file.
import { Platform } from 'react-native';
import api from '../api/client';
import { coarsen } from './coarseLocation';
import * as Store from './storage';
import { locationKey } from './storageKeys';

const location = () => require('expo-location');

/** Web falls through to the browser's own geolocation via expo-location. */
const supported = () => Platform.OS !== 'web';

/** What the screen needs to know, without leaking the library's vocabulary. */
export const STATUS = {
  unknown: 'unknown', // not asked yet on this device
  allowed: 'allowed',
  refused: 'refused', // said no, and can be asked again
  blocked: 'blocked', // said no for good; only Settings can undo it
  off: 'off', // location switched off for the whole phone
  unsupported: 'unsupported',
};

/**
 * What the OS thinks right now, WITHOUT prompting. Safe to call on render.
 */
export async function currentStatus() {
  if (!supported()) return STATUS.unsupported;
  try {
    const Location = location();
    if (!(await Location.hasServicesEnabledAsync())) return STATUS.off;
    const { granted, canAskAgain } = await Location.getForegroundPermissionsAsync();
    if (granted) return STATUS.allowed;
    return canAskAgain ? STATUS.unknown : STATUS.blocked;
  } catch {
    // A missing native module or a throwing probe must never break a screen.
    return STATUS.unsupported;
  }
}

/**
 * Ask the OS. Only ever call this straight after the person has said yes on
 * our own primer, because on iOS this is the one chance there is.
 */
export async function requestPermission() {
  if (!supported()) return STATUS.unsupported;
  try {
    const Location = location();
    if (!(await Location.hasServicesEnabledAsync())) return STATUS.off;
    const { granted, canAskAgain } = await Location.requestForegroundPermissionsAsync();
    if (granted) return STATUS.allowed;
    return canAskAgain ? STATUS.refused : STATUS.blocked;
  } catch {
    return STATUS.unsupported;
  }
}

/**
 * One rounded fix, or null. Balanced accuracy on purpose: this answers "how
 * far away is this person", not "which side of the street", and the reading is
 * rounded to a ~2 km cell immediately afterwards, so paying for a GPS-grade
 * fix would only cost the person battery for precision that is thrown away.
 * A last-known fix is taken first when one is to hand, because it is instant
 * and, once rounded, indistinguishable from a fresh one.
 */
export async function readCoarsePosition() {
  if (!supported()) return null;
  try {
    const Location = location();
    const last = await Location.getLastKnownPositionAsync({ maxAge: 10 * 60 * 1000 });
    const fix =
      last ?? (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }));
    return coarsen(fix?.coords);
  } catch {
    // Timeout, no signal indoors, services switched off mid-read: all of them
    // mean the same thing to the screen, which is "no position this time".
    return null;
  }
}

/**
 * What this phone recorded the last time a save went through, or null.
 *
 * The API cannot be asked: ProfileResponse carries `city` and no coordinates,
 * and PUT /profile/location returns Void. So the phone keeps its own note, and
 * that note is the app's answer to "does this person have a position yet".
 * A town typed on the website counts as no position on purpose: replacing a
 * town centre with a real cell is the whole point of asking.
 *
 * @param {string|undefined|null} userId
 * @returns {Promise<{locationLat: number, locationLng: number, savedAt: number}|null>}
 */
export async function readSavedPosition(userId) {
  try {
    const raw = await Store.getItemAsync(locationKey(userId));
    if (!raw) return null;
    const saved = JSON.parse(raw);
    const coarse = coarsen({ latitude: saved?.locationLat, longitude: saved?.locationLng });
    if (!coarse) return null;
    // A note written by an older build, or half-written, must read as "no
    // position" rather than as a position from the epoch.
    const savedAt = Number.isFinite(saved?.savedAt) ? saved.savedAt : 0;
    return { ...coarse, savedAt };
  } catch {
    // Unparseable, or a keychain that will not open: both mean the same thing
    // to a screen, which is "ask again".
    return null;
  }
}

/**
 * Save a rounded position against the account. The endpoint already exists for
 * the website's browser geolocation (PUT /profile/location, every field
 * optional), so nothing server-side changes.
 *
 * This is the ONE save path. It coarsens again before the PUT even though
 * readCoarsePosition already did: coarsen() is idempotent on an already-snapped
 * pair, so it costs nothing here and it closes every call site that might one
 * day hand this function a raw fix.
 *
 * @param {{locationLat: number, locationLng: number}|null} position
 * @param {string|undefined|null} userId who the record belongs to
 */
export async function savePosition(position, userId) {
  const coarse = coarsen({ latitude: position?.locationLat, longitude: position?.locationLng });
  if (!coarse) return false;
  try {
    await api.put('/profile/location', coarse);
  } catch {
    // A failed save is not worth a banner: the person asked to find friends,
    // not to manage a sync. No record is written, so the next visit tries again.
    return false;
  }
  try {
    await Store.setItemAsync(
      locationKey(userId),
      JSON.stringify({ ...coarse, savedAt: Date.now() })
    );
  } catch {
    // The position IS saved against the account; only this phone's note failed.
    // Saying false here would tell the screen the save did not happen.
  }
  return true;
}

/**
 * Ask, read, save. Returns the status so the screen can say what happened.
 * @param {string|undefined|null} userId who the record belongs to
 */
export async function enableAndSave(userId) {
  const status = await requestPermission();
  if (status !== STATUS.allowed) return { status, position: null };
  const position = await readCoarsePosition();
  if (position) await savePosition(position, userId);
  return { status, position };
}

/**
 * Read and save again without prompting. Only ever called where permission is
 * already `allowed`, so no system dialog can appear.
 * @param {string|undefined|null} userId
 */
export async function refreshSavedPosition(userId) {
  const position = await readCoarsePosition();
  if (!position) return null;
  const saved = await savePosition(position, userId);
  return saved ? position : null;
}
