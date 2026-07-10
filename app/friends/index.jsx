// Friends — placeholder until US-011 (list + add friends). Reached from the
// top-right icon on Home; present so the icon never dead-ends.
import { useRouter } from 'expo-router';
import { Text } from 'react-native';
import Button from '../../src/components/ui/Button';
import Card from '../../src/components/ui/Card';
import Screen from '../../src/components/ui/Screen';
import { useTheme } from '../../src/theme/ThemeContext';

export default function FriendsScreen() {
  const { t, spacing, text, fontFamily } = useTheme();
  const router = useRouter();

  return (
    <Screen title="Friends">
      <Card>
        <Text
          accessibilityRole="header"
          style={{ fontFamily: fontFamily.display, fontSize: text.lg, color: t.ink }}
        >
          Your people place
        </Text>
        <Text style={{ marginTop: spacing[2], fontSize: text.base, lineHeight: 27, color: t.inkSlate }}>
          Your friends and adding new ones arrive in the next build step.
        </Text>
        <Button
          title="Back to Home"
          variant="secondary"
          onPress={() => router.back()}
          style={{ marginTop: spacing[6] }}
        />
      </Card>
    </Screen>
  );
}
