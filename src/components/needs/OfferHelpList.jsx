// Offer Help (4b/4c) — the helper's center-FAB screen: Available / Applied /
// Completed segments with a radius row. Cards follow the website's NeedCard:
// serif 17 title, 13 description, neutral category chip + Urgent chip (red
// dot), "1 km · Posted 2 hours ago by Eleanor" meta, and a tonal bold
// "Offer to Help". Applied: "Waiting to hear back" + underlined Withdraw;
// accepted: green "You're helping"; completed cards sit at 65% opacity.
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { MapPin } from '../icons';
import { memo, useCallback, useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import RefreshControl from '../ui/RefreshControl';
import { listNearbyHelpRequests, listOpenHelpRequests, listMyApplications } from '../../api/needs';
import { useAuth } from '../../context/AuthContext';
import { filterBlocked, getBlocked } from '../../lib/blockList';
import { timeAgo } from '../../lib/copy';
import { catLabel } from '../../lib/needs';
import { tabBarSpace } from '../../lib/tabBarMetrics';
import ActionChip from '../ui/ActionChip';
import Button from '../ui/Button';
import LocationPrimer from '../location/LocationPrimer';
import useDevicePosition from '../../lib/useDevicePosition';
import { useTheme } from '../../theme/ThemeContext';
import SegmentedControl from '../ui/SegmentedControl';
import SwipeSegments from '../ui/SwipeSegments';
import LoadError from '../ui/LoadError';
import SkeletonCard from '../ui/Skeleton';
import { useApplyMutations } from '../../lib/useApplyMutations';

const RADIUS_STEPS = [5, 10, 25, 50, 100];

function Pill({ label, tone = 'neutral' }) {
  const { t, radius, type } = useTheme();
  const styles =
    tone === 'green'
      ? { backgroundColor: t.greenTint, borderColor: t.greenLine, color: t.greenDeep }
      : { backgroundColor: t.surfaceFill, borderColor: t.border, color: t.inkSlate };
  return (
    // A label, not a button: soft fill, no border (status pills never tap).
    <View
      style={{
        backgroundColor: styles.backgroundColor,
        borderRadius: radius.pill,
        paddingHorizontal: 8,
        paddingVertical: 4,
        alignSelf: 'flex-start',
      }}
    >
      <Text style={{ fontSize: type.meta, fontWeight: '600', color: styles.color }}>{label}</Text>
    </View>
  );
}

// memo + stable onApply/onWithdraw (mutate fns, not mutation objects): a
// refetch or radius toggle re-renders only rows whose data actually changed.
const NeedCard = memo(function NeedCard({ need, onApply, onWithdraw, applyingId = null, completed = false }) {
  const applying = applyingId === need.id; // only the tapped card shows progress (HCI rule 1)
  const { t, radius, type, fontFamily } = useTheme();
  const router = useRouter();
  const mine = need.myApplicationStatus;
  // Descriptions run up to 2000 chars and the website shows them in full —
  // the helper must be able to read the whole request before offering.
  const [descExpanded, setDescExpanded] = useState(false);
  const descLong = (need.description?.length ?? 0) > 120;

  const distance =
    Number.isFinite(need.distanceKm) && need.distanceKm > 0 ? `${need.distanceKm.toFixed(0)} km` : null;
  const when = need.createdAt ? timeAgo(need.createdAt) : null;

  return (
    <View
      style={{
        backgroundColor: t.canvas,
        borderWidth: 1,
        borderColor: t.border,
        borderRadius: radius.card,
        padding: 16,
        opacity: completed ? 0.65 : 1,
      }}
    >
      <Text style={{ fontFamily: fontFamily.display, fontSize: 17, color: t.ink, lineHeight: 22 }}>
        {need.title}
      </Text>
      {need.description ? (
        <>
          <Text
            numberOfLines={descExpanded ? undefined : 2}
            // Reading text a helper decides on — the elder floor applies (16).
            style={{ fontSize: type.body, color: t.inkSlate, lineHeight: 22, marginTop: 4 }}
          >
            {need.description}
          </Text>
          {descLong ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={descExpanded ? 'Show less of the request' : 'Read the full request'}
              onPress={() => setDescExpanded((v) => !v)}
              hitSlop={8}
              style={({ pressed }) => ({
                minHeight: 44,
                justifyContent: 'center',
                opacity: pressed ? 0.6 : 1,
              })}
            >
              <Text style={{ fontSize: type.meta, fontWeight: '600', color: t.blueDeep }}>
                {descExpanded ? 'Show less' : 'Read more'}
              </Text>
            </Pressable>
          ) : null}
        </>
      ) : null}

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 }}>
        <Pill label={catLabel(need.category)} />
        {need.urgency === 'URGENT' ? (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4,
              backgroundColor: t.redWash2,
              borderWidth: 1,
              borderColor: t.redLineSoft,
              borderRadius: radius.pill,
              paddingHorizontal: 8,
              paddingVertical: 4,
            }}
          >
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: t.red }} />
            <Text style={{ fontSize: type.meta, fontWeight: '600', color: t.redDeep }}>Urgent</Text>
          </View>
        ) : null}
        {completed ? <Pill label="Completed" tone="green" /> : null}
      </View>

      {/* The poster's name is a real 44pt box, not a Text inside a Text:
          opening their profile is how a helper checks who they would be
          helping, and a nested Text takes neither minHeight nor hitSlop
          (Chip.jsx: a target in a wrapping row has to be a box, and
          react-native-web drops hitSlop anyway). The time moved ahead of the
          name so the box ends the line and no wrap can start on a comma. */}
      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          alignItems: 'center',
          // On the row, not only on the button: a card with no profile to open
          // keeps the same meta rhythm as one that has it.
          minHeight: 44,
          marginTop: 4,
        }}
      >
        <Text style={{ fontSize: type.meta, color: t.inkSlate }}>
          {distance ? `${distance} · ` : ''}
          {when ? `Posted ${when}` : 'Posted'}
          {need.elderName ? ' by ' : ''}
        </Text>
        {need.elderName && need.elderId ? (
          // button, not link: this opens the elder's profile inside the app,
          // and "link" tells a screen reader they are being handed off
          // somewhere else. Same control, same word as the elder's side in
          // PostedHelpList.
          <Pressable
            accessibilityRole="button"
            accessibilityHint={`Opens ${need.elderName}'s profile`}
            onPress={() => router.push(`/user/${need.elderId}`)}
            style={({ pressed }) => ({
              minHeight: 44,
              minWidth: 44,
              justifyContent: 'center',
              opacity: pressed ? 0.6 : 1,
            })}
          >
            <Text
              style={{
                fontSize: type.meta,
                fontWeight: '600',
                color: t.blueDeep,
                textDecorationLine: 'underline',
              }}
            >
              {need.elderName}
            </Text>
          </Pressable>
        ) : need.elderName ? (
          // no profile to open — never dress a name as a link it isn't
          <Text style={{ fontSize: type.meta, color: t.inkSlate, fontWeight: '600' }}>
            {need.elderName}
          </Text>
        ) : null}
      </View>
      {need.actedByName ? (
        // Written by a family member on the elder's behalf. The helper is
        // about to answer it, so they should know whose words these are
        // before they reply — the job is still the elder's (website
        // HelperDashboard parity; owner call 2026-08-28). Gold, the trust
        // colour, the same line the elder and the family see.
        <Text style={{ fontSize: type.meta, fontWeight: '600', color: t.trustGold, lineHeight: 20, marginTop: 4 }}>
          {`Asked by ${need.actedByName}${need.elderName ? `, for ${need.elderName}` : ''}`}
        </Text>
      ) : null}

      {completed ? null : mine === 'PENDING' ? (
        <View style={{ marginTop: 12 }}>
          <Pill label="Waiting to hear back" />
          <Text style={{ fontSize: type.meta, color: t.inkSlate, lineHeight: 19, marginTop: 8 }}>
            The elder reviews all helpers and picks one.
          </Text>
          {/* No confirm (rulebook: undo over confirmation) — withdrawing is
              reversible in one tap: the Offer button reappears right here. */}
          <ActionChip
            label="Withdraw my offer"
            onPress={() => onWithdraw(need.id)}
            style={{ marginTop: 8, alignSelf: 'flex-start' }}
          />
        </View>
      ) : mine === 'ACCEPTED' ? (
        <View style={{ marginTop: 12 }}>
          <Pill label="You're helping" tone="green" />
        </View>
      ) : mine === 'DECLINED' ? (
        <View style={{ marginTop: 12 }}>
          <Pill label="Not this time" />
        </View>
      ) : (
        <Button
          // Tonal, not filled — this card repeats for every open request, so a
          // filled button here would mean several "primaries" on one screen.
          title="Offer to Help"
          variant="secondary"
          size="small"
          onPress={() => onApply(need.id)}
          loading={applying}
          style={{ marginTop: 12 }}
        />
      )}
    </View>
  );
});

