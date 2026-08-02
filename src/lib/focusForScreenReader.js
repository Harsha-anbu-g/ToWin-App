// Move screen-reader focus to a just-shown element, on every platform.
//
// Android's Modal doesn't relocate TalkBack focus on its own, so the sheets
// hand focus to their header from onShow. On native that requires
// findNodeHandle — but on react-native-web findNodeHandle THROWS ("not
// supported on web"), and because onShow runs inside React's commit, the
// throw unmounted the entire app: tapping ☰ or Ask AI in a browser was a
// white screen. On web the ref already IS the DOM node, so we focus it
// directly (a quiet no-op when the node isn't focusable — the modal's
// aria-modal semantics still scope the screen reader correctly).
import { AccessibilityInfo, Platform, findNodeHandle } from 'react-native';

export default function focusForScreenReader(ref) {
  const target = ref?.current;
  if (!target) return;
  if (Platform.OS === 'web') {
    target.focus?.();
    return;
  }
  const node = findNodeHandle(target);
  if (node) AccessibilityInfo.setAccessibilityFocus(node);
}
