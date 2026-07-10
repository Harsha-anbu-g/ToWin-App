// Peekaboo — placeholder until US-017 (the calm memory game).
import { useRouter } from 'expo-router';
import { Text } from 'react-native';
import Button from '../src/components/ui/Button';
import Card from '../src/components/ui/Card';
import Screen from '../src/components/ui/Screen';
import { useTheme } from '../src/theme/ThemeContext';

export default function GameScreen() {
  const { t, spacing, text, fontFamily } = useTheme();
  const router = useRouter();

  return (
    <Screen title="Peekaboo">
      <Card>
        <Text
          accessibilityRole="header"
          style={{ fontFamily: fontFamily.display, fontSize: text.lg, color: t.ink }}
        >
          A quiet minute
        </Text>
        <Text style={{ marginTop: spacing[2], fontSize: text.base, lineHeight: 27, color: t.inkSlate }}>
          The peekaboo game arrives in the next build step.
        </Text>
        <Button title="Back" variant="secondary" onPress={() => router.back()} style={{ marginTop: spacing[6] }} />
      </Card>
    </Screen>
  );
}