export default function OfferHelpList() {
  const { t, radius, spacing, type, fontFamily } = useTheme();
  const insets = useSafeAreaInsets();
  // Blocks are per account (blockList.js), so the read is keyed by who is in.
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { apply, withdraw } = useApplyMutations();
  const [seg, setSeg] = useState('available');
  const [radiusIdx, setRadiusIdx] = useState(2); // 25 km, like the web
  const [refreshing, setRefreshing] = useState(false);
  const radiusKm = RADIUS_STEPS[radiusIdx];

  // Where this phone is, if it has ever said. Read-only on mount: the iOS
  // prompt is spent by a tap on the card below and nowhere else.
  const {
    status: locStatus,
    busy: locBusy,
    hasPosition,
    position,
    enable: enableLocation,
    dismissed: locDismissed,
    dismiss: hideLocationCard,
  } = useDevicePosition();
  // `locStatus` stays null until that read lands. Waiting one tick beats firing
  // /needs/open and then replacing the list a moment later with a different one.
  const settled = !!locStatus;
  const shouldAskForLocation = settled && !hasPosition && !locDismissed;

  const lat = position?.locationLat ?? null;
  const lng = position?.locationLng ?? null;

  // WITH a position: the endpoint that answers a real distance. /needs/open
  // builds every row with toResponse(n, null, ...) (NeedService.java:107), so
  // distanceKm is null on all of them and the pill below filtered nothing at
  // all. /needs/nearby is the same flow the website picks
  // (HelperDashboard.jsx:280-281) on this exact condition.
  //
  // The coordinates and the radius are IN THE KEY, so tapping the pill asks the
  // server again instead of re-slicing a list computed against the old ring.
  // That mistake was already fixed once for /discover in commit 8c046a0.
  //
  // What goes on the wire is the local record, which readSavedPosition has
  // already snapped to the 0.02 degree cell. A raw fix never reaches it.
  const nearbyQuery = useQuery({
    queryKey: ['needs-nearby', lat, lng, radiusKm],
    queryFn: () => listNearbyHelpRequests({ lat, lng, radiusKm }),
    enabled: settled && hasPosition,
  });
  // WITHOUT one: every open request, exactly as before. Browsing is never the
  // price of handing over a position.
  const openQuery = useQuery({
    queryKey: ['needs-open'],
    queryFn: listOpenHelpRequests,
    enabled: settled && !hasPosition,
  });
  const feed = hasPosition ? nearbyQuery : openQuery;
  const feedData = feed.data;
  // A disabled query reports isLoading false in TanStack v5, so the wait for
  // the position read has to be said here or the empty state flashes first.
  const isLoading = !settled || feed.isLoading;
  const feedFailed = feed.isError;
  const refetchFeed = feed.refetch;
  const { data: appsData, isLoading: appsLoading, isError: appsFailed, refetch: refetchApps } = useQuery({
    queryKey: ['needs-applications'],
    queryFn: listMyApplications,
  });

  const { data: blocked } = useQuery({
    queryKey: ['block-list', user?.userId],
    queryFn: () => getBlocked(user?.userId),
  });

  // Blocked elders' requests never show in Available (UGC 1.2); Applied and
  // Completed stay visible — they're the helper's own commitments to unwind.
  const open = filterBlocked(
    Array.isArray(feedData) ? feedData : feedData?.content ?? [],
    blocked,
    (n) => n.elderId
  ).filter((n) => !Number.isFinite(n.distanceKm) || n.distanceKm <= radiusKm);
  const applications = Array.isArray(appsData) ? appsData : appsData?.content ?? [];

  // Three lines that change with the position, named here rather than nested
  // into the JSX below. "near you" and a ring are claims this screen can only
  // make once it has one: without a position the server cannot filter by
  // distance and every row comes back with distanceKm null.
  const radiusLine = hasPosition
    ? `Showing needs within ${radiusKm} km of you`
    : 'Showing every open request';
  const availableLabel = hasPosition ? 'open requests near you' : 'open requests';
  // "Try a wider distance" points at a pill that cannot widen anything yet.
  const availableEmpty = hasPosition
    ? `No open needs within ${radiusKm} km right now. Try a wider distance, or check back soon.`
    : 'No open requests right now. Check back soon.';

  const available = open.filter((n) => !n.myApplicationStatus);
  const applied = applications.filter((n) => n.status !== 'COMPLETED' && n.status !== 'CANCELLED');
  const completed = applications.filter((n) => n.status === 'COMPLETED');
  const shown = seg === 'available' ? available : seg === 'applied' ? applied : completed;

  const onRefresh = async () => {
    setRefreshing(true);
    // finally: the spinner must stop even when refresh fails on poor WiFi
    try {
      await queryClient.invalidateQueries({ queryKey: ['needs-open'] });
      // Prefix match: every coordinate and every ring this session has cached.
      await queryClient.invalidateQueries({ queryKey: ['needs-nearby'] });
      await queryClient.invalidateQueries({ queryKey: ['needs-applications'] });
    } finally {
      setRefreshing(false);
    }
  };

  // Stable renderItem + memoized NeedCard: mutate fns are stable in
  // TanStack v5, so rows skip re-rendering unless their need changed.
  const renderItem = useCallback(
    ({ item }) => (
      <NeedCard
        need={item}
        onApply={apply.mutate}
        onWithdraw={withdraw.mutate}
        applyingId={apply.isPending ? apply.variables : null}
        completed={seg === 'done'}
      />
    ),
    [apply.mutate, apply.isPending, apply.variables, withdraw.mutate, seg]
  );

  return (
    // Swiping the list left/right steps the segments, iOS-style.
    <SwipeSegments keys={['available', 'applied', 'done']} value={seg} onChange={setSeg} style={{ flex: 1 }}>
    <FlatList
      data={isLoading && seg === 'available' ? [] : shown}
      keyExtractor={(n) => n.id}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      // The bar floats over full-height scenes: 64 left the last card's Apply
      // button trapped inside the bar's band, untappable at full scroll
      // (verify sweep 2026-08-22). The clearance is the bar's real footprint.
      contentContainerStyle={{
        paddingHorizontal: spacing[4],
        paddingBottom: tabBarSpace(insets) + spacing[4],
        gap: 12,
      }}
      ListHeaderComponent={
        <View>
          <Text
            accessibilityRole="header"
            style={{ fontFamily: fontFamily.display, fontSize: type.title, color: t.ink, letterSpacing: -0.5 }}
          >
            Offer Help
          </Text>
          <SegmentedControl
            segments={[
              { key: 'available', label: 'Available', count: available.length },
              { key: 'applied', label: 'Applied', count: applied.length },
              { key: 'done', label: 'Completed', count: completed.length },
            ]}
            value={seg}
            onChange={setSeg}
            style={{ marginTop: 16 }}
          />
          {seg === 'available' && shouldAskForLocation ? (
            // Primary here, unlike Post Help: this screen owns no other filled
            // sky-blue button, and without a position its whole distance row is
            // inert. Dismissible, because reading the open requests must never
            // be the price of handing over a position (HCI 3).
            <View style={{ marginTop: 12 }}>
              <LocationPrimer
                status={locStatus}
                busy={locBusy}
                context="offer"
                onEnable={enableLocation}
                onDismiss={hideLocationCard}
              />
            </View>
          ) : null}
          {seg === 'available' ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                <MapPin size={14} color={t.inkSlate} strokeWidth={1.8} />
                {/* Naming a ring the screen cannot apply would state
                    something untrue about what it is doing (HCI 1). */}
                <Text style={{ fontSize: type.meta, color: t.inkSlate }}>{radiusLine}</Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Distance ${radiusKm} kilometres, tap to change`}
                onPress={() => setRadiusIdx((i) => (i + 1) % RADIUS_STEPS.length)}
                style={({ pressed }) => ({
                  // A real 44pt box, not 30 propped up by hitSlop: the web build
                  // drops hitSlop (DEEP-08), and this pill is the whole answer to
                  // an empty list. min, not fixed, so it grows with OS text.
                  minHeight: 44,
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: radius.pill,
                  backgroundColor: t.surfaceFill,
                  borderWidth: 1,
                  borderColor: t.border,
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <Text style={{ fontSize: type.meta, fontWeight: '600', color: t.inkSlate }}>
                  {radiusKm} km
                </Text>
              </Pressable>
            </View>
          ) : (
            <View style={{ height: 12 }} />
          )}
        </View>
      }
      ListEmptyComponent={
        <View style={{ backgroundColor: t.canvas, borderWidth: 1, borderColor: t.border, borderRadius: 16, padding: 16 }}>
          {(seg === 'available' ? isLoading : appsLoading) ? (
            // The pending load must never render "You haven't offered to help
            // yet" on an account that has (rulebook).
            <SkeletonCard />
          ) : (seg === 'available' ? feedFailed : appsFailed) ? (
            // "Check back soon" copy on a failed fetch discourages the retry
            // that would actually fix it — name the failure instead.
            <LoadError
              bare
              what={seg === 'available' ? availableLabel : 'your offers'}
              onRetry={seg === 'available' ? refetchFeed : refetchApps}
            />
          ) : (
            <>
              <Text style={{ fontSize: type.body, lineHeight: 22, color: t.inkSlate }}>
                {seg === 'available'
                  ? availableEmpty
                  : seg === 'applied'
                    ? "You haven't offered to help yet."
                    : 'No completed help yet. It will show here.'}
              </Text>
              {/* A real starter action — never "open the Available tab"
                  (rulebook: empty states carry their own action). */}
              {seg === 'applied' ? (
                <Button
                  title="Browse needs near you"
                  variant="secondary"
                  onPress={() => setSeg('available')}
                  style={{ marginTop: spacing[4] }}
                />
              ) : null}
            </>
          )}
        </View>
      }
      renderItem={renderItem}
    />
    </SwipeSegments>
  );
}
