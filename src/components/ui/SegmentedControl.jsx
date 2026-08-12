// Segmented control — the canvas's pill track (3d/3f/3g/4a…): surfaceFill
// track, active chip lifted to segActive (white by day, lighter charcoal by
// night — border-free, the brand's no-shadow elevation), label + tabular
// count.
//
// The chip stays 34pt to the eye; the target around it is a real 44pt box
// (DEEP-08). It used to be 34pt plus hitSlop, which the web build drops
// entirely — so the app's most-used filter, on 8+ screens, was a 34pt target
// at towinly.com/app/ while the design law promises 44. The extra height is
// taken out of the track's vertical padding, so the control lands within 2pt
// of the height it has always drawn.
import { Pressable, Text, View } from 'react-native';
import { haptic } from '../../lib/haptics';
import { useTheme } from '../../theme/ThemeContext';

export default function SegmentedControl({ segments, value, onChange, style }) {
  const { t, radius, type, fontScaleCaps, pressRipple } = useTheme();

  return (
    <View
      accessibilityRole="tablist"
      style={[
        {
          flexDirection: 'row',
          backgroundColor: t.surfaceFill,
          borderRadius: radius.pill,
          paddingHorizontal: 4,
        },
        style,
      ]}
    >
      {segments.map((seg) => {
        const active = seg.key === value;
        return (
          <Pressable
            key={seg.key}
            accessibilityRole="tab"
            accessibilityLabel={
              seg.count != null ? `${seg.label}, ${seg.count}` : seg.label
            }
            // Both spellings on purpose: the web build drops accessibilityState
            // on Pressable (react-native-web forwards aria-* and role only), so
            // without aria-selected the app's one filter control read as three
            // identical tabs at towinly.com/app with no way to hear which
            // list you were looking at.
            aria-selected={active}
            accessibilityState={{ selected: active }}
            onPress={() => {
              // The tick fires only when the value actually changes (§11) —
              // re-tapping the active segment stays silent.
              if (seg.key !== value) haptic.selection();
              onChange(seg.key);
            }}
            android_ripple={pressRipple}
            // Pressed feedback (rulebook: no silent taps) — this is the primary
            // in-screen filter control on 8+ screens and previously gave none.
            style={({ pressed }) => ({
              flex: 1,
              minHeight: 44, // min, not fixed — grows with the OS large-text setting
              justifyContent: 'center',
              opacity: pressed ? 0.7 : 1,
            })}
          >
            {/* The chip the eye sees, inside the box the finger gets. */}
            <View
              style={{
                minHeight: 34,
                paddingVertical: 4,
                borderRadius: radius.pill,
                backgroundColor: active ? t.segActive : 'transparent',
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 4,
                paddingHorizontal: 4,
              }}
            >
              <Text
                numberOfLines={1}
                maxFontSizeMultiplier={fontScaleCaps.chrome}
                style={{
                  // meta, not caption — these are navigation labels (rulebook pass)
                  fontSize: type.meta,
                  fontWeight: '600',
                  color: active ? t.blueDeep : t.inkSlate,
                  // Without flexShrink a long label ("Looking for Help") measures
                  // at its full intrinsic width and pushes the count past the
                  // chip's rounded edge, so the number reads as if it sat outside
                  // the button (user report 2026-07-26).
                  flexShrink: 1,
                }}
              >
                {seg.label}
              </Text>
              {seg.count != null ? (
                <Text
                  maxFontSizeMultiplier={fontScaleCaps.chrome}
                  style={{
                    fontSize: type.segCount,
                    color: active ? t.blueDeep : t.inkFaint2,
                    fontVariant: ['tabular-nums'],
                  }}
                >
                  {seg.count}
                </Text>
              ) : null}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}
