// My Elders (4a) — the helper's relationship hub, shared by Home and the
// My Elders tab: one row per elder, name only until touched (owner call
// 2026-08-26, "do the same for the helper" as My Helpers), opening to the
// 7-node trust ladder, why the ladder exists, the family behind it, and the
// mutual-consent step. Data: ACTIVE connections merged with /trust/my-score
// for stage/points, and /needs/applications for the request behind it.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { ChevronRight, Phone } from '../icons';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { friendlyWriteError } from '../../api/client';
import { endConnection, listMyConnections } from '../../api/connections';
import { getFamilyBehindMe } from '../../api/family';
import { listMyApplications } from '../../api/needs';
import {
  confirmTrustStep,
  getMyTrustScore,
  pauseTrustSteps,
  resumeTrustSteps,
} from '../../api/trust';
import { useAuth } from '../../context/AuthContext';
import { useConfirm } from '../../context/ConfirmContext';
import { useToast } from '../../context/ToastContext';
import { filterBlocked, getBlocked } from '../../lib/blockList';
import { centerActionFor } from '../../lib/roles';
import { filterByQuery } from '../../lib/searchFilter';
import { trustOriginLine } from '../../lib/trustOrigin';
import { isStepAwaitingMe } from '../../lib/trustStepBadges';
import { LEVEL_INDEX, SHORT_STAGES } from '../../lib/trustStages';
import { useTheme } from '../../theme/ThemeContext';
import ActionChip from '../ui/ActionChip';
import Avatar from '../ui/Avatar';
import Button from '../ui/Button';
import LoadError from '../ui/LoadError';
import RowBadge from '../ui/RowBadge';
import SearchField, { SearchMiss } from '../ui/SearchField';
import SegmentedControl from '../ui/SegmentedControl';
import SkeletonCard from '../ui/Skeleton';
import SwipeSegments from '../ui/SwipeSegments';
import PausedCard from './PausedCard';
import TrustLadder from './TrustLadder';

