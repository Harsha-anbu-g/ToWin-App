// My Elders (4a) — the helper's relationship hub, shared by Home and the
// My Elders tab: each elder as a card with contact actions (Message · View
// Profile · End), the 7-node trust ladder, and the mutual-consent step.
// Data: ACTIVE connections merged with /trust/my-score for stage/points.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { ChevronRight, Phone } from '../icons';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import api, { friendlyWriteError } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useConfirm } from '../../context/ConfirmContext';
import { useToast } from '../../context/ToastContext';
import { filterBlocked, getBlocked } from '../../lib/blockList';
import { LEVEL_INDEX, SHORT_STAGES } from '../../lib/trustStages';
import { useTheme } from '../../theme/ThemeContext';
import ActionChip from '../ui/ActionChip';
import Avatar from '../ui/Avatar';
import Button from '../ui/Button';
import LoadError from '../ui/LoadError';
import SegmentedControl from '../ui/SegmentedControl';
import SkeletonCard from '../ui/Skeleton';
import SwipeSegments from '../ui/SwipeSegments';
import PausedCard from './PausedCard';
import TrustLadder from './TrustLadder';

function ElderCard({ conn, scoreCard, familyBehind = [], famConnFor, onEnd, onConfirm, onPause }) {
  const { t, radius, type, fontFamily } = useTheme();
  const router = useRouter();
  // Family folds under a small arrow, mirroring HelperCard (owner call
  // 2026-08-17: the card shows the person, the steps line, the next action).
  const [familyOpen, setFamilyOpen] = useState(false);
  const stageIndex = scoreCard?.stageIndex ?? LEVEL_INDEX[conn.currentTrustLevel] ?? 0;
  const atTop = stageIndex >= 6;
  const waiting = conn.confirmedByMe && !conn.confirmedByOther;
  const next = SHORT_STAGES[Math.min(stageIndex + 1, 6)];

  return (
    <View style={{ backgroundColor: t.canvas, borderWidth: 1, borderColor: t.border, borderRadius: radius.card, padding: 14, marginTop: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        {/* The person IS the link to their profile (user call 2026-07-26):
            tapping the photo or the name opens it, so the card no longer
            carries a separate "View Profile" chip. */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`View ${conn.otherUserName}'s profile`}
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
          <Avatar name={conn.otherUserName} uri={conn.otherUserPhotoUrl} size={40} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: fontFamily.display, fontSize: type.cardTitle, color: t.ink }}>
              {conn.otherUserName}
            </Text>
            {conn.otherUserAge ? (
              <Text style={{ fontSize: type.caption, color: t.inkSlate, marginTop: 1 }}>
                Age {conn.otherUserAge}
              </Text>
            ) : null}
          </View>
        </Pressable>
        {/* Message rides the header row, like HelperCard (owner call
            2026-08-17: it does not need a line of its own). */}
        <ActionChip label="Message" tonal onPress={() => router.push(`/chat/${conn.id}`)} />
        {scoreCard ? (
          <Text style={{ fontSize: type.body, fontWeight: '600', color: t.trustGold, fontVariant: ['tabular-nums'] }}>
            {scoreCard.total}
            <Text style={{ fontWeight: '400', fontSize: type.caption, fontVariant: ['tabular-nums'] }}>/{scoreCard.totalMax}</Text>
          </Text>
        ) : null}
      </View>

      {conn.otherUserPhone ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 }}>
          <Phone size={14} color={t.blueDeep} strokeWidth={1.8} />
          <Text style={{ fontSize: type.meta, color: t.blueDeep, fontVariant: ['tabular-nums'] }}>
            {conn.otherUserPhone}
          </Text>
        </View>
      ) : null}

      <TrustLadder stageIndex={stageIndex} style={{ marginTop: 12 }} />
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
        <Text style={{ fontSize: type.meta, color: t.inkSlate }}>Connected</Text>
        {!atTop ? (
          <Text style={{ fontSize: type.meta, fontWeight: '600', color: t.blueDeep }}>Next: {next}</Text>
        ) : null}
        <Text style={{ fontSize: type.meta, color: t.trustGold }}>Trusted</Text>
      </View>

      {/* Backend rule (website ea03935): the elder starts each step — the
          helper only ever ACCEPTS, and never sees a dead start button. */}
      {atTop ? (
        // The product's headline achievement gets a moment, not one meta line
        // (rulebook: peak-end — engineer the peak).
        <View
          style={{
            backgroundColor: t.greenTint,
            borderWidth: 1,
            borderColor: t.greenLine,
            borderRadius: 12,
            padding: 12,
            marginTop: 12,
          }}
        >
          <Text style={{ fontFamily: fontFamily.display, fontSize: type.cardTitle, color: t.greenDeep }}>
            Fully trusted
          </Text>
          <Text style={{ fontSize: type.meta, color: t.greenDeep, lineHeight: 18, marginTop: 2 }}>
            Seven steps, climbed together. The whole ladder is complete.
          </Text>
        </View>
      ) : conn.confirmedByOther && !conn.confirmedByMe ? (
        <Button
          title="Accept the next step"
          variant="secondary"
          size="small"
          onPress={() => onConfirm(conn)}
          style={{ marginTop: 12 }}
        />
      ) : waiting ? (
        <Text style={{ fontSize: type.meta, color: t.inkSlate, lineHeight: 18, marginTop: 12 }}>
          Waiting for {conn.otherUserName} to accept the next step. They'll get a tap on their side.
        </Text>
      ) : (
        <Text style={{ fontSize: type.meta, color: t.inkSlate, lineHeight: 18, marginTop: 12 }}>
          {conn.otherUserName} starts each trust step. You'll get a tap here to accept.
        </Text>
      )}

      {/* One quiet utility line, mirroring HelperCard: family folds under a
          small arrow on the left; pause and End share the right corner. */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
        {familyBehind.length > 0 || conn.sharedWithFamily ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Family options${conn.sharedWithFamily ? ', sharing is on' : ''}`}
            accessibilityState={{ expanded: familyOpen }}
            onPress={() => setFamilyOpen((open) => !open)}
            hitSlop={8}
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4,
              minHeight: 36,
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <ChevronRight
              size={14}
              color={t.inkSlate}
              style={{ transform: [{ rotate: familyOpen ? '90deg' : '0deg' }] }}
            />
            <Text style={{ fontSize: type.meta, fontWeight: '600', color: t.inkSlate }}>
              Family{familyBehind.length > 0 ? ` (${familyBehind.length})` : ''}
            </Text>
          </Pressable>
        ) : (
          <View />
        )}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {/* Trust steps can be paused/resumed (HCI rule 3) — quiet, never crowding the CTA */}
          <Button
            title="Take a break"
            variant="text"
            onPress={() => onPause(conn)}
            accessibilityHint="Pauses trust steps and messages with this person until either of you resumes"
            style={{ paddingHorizontal: 0 }}
          />
          <ActionChip label="End" destructive onPress={() => onEnd(conn)} />
        </View>
      </View>

      {/* The family standing behind this friendship (FAM-512) — same
          server-side derivation as their side, so this names exactly the
          people who can already see it and message this helper, nested
          under the elder they belong to (web 2026-07-26). Revealed by the
          arrow above. */}
      {familyOpen && familyBehind.length > 0 ? (
        <View style={{ borderTopWidth: 1, borderTopColor: t.hairline, marginTop: 4, paddingTop: 10 }}>
          <Text style={{ fontSize: type.meta, fontWeight: '600', color: t.ink, marginBottom: 8 }}>
            {conn.otherUserName ? `${conn.otherUserName}'s family` : 'Their family'}
          </Text>
          {familyBehind.map((f) => {
            // The family coordination connection (auto-materialized while the
            // elder shares this friendship) carries the chat.
            const famConn = famConnFor?.(f.familyUserId);
            return (
              <View
                key={f.familyUserId}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 }}
              >
                <Avatar name={f.familyName} uri={f.familyPhotoUrl} size={36} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: type.meta, fontWeight: '600', color: t.ink }}>
                    {f.familyName}
                    {f.relationship ? (
                      <Text style={{ fontWeight: '400', color: t.inkSlate }}>
                        {`, ${conn.otherUserName ? `${conn.otherUserName}'s` : 'their'} ${f.relationship.toLowerCase()}`}
                      </Text>
                    ) : null}
                  </Text>
                  <Text style={{ fontSize: type.meta, color: t.inkSlate, lineHeight: 18, marginTop: 2 }}>
                    {famConn
                      ? 'You can message each other while this friendship stays shared.'
                      : 'Can see how this friendship is going and may message you.'}
                  </Text>
                </View>
                {famConn ? (
                  <ActionChip
                    label="Message"
                    tonal
                    onPress={() => router.push(`/chat/${famConn.id}`)}
                  />
                ) : null}
              </View>
            );
          })}
        </View>
      ) : null}

      {/* Updates for the family — only while the elder shares this
          friendship (FAM-511 entry point, helper side). Lives in the
          folded family section. */}
      {familyOpen && conn.sharedWithFamily ? (
        <ActionChip
          label="Open the family group"
          onPress={() => router.push(`/chat/${conn.id}?channel=family`)}
          style={{ marginTop: 8, alignSelf: 'flex-start' }}
        />
      ) : null}
    </View>
  );
}

