// The tab bar's footprint, in one place. Three things float in the bar's
// band — the bar itself, the Ask AI pill, and toasts — and each used to carry
// its own copy of "76 + the safe-area inset". One module now owns the shape so
// the three can never drift apart.
//
// On iOS the bar is a detached capsule floating above the home indicator with
// content visible around it — the iOS 26 grammar (owner call 2026-08-22,
// pointing at WhatsApp and Instagram: "see the bottom i need like this").
// Android keeps its platform's own edge-to-edge bar: copying an iOS shape onto
// Android would be hand-drawing another platform's control (CLAUDE.md, native
// controls first).
import { Platform } from 'react-native';

export const TAB_BAR_HEIGHT = 76; // room for the raised center circle (2026-07-27)
export const TAB_BAR_GAP = 6; // air between the capsule and the home indicator
export const TAB_BAR_MARGIN = 12; // the capsule's inset from the screen sides
export const TAB_BAR_RADIUS = TAB_BAR_HEIGHT / 2; // fully round ends = capsule

export const isFloatingTabBar = Platform.OS === 'ios';

// The vertical band the bar occupies, measured from the bottom screen edge.
// Anything pinned above the bar (Ask AI pill, toasts) starts its own offset
// here.
export function tabBarSpace(insets) {
  if (isFloatingTabBar) return insets.bottom + TAB_BAR_GAP + TAB_BAR_HEIGHT;
  return TAB_BAR_HEIGHT + insets.bottom;
}
