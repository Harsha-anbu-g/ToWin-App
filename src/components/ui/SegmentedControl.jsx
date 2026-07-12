// Segmented control — the canvas's pill track (3d/3f/3g/4a…): surfaceFill
// track, active chip lifted to segActive (white by day, lighter charcoal by
// night — border-free, the brand's no-shadow elevation), label + tabular
// count. Segments are 34pt visually; hitSlop tops every target up to >=44pt.
import { Pressable, Text, View } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';

export default function SegmentedControl({ segments, value, onChange, style }) {
  const { t, radius, type } = useTheme();

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
            onPress={() => onChange(seg.key)}
            hitSlop={{ top: 5, bottom: 5 }}
            style={{
              flex: 1,
              minHeight: 34, // min, not fixed — grows with the OS large-text setting
              paddingVertical: 4,
              borderRadius: radius.pill,
              backgroundColor: active ? t.segActive : 'transparent',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 5,
              paddingHorizontal: 4,
            }}
          >
            <Text
              numberOfLines={1}
              style={{
                fontSize: type.caption,
                fontWeight: '600',
                color: active ? t.blueDeep : t.inkSlate,
              }}
            >
              {seg.label}
            </Text>
            {seg.count != null ? (
              <Text
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
