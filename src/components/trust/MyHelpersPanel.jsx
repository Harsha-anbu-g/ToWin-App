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
import { filterBlocked, getBlocked } from '../../lib/blockList';
import { useTheme } from '../../theme/ThemeContext';
import ActionChip from '../ui/ActionChip';
import Avatar from '../ui/Avatar';
import Button from '../ui/Button';
import LoadError from '../ui/LoadError';
import SkeletonCard from '../ui/Skeleton';
import SegmentedControl from '../ui/SegmentedControl';
import PausedCard from './PausedCard';
import TrustLadder from './TrustLadder';

// Short stage names for the ladder footer (handoff §Interactions).
const SHORT_STAGES = ['Connected', 'Messaging', 'Phone', 'Video', 'Socials', 'Met', 'Trusted'];

function HelperCard({ card, conn, connReady, confirmedByMe, confirmedByOther, onConfirm, onPause }) {
  const { t, radius, type } = useTheme();
  const router = useRouter();
  const atTop = card.stageIndex >= 6;
  const next = SHORT_STAGES[Math.min(card.stageIndex + 1, 6)];
  // Backend rule (website ea03935): the elder STARTS a step; if the other
  // side already confirmed, this tap accepts and the step climbs.
  const ctaLabel = confirmedByOther ? 'Accept the next step' : 'Start the next step';

  return (
    <View style={{ backgroundColor: t.canvas, borderWidth: 1, borderColor: t.border, borderRadius: radius.card, padding: 16, marginTop: 16 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Avatar name={card.customerName} uri={card.customerPhotoUrl} size={44} />
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: type.body, fontWeight: '600', color: t.ink }}>{card.customerName}</Text>
          <Text style={{ fontSize: type.caption, color: t.inkSlate, marginTop: 1 }}>
            Stage {Math.min(card.stageIndex + 1, 7)} of 7 · {SHORT_STAGES[Math.min(card.stageIndex, 6)]}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Trust score ${card.total} of ${card.totalMax}. Open your Trust Score page`}
          onPress={() => router.push('/trust')}
          hitSlop={10}
        >
          <Text style={{ fontSize: type.body, fontWeight: '600', color: t.trustGold, fontVariant: ['tabular-nums'] }}>
            {card.total}
            <Text style={{ fontWeight: '400', fontSize: type.caption }}>/{card.totalMax}</Text>
          </Text>
        </Pressable>
      </View>

      {/* Actions — parity with the helper's ElderCard: the elder can message or
          view a helper right from their own Home, not hunt the Messages tab */}
      {conn ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 16 }}>
          <ActionChip label="Message" tonal onPress={() => router.push(`/chat/${card.connectionId}`)} />
          <ActionChip label="View Profile" onPress={() => router.push(`/user/${conn.otherUserId}`)} />
        </View>
      ) : null}

      <TrustLadder stageIndex={card.stageIndex} style={{ marginTop: 16 }} />

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
        <Text style={{ fontSize: 13, color: t.inkSlate }}>Connected</Text>
        {!atTop ? (
          <Text style={{ fontSize: 13, fontWeight: '600', color: t.blueDeep }}>Next: {next}</Text>
        ) : null}
        <Text style={{ fontSize: 13, color: t.trustGold }}>Trusted</Text>
      </View>

      {atTop ? (
        <Text style={{ fontSize: type.meta, fontWeight: '600', color: t.greenDeep, marginTop: 16 }}>
          Fully trusted — the ladder is complete.
        </Text>
      ) : confirmedByMe && !confirmedByOther ? (
        <Text style={{ fontSize: type.meta, color: t.inkSlate, lineHeight: 19, marginTop: 16 }}>
          You've started the next step — waiting for {card.customerName} to accept.
        </Text>
      ) : !connReady ? (
        // Confirmed flags are unknown until ['connections'] resolves — a
        // premature "Start the next step" would 400 as already-confirmed.
        null
      ) : (
        <Button
          title={ctaLabel}
          variant="secondary"
          size="small"
          onPress={onConfirm}
          style={{ marginTop: 16 }}
        />
      )}

      {/* Trust steps can be paused/resumed (HCI rule 3) — quiet, never crowding the CTA */}
      <Button
        title="Take a break"
        variant="text"
        onPress={onPause}
        accessibilityHint="Pauses trust steps and messages with this person until either of you resumes"
        style={{ marginTop: 2 }}
      />
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
  const { data: blocked } = useQuery({ queryKey: ['block-list'], queryFn: getBlocked });

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

  const pause = useMutation({
    mutationFn: (connectionId) => api.post(`/trust/${connectionId}/pause`),
    onSuccess: () => {
      showToast('Taking a break — trust steps and messages are paused until one of you resumes.', 'info');
      queryClient.invalidateQueries({ queryKey: ['trust-my-score'] });
      queryClient.invalidateQueries({ queryKey: ['connections'] });
    },
    onError: (err) =>
      showToast(friendlyWriteError(err, 'Could not pause right now. Please try again.'), 'error'),
  });
  const resume = useMutation({
    mutationFn: (connectionId) => api.post(`/trust/${connectionId}/resume`),
    onSuccess: () => {
      showToast('Welcome back — trust steps and messages are on again.', 'success');
      queryClient.invalidateQueries({ queryKey: ['trust-my-score'] });
      queryClient.invalidateQueries({ queryKey: ['connections'] });
    },
    onError: (err) =>
      showToast(friendlyWriteError(err, 'Could not resume right now. Please try again.'), 'error'),
  });

  const confirmPause = (card) =>
    Alert.alert(
      'Take a break?',
      `Trust steps and messages with ${card.customerName} pause until either of you resumes. Nothing is lost.`,
      [
        { text: 'Not now', style: 'cancel' },
        { text: 'Pause', onPress: () => pause.mutate(card.connectionId) },
      ]
    );

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

  // Blocked people never appear in the relationship hub (UGC 1.2); score
  // cards map back to their connection for the other person's id.
  const customers = filterBlocked(
    breakdown?.customers ?? [],
    blocked,
    (card) => connOf(card.connectionId)?.otherUserId
  );
  const trusted = customers.filter((c) => c.stageIndex >= 6);
  const building = customers.filter((c) => c.stageIndex < 6);
  const shown = seg === 'trusted' ? trusted : building;
  // A paused friendship vanishes from the score breakdown (backend counts
  // ACTIVE only) — surface it from the connections list so Resume stays
  // visible, in the SAME segment the person was in when paused: the pause
  // dialog promises "Nothing is lost", so a trusted friend must not vanish
  // from Trusted Friends into the other tab.
  const pausedAll = filterBlocked(
    (connections ?? []).filter((c) => c.status === 'PAUSED'),
    blocked,
    (c) => c.otherUserId
  );
  const pausedTrusted = pausedAll.filter((c) => c.currentTrustLevel === 'TRUSTED');
  const pausedBuilding = pausedAll.filter((c) => c.currentTrustLevel !== 'TRUSTED');
  const paused = seg === 'trusted' ? pausedTrusted : pausedBuilding;

  return (
    <View>
      <Text
        accessibilityRole="header"
        style={{ fontFamily: fontFamily.display, fontSize: 26, color: t.ink, letterSpacing: -0.5 }}
      >
        My Helpers
      </Text>
      <Text style={{ fontSize: type.meta, color: t.inkSlate, marginTop: 4 }}>
        <Text style={{ color: t.trustGold, fontWeight: '600' }}>Trust</Text> grows step by step, like roots.
      </Text>

      <SegmentedControl
        segments={[
          { key: 'trusted', label: 'Trusted Friends', count: trusted.length + pausedTrusted.length },
          { key: 'building', label: 'Building Trust', count: building.length + pausedBuilding.length },
        ]}
        value={seg}
        onChange={setSeg}
        style={{ marginTop: 16 }}
      />

      {isLoading ? (
        <SkeletonCard lines={4} />
      ) : isError ? (
        <LoadError what="your helpers" onRetry={refetch} style={{ marginTop: 16 }} />
      ) : shown.length === 0 && paused.length === 0 ? (
        <View style={{ backgroundColor: t.canvas, borderWidth: 1, borderColor: t.border, borderRadius: 16, padding: 16, marginTop: 16 }}>
          <Text style={{ fontSize: type.body, color: t.inkSlate, lineHeight: 22 }}>
            {seg === 'trusted'
              ? 'No fully trusted friends yet — every ladder ends here.'
              : 'No ladders in progress. Add a friend and trust starts growing.'}
          </Text>
          <Button title="Find friends" variant="secondary" onPress={() => router.push('/friends')} style={{ marginTop: 16 }} />
        </View>
      ) : (
        shown.map((card) => {
          const c = connOf(card.connectionId);
          return (
            <HelperCard
              key={card.connectionId}
              card={card}
              conn={c}
              connReady={!!connections}
              confirmedByMe={!!c?.confirmedByMe}
              confirmedByOther={!!c?.confirmedByOther}
              onConfirm={() => confirmStep(card)}
              onPause={() => confirmPause(card)}
            />
          );
        })
      )}
      {!isLoading && !isError
        ? paused.map((c) => (
            <PausedCard
              key={c.id}
              conn={c}
              resuming={resume.isPending && resume.variables === c.id}
              onResume={() => resume.mutate(c.id)}
            />
          ))
        : null}
    </View>
  );
}