function ElderCard({ conn, scoreCard, familyBehind = [], famConnFor, onEnd, onConfirm, onPause, divider, originLine }) {
  const { t, type, fontFamily } = useTheme();
  const router = useRouter();
  // The row is the person alone, like a WhatsApp chat row, mirroring
  // HelperCard (owner call 2026-08-26: "do the same for the helper"). One
  // touch on the name opens the ladder AND the family section — no second
  // arrow; the photo opens the profile.
  const [open, setOpen] = useState(false);
  const stageIndex = scoreCard?.stageIndex ?? LEVEL_INDEX[conn.currentTrustLevel] ?? 0;
  const atTop = stageIndex >= 6;
  const stageNo = Math.min(stageIndex + 1, 7);
  const stageName = SHORT_STAGES[Math.min(stageIndex, 6)];
  const waiting = conn.confirmedByMe && !conn.confirmedByOther;
  // The elder started the next step and it is waiting on me (owner call
  // 2026-08-28: "so they can accept"). Worn on the folded name and counted
  // on the My Elders tab until I accept; looking never clears it.
  const waitingOnMe = isStepAwaitingMe(conn);
  const next = SHORT_STAGES[Math.min(stageIndex + 1, 6)];
  const hasFamily = familyBehind.length > 0 || conn.sharedWithFamily;

  return (
    <View style={divider ? { borderTopWidth: 1, borderTopColor: t.hairline } : null}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`View ${conn.otherUserName}'s profile`}
          onPress={() => router.push(`/user/${conn.otherUserId}`)}
          hitSlop={6}
          style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
        >
          <Avatar name={conn.otherUserName} uri={conn.otherUserPhotoUrl} size={48} />
        </Pressable>
        {/* The stage rides the spoken label so folding never hides status
            from a screen reader (HCI rule 1); the eye gets it on open. */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${conn.otherUserName}. Stage ${stageNo} of 7, ${stageName}${waitingOnMe ? '. 1 step waiting for you to accept' : ''}`}
          accessibilityState={{ expanded: open }}
          onPress={() => setOpen((o) => !o)}
          style={({ pressed }) => ({
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            minHeight: 64,
            opacity: pressed ? 0.6 : 1,
          })}
        >
          <Text
            numberOfLines={1}
            style={{ flex: 1, fontFamily: fontFamily.display, fontSize: type.cardTitle, color: t.ink }}
          >
            {conn.otherUserName}
          </Text>
          <RowBadge count={waitingOnMe ? 1 : 0} />
          <ChevronRight
            size={18}
            color={t.inkFaint2}
            strokeWidth={1.8}
            style={{ transform: [{ rotate: open ? '90deg' : '0deg' }] }}
          />
        </Pressable>
      </View>

      {open ? (
        <View style={{ paddingBottom: 14 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: type.caption, color: t.inkSlate }}>
                Stage {stageNo} of 7 · {stageName}
              </Text>
              {/* Why this ladder exists and when it started (owner call
                  2026-08-26): a friendship, or one of their requests I was
                  accepted on, by name. */}
              {originLine ? (
                <Text style={{ fontSize: type.caption, color: t.inkSlate, marginTop: 2 }}>{originLine}</Text>
              ) : null}
              {conn.otherUserAge ? (
                <Text style={{ fontSize: type.caption, color: t.inkSlate, marginTop: 2 }}>
                  Age {conn.otherUserAge}
                </Text>
              ) : null}
            </View>
            {/* Message rides the stage line, like HelperCard (owner call
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
          ) : waitingOnMe ? (
            // Filled blue, not the tonal chip (owner call 2026-08-28: "accept
            // the next step should be in blue background").
            <Button
              title="Accept the next step"
              variant="primary"
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

          {/* The family standing behind this friendship (FAM-512) — same
              server-side derivation as their side, so this names exactly the
              people who can already see it and message this helper, nested
              under the elder they belong to (web 2026-07-26). Open with the
              row, no second arrow (owner call 2026-08-26). */}
          {familyBehind.length > 0 ? (
            <View style={{ borderTopWidth: 1, borderTopColor: t.hairline, marginTop: 12, paddingTop: 10 }}>
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
              friendship (FAM-511 entry point, helper side). */}
          {conn.sharedWithFamily ? (
            <ActionChip
              label="Open the family group"
              onPress={() => router.push(`/chat/${conn.id}?channel=family`)}
              style={{ marginTop: hasFamily ? 8 : 12, alignSelf: 'flex-start' }}
            />
          ) : null}

          {/* Pause and End share the right corner (HCI rule 3) — quiet, never
              crowding the CTA. */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
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
  // The search box above the list (owner call 2026-08-28, WhatsApp): narrows
  // the open segment by name.
  const [query, setQuery] = useState('');

  const { data: connections, isLoading, isError, refetch } = useQuery({
    queryKey: ['connections'],
    queryFn: listMyConnections,
  });
  const { data: breakdown } = useQuery({
    queryKey: ['trust-my-score'],
    queryFn: getMyTrustScore,
  });

  const { data: blocked } = useQuery({
    queryKey: ['block-list', user?.userId],
    queryFn: () => getBlocked(user?.userId),
  });
  // My offers, to say which request an elder's ladder grew from
  // (trustOrigin.js, helper seat). Same key as My Jobs and the Updates feed.
  const { data: applicationsData } = useQuery({
    queryKey: ['needs-applications'],
    queryFn: listMyApplications,
  });
  const myOffers = Array.isArray(applicationsData) ? applicationsData : applicationsData?.content ?? [];

  // Who stands behind each elder friendship — derived server-side from the
  // elder's sharing, so it names exactly the people who could already reach
  // me. Errors fold to empty: a helper with no family-backed friendships
  // must never see this fail loudly (FAM-512).
  const { data: behindData } = useQuery({
    queryKey: ['family-behind'],
    queryFn: async () => {
      try {
        return await getFamilyBehindMe();
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
  const shown = filterByQuery(seg === 'trusted' ? trusted : building, query, (c) => [c.otherUserName]);
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
  const paused = filterByQuery(seg === 'trusted' ? pausedTrusted : pausedBuilding, query, (c) => [c.otherUserName]);
  const anyone = building.length + trusted.length + pausedAll.length > 0;

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['connections'] });
    queryClient.invalidateQueries({ queryKey: ['trust-my-score'] });
  };

  const confirm = useMutation({
    mutationFn: (connectionId) => confirmTrustStep(connectionId),
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
    mutationFn: (connectionId) => endConnection(connectionId),
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
    mutationFn: (connectionId) => pauseTrustSteps(connectionId),
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
    mutationFn: (connectionId) => resumeTrustSteps(connectionId),
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

      {anyone ? <SearchField value={query} onChangeText={setQuery} style={{ marginTop: 12 }} /> : null}
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
      ) : query.trim() && shown.length === 0 && paused.length === 0 ? (
        // A search that finds nobody says so, and never borrows the empty
        // state below, whose doors are for someone with no one yet.
        <SearchMiss query={query} />
      ) : shown.length === 0 && paused.length === 0 ? (
        <View style={{ backgroundColor: t.canvas, borderWidth: 1, borderColor: t.border, borderRadius: 16, padding: 14, marginTop: 12 }}>
          <Text style={{ fontSize: type.body, color: t.inkSlate, lineHeight: 22 }}>
            {seg === 'trusted'
              ? 'No fully trusted elders yet. Every ladder ends here.'
              : 'No connections yet. Find an elder nearby and say hello.'}
          </Text>
          {/* Both doors (owner call 2026-08-28): the helper's own verb, worded
              as the centre button, then Find elders. */}
          <Button title={centerActionFor('HELPER').label} variant="secondary" onPress={() => router.push('/(tabs)/action')} style={{ marginTop: 16 }} />
          <Button title="Find elders" variant="secondary" onPress={() => router.push('/friends')} style={{ marginTop: 10 }} />
        </View>
      ) : (
        shown.map((conn, i) => (
          <ElderCard
            key={conn.id}
            divider={i > 0}
            originLine={trustOriginLine(conn, myOffers, { seat: 'helper' })}
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