export default function MyEldersPanel() {
  const { t, type, fontFamily } = useTheme();
  // Blocks are per account (blockList.js), so the read is keyed by who is in.
  const { user } = useAuth();
  const { showToast } = useToast();
  const askConfirm = useConfirm();
  const queryClient = useQueryClient();
  const router = useRouter();
  const [seg, setSeg] = useState('building');

  const { data: connections, isLoading, isError, refetch } = useQuery({
    queryKey: ['connections'],
    queryFn: async () => (await api.get('/connections')).data,
  });
  const { data: breakdown } = useQuery({
    queryKey: ['trust-my-score'],
    queryFn: async () => (await api.get('/trust/my-score')).data,
  });

  const { data: blocked } = useQuery({
    queryKey: ['block-list', user?.userId],
    queryFn: () => getBlocked(user?.userId),
  });

  // Who stands behind each elder friendship — derived server-side from the
  // elder's sharing, so it names exactly the people who could already reach
  // me. Errors fold to empty: a helper with no family-backed friendships
  // must never see this fail loudly (FAM-512).
  const { data: behindData } = useQuery({
    queryKey: ['family-behind'],
    queryFn: async () => {
      try {
        return (await api.get('/family/behind-me')).data;
      } catch {
        return { entries: [] };
      }
    },
  });
  const behindFor = (connId) =>
    (behindData?.entries ?? []).filter((f) => f.connectionId === connId);

  const scoreOf = (connId) => (breakdown?.customers ?? []).find((c) => c.connectionId === connId);
  // Blocked people never appear in the relationship hub (UGC 1.2)
  const active = filterBlocked(
    (connections ?? []).filter((c) => c.status === 'ACTIVE'),
    blocked,
    (c) => c.otherUserId
  );
  const stageOf = (c) => scoreOf(c.id)?.stageIndex ?? LEVEL_INDEX[c.currentTrustLevel] ?? 0;
  const trusted = active.filter((c) => stageOf(c) >= 6);
  const building = active.filter((c) => stageOf(c) < 6);
  const shown = seg === 'trusted' ? trusted : building;
  // A paused friendship leaves the ACTIVE list — surface it here so the way
  // back (Resume) stays visible (HCI rule 3), in the SAME segment it was paused
  // from. The pause toast promises nothing is lost, so a trusted elder must not
  // drop out of Trusted Elders into Building Trust (deep audit; MyHelpersPanel
  // already splits this way). /trust/my-score covers ACTIVE only, so the level
  // comes from the connection's own currentTrustLevel — the backend enum name
  // (common/enums/TrustLevel.java), where TRUSTED is the top rung.
  const pausedAll = filterBlocked(
    (connections ?? []).filter((c) => c.status === 'PAUSED'),
    blocked,
    (c) => c.otherUserId
  );
  const pausedTrusted = pausedAll.filter((c) => c.currentTrustLevel === 'TRUSTED');
  const pausedBuilding = pausedAll.filter((c) => c.currentTrustLevel !== 'TRUSTED');
  const paused = seg === 'trusted' ? pausedTrusted : pausedBuilding;

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['connections'] });
    queryClient.invalidateQueries({ queryKey: ['trust-my-score'] });
  };

  const confirm = useMutation({
    mutationFn: (connectionId) => api.post(`/trust/${connectionId}/confirm`),
    onSuccess: (_r, connectionId) => {
      const c = active.find((x) => x.id === connectionId);
      showToast(
        c && !c.confirmedByOther
          ? `Step confirmed. Waiting for ${c.otherUserName} to agree too.`
          : 'You both agreed. One step up the ladder!',
        'success'
      );
      refresh();
    },
    onError: (err) =>
      showToast(friendlyWriteError(err, 'Could not confirm right now. Please try again.'), 'error'),
  });

  const end = useMutation({
    mutationFn: (connectionId) => api.delete(`/connections/${connectionId}`),
    onSuccess: () => {
      showToast('Connection ended.', 'info');
      refresh();
    },
    onError: (err) =>
      showToast(friendlyWriteError(err, 'Could not end it right now. Please try again.'), 'error'),
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
      refresh();
    },
    onError: (err) =>
      showToast(friendlyWriteError(err, 'Could not pause right now. Please try again.'), 'error'),
  });
  const resume = useMutation({
    mutationFn: (connectionId) => api.post(`/trust/${connectionId}/resume`),
    onSuccess: () => {
      showToast('Welcome back. Trust steps and messages are on again.', 'success');
      refresh();
    },
    onError: (err) =>
      showToast(friendlyWriteError(err, 'Could not resume right now. Please try again.'), 'error'),
  });

  // askConfirm, not confirm: `confirm` is already the trust-step mutation.
  const confirmStep = async (conn) => {
    const ok = await askConfirm({
      title: 'Accept the next step?',
      message: `${conn.otherUserName} has asked to move one step up. Accepting climbs the ladder for both of you.`,
      cancelLabel: 'Not yet',
      confirmLabel: 'Accept',
    });
    if (ok) confirm.mutate(conn.id);
  };

  const confirmEnd = async (conn) => {
    const ok = await askConfirm({
      title: 'End this connection?',
      message: `You and ${conn.otherUserName} will no longer be connected. This cannot be undone.`,
      cancelLabel: 'Keep it',
      confirmLabel: 'End',
      destructive: true,
    });
    if (ok) end.mutate(conn.id);
  };

  return (
    <View>
      <Text
        accessibilityRole="header"
        style={{ fontFamily: fontFamily.display, fontSize: 22, color: t.ink, letterSpacing: -0.5 }}
      >
        My Elders
      </Text>
      <Text style={{ fontSize: type.meta, color: t.inkSlate, marginTop: 2 }}>
        <Text style={{ color: t.trustGold, fontWeight: '600' }}>Trust</Text> grows step by step, like roots.
      </Text>

      <SegmentedControl
        segments={[
          // Building Trust leads, mirroring MyHelpersPanel (owner call
          // 2026-08-17) and matching the default segment.
          // No counts on these labels (owner call 2026-08-22, same rule as
          // MyHelpersPanel: no number near Building Trust / Trusted).
          { key: 'building', label: 'Building Trust' },
          { key: 'trusted', label: 'Trusted Elders' },
        ]}
        value={seg}
        onChange={setSeg}
        style={{ marginTop: 12 }}
      />

      {/* Swiping the list left/right steps the segments, iOS-style. */}
      <SwipeSegments keys={['building', 'trusted']} value={seg} onChange={setSeg}>
      {isLoading ? (
        <SkeletonCard lines={4} />
      ) : isError ? (
        <LoadError what="your elders" onRetry={refetch} style={{ marginTop: 16 }} />
      ) : shown.length === 0 && paused.length === 0 ? (
        <View style={{ backgroundColor: t.canvas, borderWidth: 1, borderColor: t.border, borderRadius: 16, padding: 14, marginTop: 12 }}>
          <Text style={{ fontSize: type.body, color: t.inkSlate, lineHeight: 22 }}>
            {seg === 'trusted'
              ? 'No fully trusted elders yet. Every ladder ends here.'
              : 'No connections yet. Find an elder nearby and say hello.'}
          </Text>
          <Button title="Find elders" variant="secondary" onPress={() => router.push('/friends')} style={{ marginTop: 16 }} />
        </View>
      ) : (
        shown.map((conn) => (
          <ElderCard
            key={conn.id}
            conn={conn}
            scoreCard={scoreOf(conn.id)}
            familyBehind={behindFor(conn.id)}
            famConnFor={(familyUserId) =>
              (connections ?? []).find(
                (c) => c.type === 'FAMILY' && c.status === 'ACTIVE' && c.otherUserId === familyUserId
              )
            }
            onEnd={confirmEnd}
            onConfirm={confirmStep}
            onPause={async (c) => {
              // Asks first (owner call 2026-08-17), mirroring MyHelpersPanel.
              const ok = await askConfirm({
                title: 'Take a break?',
                message: 'Trust steps and messages with this elder pause until either of you resumes. Nothing is lost.',
                cancelLabel: 'Not now',
                confirmLabel: 'Take a break',
              });
              if (ok) pause.mutate(c.id);
            }}
          />
        ))
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
      </SwipeSegments>
    </View>
  );
}
