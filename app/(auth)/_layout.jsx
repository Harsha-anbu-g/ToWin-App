import { Stack } from 'expo-router';
import { useTheme } from '../../src/theme/ThemeContext';

export default function AuthLayout() {
  const { t } = useTheme();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: t.surface },
      }}
    >
      {/* Mid-form screens: a half swipe would eat typed text without warning,
          so iOS swipe-back is off and leaving is an explicit tap (UX-707).
          Login and forgot-password keep the gesture — one short field each.
          The role page (register) keeps it too: three rows, nothing typed,
          nothing to lose (2026-08-28 split). */}
      <Stack.Screen name="create-account" options={{ gestureEnabled: false }} />
      <Stack.Screen name="finish-setup" options={{ gestureEnabled: false }} />
      <Stack.Screen name="reset-password" options={{ gestureEnabled: false }} />
    </Stack>
  );
}
