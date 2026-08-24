// The native launch screen (tortoise in the middle, "from Towinly" at the
// foot — plugins/withSplashBranding) stays up until the app can paint its
// first real screen, then fades over it. WhatsApp's pattern: one branded
// screen, then the app. Without the hold the splash drops the moment React
// mounts, and a phone shows the font-gate skeleton for a beat instead.
//
// A stuck launch screen is the worst possible outcome — it reads as a frozen
// app — so the hold has a hard ceiling that releases no matter what.
import { Platform } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';

// Under the 300ms UI-motion ceiling (Emil rules). iOS only; Android cuts.
export const SPLASH_FADE_MS = 250;
// Fonts are bundled and the session restore is a keychain read, so the real
// wait is well under a second. The ceiling only ever fires when something
// upstream is broken, and then a blank screen beats a frozen one.
export const SPLASH_MAX_HOLD_MS = 4000;

let released = false;
let ceiling = null;

const isNative = () => Platform.OS !== 'web';

/**
 * Keep the native splash up until releaseSplash(). Call once, at module
 * scope of the root layout — inside a component it can already be too late.
 */
export function holdSplash() {
  if (!isNative()) return;
  SplashScreen.setOptions({ fade: true, duration: SPLASH_FADE_MS });
  // Rejects when the splash is already gone (dev reloads); nothing to do then.
  SplashScreen.preventAutoHideAsync().catch(() => {});
  ceiling = setTimeout(releaseSplash, SPLASH_MAX_HOLD_MS);
}

/** Let the first screen through. Safe to call more than once. */
export function releaseSplash() {
  if (!isNative() || released) return;
  released = true;
  clearTimeout(ceiling);
  SplashScreen.hideAsync().catch(() => {});
}
