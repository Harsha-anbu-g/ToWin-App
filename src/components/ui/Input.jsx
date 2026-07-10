// ToWin input — full visible box on surface fill with hairline border (NEVER
// borderless), radius 11, calm sky focus, visible label above, error below the
// field announced to screen readers. Elder rules: >=44pt, 18px text.
import { useState } from 'react';
import { Text, TextInput, View } from 'react-native';
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
  const [focused, setFocused] = useState(false);

  return (
    <View style={style}>
      {label ? (
        <Text
          style={{
            fontSize: text.sm,
            color: t.inkSlate,
            marginBottom: spacing[2],
            fontWeight: '500',
          }}
        >
          {label}
        </Text>
      ) : null}
      <View>
        <TextInput
          accessibilityLabel={label}
          value={value}
          onChangeText={onChangeText}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholderTextColor={t.ink4}
          style={[
            {
              minHeight: 48,
              backgroundColor: t.surface,
              borderWidth: focused ? 2 : 1,
              borderColor: error ? t.redError : focused ? t.blue : t.border,
              borderRadius: radius.md,
              paddingHorizontal: spacing[4],
              paddingVertical: spacing[3],
              fontSize: text.base,
              color: t.ink,
            },
            rightSlot ? { paddingRight: 52 } : null,
            inputStyle,
          ]}
          {...rest}
        />
        {rightSlot ? (
          <View
            style={{
              position: 'absolute',
              right: 2,
              top: 0,
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
