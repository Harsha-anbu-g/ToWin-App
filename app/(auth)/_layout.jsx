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
    />
  );
}
