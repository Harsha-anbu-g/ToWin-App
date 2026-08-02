// Keeps the thing you're typing into above the keyboard, on every platform.
//
// The app has three places where a composer sits at the bottom of a scrolling
// list — chat, Ask AI, and any <Screen keyboard> form. All three used
// KeyboardAvoidingView, which does nothing at all in a browser: the keyboard
// covers the input and the person types where they cannot see.
//
// Native keeps exactly the previous behaviour. The web branch pads by the
// measured keyboard height instead (src/lib/useKeyboardInset).
import { KeyboardAvoidingView, Platform, View } from 'react-native';
import useKeyboardInset from '../../lib/useKeyboardInset';

export default function KeyboardAvoider({ children, style }) {
  const inset = useKeyboardInset();

  if (Platform.OS === 'web') {
    return <View style={[{ flex: 1, paddingBottom: inset }, style]}>{children}</View>;
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[{ flex: 1 }, style]}
    >
      {children}
    </KeyboardAvoidingView>
  );
}
