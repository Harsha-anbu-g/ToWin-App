// Peekaboo game card — a calm invitation, not a gamified shout.
import { useRouter } from 'expo-router';
import { Pressable, Text } from 'react-native';
import Card from '../ui/Card';
import { useTheme } from '../../theme/ThemeContext';

export default function GameCard() {
  const { t, spacing, text, fontFamily } = useTheme();
  const router = useRouter();

  return (
    <Card>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Play peekaboo, a calm memory game"
        onPress={() => router.push('/game')}
        style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}
      >
        <Text
          accessibilityRole="header"
          style={{ fontFamily: fontFamily.display, fontSize: text.lg, color: t.ink }}
        >
          A quiet minute?
        </Text>
        <Text style={{ fontSize: text.base, color: t.inkSlate, lineHeight: 26, marginTop: spacing[2] }}>
          Play peekaboo — a calm little memory game with the tortoise.
        </Text>
      </Pressable>
    </Card>
  );
}
