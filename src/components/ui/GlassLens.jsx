// The lens material — the family-switch pattern applied to glass (owner
// call 2026-08-17: "see the family switch code and create the slide like
// WhatsApp"). The family switch is perfect because Apple draws it; this
// does the same for the gliding lens: on an iPhone that can draw Liquid
// Glass (iOS 26+), the capsule IS Apple's real glass. Everywhere else —
// older iOS, Android, web, Jest — it falls back to the blur-and-wash
// composite. Purely a material: the parent owns size, position, borders,
// and motion.
//
// The availability probe moved to ./glass 2026-08-22, when the tab bar and
// the Ask AI pill started asking the same question.
import { Platform, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { FILL, GlassView } from './glass';

export { hasLiquidGlass } from './glass';

// The browser's stand-in for Liquid Glass (owner call 2026-09-04: the phone
// web build looks like the iOS app). Like the real material it draws its own
// edge — a bright inner rim — so parents give it no border of their own; the
// hairline-plus-wash composite below read as the milky lens the owner sent
// back on 2026-08-19.
export const isWebGlass = Platform.OS === 'web';
const WEB_RIM = {
  light: { boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.85)' },
  dark: { boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.12)' },
};

export default function GlassLens({ tint, washColor, washOpacity = 0.75 }) {
  if (GlassView) {
    // colorScheme={tint}: the app's night mode is opt-in only — the glass
    // must follow the app's theme, never the OS setting.
    return <GlassView style={FILL} glassEffectStyle="regular" tintColor={washColor} colorScheme={tint} />;
  }
  if (isWebGlass) {
    return (
      <>
        <BlurView intensity={22} tint={tint} style={FILL} />
        <View style={[FILL, { backgroundColor: washColor, opacity: washOpacity }]} />
        <View testID="glass-rim" pointerEvents="none" style={[FILL, WEB_RIM[tint] ?? WEB_RIM.light]} />
      </>
    );
  }
  return (
    <>
      {/* Android's view blur is costly and uneven — wash alone reads fine. */}
      {Platform.OS !== 'android' ? <BlurView intensity={22} tint={tint} style={FILL} /> : null}
      <View
        style={[
          FILL,
          { backgroundColor: washColor, opacity: Platform.OS === 'android' ? 0.95 : washOpacity },
        ]}
      />
    </>
  );
}
