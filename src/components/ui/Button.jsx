// Button — Material (react-native-paper) under the app's own API, so every
// screen keeps its props while the look is MD3. Variants: primary (contained),
// secondary (outlined), text, destructive (outlined, error color).
// Elder rules hold: >=44pt target, readable 16px label.
import { Button as PaperButton } from 'react-native-paper';
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
  const { t } = useTheme();

  const mode =
    variant === 'primary' ? 'contained' : variant === 'text' ? 'text' : 'outlined';
  const textColor =
    variant === 'destructive' ? t.redDeep : variant === 'primary' ? t.actionInk : t.blueDeep;

  return (
    <PaperButton
      mode={mode}
      onPress={onPress}
      disabled={disabled}
      loading={loading}
      buttonColor={variant === 'primary' ? t.actionFill : undefined}
      textColor={textColor}
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityHint={accessibilityHint}
      style={[{ borderRadius: 999 }, variant === 'destructive' ? { borderColor: t.redLine } : null, style]}
      contentStyle={{ minHeight: 48 }}
      labelStyle={{ fontSize: 16, fontWeight: '600', letterSpacing: 0.1 }}
    >
      {title}
    </PaperButton>
  );
}
