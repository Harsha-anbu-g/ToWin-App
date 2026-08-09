// TextLink — the app's inline text action ("Create Account", "Back to log in").
// Rulebook pass 2026-07-27: the auth flow had ~19 bare Pressables at 14–15pt
// with no minHeight and no pressed state — sub-35pt silent targets. This is
// the one control that replaces them: 44pt floor, pressed feedback, 16pt.
import { Pressable, Text } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';

export default function TextLink({ label, onPress, muted = false, disabled = false, style, textStyle }) {
  const { t, type, fontScaleCaps, pressRipple } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      android_ripple={pressRipple}
      hitSlop={{ left: 8, right: 8 }}
      style={({ pressed }) => [
        {
          minHeight: 44,
          justifyContent: 'center',
          alignSelf: 'center',
          paddingHorizontal: 8,
          opacity: disabled ? 0.5 : pressed ? 0.6 : 1,
        },
        style,
      ]}
    >
      <Text
        maxFontSizeMultiplier={fontScaleCaps.body}
        style={[
          {
            fontSize: type.body,
            fontWeight: '600',
            color: muted ? t.inkSlate : t.blueDeep,
            textAlign: 'center',
          },
          textStyle,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}
