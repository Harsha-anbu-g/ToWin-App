// My Helpers (3d) — now the heart of the elder's Home: per-helper cards with
// the 7-node trust ladder, Trusted Friends / Building Trust segments, and the
// mutual-consent "Take the next step". Extracted from the old dashboard route
// so Home owns it; parent provides the scroll container.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import api, { friendlyWriteError } from '../../api/client';
import { useToast } from '../../context/ToastContext';
import { useTheme } from '../../theme/ThemeContext';
import Avatar from '../ui/Avatar';
import Button from '../ui/Button';
import LoadError from '../ui/LoadError';
import SkeletonCard from '../ui/Skeleton';
import SegmentedControl from '../ui/SegmentedControl';
import TrustLadder from './TrustLadder';

// Short stage names for the ladder footer (handoff §Interactions).
const SHORT_STAGES = ['Connected', 'Messaging', 'Phone', 'Video', 'Socials', 'Met', 'Trusted'];

function HelperCard({ card, confirmedByMe, confirmedByOther, onConfirm }) {
  const { t, radius, type } = useTheme();
  const atTop = card.stageIndex >= 6;
  const next = SHORT_STAGES[Math.min(card.stageIndex + 1, 6)];
  // Backend rule (website ea03935): the elder STARTS a step; if the other
  // side already confirmed, this tap accepts and the step climbs.
  const ctaLabel = confirmedByOther ? 'Accept the next step' : 'Start the next step';

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
        <Text style={{ fontSize: 13, color: t.inkSlate }}>Connected</Text>
        {!atTop ? (
          <Text style={{ fontSize: 13, fontWeight: '600', color: t.blueDeep }}>Next: {next}</Text>
        ) : null}
        <Text style={{ fontSize: 13, color: t.trustGold }}>Trusted</Text>
      </View>

      {atTop ? (
        <Text style={{ fontSize: type.meta, fontWeight: '600', color: t.greenDeep, marginTop: 14 }}>
          Fully trusted — the ladder is complete.
        </Text>
      ) : confirmedByMe && !confirmedByOther ? (
        <Text style={{ fontSize: type.meta, color: t.inkSlate, lineHeight: 19, marginTop: 14 }}>
          You've started the next step — waiting for {card.customerName} to accept.
        </Text>
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={ctaLabel}
          onPress={onConfirm}
          style={({ pressed }) => ({
            height: 38,
            borderRadius: radius.pill,
            backgroundColor: 'transparent',
            borderWidth: 1,
            borderColor: t.blueSoft,
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: 14,
            opacity: pressed ? 0.7 : 1,
          })}
        >
          <Text style={{ fontSize: type.meta, fontWeight: '600', color: t.blueDeep }}>{ctaLabel}</Text>
        </Pressable>
      )}
    </View>
  );
}

export default function MyHelpersPanel() {
  const { t, type, fontFamily } = useTheme();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const router = useRouter();
  const [seg, setSeg] = useState('building');

  const { data: breakdown, isLoading, isError, refetch } = useQuery({
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
      showToast(friendlyWriteError(err, 'Could not confirm right now. Please try again.'), 'error'),
  });

  const confirmStep = (card) => {
    const accepting = !!connOf(card.connectionId)?.confirmedByOther;
    Alert.alert(
      accepting ? 'Accept the next step?' : 'Start the next step?',
      accepting
        ? `${card.customerName} has asked to move one step up. Accepting climbs the ladder for both of you.`
        : `Trust grows only when BOTH of you agree. ${card.customerName} will get a tap to accept.`,
      [
        { text: 'Not yet', style: 'cancel' },
        { text: accepting ? 'Accept' : 'Start', onPress: () => confirm.mutate(card.connectionId) },
      ]
    );
  };

  const customers = breakdown?.customers ?? [];
  const trusted = customers.filter((c) => c.stageIndex >= 6);
  const building = customers.filter((c) => c.stageIndex < 6);
  const shown = seg === 'trusted' ? trusted : building;

  return (
    <View>
      <Text
        accessibilityRole="header"
        style={{ fontFamily: fontFamily.display, fontSize: 26, color: t.ink, letterSpacing: -0.5 }}
      >
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
      ) : isError ? (
        <LoadError what="your helpers" onRetry={refetch} style={{ marginTop: 14 }} />
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
              confirmedByMe={!!c?.confirmedByMe}
              confirmedByOther={!!c?.confirmedByOther}
              onConfirm={() => confirmStep(card)}
            />
          );
        })
      )}
    </View>
  );
}
