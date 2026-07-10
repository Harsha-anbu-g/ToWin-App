// Two quiet side-by-side tiles — my trust (gold, serif) and the game (a
// whisper, not a shout). Replaces two full-width cards with one calm row.
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { Turtle } from 'lucide-react-native';
import api from '../../api/client';
import { useTheme } from '../../theme/ThemeContext';

function Tile({ onPress, accessibilityLabel, children }) {
  const { t, spacing, radius } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => ({
        flex: 1,
        minHeight: 96,
        backgroundColor: t.canvas,
        borderWidth: 1,
        borderColor: t.border,
        borderRadius: radius.xl,
        padding: spacing[4],
        justifyContent: 'space-between',
        opacity: pressed ? 0.8 : 1,
      })}
    >
      {children}
    </Pressable>
  );
}

export default function QuietTiles() {
  const { t, spacing, text, fontFamily } = useTheme();
  const router = useRouter();

  const { data: trust } = useQuery({
    queryKey: ['trust-my-score'],
    queryFn: async () => (await api.get('/trust/my-score')).data,
  });

  return (
    <View style={{ flexDirection: 'row', gap: spacing[3] }}>
      <Tile
        onPress={() => router.push('/trust')}
        accessibilityLabel={`My trust score${trust ? `: ${Math.round(trust.totalScore)}` : ''}. See how trust works`}
      >
        <Text style={{ fontFamily: fontFamily.display, fontSize: text.base, color: t.ink }}>
          My <Text style={{ color: t.trustGold }}>trust</Text>
        </Text>
        <Text
          style={{
            fontSize: text.xl,
            color: t.trustGold,
            fontWeight: '600',
            fontVariant: ['tabular-nums'],
          }}
        >
          {trust ? Math.round(trust.totalScore) : '—'}
        </Text>
      </Tile>

      <Tile onPress={() => router.push('/game')} accessibilityLabel="Play peekaboo, a calm memory game">
        <Text style={{ fontFamily: fontFamily.display, fontSize: text.base, color: t.ink }}>
          A quiet minute?
        </Text>
        <Turtle size={26} color={t.logoGreen} />
      </Tile>
    </View>
  );
}
