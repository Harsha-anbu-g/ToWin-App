// Input — Material outlined text field (react-native-paper) under the app's
// own API: label, error (announced), helper, and an optional rightSlot overlay
// (used for the password eye toggles). Elder rules: >=48pt, 18px text.
// memo'd: Paper inputs animate a floating label, so sibling fields skipping
// re-renders per keystroke is what keeps slow typists free of keyboard lag.
import { AlertCircle } from 'lucide-react-native';
import { memo } from 'react';
import { Text, View } from 'react-native';
import { TextInput as PaperInput } from 'react-native-paper';
import { useTheme } from '../../theme/ThemeContext';

export default memo(function Input({
  label,
  value,
  onChangeText,
  error,
  helper,
  style,
  inputStyle,
  rightSlot,
  ...rest
}) {
  const { t, spacing, radius, text, fontScaleCaps } = useTheme();

  return (
    <View style={style}>
      <View>
        <PaperInput
          mode="outlined"
          label={label}
          accessibilityLabel={label}
          maxFontSizeMultiplier={fontScaleCaps.body}
          value={value}
          onChangeText={onChangeText}
          error={!!error}
          style={[
            { backgroundColor: t.canvas, fontSize: text.base, minHeight: 48 },
            // 48, not 40 — the eye slot occupies 46pt from the right edge;
            // long values were rendering underneath it (rulebook pass).
            rightSlot ? { paddingRight: 48 } : null,
            inputStyle,
          ]}
          outlineStyle={{ borderRadius: radius.input }}
          {...rest}
        />
        {rightSlot ? (
          <View
            style={{
              position: 'absolute',
              right: 2,
              top: 6,
              bottom: 0,
              justifyContent: 'center',
            }}
          >
            {rightSlot}
          </View>
        ) : null}
      </View>
      {error ? (
        // Icon + color, never color alone (rulebook: ~8% of men are color-blind
        // and sunlight flattens every phone screen).
        <View
          accessible
          accessibilityRole="alert"
          style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing[1], marginTop: spacing[2] }}
        >
          <AlertCircle size={16} color={t.redError} strokeWidth={2} style={{ marginTop: 2 }} />
          <Text
            maxFontSizeMultiplier={fontScaleCaps.body}
            style={{ flex: 1, color: t.redError, fontSize: text.sm, lineHeight: 21 }}
          >
            {error}
          </Text>
        </View>
      ) : helper ? (
        <Text
          maxFontSizeMultiplier={fontScaleCaps.body}
          style={{ color: t.inkSlate, fontSize: text.sm, marginTop: spacing[2] }}
        >
          {helper}
        </Text>
      ) : null}
    </View>
  );
});
