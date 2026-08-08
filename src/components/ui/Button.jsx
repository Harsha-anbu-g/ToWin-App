// Button — the canvas's own button language, not a component library's:
//   primary     filled sky pill, 50pt, white 16/600 (ONE per screen)
//   secondary   tonal wash chip — blueWash fill, blueSoft border, blueDeep text
//   text        quiet blueDeep label, no chrome
//   destructive parchment card fill, red hairline, redDeep text
// Same API as before so every screen keeps working. >=44pt targets; heights
// are MINIMUMS so large OS text (elder-first) wraps to 2 lines instead of
// clipping inside a fixed pill.
import { ActivityIndicator, Pressable, Text } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';

export default function Button({
  title,
  onPress,
  variant = 'primary',
  // size="small" is the ONE sanctioned compact pill (38pt visual) for inside
  // cards — hitSlop keeps the effective target ≥44pt. No hand-rolled pills.
  size = 'regular',
  disabled = false,
  loading = false,
  style,
  accessibilityLabel,
  accessibilityHint,
}) {
  const { t, radius, text, fontScaleCaps } = useTheme();
  const blocked = disabled || loading;
  const small = size === 'small';

  const shell = {
    primary: {
      minHeight: 50,
      backgroundColor: disabled ? t.btnDisabled : t.actionFill,
      borderWidth: 0,
    },
    // Ghost, like the website's .ghost-btn — no fill, hairline sky border.
    // A wash-filled pill reads "generated"; a printed hairline reads designed.
    secondary: {
      minHeight: 44,
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: t.blueSoft,
    },
    text: {
      minHeight: 44,
      backgroundColor: 'transparent',
      borderWidth: 0,
    },
    // Plain red text, iOS-style — destructive must not share the pill shape
    // of ordinary actions (it reads as "just another button" otherwise).
    destructive: {
      minHeight: 44,
      backgroundColor: 'transparent',
      borderWidth: 0,
    },
  }[variant];

  const label = {
    primary: { color: t.actionInk, fontSize: text.sm },
    secondary: { color: t.blueDeep, fontSize: text.sm },
    text: { color: t.blueDeep, fontSize: text.sm },
    destructive: { color: t.redDeep, fontSize: text.sm },
  }[variant];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: blocked, busy: loading }}
      disabled={blocked}
      onPress={onPress}
      hitSlop={small ? { top: 4, bottom: 4 } : undefined}
      style={({ pressed }) => [
        {
          borderRadius: radius.pill,
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'row',
          gap: 8,
          paddingHorizontal: 20,
          paddingVertical: small ? 6 : 8,
          opacity: pressed ? 0.85 : disabled && variant !== 'primary' ? 0.5 : 1,
        },
        shell,
        small ? { minHeight: 38, paddingHorizontal: 16 } : null,
        style,
      ]}
    >
      {loading ? <ActivityIndicator size="small" color={label.color} /> : null}
      <Text
        numberOfLines={2}
        maxFontSizeMultiplier={fontScaleCaps.body}
        style={{ fontSize: label.fontSize, fontWeight: '600', letterSpacing: 0.1, color: label.color, textAlign: 'center' }}
      >
        {title}
      </Text>
    </Pressable>
  );
}
