// Trust — placeholder until US-015 (7-step ladder + score breakdown).
import { useRouter } from 'expo-router';
import { Text } from 'react-native';
import Button from '../../src/components/ui/Button';
import Card from '../../src/components/ui/Card';
import Screen from '../../src/components/ui/Screen';
import { useTheme } from '../../src/theme/ThemeContext';

export default function TrustScreen() {
  const { t, spacing, text, fontFamily } = useTheme();
  const router = useRouter();

  return (
    <Screen title="Trust">
      <Card>
        <Text
          accessibilityRole="header"
          style={{ fontFamily: fontFamily.display, fontSize: text.lg, color: t.ink }}
        >
          How <Text style={{ color: t.trustGold }}>trust</Text> works
        </Text>
        <Text style={{ marginTop: spacing[2], fontSize: text.base, lineHeight: 27, color: t.inkSlate }}>
          The full trust ladder and your score breakdown arrive in the next build step.
        </Text>
        <Button title="Back" variant="secondary" onPress={() => router.back()} style={{ marginTop: spacing[6] }} />
      </Card>
    </Screen>
  );
}
