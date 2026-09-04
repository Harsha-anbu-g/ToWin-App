// The bottom scroll edge, WhatsApp's grammar (owner call 2026-08-30: "the
// bottom bar — after that, it will blur — i need the same"). A native iOS 26
// tab bar gets this from the system: rows sliding into the bar's band blur
// progressively toward the screen edge instead of staying knife-sharp beside
// the floating capsule. Our bar is custom (the centre FAB rules out native
// tabs), so the system never draws the effect and only the capsule itself
// blurred — the list ran sharp to the home indicator. This band is that
// missing layer.
//
// Four stacked BlurViews approximate the progressive ramp: every layer is
// pinned to the bottom, and each shorter one blurs harder, so the effect
// compounds toward the screen edge while each layer's own top seam stays too
// faint to see. The literal implementation is one gradient-masked blur, but
// a mask needs a native module this build doesn't carry — and UIKit doesn't
// support masking a UIVisualEffectView anyway.
//
// It renders inside the scene (the tab navigator's screenLayout), which puts
// it over the scrolling content but under the tab bar, the FAB and the Ask
// AI pill — the capsule's rim and labels stay crisp. pointerEvents none:
// purely visual, so taps land on the real rows beneath, exactly as they do
// in the gaps around WhatsApp's capsule.
import { View } from 'react-native';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { isFloatingTabBar, tabBarSpace } from '../../lib/tabBarMetrics';
import { useTheme } from '../../theme/ThemeContext';

// Each layer covers a share of the band, measured up from the bottom edge.
// The tall layers stay gentle so their top seams vanish; the short bottom
// layers carry the weight where they overlap.
const LAYERS = [
  { share: 1, intensity: 8 },
  { share: 0.7, intensity: 10 },
  { share: 0.45, intensity: 14 },
  { share: 0.26, intensity: 18 },
];

// The ramp reaches this far above the capsule's top so the blur eases out
// instead of stopping level with the bar.
const FADE_HEADROOM = 14;

export default function BottomEdgeBlur() {
  const insets = useSafeAreaInsets();
  const { mode } = useTheme();
  // Android keeps its solid edge-to-edge bar — nothing scrolls behind it, so
  // there is no edge to soften (native controls first).
  if (!isFloatingTabBar) return null;
  const band = tabBarSpace(insets) + FADE_HEADROOM;
  const tint = mode === 'dark' ? 'dark' : 'light';
  return (
    <View
      testID="bottom-edge-blur"
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: band }}
    >
      {LAYERS.map(({ share, intensity }) => (
        <BlurView
          key={share}
          testID="bottom-edge-blur-layer"
          tint={tint}
          intensity={intensity}
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            height: Math.round(band * share),
          }}
        />
      ))}
    </View>
  );
}
