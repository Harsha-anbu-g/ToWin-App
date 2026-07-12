// Dashboard — My Helpers (3d): where "I'm here today" lands. Each helper is a
// card with the horizontal 7-node trust ladder (blue check circles for climbed
// steps, ring for the current one, the tortoise in a wash circle as the goal)
// and the tonal "Take the next step" CTA (mutual-consent confirm, as on web).
// Lives inside (tabs) with href:null so the tab bar stays under it (canvas 3d).
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import api from '../../src/api/client';
import TrustLadder from '../../src/components/trust/TrustLadder';
import Avatar from '../../src/components/ui/Avatar';
import Button from '../../src/components/ui/Button';
import NavRow from '../../src/components/ui/NavRow';
import Screen from '../../src/components/ui/Screen';
import SegmentedControl from '../../src/components/ui/SegmentedControl';
import SkeletonCard from '../../src/components/ui/Skeleton';
import { useToast } from '../../src/context/ToastContext';
import { useTheme } from '../../src/theme/ThemeContext';

// Short stage names for the ladder footer (handoff §Interactions).
const SHORT_STAGES = ['Connected', 'Messaging', 'Phone', 'Video', 'Socials', 'Met', 'Trusted'];

function HelperCard({ card, waitingForOther, onConfirm }) {
  const { t, radius, type } = useTheme();
  const atTop = card.stageIndex >= 6;
  const next = SHORT_STAGES[Math.min(card.stageIndex + 1, 6)];

  return (
    <View style={{ backgroundColor: t.canvas, borderWidth: 1, borderColor: t.border, borderRadius: radius.card, padding: 16, marginTop: 14 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 11 }}>
        <Avatar name={card.customerName} uri={card.customerPhotoUrl} size={44} />
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: type.body, fontWeight: '600', color: t.ink }}>{card.customerName}</Text>
          <Text style={{ fontSize: type.caption, color: t.inkSlate, marginTop: 1 }}>
            Stage {Math.min(card.stageIndex + 1, 7)} of 7 · {card.currentStageLabel}
          </Text>
        </View>
        <Text style={{ fontSize: type.body, fontWeight: '600', color: t.trustGold, fontVariant: ['tabular-nums'] }}>
          {card.total}
          <Text style={{ fontWeight: '400', fontSize: type.caption }}>/{card.totalMax}</Text>
        </Text>
      </View>

      <TrustLadder stageIndex={card.stageIndex} style={{ marginTop: 16 }} />

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
        <Text style={{ fontSize: 11, color: t.inkSlate }}>Connected</Text>
        {!atTop ? (
          <Text style={{ fontSize: 11, fontWeight: '600', color: t.blueDeep }}>Next: {next}</Text>
        ) : null}
        <Text style={{ fontSize: 11, color: t.trustGold }}>Trusted</Text>
      </View>

      {atTop ? (
        <View style={{ backgroundColor: t.greenTint, borderRadius: radius.input, padding: 12, marginTop: 14 }}>
          <Text style={{ fontSize: type.meta, fontWeight: '600', color: t.greenDeep }}>
            Fully trusted — the ladder is complete.
          </Text>
        </View>
      ) : waitingForOther ? (
        <Text style={{ fontSize: type.meta, color: t.inkSlate, lineHeight: 19, marginTop: 14 }}>
          You've confirmed — waiting for {card.customerName} to agree to the next step.
        </Text>
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Take the next step"
          onPress={onConfirm}
          style={({ pressed }) => ({
            height: 38,
            borderRadius: radius.pill,
            backgroundColor: t.blueWash,
            borderWidth: 1,
            borderColor: t.blueSoft,
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: 14,
            opacity: pressed ? 0.7 : 1,
          })}
        >
          <Text style={{ fontSize: type.meta, fontWeight: '600', color: t.blueDeep }}>Take the next step</Text>
        </Pressable>
      )}
    </View>
  );
}

export default function Dashboard() {
  const { t, spacing, type, fontFamily } = useTheme();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const router = useRouter();
  const [seg, setSeg] = useState('building');

  const { data: breakdown, isLoading } = useQuery({
    queryKey: ['trust-my-score'],
    queryFn: async () => (await api.get('/trust/my-score')).data,
  });
  const { data: connections } = useQuery({
    queryKey: ['connections'],
    queryFn: async () => (await api.get('/connections')).data,
  });
  const connOf = (id) => (connections ?? []).find((c) => c.id === id);

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
      queryClient.invalidateQueries({ queryKey: ['trust-my-score'] });
      queryClient.invalidateQueries({ queryKey: ['connections'] });
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

  const customers = breakdown?.customers ?? [];
  const trusted = customers.filter((c) => c.stageIndex >= 6);
  const building = customers.filter((c) => c.stageIndex < 6);
  const shown = seg === 'trusted' ? trusted : building;

  return (
    <Screen scroll={false} contentStyle={{ padding: 0 }}>
      <NavRow
        trustScore={breakdown ? Math.round(breakdown.totalScore) : undefined}
        onMenu={() => router.push('/(tabs)/home')}
        onAddFriends={() => router.push('/friends')}
      />
      <ScrollView contentContainerStyle={{ paddingHorizontal: spacing[4], paddingTop: spacing[2], paddingBottom: spacing[12] }}>
        <Text accessibilityRole="header" style={{ fontFamily: fontFamily.display, fontSize: 26, color: t.ink, letterSpacing: -0.5 }}>
          My Helpers
        </Text>
        <Text style={{ fontSize: type.meta, color: t.inkSlate, marginTop: 3 }}>
          <Text style={{ color: t.trustGold, fontWeight: '600' }}>Trust</Text> grows step by step, like roots.
        </Text>

        <SegmentedControl
          segments={[
            { key: 'trusted', label: 'Trusted Friends', count: trusted.length },
            { key: 'building', label: 'Building Trust', count: building.length },
          ]}
          value={seg}
          onChange={setSeg}
          style={{ marginTop: 14 }}
        />

        {isLoading ? (
          <SkeletonCard lines={4} />
        ) : shown.length === 0 ? (
          <View style={{ backgroundColor: t.canvas, borderWidth: 1, borderColor: t.border, borderRadius: 16, padding: 16, marginTop: 14 }}>
            <Text style={{ fontSize: type.body, color: t.inkSlate, lineHeight: 22 }}>
              {seg === 'trusted'
                ? 'No fully trusted friends yet — every ladder ends here.'
                : 'No ladders in progress. Add a friend and trust starts growing.'}
            </Text>
            <Button title="Find friends" variant="secondary" onPress={() => router.push('/friends')} style={{ marginTop: 14 }} />
          </View>
        ) : (
          shown.map((card) => {
            const c = connOf(card.connectionId);
            return (
              <HelperCard
                key={card.connectionId}
                card={card}
                waitingForOther={c?.confirmedByMe && !c?.confirmedByOther}
                onConfirm={() => confirmStep(card)}
              />
            );
          })
        )}
      </ScrollView>
    </Screen>
  );
}
