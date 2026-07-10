// Trust — the heart of ToWin (port of Trust.jsx + TrustJourney.jsx):
// score breakdown (profile +3 / ladder +7 / reviews +5, max 15 per friend) and
// the 7-step ladder per friendship with mutual-consent climbing. Gold speaks
// trust; the turtle marks the goal.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Alert, Text, View } from 'react-native';
import { Turtle } from 'lucide-react-native';
import api from '../../src/api/client';
import Avatar from '../../src/components/ui/Avatar';
import Button from '../../src/components/ui/Button';
import Card from '../../src/components/ui/Card';
import Screen from '../../src/components/ui/Screen';
import { useToast } from '../../src/context/ToastContext';
import { useTheme } from '../../src/theme/ThemeContext';

function Ladder({ stageIndex }) {
  const { t, spacing } = useTheme();
  // 7 numbered nodes; the last carries the turtle (the goal). Filled = climbed.
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[1], marginTop: spacing[3] }}>
      {[0, 1, 2, 3, 4, 5, 6].map((i) => {
        const reached = i <= stageIndex;
        const isGoal = i === 6;
        return (
          <View key={i} style={{ flex: 1, alignItems: 'center' }}>
            <View
              style={{
                width: 30,
                height: 30,
                borderRadius: 15,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: reached ? t.goldWash : t.trackEmpty,
                borderWidth: 1,
                borderColor: reached ? t.goldLine : t.trackEmpty,
              }}
            >
              {isGoal ? (
                <Turtle size={16} color={reached ? t.logoGreen : t.steelText} />
              ) : (
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: '600',
                    fontVariant: ['tabular-nums'],
                    color: reached ? t.goldDeep : t.steelText,
                  }}
                >
                  {i + 1}
                </Text>
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
}

function PointRow({ label, earned, max }) {
  const { t, spacing, text } = useTheme();
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing[2] }}>
      <Text style={{ fontSize: text.sm, color: t.inkSlate }}>{label}</Text>
      <Text style={{ fontSize: text.sm, color: t.trustGold, fontWeight: '600', fontVariant: ['tabular-nums'] }}>
        +{earned} of {max}
      </Text>
    </View>
  );
}

