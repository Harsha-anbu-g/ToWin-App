// Input — Material outlined text field (react-native-paper) under the app's
// own API: label, error (announced), helper, and an optional rightSlot overlay
// (used for the password eye toggles). Elder rules: >=48pt, 18px text.
import { Text, View } from 'react-native';
import { TextInput as PaperInput } from 'react-native-paper';
import { useTheme } from '../../theme/ThemeContext';

export default function Input({
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
  const { t, spacing, radius, text } = useTheme();

  return (
    <View style={style}>
      <View>
        <PaperInput
          mode="outlined"
          label={label}
          accessibilityLabel={label}
          value={value}
          onChangeText={onChangeText}
          error={!!error}
          style={[
            { backgroundColor: t.canvas, fontSize: text.base, minHeight: 48 },
            rightSlot ? { paddingRight: 40 } : null,
            inputStyle,
          ]}
          outlineStyle={{ borderRadius: radius.md }}
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
        <Text
          accessibilityRole="alert"
          style={{ color: t.redError, fontSize: text.sm, marginTop: spacing[2] }}
        >
          {error}
        </Text>
      ) : helper ? (
        <Text style={{ color: t.inkSlate, fontSize: text.sm, marginTop: spacing[2] }}>
          {helper}
        </Text>
      ) : null}
    </View>
  );
}
