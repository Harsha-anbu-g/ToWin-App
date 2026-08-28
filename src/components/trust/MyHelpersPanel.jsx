// My Helpers (3d) — now the heart of the elder's Home: one row per helper,
// name only until touched (owner call 2026-08-26, "like whatsapp"), opening
// to the 7-node trust ladder, the family arrow and the mutual-consent "Start
// the next step"; Trusted Friends / Building Trust segments above. Extracted
// from the old dashboard route so Home owns it; parent provides the scroll
// container.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { ChevronRight } from '../icons';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import api, { friendlyWriteError } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useConfirm } from '../../context/ConfirmContext';
import { useToast } from '../../context/ToastContext';
import { filterBlocked, getBlocked } from '../../lib/blockList';
import { centerActionFor } from '../../lib/roles';
import { filterByQuery } from '../../lib/searchFilter';
import { trustOriginLine } from '../../lib/trustOrigin';
import { SHORT_STAGES } from '../../lib/trustStages';
import { useTheme } from '../../theme/ThemeContext';
import FamilyShareToggle from '../family/FamilyShareToggle';
import ActionChip from '../ui/ActionChip';
import Avatar from '../ui/Avatar';
import Button from '../ui/Button';
import LoadError from '../ui/LoadError';
import SkeletonCard from '../ui/Skeleton';
import SearchField, { SearchMiss } from '../ui/SearchField';
import SegmentedControl from '../ui/SegmentedControl';
import SwipeSegments from '../ui/SwipeSegments';
import PausedCard from './PausedCard';
import TrustLadder from './TrustLadder';


function HelperCard({ card, conn, connReady, confirmedByMe, confirmedByOther, onConfirm, onPause, divider, originLine }) {
  const { t, type, fontFamily } = useTheme();
  const router = useRouter();
  // The row is the person alone, like a WhatsApp chat row (owner call
  // 2026-08-26: "only show the name of the person like whatsapp"). Touching
  // the name opens the ladder AND the family section in one go — no second
  // arrow to find (owner, same day: "it should also open the family, no
  // double clicking"). This retires the 2026-08-17 fold-under-an-arrow rule:
  // the row itself is the fold now. The photo opens the profile, the way
  // WhatsApp's own row splits photo from name.
  const [open, setOpen] = useState(false);
  const atTop = card.stageIndex >= 6;
  const stageNo = Math.min(card.stageIndex + 1, 7);
  const stageName = SHORT_STAGES[Math.min(card.stageIndex, 6)];
  const next = SHORT_STAGES[Math.min(card.stageIndex + 1, 6)];
  // Backend rule (TrustService): the elder STARTS every step and the helper
  // can only accept afterwards — so this card's button always reads Start
  // (a helper-first confirm is refused server-side; owner call 2026-08-17).
  const ctaLabel = 'Start the next step';

  return (
    <View style={divider ? { borderTopWidth: 1, borderTopColor: t.hairline } : null}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`View ${card.customerName}'s profile`}
          disabled={!conn}
          onPress={() => router.push(`/user/${conn.otherUserId}`)}
          hitSlop={6}
          style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
        >
          <Avatar name={card.customerName} uri={card.customerPhotoUrl} size={48} />
        </Pressable>
        {/* The stage rides the spoken label so collapsing never hides status
            from a screen reader (HCI rule 1); the eye gets it on open. */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${card.customerName}. Stage ${stageNo} of 7, ${stageName}`}
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
          {/* Serif 400 name, like ElderCard and the web hub cards (UX-711):
              sans 600 here broke the one-app rhythm between the two hubs. */}
          <Text
            numberOfLines={1}
            style={{ flex: 1, fontFamily: fontFamily.display, fontSize: type.cardTitle, color: t.ink }}
          >
            {card.customerName}
          </Text>
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
                  2026-08-26): a friendship, or one of my posted requests by
                  name. Waits for ['connections'], which carries the date. */}
              {originLine ? (
                <Text style={{ fontSize: type.caption, color: t.inkSlate, marginTop: 2 }}>
                  {originLine}
                </Text>
              ) : null}
            </View>
            {/* Message rides the stage line (owner call 2026-08-17: it does
                not need a line of its own). */}
            {conn ? (
              <ActionChip label="Message" tonal onPress={() => router.push(`/chat/${card.connectionId}`)} />
            ) : null}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Trust score ${card.total} of ${card.totalMax}. Open your Trust Score page`}
              onPress={() => router.push('/trust')}
              hitSlop={10}
              style={({ pressed }) => ({
                minWidth: 40,
                minHeight: 40,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <Text style={{ fontSize: type.body, fontWeight: '600', color: t.trustGold, fontVariant: ['tabular-nums'] }}>
                {card.total}
                <Text style={{ fontWeight: '400', fontSize: type.caption, fontVariant: ['tabular-nums'] }}>/{card.totalMax}</Text>
              </Text>
            </Pressable>
          </View>

          <TrustLadder stageIndex={card.stageIndex} style={{ marginTop: 12 }} />

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
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
          ) : confirmedByMe && !confirmedByOther ? (
            <Text style={{ fontSize: type.meta, color: t.inkSlate, lineHeight: 18, marginTop: 12 }}>
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
              style={{ marginTop: 12 }}
            />
          )}

          {/* Family visibility (FAM-404) + the shared updates thread (FAM-511),
              open with the row. sharedWithFamily lives on the connection
              object, so the section waits for ['connections']. */}
          {conn ? (
            <>
              <FamilyShareToggle connectionId={conn.id} shared={conn.sharedWithFamily} />
              {conn.sharedWithFamily ? (
                <ActionChip
                  label="Open the family group"
                  onPress={() => router.push(`/chat/${conn.id}?channel=family`)}
                  style={{ marginTop: 8, alignSelf: 'flex-start' }}
                />
              ) : null}
            </>
          ) : null}

          {/* Trust steps can be paused/resumed (HCI rule 3) — quiet, in the
              right corner, never crowding the CTA. */}
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 4 }}>
            <Button
              title="Take a break"
              variant="text"
              onPress={onPause}
              accessibilityHint="Pauses trust steps and messages with this person until either of you resumes"
              style={{ paddingHorizontal: 0 }}
            />
          </View>
        </View>
      ) : null}
    </View>
  );
}

