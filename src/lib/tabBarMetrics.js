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
//
// The phone-web build floats too (owner call 2026-08-28: "the bottom bar
// should not touch the left and right edge of the phone, reduce the size like
// WhatsApp"). Phones on towinly.com get this build in place of the iOS app,
// and a browser has no bottom-bar convention of its own to keep, so the web
// bar wears the iOS capsule rather than the only edge-to-edge bar left.
import { Platform } from 'react-native';

// Measured off the owner's WhatsApp screenshot (2026-08-28, iPhone 16 Pro,
// "see this, I need like this"): capsule ~360pt wide on a 402pt screen (~21pt
// each side), ~74pt tall, bottom edge ~23pt above the screen's bottom edge,
// so it sits INSIDE the home-indicator zone rather than above it. Ours had
// the width right (20pt in, since build 17) but floated 40pt up and read as
// a slab on a shelf. These numbers are that screenshot.
export const TAB_BAR_HEIGHT = 72;
/** The raised centre circle's diameter (CenterActionButton). */
export const TAB_BAR_FAB_SIZE = 50;
/**
 * How far the capsule's bottom edge sits above the screen's bottom edge:
 * the home-indicator inset minus this overlap (34 − 11 = 23 on a 16 Pro),
 * never less than TAB_BAR_LIFT on a phone with no indicator.
 */
export const TAB_BAR_INDICATOR_OVERLAP = 11;
export const TAB_BAR_LIFT = 8;
// The capsule spans the screen with a small, fixed gap either side, the way
// WhatsApp's does (owner, 2026-08-28: "it will not touch both the edge of the
// phone, it will have a very very small gap"). 21 is WhatsApp's own gap,
// measured off the owner's screenshots (62px at 2.95px/pt on an iPhone 16
// Pro). Everything else was tried the same day: a capsule sized to its tabs
// left 36pt either side on a Pro Max (too much); 16 read as touching next to
// the phone's rounded corner (owner, side by side with WhatsApp: "you can
// see a gap in WhatsApp, I need the same"); 12 was called touching on
// 2026-08-26.
export const TAB_BAR_MARGIN = 21; // WhatsApp's gap, the capsule's inset from each screen side
export const TAB_BAR_RADIUS = TAB_BAR_HEIGHT / 2; // fully round ends = capsule

/**
 * The floating capsule's width on this screen width: the screen minus the
 * gap on each side. The layout and the glass lens both read this, so they
 * agree.
 */
export function tabBarCapsuleWidth(windowWidth) {
  return windowWidth - 2 * TAB_BAR_MARGIN;
}

export const isFloatingTabBar = Platform.OS !== 'android';

/** The floating capsule's `bottom`, measured from the screen's bottom edge. */
export function tabBarBottom(insets) {
  if (!isFloatingTabBar) return 0;
  return Math.max((insets?.bottom ?? 0) - TAB_BAR_INDICATOR_OVERLAP, TAB_BAR_LIFT);
}

// The vertical band the bar occupies, measured from the bottom screen edge.
// Anything pinned above the bar (Ask AI pill, toasts) starts its own offset
// here.
export function tabBarSpace(insets) {
  if (isFloatingTabBar) return tabBarBottom(insets) + TAB_BAR_HEIGHT;
  return TAB_BAR_HEIGHT + insets.bottom;
}
