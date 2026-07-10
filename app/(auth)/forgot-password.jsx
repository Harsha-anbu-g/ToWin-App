// Placeholder — US-006 ports the full ForgotPassword.jsx flow. Present so
// Login's "Forgot password?" link never dead-ends.
import { useRouter } from 'expo-router';
import { Text } from 'react-native';
import Button from '../../src/components/ui/Button';
import Card from '../../src/components/ui/Card';
import Screen from '../../src/components/ui/Screen';
import { useTheme } from '../../src/theme/ThemeContext';

export default function ForgotPasswordPlaceholder() {
  const { t, spacing, text, fontFamily } = useTheme();
  const router = useRouter();

  return (
    <Screen scroll={false} contentStyle={{ justifyContent: 'center' }}>
      <Card>
        <Text
          accessibilityRole="header"
          style={{ fontFamily: fontFamily.display, fontSize: text.xl, color: t.ink }}
        >
          Password help
        </Text>
        <Text style={{ marginTop: spacing[3], fontSize: text.base, lineHeight: 27, color: t.inkSlate }}>
          Resetting your password arrives in the next build step.
        </Text>
        <Button
          title="Back to log in"
          variant="primary"
          onPress={() => router.back()}
          style={{ marginTop: spacing[6] }}
        />
      </Card>
    </Screen>
  );
}