export default function TrustScreen() {
  const { t, spacing, text, fontFamily } = useTheme();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const router = useRouter();

  const { data: breakdown, isLoading } = useQuery({
    queryKey: ['trust-my-score'],
    queryFn: async () => (await api.get('/trust/my-score')).data,
  });

  const { data: connections } = useQuery({
    queryKey: ['connections'],
    queryFn: async () => (await api.get('/connections')).data,
  });
  const connOf = (id) => (connections ?? []).find((c) => c.id === id);

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['trust-my-score'] });
    queryClient.invalidateQueries({ queryKey: ['connections'] });
  };

  const confirm = useMutation({
    mutationFn: (connectionId) => api.post(`/trust/${connectionId}/confirm`),
    onSuccess: (_r, connectionId) => {
      const c = connOf(connectionId);
      showToast(
        c && !c.confirmedByOther
          ? `Step confirmed — waiting for ${c.otherUserName} to agree too.`
          : 'You both agreed — one step up the ladder!',
        'success'
      );
      refresh();
    },
    onError: (err) =>
      showToast(err?.response?.data?.message || 'Could not confirm right now. Please try again.', 'error'),
  });

  const confirmStep = (card) =>
    Alert.alert(
      'Take the next step?',
      `Trust grows only when BOTH of you agree. Confirm your side of the next step with ${card.customerName}?`,
      [
        { text: 'Not yet', style: 'cancel' },
        { text: 'Confirm my side', onPress: () => confirm.mutate(card.connectionId) },
      ]
    );

  return (
    <Screen back title="Trust">
      {/* Score header */}
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flex: 1 }}>
            <Text
              accessibilityRole="header"
              style={{ fontFamily: fontFamily.display, fontSize: text.xl, color: t.ink }}
            >
              My <Text style={{ color: t.trustGold }}>trust</Text> score
            </Text>
            {breakdown?.tier ? (
              <Text style={{ fontSize: text.sm, color: t.inkSlate, marginTop: 2 }}>{breakdown.tier}</Text>
            ) : null}
          </View>
          <Text
            style={{
              fontSize: text['3xl'],
              color: t.trustGold,
              fontWeight: '600',
              fontVariant: ['tabular-nums'],
            }}
          >
            {breakdown ? Math.round(breakdown.totalScore) : '—'}
          </Text>
        </View>
        <Text style={{ fontSize: text.sm, lineHeight: 21, color: t.inkSlate, marginTop: spacing[3] }}>
          Trust grows slowly, like roots: up to {breakdown?.maxPerCustomer ?? 15} points with each
          friend — your profile (+3), the seven-step ladder (+7), and a review (+5).
        </Text>
        {breakdown?.profile ? (
          <PointRow label="My profile is filled in" earned={breakdown.profile.earned} max={breakdown.profile.max} />
        ) : null}
      </Card>

      {isLoading ? (
        <Card style={{ marginTop: spacing[4] }}>
          <Text style={{ fontSize: text.base, color: t.inkSlate }}>Loading your ladder…</Text>
        </Card>
      ) : (breakdown?.customers ?? []).length === 0 ? (
        <Card style={{ marginTop: spacing[4] }}>
          <Text
            accessibilityRole="header"
            style={{ fontFamily: fontFamily.display, fontSize: text.lg, color: t.ink }}
          >
            No friendships yet
          </Text>
          <Text style={{ marginTop: spacing[2], fontSize: text.base, lineHeight: 26, color: t.inkSlate }}>
            Trust starts with a friend. Add someone, and the ladder appears here.
          </Text>
          <Button
            title="Find friends"
            variant="primary"
            onPress={() => router.push('/friends')}
            style={{ marginTop: spacing[5] }}
          />
        </Card>
      ) : (
        breakdown.customers.map((card) => {
          const c = connOf(card.connectionId);
          const waitingForOther = c?.confirmedByMe && !c?.confirmedByOther;
          const atTop = card.stageIndex >= 6;
          return (
            <Card key={card.connectionId} style={{ marginTop: spacing[4] }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[3] }}>
                <Avatar name={card.customerName} uri={card.customerPhotoUrl} size={44} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: text.base, fontWeight: '600', color: t.ink }}>
                    {card.customerName}
                  </Text>
                  <Text style={{ fontSize: text.sm, color: t.goldDeep, marginTop: 1 }}>
                    {card.currentStageLabel}
                  </Text>
                </View>
                <Text style={{ fontSize: text.lg, color: t.trustGold, fontWeight: '600', fontVariant: ['tabular-nums'] }}>
                  {card.total}/{card.totalMax}
                </Text>
              </View>

              <Ladder stageIndex={card.stageIndex} />

              <PointRow label="Ladder steps together" earned={card.rooting} max={card.rootingMax} />
              <PointRow label="Review from them" earned={card.review} max={card.reviewMax} />
              <PointRow label="Profile points" earned={card.profile} max={card.profileMax} />

              {!atTop ? (
                waitingForOther ? (
                  <View
                    style={{
                      backgroundColor: t.goldWash,
                      borderRadius: 11,
                      padding: spacing[3],
                      marginTop: spacing[4],
                    }}
                  >
                    <Text style={{ fontSize: text.sm, color: t.goldDeep, lineHeight: 20 }}>
                      You've confirmed — waiting for {card.customerName} to agree to the next step.
                    </Text>
                  </View>
                ) : (
                  <Button
                    title="Take the next step together"
                    variant="secondary"
                    onPress={() => confirmStep(card)}
                    style={{ marginTop: spacing[4] }}
                  />
                )
              ) : (
                <View
                  style={{
                    backgroundColor: t.greenTint,
                    borderRadius: 11,
                    padding: spacing[3],
                    marginTop: spacing[4],
                  }}
                >
                  <Text style={{ fontSize: text.sm, fontWeight: '600', color: t.greenDeep }}>
                    Fully trusted — the ladder is complete.
                  </Text>
                </View>
              )}
            </Card>
          );
        })
      )}
    </Screen>
  );
}
