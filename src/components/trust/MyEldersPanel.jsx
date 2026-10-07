// My Elders (4a) — the helper's relationship hub, shared by Home and the
// My Elders tab: one row per elder, name only (owner call 2026-08-26, "do the
// same for the helper" as My Helpers). Touching the name opens the elder's own
// page (owner call 2026-09-25, ElderSeatDetail) with the 7-node trust ladder,
// why the ladder exists, the family behind it, and the mutual-consent step.
// Data: ACTIVE connections merged with /trust/my-score for stage/points.
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { ChevronRight } from '../icons';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { listMyConnections } from '../../api/connections';
import { getMyTrustScore } from '../../api/trust';
import { useAuth } from '../../context/AuthContext';
import { filterBlocked, getBlocked } from '../../lib/blockList';
import { centerActionFor } from '../../lib/roles';
import { filterByQuery } from '../../lib/searchFilter';
import { isStepAwaitingMe } from '../../lib/trustStepBadges';
import { LEVEL_INDEX, SHORT_STAGES } from '../../lib/trustStages';
import useElderSeatActions from '../../lib/useElderSeatActions';
import { useTheme } from '../../theme/ThemeContext';
import Avatar from '../ui/Avatar';
import Button from '../ui/Button';
import LoadError from '../ui/LoadError';
import RowBadge from '../ui/RowBadge';
import SearchField, { SearchMiss } from '../ui/SearchField';
import SegmentedControl from '../ui/SegmentedControl';
import SkeletonCard from '../ui/Skeleton';
import SwipeSegments from '../ui/SwipeSegments';
import PausedCard from './PausedCard';
import { tr } from '../../i18n';

// The row is the person alone, like a WhatsApp chat row, mirroring
// HelperCard (owner call 2026-08-26: "do the same for the helper"). Touching
// the name opens the elder's own page (owner call 2026-09-25: not a dropdown,
// "a new page like whatsapp"), where the ladder, the family behind it and the
// next step live (ElderSeatDetail). The photo opens the profile.
function ElderCard({ conn, scoreCard, divider }) {
  const { t, type, fontFamily } = useTheme();
  const router = useRouter();
  const stageIndex = scoreCard?.stageIndex ?? LEVEL_INDEX[conn.currentTrustLevel] ?? 0;
  const stageNo = Math.min(stageIndex + 1, 7);
  const stageName = tr(SHORT_STAGES[Math.min(stageIndex, 6)]);
  // The elder started the next step and it is waiting on me (owner call
  // 2026-08-28: "so they can accept"). Worn on the name and counted on the My
  // Elders tab until I accept; looking never clears it.
  const waitingOnMe = isStepAwaitingMe(conn);

  return (
    <View style={divider ? { borderTopWidth: 1, borderTopColor: t.hairline } : null}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={tr("View {otherUserName}'s profile", { otherUserName: conn.otherUserName })}
          onPress={() => router.push(`/user/${conn.otherUserId}`)}
          hitSlop={6}
          style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
        >
          <Avatar name={conn.otherUserName} uri={conn.otherUserPhotoUrl} size={48} />
        </Pressable>
        {/* The stage rides the spoken label so the name-only row never hides
            status from a screen reader (HCI rule 1). */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={tr('{otherUserName}. Stage {stageNo} of 7, {stageName}', { otherUserName: conn.otherUserName, stageNo, stageName }) + (waitingOnMe ? tr('. 1 step waiting for you to accept') : '')}
          onPress={() => router.push(`/connection/${conn.id}`)}
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
          <ChevronRight size={18} color={t.inkFaint2} strokeWidth={1.8} />
        </Pressable>
      </View>
    </View>
  );
}

export default function MyEldersPanel() {
  const { t, type, fontFamily } = useTheme();
  // Blocks are per account (blockList.js), so the read is keyed by who is in.
  const { user } = useAuth();
  const router = useRouter();
  // Resume for a paused card; Accept / Take a break / End live on the elder's page.
  const { resume } = useElderSeatActions();
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
  const scoreOf = (connId) => (breakdown?.customers ?? []).find((c) => c.connectionId === connId);
  // Blocked people never appear in the relationship hub (UGC 1.2)
  const active = filterBlocked(
    // Helper friends (PEER) just chat; they live under Messages, not here.
    (connections ?? []).filter((c) => c.status === 'ACTIVE' && c.type !== 'PEER'),
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
    (connections ?? []).filter((c) => c.status === 'PAUSED' && c.type !== 'PEER'),
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
        {tr('My Elders')}
      </Text>

      {anyone ? <SearchField value={query} onChangeText={setQuery} style={{ marginTop: 12 }} /> : null}
      <SegmentedControl
        segments={[
          // Building Trust leads, mirroring MyHelpersPanel (owner call
          // 2026-08-17) and matching the default segment.
          // No counts on these labels (owner call 2026-08-22, same rule as
          // MyHelpersPanel: no number near Building Trust / Trusted).
          { key: 'building', label: tr('Building Trust') },
          { key: 'trusted', label: tr('Trusted Elders') },
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
        <LoadError what={tr('your elders')} onRetry={refetch} style={{ marginTop: 16 }} />
      ) : query.trim() && shown.length === 0 && paused.length === 0 ? (
        // A search that finds nobody says so, and never borrows the empty
        // state below, whose doors are for someone with no one yet.
        <SearchMiss query={query} />
      ) : shown.length === 0 && paused.length === 0 ? (
        <View style={{ backgroundColor: t.canvas, borderWidth: 1, borderColor: t.border, borderRadius: 16, padding: 14, marginTop: 12 }}>
          <Text style={{ fontSize: type.body, color: t.inkSlate, lineHeight: 22 }}>
            {seg === 'trusted'
              ? tr('No fully trusted elders yet. Every ladder ends here.')
              : tr('No connections yet. Find an elder nearby and say hello.')}
          </Text>
          {/* Both doors (owner call 2026-08-28): the helper's own verb, worded
              as the centre button, then Find elders. */}
          <Button title={centerActionFor('HELPER').label} variant="secondary" onPress={() => router.push('/(tabs)/action')} style={{ marginTop: 16 }} />
          <Button title={tr('Find elders')} variant="secondary" onPress={() => router.push('/friends')} style={{ marginTop: 10 }} />
        </View>
      ) : (
        shown.map((conn, i) => (
          <ElderCard
            key={conn.id}
            divider={i > 0}
            conn={conn}
            scoreCard={scoreOf(conn.id)}
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
