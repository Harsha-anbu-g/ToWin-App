// Trust summary — the score in gold (gold is reserved for trust), one tap to
// the full ladder. Data: GET /trust/my-score (TrustScoreBreakdownResponse).
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import api from '../../api/client';
import Card from '../ui/Card';
import { useTheme } from '../../theme/ThemeContext';

export default function TrustSummaryCard() {
  const { t, spacing, text, fontFamily } = useTheme();
  const router = useRouter();

  const { data } = useQuery({
    queryKey: ['trust-my-score'],
    queryFn: async () => (await api.get('/trust/my-score')).data,
  });

  return (
    <Card>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`My trust score${data ? `: ${data.totalScore}` : ''}. See how trust works`}
        onPress={() => router.push('/trust')}
        style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flex: 1 }}>
            <Text
              accessibilityRole="header"
              style={{ fontFamily: fontFamily.display, fontSize: text.lg, color: t.ink }}
            >
              My <Text style={{ color: t.trustGold }}>trust</Text>
            </Text>
            <Text style={{ fontSize: text.sm, color: t.inkSlate, marginTop: 2 }}>
              {data?.tier ? data.tier : 'Grows slowly, like roots'} · tap to see how it works
            </Text>
          </View>
          <Text
            style={{
              fontSize: text['2xl'],
              color: t.trustGold,
              fontVariant: ['tabular-nums'],
              fontWeight: '600',
            }}
          >
            {data ? Math.round(data.totalScore) : '—'}
          </Text>
        </View>
      </Pressable>
    </Card>
  );
}
