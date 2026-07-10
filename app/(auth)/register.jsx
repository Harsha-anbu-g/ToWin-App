// Placeholder — US-005 ports the full Register.jsx (role choice, fields,
// validation). Present so Login's "Create Account" link never dead-ends.
import { useRouter } from 'expo-router';
import { Text } from 'react-native';
import Button from '../../src/components/ui/Button';
import Card from '../../src/components/ui/Card';
import Screen from '../../src/components/ui/Screen';
import { useTheme } from '../../src/theme/ThemeContext';

export default function RegisterPlaceholder() {
  const { t, spacing, text, fontFamily } = useTheme();
  const router = useRouter();

  return (
    <Screen scroll={false} contentStyle={{ justifyContent: 'center' }}>
      <Card>
        <Text
          accessibilityRole="header"
          style={{ fontFamily: fontFamily.display, fontSize: text.xl, color: t.ink }}
        >
          Joining ToWin
        </Text>
        <Text style={{ marginTop: spacing[3], fontSize: text.base, lineHeight: 27, color: t.inkSlate }}>
          Creating an account arrives in the next build step. For now, use a demo
          account from the log in screen to look around.
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
