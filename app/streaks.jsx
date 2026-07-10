// Streaks — placeholder until US-016 (check-in flow + streak history).
// The Home check-in card already covers today's check-in.
import { useRouter } from 'expo-router';
import { Text } from 'react-native';
import Button from '../src/components/ui/Button';
import Card from '../src/components/ui/Card';
import Screen from '../src/components/ui/Screen';
import { useTheme } from '../src/theme/ThemeContext';

export default function StreaksScreen() {
  const { t, spacing, text, fontFamily } = useTheme();
  const router = useRouter();

  return (
    <Screen title="Check-in">
      <Card>
        <Text
          accessibilityRole="header"
          style={{ fontFamily: fontFamily.display, fontSize: text.lg, color: t.ink }}
        >
          Your streak
        </Text>
        <Text style={{ marginTop: spacing[2], fontSize: text.base, lineHeight: 27, color: t.inkSlate }}>
          Streak history arrives in the next build step. Today's check-in lives on your Home feed.
        </Text>
        <Button title="Back" variant="secondary" onPress={() => router.back()} style={{ marginTop: spacing[6] }} />
      </Card>
    </Screen>
  );
}
