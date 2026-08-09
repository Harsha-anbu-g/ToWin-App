// Password field with a show/hide eye — mirrors the web auth forms' toggle
// (44pt target, labelled for screen readers). Wraps the kit Input.
import { useState } from 'react';
import { Pressable } from 'react-native';
import { Eye, EyeOff } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeContext';
import Input from './Input';

// textContentType defaults to 'password' so iOS offers the saved credential;
// call sites override with 'newPassword' (set-a-new-one forms) or 'none'
// (the sealed-box passphrase, which is not an account credential).
export default function PasswordInput({
  autoComplete = 'current-password',
  textContentType = 'password',
  ...rest
}) {
  const { t } = useTheme();
  const [shown, setShown] = useState(false);

  return (
    <Input
      secureTextEntry={!shown}
      autoCapitalize="none"
      autoCorrect={false}
      autoComplete={autoComplete}
      textContentType={textContentType}
      rightSlot={
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={shown ? 'Hide password' : 'Show password'}
          onPress={() => setShown((v) => !v)}
          hitSlop={4}
          style={({ pressed }) => ({
            minWidth: 44,
            minHeight: 44,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: pressed ? 0.7 : 1,
          })}
        >
          {shown ? <EyeOff size={18} color={t.ink3} /> : <Eye size={18} color={t.ink3} />}
        </Pressable>
      }
      {...rest}
    />
  );
}
