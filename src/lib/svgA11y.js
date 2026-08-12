// Accessibility props for a TAPPABLE SVG shape, per platform.
//
// On react-native-web, accessibilityRole="button" makes the renderer swap the
// underlying DOM tag for <button> — and an HTML <button> inside an <svg>
// paints nothing at all. The Peekaboo cells vanished this way (2026-08-02):
// twelve invisible <button points=...> elements on the shell. So on web the
// shape keeps its real SVG tag and speaks through aria-label only; on native
// TalkBack/VoiceOver still get the full button semantics.
//
// The role cannot come back: the swap fires on `role` and `accessibilityRole`
// alike (react-native-web's modules/AccessibilityUtil/propsToAccessibilityComponent
// maps role "button" to the button element before any prop is read). Focus and
// keyboard activation do not need it, and without them the shapes were also
// left out of the tab order with no way to play the game from a keyboard
// (DEEP-35), so those come back instead: tabIndex reaches the DOM untouched,
// and Enter/Space raise the same click react-native-svg already maps onPress
// to.
import { Platform } from 'react-native';

// An SVG element has no .click() — that lives on HTMLElement — so activation is
// a real bubbling click event, which React picks up at the root exactly as it
// picks up a mouse click on the same shape.
function activateOnKey(event) {
  if (event.key !== 'Enter' && event.key !== ' ') return;
  const Click = globalThis.MouseEvent;
  const node = event.currentTarget;
  if (typeof Click !== 'function' || !node?.dispatchEvent) return;
  event.preventDefault(); // Space would scroll the page out from under the board
  node.dispatchEvent(new Click('click', { bubbles: true, cancelable: true }));
}

export function svgButtonA11y(label) {
  if (Platform.OS === 'web') {
    return {
      accessible: true,
      accessibilityLabel: label,
      tabIndex: 0,
      onKeyDown: activateOnKey,
    };
  }
  return { accessible: true, accessibilityRole: 'button', accessibilityLabel: label };
}
