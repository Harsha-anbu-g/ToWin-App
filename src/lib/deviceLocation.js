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
 * Save a rounded position against the account. The endpoint already exists for
 * the website's browser geolocation (PUT /profile/location, every field
 * optional), so nothing server-side changes.
 */
export async function savePosition(position) {
  if (!position) return false;
  try {
    await api.put('/profile/location', position);
    return true;
  } catch {
    // A failed save is not worth a banner: the person asked to find friends,
    // not to manage a sync. The next visit tries again.
    return false;
  }
}

/** Ask, read, save. Returns the status so the screen can say what happened. */
export async function enableAndSave() {
  const status = await requestPermission();
  if (status !== STATUS.allowed) return { status, position: null };
  const position = await readCoarsePosition();
  if (position) await savePosition(position);
  return { status, position };
}