export default function MyHelpersPanel() {
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

  const { data: breakdown, isLoading, isError, refetch } = useQuery({
    queryKey: ['trust-my-score'],
    queryFn: async () => (await api.get('/trust/my-score')).data,
  });
  const { data: connections } = useQuery({
    queryKey: ['connections'],
    queryFn: async () => (await api.get('/connections')).data,
  });
  const connOf = (id) => (connections ?? []).find((c) => c.id === id);
  // My posted requests, to say which one a helper is on (trustOrigin.js).
  // Same key as Posted Help and the tab shell, so react-query dedupes it.
  const { data: needsMine } = useQuery({
    queryKey: ['needs-mine'],
    queryFn: async () => (await api.get('/needs/mine')).data,
  });
  const { data: blocked } = useQuery({
    queryKey: ['block-list', user?.userId],
    queryFn: () => getBlocked(user?.userId),
  });

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
    // Always the Start dialog: only the elder can begin a step (TrustService).
    const ok = await askConfirm({
      title: 'Start the next step?',
      message: `Trust grows only when BOTH of you agree. ${card.customerName} will get a tap to accept.`,
      cancelLabel: 'Not yet',
      confirmLabel: 'Start',
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
  const shown = filterByQuery(seg === 'trusted' ? trusted : building, query, (c) => [c.customerName]);
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
  const paused = filterByQuery(seg === 'trusted' ? pausedTrusted : pausedBuilding, query, (c) => [c.otherUserName]);
  const anyone = building.length + trusted.length + pausedAll.length > 0;

  return (
    <View>
      <Text
        accessibilityRole="header"
        style={{ fontFamily: fontFamily.display, fontSize: 22, color: t.ink, letterSpacing: -0.5 }}
      >
        My Helpers
      </Text>
      <Text style={{ fontSize: type.meta, color: t.inkSlate, marginTop: 2 }}>
        <Text style={{ color: t.trustGold, fontWeight: '600' }}>Trust</Text> grows step by step, like roots.
      </Text>

      {anyone ? <SearchField value={query} onChangeText={setQuery} style={{ marginTop: 12 }} /> : null}
      <SegmentedControl
        segments={[
          // Building Trust leads (owner call 2026-08-17): it is the working
          // list, where the next step lives; Trusted Friends is the trophy
          // shelf. The order now matches the default segment below.
          // No counts on these labels (owner call 2026-08-22: "it should not
          // show the number near the building trust, trusted friends").
          { key: 'building', label: 'Building Trust' },
          { key: 'trusted', label: 'Trusted Friends' },
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
        <LoadError what="your helpers" onRetry={refetch} style={{ marginTop: 16 }} />
      ) : query.trim() && shown.length === 0 && paused.length === 0 ? (
        // A search that finds nobody says so, and never borrows the empty
        // state below, whose doors are for someone with no one yet.
        <SearchMiss query={query} />
      ) : shown.length === 0 && paused.length === 0 ? (
        <View style={{ backgroundColor: t.canvas, borderWidth: 1, borderColor: t.border, borderRadius: 16, padding: 14, marginTop: 12 }}>
          <Text style={{ fontSize: type.body, color: t.inkSlate, lineHeight: 22 }}>
            {seg === 'trusted'
              ? 'No fully trusted friends yet. Every ladder ends here.'
              : 'No ladders in progress. Add a friend and trust starts growing.'}
          </Text>
          {/* Both doors (owner call 2026-08-28, "same for my helper"): the
              elder's own verb, worded as the centre button, then Find friends. */}
          <Button title={centerActionFor('ELDER').label} variant="secondary" onPress={() => router.push('/(tabs)/action')} style={{ marginTop: 16 }} />
          <Button title="Find friends" variant="secondary" onPress={() => router.push('/friends')} style={{ marginTop: 10 }} />
        </View>
      ) : (
        shown.map((card, i) => {
          const c = connOf(card.connectionId);
          return (
            <HelperCard
              key={card.connectionId}
              divider={i > 0}
              card={card}
              conn={c}
              originLine={c ? trustOriginLine(c, needsMine?.content) : null}
              connReady={!!connections}
              confirmedByMe={!!c?.confirmedByMe}
              confirmedByOther={!!c?.confirmedByOther}
              onConfirm={() => confirmStep(card)}
              onPause={async () => {
                // Asks first (owner call 2026-08-17): a mis-tap here
                // silences a friendship, so the dialog stands in front and
                // the undo toast stays as the second net.
                const ok = await askConfirm({
                  title: 'Take a break?',
                  message: `Trust steps and messages with ${card.customerName} pause until either of you resumes. Nothing is lost.`,
                  cancelLabel: 'Not now',
                  confirmLabel: 'Take a break',
                });
                if (ok) pause.mutate(card.connectionId);
              }}
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
      </SwipeSegments>
    </View>
  );
}
