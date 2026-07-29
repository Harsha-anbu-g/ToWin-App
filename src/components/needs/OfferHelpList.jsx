// Offer Help (4b/4c) — the helper's center-FAB screen: Available / Applied /
// Completed segments with a radius row. Cards follow the website's NeedCard:
// serif 17 title, 13 description, neutral category chip + Urgent chip (red
// dot), "1 km · Posted by Eleanor, 2 hours ago" meta, and a tonal bold
// "Offer to Help". Applied: "Waiting to hear back" + underlined Withdraw;
// accepted: green "You're helping"; completed cards sit at 65% opacity.
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { MapPin } from 'lucide-react-native';
import { memo, useCallback, useState } from 'react';
import { FlatList, Pressable, RefreshControl, Text, View } from 'react-native';
import api from '../../api/client';
import { filterBlocked, getBlocked } from '../../lib/blockList';
import { timeAgo } from '../../lib/copy';
import { catLabel } from '../../lib/needs';
import ActionChip from '../ui/ActionChip';
import Button from '../ui/Button';
import { useTheme } from '../../theme/ThemeContext';
import SegmentedControl from '../ui/SegmentedControl';
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
              style={{ minHeight: 44, justifyContent: 'center' }}
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

      <Text style={{ fontSize: type.meta, color: t.inkSlate, marginTop: 12 }}>
        {distance ? `${distance} · ` : ''}
        {need.elderName ? (
          <>
            Posted by{' '}
            {need.elderId ? (
              <Text
                accessibilityRole="link"
                suppressHighlighting
                onPress={() => router.push(`/user/${need.elderId}`)}
                style={{ color: t.blueDeep, textDecorationLine: 'underline' }}
              >
                {need.elderName}
              </Text>
            ) : (
              // no profile to open — never dress a name as a link it isn't
              <Text style={{ fontWeight: '600' }}>{need.elderName}</Text>
            )}
          </>
        ) : (
          'Posted'
        )}
        {when ? `, ${when}` : ''}
      </Text>

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
  const { t, spacing, type, fontFamily } = useTheme();
  const queryClient = useQueryClient();
  const { apply, withdraw } = useApplyMutations();
  const [seg, setSeg] = useState('available');
  const [radiusIdx, setRadiusIdx] = useState(2); // 25 km, like the web
  const [refreshing, setRefreshing] = useState(false);

  const { data: openData, isLoading, isError: openFailed, refetch: refetchOpen } = useQuery({
    queryKey: ['needs-open'],
    queryFn: async () => (await api.get('/needs/open')).data,
  });
  const { data: appsData, isLoading: appsLoading, isError: appsFailed, refetch: refetchApps } = useQuery({
    queryKey: ['needs-applications'],
    queryFn: async () => (await api.get('/needs/applications')).data,
  });

  const { data: blocked } = useQuery({ queryKey: ['block-list'], queryFn: getBlocked });

  const radiusKm = RADIUS_STEPS[radiusIdx];
  // Blocked elders' requests never show in Available (UGC 1.2); Applied and
  // Completed stay visible — they're the helper's own commitments to unwind.
  const open = filterBlocked(
    Array.isArray(openData) ? openData : openData?.content ?? [],
    blocked,
    (n) => n.elderId
  ).filter((n) => !Number.isFinite(n.distanceKm) || n.distanceKm <= radiusKm);
  const applications = Array.isArray(appsData) ? appsData : appsData?.content ?? [];

  const available = open.filter((n) => !n.myApplicationStatus);
  const applied = applications.filter((n) => n.status !== 'COMPLETED' && n.status !== 'CANCELLED');
  const completed = applications.filter((n) => n.status === 'COMPLETED');
  const shown = seg === 'available' ? available : seg === 'applied' ? applied : completed;

  const onRefresh = async () => {
    setRefreshing(true);
    // finally: the spinner must stop even when refresh fails on poor WiFi
    try {
      await queryClient.invalidateQueries({ queryKey: ['needs-open'] });
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
    <FlatList
      data={isLoading && seg === 'available' ? [] : shown}
      keyExtractor={(n) => n.id}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={t.blue} />}
      contentContainerStyle={{ paddingHorizontal: spacing[4], paddingBottom: 64, gap: 12 }}
      ListHeaderComponent={
        <View>
          <Text
            accessibilityRole="header"
            style={{ fontFamily: fontFamily.display, fontSize: 28, color: t.ink, letterSpacing: -0.5 }}
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
          {seg === 'available' ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                <MapPin size={14} color={t.inkSlate} strokeWidth={1.8} />
                <Text style={{ fontSize: type.meta, color: t.inkSlate }}>
                  Showing needs within {radiusKm} km of you
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Distance ${radiusKm} kilometres — tap to change`}
                onPress={() => setRadiusIdx((i) => (i + 1) % RADIUS_STEPS.length)}
                hitSlop={{ top: 7, bottom: 7 }}
                style={({ pressed }) => ({
                  // minHeight, not height: the label must grow with the user's
                  // text size instead of clipping (30 is the default-size look).
                  minHeight: 30,
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 15,
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
          ) : (seg === 'available' ? openFailed : appsFailed) ? (
            // "Check back soon" copy on a failed fetch discourages the retry
            // that would actually fix it — name the failure instead.
            <LoadError
              bare
              what={seg === 'available' ? 'open requests near you' : 'your offers'}
              onRetry={seg === 'available' ? refetchOpen : refetchApps}
            />
          ) : (
            <>
              <Text style={{ fontSize: type.body, lineHeight: 22, color: t.inkSlate }}>
                {seg === 'available'
                  ? `No open needs within ${radiusKm} km right now. Try a wider distance, or check back soon.`
                  : seg === 'applied'
                    ? "You haven't offered to help yet."
                    : 'No completed help yet — it will show here.'}
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
  );
}
