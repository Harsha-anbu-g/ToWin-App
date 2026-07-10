// ToWin buttons — DESIGN.md: exactly ONE filled sky-blue pill primary per screen;
// secondary = outlined hairline pill; text = quiet tertiary. Elder rules: min 44pt
// target, pressed feedback via opacity only (no layout shift).
import { ActivityIndicator, Pressable, Text } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';

export default function Button({
  title,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  style,
  accessibilityLabel,
  accessibilityHint,
}) {
  const { t, spacing, radius, text } = useTheme();

  const palette = {
    primary: {
      backgroundColor: disabled ? t.btnDisabled : t.actionFill,
      borderWidth: 0,
      color: t.actionInk,
    },
    secondary: {
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: t.border,
      color: t.ink,
    },
    text: {
      backgroundColor: 'transparent',
      borderWidth: 0,
      color: t.blueDeep,
    },
    destructive: {
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: t.redLine,
      color: t.redDeep,
    },
  }[variant];

  const blocked = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: blocked, busy: loading }}
      disabled={blocked}
      onPress={onPress}
      hitSlop={4}
      style={({ pressed }) => [
        {
          minHeight: 44,
          borderRadius: radius.pill,
          paddingHorizontal: spacing[6],
          paddingVertical: spacing[3],
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'row',
          backgroundColor: palette.backgroundColor,
          borderWidth: palette.borderWidth,
          borderColor: palette.borderColor,
          opacity: pressed ? 0.82 : disabled && variant !== 'primary' ? 0.5 : 1,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={palette.color} />
      ) : (
        <Text
          style={{
            color: palette.color,
            fontSize: text.base,
            fontWeight: '600',
            textAlign: 'center',
          }}
        >
          {title}
        </Text>
      )}
    </Pressable>
  );
}
