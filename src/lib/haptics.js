// The haptic layer (rulebook §11): system patterns used strictly by their
// documented meanings — notification haptics for task outcomes, the selection
// tick for values changing. One event, one haptic, forever. Restraint is the
// budget: no haptic on ordinary button presses, and the whole layer can be
// switched off (Profile → Vibration feedback) with the app fully usable
// without it. Failures no-op silently — feedback must never become an error.
import * as Haptics from 'expo-haptics';
import * as SecureStore from 'expo-secure-store';

const KEY = 'towin-haptics';

let enabled = true; // default on until the saved preference loads
let loaded = false;
const listeners = new Set();

const notify = () => listeners.forEach((fn) => fn(enabled));

export async function loadHapticsPreference() {
  if (loaded) return;
  loaded = true;
  try {
    const saved = await SecureStore.getItemAsync(KEY);
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
    await SecureStore.setItemAsync(KEY, enabled ? 'on' : 'off');
  } catch {
    // Persisting is best-effort; the in-session choice still holds.
  }
}

// For the Profile switch: subscribe to changes (returns unsubscribe).
export function subscribeHaptics(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

const fire = (run) => {
  if (!enabled) return;
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
};
