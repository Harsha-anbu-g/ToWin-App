// The lens material — the family-switch pattern applied to glass (owner
// call 2026-08-17: "see the family switch code and create the slide like
// WhatsApp"). The family switch is perfect because Apple draws it; this
// does the same for the gliding lens: on an iPhone that can draw Liquid
// Glass (iOS 26+), the capsule IS Apple's real glass via expo-glass-effect.
// Everywhere else — older iOS, Android, web, Jest — it falls back to the
// blur-and-wash composite. Purely a material: the parent owns size,
// position, borders, and motion.
import { Platform, View } from 'react-native';
import { BlurView } from 'expo-blur';

// Guarded require, like pushNotifications' lazy expo-notifications: if the
// native module is missing (older Expo Go, web, tests) the require or the
// availability probe throws or answers false, and the fallback ships —
// the bar must never crash over a nicety.
let GlassView = null;
try {
  const glass = require('expo-glass-effect');
  if (Platform.OS === 'ios' && glass?.isLiquidGlassAvailable?.()) {
    GlassView = glass.GlassView;
  }
} catch {
  GlassView = null;
}

// Parents drop their hairline border when the real glass draws its own edge.
export const hasLiquidGlass = !!GlassView;

const FILL = { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 };

export default function GlassLens({ tint, washColor, washOpacity = 0.75 }) {
  if (GlassView) {
    return <GlassView style={FILL} glassEffectStyle="regular" tintColor={washColor} />;
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
