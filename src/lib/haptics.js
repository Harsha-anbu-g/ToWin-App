// The haptic layer (rulebook §11, widened by UX-703): system patterns used
// strictly by their documented meanings — notification haptics for task
// outcomes, the selection tick for values changing, the light impact for a
// real action leaving the finger (primary button, tab change, chat send) and
// the warning pattern for a destructive press. One event, one haptic,
// forever; scrolls and minor touches stay silent. The whole layer can be
// switched off (Profile → Vibration feedback) with the app fully usable
// without it. Failures no-op silently — feedback must never become an error.
import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import * as Store from './storage';
import { KEYS } from './storageKeys';

const KEY = KEYS.haptics;

let enabled = true; // default on until the saved preference loads
let loaded = false;
const listeners = new Set();

const notify = () => listeners.forEach((fn) => fn(enabled));

export async function loadHapticsPreference() {
  if (loaded) return;
  loaded = true;
  try {
    const saved = await Store.getItemAsync(KEY);
    if (saved === 'off') {
      enabled = false;
      notify();
    }
  } catch {
    // Unreadable preference → keep the default; never block startup.
  }
}

export function isHapticsEnabled() {
  return enabled;
}

export async function setHapticsEnabled(next) {
  enabled = !!next;
  notify();
  try {
    await Store.setItemAsync(KEY, enabled ? 'on' : 'off');
  } catch {
    // Persisting is best-effort; the in-session choice still holds.
  }
}

// For the Profile switch: subscribe to changes (returns unsubscribe).
export function subscribeHaptics(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

// expo-haptics has no web implementation, so the browser build simply doesn't
// vibrate — checked up front rather than throwing once per interaction.
const fire = (run) => {
  if (!enabled || Platform.OS === 'web') return;
  try {
    run().catch(() => {});
  } catch {
    // Unsupported device / Expo Go quirk — degrade to nothing, silently.
  }
};

// The strict causal map. Nothing else in the app may vibrate.
export const haptic = {
  // Task outcomes only (a write succeeded / failed) — fired by the toast, so
  // every outcome across the app carries the same physical signature.
  success: () => fire(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  error: () => fire(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)),
  // A value changing under the finger (stars, segments, chips) — the tick.
  selection: () => fire(() => Haptics.selectionAsync()),
  // A real action leaving the finger (primary press, tab change, chat send).
  impact: () => fire(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  // A destructive press — the pattern that says "this one has consequences".
  warning: () => fire(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)),
};
