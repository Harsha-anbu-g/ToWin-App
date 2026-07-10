// Password field with a show/hide eye — mirrors the web auth forms' toggle
// (44pt target, labelled for screen readers). Wraps the kit Input.
import { useState } from 'react';
import { Pressable } from 'react-native';
import { Eye, EyeOff } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeContext';
import Input from './Input';

export default function PasswordInput({ autoComplete = 'current-password', ...rest }) {
  const { t } = useTheme();
  const [shown, setShown] = useState(false);

  return (
    <Input
      secureTextEntry={!shown}
      autoCapitalize="none"
      autoCorrect={false}
      autoComplete={autoComplete}
      rightSlot={
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={shown ? 'Hide password' : 'Show password'}
          onPress={() => setShown((v) => !v)}
          hitSlop={4}
          style={{
            minWidth: 44,
            minHeight: 44,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {shown ? <EyeOff size={18} color={t.ink3} /> : <Eye size={18} color={t.ink3} />}
        </Pressable>
      }
      {...rest}
    />
  );
}
