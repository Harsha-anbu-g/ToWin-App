// One place asks the phone whether it can draw Apple's Liquid Glass, and one
// place holds the answer. Every surface that wants the real material — the tab
// bar, the Ask AI pill, the segmented lens — reads it from here, so the probe
// runs once at import and no two surfaces can disagree about the device.
//
// Guarded require, like pushNotifications' lazy expo-notifications: on older
// Expo Go, on Android, on web and under Jest either the native module or the
// availability probe is missing, and callers ship their blur-and-wash fallback
// instead. A nicety must never crash a screen.
import { Platform } from 'react-native';

let resolved = null;
try {
  const glass = require('expo-glass-effect');
  if (Platform.OS === 'ios' && glass?.isLiquidGlassAvailable?.()) {
    resolved = glass.GlassView;
  }
} catch {
  resolved = null;
}

// The real material, or null. Null is the signal to draw the fallback.
export const GlassView = resolved;

// Parents drop their own hairline border and their own translucent wash when
// this is true: Apple's glass draws its own edge, and a 72%-opaque wash laid
// over Liquid Glass is just a wash.
export const hasLiquidGlass = !!resolved;

// Fills the parent. Both the glass and every fallback layer are backgrounds.
export const FILL = { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 };
