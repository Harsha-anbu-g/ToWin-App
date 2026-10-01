// My Helpers (3d) — now the heart of the elder's Home: one row per helper,
// name only (owner call 2026-08-26, "like whatsapp"). Touching the name opens
// the helper's own page (owner call 2026-09-25, HelperSeatDetail) with the
// 7-node trust ladder, the family and the mutual-consent "Start the next
// step"; Trusted Friends / Building Trust segments above. Extracted from the
// old dashboard route so Home owns it; parent provides the scroll container.
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
import { useUnseenTokens } from '../../lib/seenIds';
import { TRUST_STEPS_CATEGORY, isStepNewsPending, stepNewsTokens } from '../../lib/trustStepBadges';
import { SHORT_STAGES } from '../../lib/trustStages';
import useHelperSeatActions from '../../lib/useHelperSeatActions';
import { useTheme } from '../../theme/ThemeContext';
import Avatar from '../ui/Avatar';
import Button from '../ui/Button';
import LoadError from '../ui/LoadError';
import RowBadge from '../ui/RowBadge';
import SkeletonCard from '../ui/Skeleton';
import SearchField, { SearchMiss } from '../ui/SearchField';
import SegmentedControl from '../ui/SegmentedControl';
import SwipeSegments from '../ui/SwipeSegments';
import PausedCard from './PausedCard';

// The row is the person alone, like a WhatsApp chat row (owner call
// 2026-08-26: "only show the name of the person like whatsapp"). Touching the
// name opens the helper's own page (owner call 2026-09-25: not a dropdown,
// "a new page like whatsapp"), where the ladder, the family and the next step
// live (HelperSeatDetail). The photo opens the profile, the way WhatsApp's own
// row splits photo from name.
function HelperCard({ card, conn, news, divider }) {
  const { t, type, fontFamily } = useTheme();
  const router = useRouter();
  const atTop = card.stageIndex >= 6;
  const stageNo = Math.min(card.stageIndex + 1, 7);
  const stageName = SHORT_STAGES[Math.min(card.stageIndex, 6)];

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
        {/* The stage rides the spoken label so the name-only row never hides
            status from a screen reader (HCI rule 1). */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${card.customerName}. Stage ${stageNo} of 7, ${stageName}${
            news ? (atTop ? '. New: fully trusted' : '. New: one step up, your move') : ''
          }`}
          onPress={() => router.push(`/connection/${card.connectionId}`)}
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
          {/* The helper accepted a step and the elder has not started the
              next one yet (owner call 2026-08-28: "a badge near the name of
              the helper", "until I accept, the badge should be there"). */}
          <RowBadge count={news ? 1 : 0} />
          <ChevronRight size={18} color={t.inkFaint2} strokeWidth={1.8} />
        </Pressable>
      </View>
    </View>
  );
}

export default function MyHelpersPanel() {
  const { t, type, fontFamily } = useTheme();
  // Blocks are per account (blockList.js), so the read is keyed by who is in.
  const { user } = useAuth();
  const router = useRouter();
  // Resume for a paused card; Start / Take a break live on the helper's page.
  const { resume } = useHelperSeatActions();
  const [seg, setSeg] = useState('building');
  // The search box above the list (owner call 2026-08-28, WhatsApp): narrows
  // the open segment by name.
  const [query, setQuery] = useState('');

  const { data: breakdown, isLoading, isError, refetch } = useQuery({
    queryKey: ['trust-my-score'],
    queryFn: getMyTrustScore,
  });
  const { data: connections } = useQuery({
    queryKey: ['connections'],
    queryFn: listMyConnections,
  });
  const connOf = (id) => (connections ?? []).find((c) => c.id === id);
  const { data: blocked } = useQuery({
    queryKey: ['block-list', user?.userId],
    queryFn: () => getBlocked(user?.userId),
  });
  // Ladders that moved and are waiting on the elder's move: a helper accepted
  // a step and the elder has not started the next one (owner call
  // 2026-08-28). Seeded on first run, so the friendships already here never
  // arrive as news (trustStepBadges.js).
  const stepNews = useUnseenTokens(user?.userId, TRUST_STEPS_CATEGORY, stepNewsTokens(connections), { seed: true });
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
              news={isStepNewsPending(c, stepNews)}
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
