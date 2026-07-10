// Form-level error box — red tint card announced to screen readers (H9:
// friendly plain-English message, never a silent failure). Port of the web
// auth cards' error state.
import { Text, View } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';

export default function FormError({ message, style }) {
  const { t, spacing, radius, text } = useTheme();
  if (!message) return null;
  return (
    <View
      accessibilityRole="alert"
      style={[
        {
          backgroundColor: t.redTint,
          borderWidth: 1,
          borderColor: t.redLine,
          borderRadius: radius.md,
          paddingHorizontal: spacing[4],
          paddingVertical: spacing[3],
        },
        style,
      ]}
    >
      <Text style={{ fontSize: text.sm, color: t.redError, lineHeight: text.sm * 1.45 }}>
        {message}
      </Text>
    </View>
  );
}
