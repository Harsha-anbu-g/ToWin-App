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

export default function GlassLens({ tint, washColor, washOpacity = 0.75 }) {
  if (GlassView) {
    // colorScheme={tint}: the app's night mode is opt-in only — the glass
    // must follow the app's theme, never the OS setting.
    return <GlassView style={FILL} glassEffectStyle="regular" tintColor={washColor} colorScheme={tint} />;
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
