// Button — the canvas's own button language, not a component library's:
//   primary     filled sky pill, 50pt, white 16/600 (ONE per screen)
//   secondary   tonal wash chip — blueWash fill, blueSoft border, blueDeep text
//   text        quiet blueDeep label, no chrome
//   destructive parchment card fill, red hairline, redDeep text
// Same API as before so every screen keeps working. >=44pt targets; heights
// are MINIMUMS so large OS text (elder-first) wraps to 2 lines instead of
// clipping inside a fixed pill.
import { ActivityIndicator, Pressable, Text } from 'react-native';
import { haptic } from '../../lib/haptics';
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
  const { t, radius, text, type, fontScaleCaps, pressRipple } = useTheme();
  const blocked = disabled || loading;
  const small = size === 'small';

  // UX-703: real actions answer back. A primary press gets the light impact,
  // a destructive press the warning pattern; quiet variants stay silent.
  const handlePress = (e) => {
    if (variant === 'primary') haptic.impact();
    else if (variant === 'destructive') haptic.warning();
    onPress?.(e);
  };

  // Normal-density heights (owner call 2026-08-17): 46pt primary, 40pt for
  // the quiet variants — ordinary app proportions instead of the elder ramp.
  const shell = {
    primary: {
      minHeight: 46,
      backgroundColor: disabled ? t.btnDisabled : t.actionFill,
      borderWidth: 0,
    },
    // iOS tonal (owner calls 2026-08-17, supersedes the ghost-outline web
    // parity): neutral gray fill, blue text — blue FILL is the primary's.
    secondary: {
      minHeight: 40,
      backgroundColor: t.surfaceFill,
      borderWidth: 0,
    },
    text: {
      minHeight: 40,
      backgroundColor: 'transparent',
      borderWidth: 0,
    },
    // Plain red text, iOS-style — destructive must not share the pill shape
    // of ordinary actions (it reads as "just another button" otherwise).
    destructive: {
      minHeight: 40,
      backgroundColor: 'transparent',
      borderWidth: 0,
    },
  }[variant];

  // Primary keeps the body size (it is the screen's one filled action); the
  // quiet variants ride text.sm, which the normal-density ramp sets to 14.
  const label = {
    primary: { color: t.actionInk, fontSize: type.body },
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
      onPress={handlePress}
      android_ripple={pressRipple}
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
        small ? { minHeight: 36, paddingHorizontal: 14 } : null,
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
