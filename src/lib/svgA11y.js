// Accessibility props for a TAPPABLE SVG shape, per platform.
//
// On react-native-web, accessibilityRole="button" makes the renderer swap the
// underlying DOM tag for <button> — and an HTML <button> inside an <svg>
// paints nothing at all. The Peekaboo cells vanished this way (2026-08-02):
// twelve invisible <button points=...> elements on the shell. So on web the
// shape keeps its real SVG tag and speaks through aria-label only; on native
// TalkBack/VoiceOver still get the full button semantics.
import { Platform } from 'react-native';

export function svgButtonA11y(label) {
  if (Platform.OS === 'web') {
    return { accessible: true, accessibilityLabel: label };
  }
  return { accessible: true, accessibilityRole: 'button', accessibilityLabel: label };
}
