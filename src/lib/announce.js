// One way to say something to a screen reader, on every platform.
//
// On a phone that is AccessibilityInfo.announceForAccessibility. In a browser
// it is nothing at all — react-native-web ships it as an empty function, so
// every announcement the app makes today ("Thinking…", the AI's reply, "You're
// offline") is silently dropped for the people who most need it.
//
// The web replacement is an always-mounted aria-live region (LiveRegion, in
// the root layout) that this module writes into. It has to be mounted before
// the message arrives: a live region that appears at the same moment as its
// text is frequently missed by screen readers, which is why LiveRegion renders
// empty rather than conditionally.
import { AccessibilityInfo, Platform } from 'react-native';

const isWeb = Platform.OS === 'web';

let sink = null;

/**
 * Called by LiveRegion to receive announcements. Not for general use.
 * @param {(message: string) => void} fn
 * @returns {() => void} deregister
 */
export function setAnnouncer(fn) {
  sink = fn;
  return () => {
    if (sink === fn) sink = null;
  };
}

/**
 * Say something out loud to assistive technology. Visual users see nothing.
 * @param {string} message
 */
export function announce(message) {
  if (!message) return;
  if (isWeb) {
    // No sink means the root layout isn't mounted yet — dropping the message
    // is correct; there is nobody listening to hear it.
    sink?.(message);
    return;
  }
  AccessibilityInfo.announceForAccessibility(message);
}
