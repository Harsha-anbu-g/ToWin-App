// My Helpers (3d) — now the heart of the elder's Home: per-helper cards with
// the 7-node trust ladder, Trusted Friends / Building Trust segments, and the
// mutual-consent "Take the next step". Extracted from the old dashboard route
// so Home owns it; parent provides the scroll container.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import api, { friendlyWriteError } from '../../api/client';
import { useConfirm } from '../../context/ConfirmContext';
import { useToast } from '../../context/ToastContext';
import { filterBlocked, getBlocked } from '../../lib/blockList';
import { useTheme } from '../../theme/ThemeContext';
import FamilyShareToggle from '../family/FamilyShareToggle';
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
  const { t, radius, type, fontFamily } = useTheme();
  const router = useRouter();
  const atTop = card.stageIndex >= 6;
  const next = SHORT_STAGES[Math.min(card.stageIndex + 1, 6)];
  // Backend rule (website ea03935): the elder STARTS a step; if the other
  // side already confirmed, this tap accepts and the step climbs.
  const ctaLabel = confirmedByOther ? 'Accept the next step' : 'Start the next step';

  return (
    <View style={{ backgroundColor: t.canvas, borderWidth: 1, borderColor: t.border, borderRadius: radius.card, padding: 16, marginTop: 16 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        {/* The person IS the link to their profile (user call 2026-07-26):
            tapping the photo or the name opens it, so the card no longer
            carries a separate "View Profile" chip. */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`View ${card.customerName}'s profile`}
          disabled={!conn}
          onPress={() => router.push(`/user/${conn.otherUserId}`)}
          hitSlop={6}
          style={({ pressed }) => ({
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            opacity: pressed ? 0.6 : 1,
          })}
        >
          <Avatar name={card.customerName} uri={card.customerPhotoUrl} size={44} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: type.body, fontWeight: '600', color: t.ink }}>{card.customerName}</Text>
            <Text style={{ fontSize: type.caption, color: t.inkSlate, marginTop: 1 }}>
              Stage {Math.min(card.stageIndex + 1, 7)} of 7 · {SHORT_STAGES[Math.min(card.stageIndex, 6)]}
            </Text>
          </View>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Trust score ${card.total} of ${card.totalMax}. Open your Trust Score page`}
          onPress={() => router.push('/trust')}
          hitSlop={10}
          style={{ minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}
        >
          <Text style={{ fontSize: type.body, fontWeight: '600', color: t.trustGold, fontVariant: ['tabular-nums'] }}>
            {card.total}
            <Text style={{ fontWeight: '400', fontSize: type.caption }}>/{card.totalMax}</Text>
          </Text>
        </Pressable>
      </View>

      {/* Actions — parity with the helper's ElderCard: the elder can message a
          helper right from their own Home, not hunt the Messages tab. The
          profile now opens from the person's photo or name above. */}
      {conn ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 16 }}>
          <ActionChip label="Message" tonal onPress={() => router.push(`/chat/${card.connectionId}`)} />
        </View>
      ) : null}

      <TrustLadder stageIndex={card.stageIndex} style={{ marginTop: 16 }} />

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
        <Text style={{ fontSize: type.meta, color: t.inkSlate }}>Connected</Text>
        {!atTop ? (
          <Text style={{ fontSize: type.meta, fontWeight: '600', color: t.blueDeep }}>Next: {next}</Text>
        ) : null}
        <Text style={{ fontSize: type.meta, color: t.trustGold }}>Trusted</Text>
      </View>

      {atTop ? (
        // The product's headline achievement gets a moment, not one meta line
        // (rulebook: peak-end — engineer the peak).
        <View
          style={{
            backgroundColor: t.greenTint,
            borderWidth: 1,
            borderColor: t.greenLine,
            borderRadius: 12,
            padding: 14,
            marginTop: 16,
          }}
        >
          <Text style={{ fontFamily: fontFamily.display, fontSize: 19, color: t.greenDeep }}>
            Fully trusted
          </Text>
          <Text style={{ fontSize: type.meta, color: t.greenDeep, lineHeight: 20, marginTop: 2 }}>
            Seven steps, climbed together. The whole ladder is complete.
          </Text>
        </View>
      ) : confirmedByMe && !confirmedByOther ? (
        <Text style={{ fontSize: type.meta, color: t.inkSlate, lineHeight: 19, marginTop: 16 }}>
          You've started the next step. Waiting for {card.customerName} to accept.
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

      {/* Family visibility (FAM-404): the elder's per-friendship choice —
          helpers' MyEldersPanel never renders this. Waits for ['connections']
          to resolve: sharedWithFamily lives on the connection object. */}
      {conn ? (
        <FamilyShareToggle connectionId={conn.id} shared={conn.sharedWithFamily} />
      ) : null}

      {/* The shared updates thread (FAM-511) — only while this friendship is
          shared; you, your helper, and your family read it together. */}
      {conn?.sharedWithFamily ? (
        <ActionChip
          label="Open the family updates thread"
          onPress={() => router.push(`/chat/${conn.id}?channel=family`)}
          style={{ marginTop: 10, alignSelf: 'flex-start' }}
        />
      ) : null}

      {/* Trust steps can be paused/resumed (HCI rule 3) — quiet, never crowding the CTA */}
      <Button
        title="Take a break"
        variant="text"
        onPress={onPause}
        accessibilityHint="Pauses trust steps and messages with this person until either of you resumes"
        style={{ marginTop: 12 }}
      />
    </View>
  );
}

export default function MyHelpersPanel() {
  const { t, type, fontFamily } = useTheme();
  const { showToast } = useToast();
  const askConfirm = useConfirm();
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
          ? `Step confirmed. Waiting for ${c.otherUserName} to agree too.`
          : 'You both agreed. One step up the ladder!',
        'success'
      );
      queryClient.invalidateQueries({ queryKey: ['trust-my-score'] });
      queryClient.invalidateQueries({ queryKey: ['connections'] });
    },
    onError: (err) =>
      showToast(friendlyWriteError(err, 'Could not confirm right now. Please try again.'), 'error'),
  });

  // Pausing is reversible on the same connection id, so the way back rides in
  // the toast (rulebook: undo over confirmation) — no dialog stands in front.
  const pause = useMutation({
    mutationFn: (connectionId) => api.post(`/trust/${connectionId}/pause`),
    onSuccess: (_r, connectionId) => {
      showToast('Paused. You can resume any time.', 'info', {
        actionLabel: 'Undo',
        onAction: () => resume.mutate(connectionId),
      });
      queryClient.invalidateQueries({ queryKey: ['trust-my-score'] });
      queryClient.invalidateQueries({ queryKey: ['connections'] });
    },
    onError: (err) =>
      showToast(friendlyWriteError(err, 'Could not pause right now. Please try again.'), 'error'),
  });
  const resume = useMutation({
    mutationFn: (connectionId) => api.post(`/trust/${connectionId}/resume`),
    onSuccess: () => {
      showToast('Welcome back. Trust steps and messages are on again.', 'success');
      queryClient.invalidateQueries({ queryKey: ['trust-my-score'] });
      queryClient.invalidateQueries({ queryKey: ['connections'] });
    },
    onError: (err) =>
      showToast(friendlyWriteError(err, 'Could not resume right now. Please try again.'), 'error'),
  });

  // askConfirm, not confirm: `confirm` is already the trust-step mutation.
  const confirmStep = async (card) => {
    const accepting = !!connOf(card.connectionId)?.confirmedByOther;
    const ok = await askConfirm({
      title: accepting ? 'Accept the next step?' : 'Start the next step?',
      message: accepting
        ? `${card.customerName} has asked to move one step up. Accepting climbs the ladder for both of you.`
        : `Trust grows only when BOTH of you agree. ${card.customerName} will get a tap to accept.`,
      cancelLabel: 'Not yet',
      confirmLabel: accepting ? 'Accept' : 'Start',
    });
    if (ok) confirm.mutate(card.connectionId);
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
              ? 'No fully trusted friends yet. Every ladder ends here.'
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
              onPause={() => pause.mutate(card.connectionId)}
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
