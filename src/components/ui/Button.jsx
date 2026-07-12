// Button — the canvas's own button language, not a component library's:
//   primary     filled sky pill, 50pt, white 16/600 (ONE per screen)
//   secondary   tonal wash chip — blueWash fill, blueSoft border, blueDeep text
//   text        quiet blueDeep label, no chrome
//   destructive parchment card fill, red hairline, redDeep text
// Same API as before so every screen keeps working. >=44pt targets.
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
  const { t, radius } = useTheme();
  const blocked = disabled || loading;

  const shell = {
    primary: {
      height: 50,
      backgroundColor: disabled ? t.btnDisabled : t.actionFill,
      borderWidth: 0,
    },
    secondary: {
      height: 44,
      backgroundColor: t.blueWash,
      borderWidth: 1,
      borderColor: t.blueSoft,
    },
    text: {
      height: 44,
      backgroundColor: 'transparent',
      borderWidth: 0,
    },
    destructive: {
      height: 44,
      backgroundColor: t.canvas,
      borderWidth: 1,
      borderColor: t.redLine,
    },
  }[variant];

  const label = {
    primary: { color: t.actionInk, fontSize: 16 },
    secondary: { color: t.blueDeep, fontSize: 15 },
    text: { color: t.blueDeep, fontSize: 15 },
    destructive: { color: t.redDeep, fontSize: 15 },
  }[variant];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: blocked, busy: loading }}
      disabled={blocked}
      onPress={onPress}
      style={({ pressed }) => [
        {
          borderRadius: radius.pill,
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'row',
          gap: 8,
          paddingHorizontal: 20,
          opacity: pressed ? 0.85 : disabled && variant !== 'primary' ? 0.5 : 1,
        },
        shell,
        style,
      ]}
    >
      {loading ? <ActivityIndicator size="small" color={label.color} /> : null}
      <Text numberOfLines={1} style={{ fontSize: label.fontSize, fontWeight: '600', letterSpacing: 0.1, color: label.color }}>
        {title}
      </Text>
    </Pressable>
  );
}
