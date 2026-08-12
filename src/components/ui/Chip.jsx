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
export default memo(function Chip({
  label,
  selected = false,
  neutral = false,
  onPress,
  style,
  // "radio" when the chip row is one exclusive answer, so a screen reader
  // announces a choice rather than a row of unrelated buttons.
  accessibilityRole = 'button',
  // A radio announces CHECKED, not selected, and aria-checked is the one
  // spelling both builds read: react-native-web forwards aria-* and drops
  // accessibilityState on Pressable, RN 0.81 folds aria-checked back into
  // accessibilityState (SHIP-606). A radio chip therefore says which one it
  // is with this prop, and it doubles as the chosen look so a row of options
  // has one source of truth, not two that can drift apart.
  'aria-checked': ariaChecked,
}) {
  const { t, radius, type, fontScaleCaps, pressRipple } = useTheme();

  const chosen = ariaChecked ?? selected;
  const backgroundColor = chosen ? t.blueWash : neutral ? t.surfaceFill : t.canvas;
  const borderColor = chosen ? t.blueSoft : t.border;
  const color = chosen ? t.blueDeep : neutral ? t.inkSlate : t.ink;

  return (
    <Pressable
      accessibilityRole={accessibilityRole}
      accessibilityLabel={label}
      aria-checked={ariaChecked}
      accessibilityState={{ selected: chosen }}
      onPress={onPress}
      disabled={!onPress}
      android_ripple={pressRipple}
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
      {chosen ? <Check size={14} color={t.blueDeep} strokeWidth={2} /> : null}
      <Text maxFontSizeMultiplier={fontScaleCaps.body} style={{ fontSize: type.meta, fontWeight: '600', color }}>
        {label}
      </Text>
    </Pressable>
  );
});
