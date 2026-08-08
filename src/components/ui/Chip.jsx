// Chip — canvas select chips (3e "Kind of help", filters) in M3 selected-state
// grammar: idle = white card + hairline border; selected = tonal blueWash,
// blueSoft border, blueDeep label with a leading check. `neutral` renders the
// quiet surfaceFill status pill (3f). The 44pt target is real box, not hitSlop:
// chips wrap in grids with an 8pt gap, and slop would eat that inert space.
import { Check } from 'lucide-react-native';
import { memo } from 'react';
import { Pressable, Text } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';

// memo'd so a keystroke elsewhere in a form doesn't re-render every chip row.
export default memo(function Chip({ label, selected = false, neutral = false, onPress, style }) {
  const { t, radius, type, fontScaleCaps } = useTheme();

  const backgroundColor = selected ? t.blueWash : neutral ? t.surfaceFill : t.canvas;
  const borderColor = selected ? t.blueSoft : t.border;
  const color = selected ? t.blueDeep : neutral ? t.inkSlate : t.ink;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      onPress={onPress}
      disabled={!onPress}
      // Pressed feedback (rulebook: no silent taps) — chips are among the
      // most-tapped controls and previously gave none.
      style={({ pressed }) => [
        {
          minHeight: 44, // min, not fixed — grows with the OS large-text setting
          paddingVertical: 8,
          paddingHorizontal: 16, // constant — no shift when the check appears
          borderRadius: radius.pill,
          backgroundColor,
          borderWidth: 1,
          borderColor,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 4,
          alignSelf: 'flex-start',
          opacity: pressed ? 0.7 : 1,
        },
        style,
      ]}
    >
      {selected ? <Check size={14} color={t.blueDeep} strokeWidth={2} /> : null}
      <Text maxFontSizeMultiplier={fontScaleCaps.body} style={{ fontSize: type.meta, fontWeight: '600', color }}>
        {label}
      </Text>
    </Pressable>
  );
});
