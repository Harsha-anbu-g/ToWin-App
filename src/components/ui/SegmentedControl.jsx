// Segmented control — the canvas's pill track (3d/3f/3g/4a…): surfaceFill
// track, active chip lifted to segActive (white by day, lighter charcoal by
// night — border-free, the brand's no-shadow elevation), label + tabular
// count. Segments are 34pt visually; hitSlop tops every target up to >=44pt.
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
          padding: 4,
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
            accessibilityState={{ selected: active }}
            onPress={() => {
              // The tick fires only when the value actually changes (§11) —
              // re-tapping the active segment stays silent.
              if (seg.key !== value) haptic.selection();
              onChange(seg.key);
            }}
            android_ripple={pressRipple}
            hitSlop={{ top: 5, bottom: 5 }}
            // Pressed feedback (rulebook: no silent taps) — this is the primary
            // in-screen filter control on 8+ screens and previously gave none.
            style={({ pressed }) => ({
              flex: 1,
              minHeight: 34, // min, not fixed — grows with the OS large-text setting
              paddingVertical: 4,
              borderRadius: radius.pill,
              backgroundColor: active ? t.segActive : 'transparent',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 4,
              paddingHorizontal: 4,
              opacity: pressed ? 0.7 : 1,
            })}
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
          </Pressable>
        );
      })}
    </View>
  );
}
