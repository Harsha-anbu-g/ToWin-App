// Offer Help (4b/4c) — the helper's center-FAB screen: Available / Applied /
// Completed segments with a radius row. Cards follow the website's NeedCard:
// serif 17 title, 13 description, neutral category chip + Urgent chip (red
// dot), "1 km · Posted by Eleanor, 2 hours ago" meta, and a tonal bold
// "Offer to Help". Applied: "Waiting to hear back" + underlined Withdraw;
// accepted: green "You're helping"; completed cards sit at 65% opacity.
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { MapPin } from 'lucide-react-native';
import { memo, useCallback, useState } from 'react';
import { Alert, FlatList, Pressable, RefreshControl, Text, View } from 'react-native';
import api from '../../api/client';
import { timeAgo } from '../../lib/copy';
import { catLabel } from '../../lib/needs';
import { useTheme } from '../../theme/ThemeContext';
import SegmentedControl from '../ui/SegmentedControl';
import LoadError from '../ui/LoadError';
import SkeletonCard from '../ui/Skeleton';
import { useApplyMutations } from '../home/OpenRequestsCard';

const RADIUS_STEPS = [5, 10, 25, 50, 100];

function Pill({ label, tone = 'neutral' }) {
  const { t, radius } = useTheme();
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
        paddingHorizontal: 9,
        paddingVertical: 4,
        alignSelf: 'flex-start',
      }}
    >
      <Text style={{ fontSize: 11, fontWeight: '600', color: styles.color }}>{label}</Text>
    </View>
  );
}

// memo + stable onApply/onWithdraw (mutate fns, not mutation objects): a
// refetch or radius toggle re-renders only rows whose data actually changed.
const NeedCard = memo(function NeedCard({ need, onApply, onWithdraw, applying = false, completed = false }) {
  const { t, radius, type, fontFamily } = useTheme();
  const mine = need.myApplicationStatus;

  const confirmWithdraw = () =>
    Alert.alert('Withdraw your offer?', `You'll stop offering to help with "${need.title}".`, [
      { text: 'Keep offering', style: 'cancel' },
      { text: 'Withdraw', style: 'destructive', onPress: () => onWithdraw(need.id) },
    ]);

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
        <Text numberOfLines={2} style={{ fontSize: type.meta, color: t.inkSlate, lineHeight: 19, marginTop: 4 }}>
          {need.description}
        </Text>
      ) : null}

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 }}>
        <Pill label={catLabel(need.category)} />
        {need.urgency === 'URGENT' ? (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 5,
              backgroundColor: t.redWash2,
              borderWidth: 1,
              borderColor: t.redLineSoft,
              borderRadius: radius.pill,
              paddingHorizontal: 10,
              paddingVertical: 3,
            }}
          >
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: t.red }} />
            <Text style={{ fontSize: 11, fontWeight: '600', color: t.redDeep }}>Urgent</Text>
          </View>
        ) : null}
        {completed ? <Pill label="Completed" tone="green" /> : null}
      </View>

      <Text style={{ fontSize: type.meta, color: t.inkSlate, marginTop: 10 }}>
        {distance ? `${distance} · ` : ''}
        {need.elderName ? (
          <>
            Posted by{' '}
            <Text style={{ color: t.blueDeep, textDecorationLine: 'underline' }}>{need.elderName}</Text>
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
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Withdraw my offer"
            onPress={confirmWithdraw}
            hitSlop={{ top: 8, bottom: 8 }}
            style={{ alignSelf: 'flex-start', paddingVertical: 8 }}
          >
            <Text style={{ fontSize: type.meta, color: t.inkSlate, textDecorationLine: 'underline' }}>
              Withdraw
            </Text>
          </Pressable>
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
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Offer to Help"
          onPress={() => onApply(need.id)}
          disabled={applying}
          style={({ pressed }) => ({
            height: 40,
            borderRadius: radius.pill,
            backgroundColor: 'transparent',
            borderWidth: 1,
            borderColor: t.blueSoft,
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: 12,
            opacity: pressed || applying ? 0.7 : 1,
          })}
        >
          <Text style={{ fontSize: type.meta, fontWeight: '700', color: t.blueDeep }}>Offer to Help</Text>
        </Pressable>
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
  const { data: appsData, isError: appsFailed, refetch: refetchApps } = useQuery({
    queryKey: ['needs-applications'],
    queryFn: async () => (await api.get('/needs/applications')).data,
  });

  const radiusKm = RADIUS_STEPS[radiusIdx];
  const open = (Array.isArray(openData) ? openData : openData?.content ?? []).filter(
    (n) => !Number.isFinite(n.distanceKm) || n.distanceKm <= radiusKm
  );
  const applications = Array.isArray(appsData) ? appsData : appsData?.content ?? [];

  const available = open.filter((n) => !n.myApplicationStatus);
  const applied = applications.filter((n) => n.status !== 'COMPLETED' && n.status !== 'CANCELLED');
  const completed = applications.filter((n) => n.status === 'COMPLETED');
  const shown = seg === 'available' ? available : seg === 'applied' ? applied : completed;

  const onRefresh = async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ['needs-open'] });
    await queryClient.invalidateQueries({ queryKey: ['needs-applications'] });
    setRefreshing(false);
  };

  // Stable renderItem + memoized NeedCard: mutate fns are stable in
  // TanStack v5, so rows skip re-rendering unless their need changed.
  const renderItem = useCallback(
    ({ item }) => (
      <NeedCard
        need={item}
        onApply={apply.mutate}
        onWithdraw={withdraw.mutate}
        applying={apply.isPending}
        completed={seg === 'done'}
      />
    ),
    [apply.mutate, apply.isPending, withdraw.mutate, seg]
  );

  return (
    <FlatList
      data={isLoading && seg === 'available' ? [] : shown}
      keyExtractor={(n) => n.id}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={t.blue} />}
      contentContainerStyle={{ paddingHorizontal: spacing[4], paddingBottom: 64, gap: 10 }}
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
            style={{ marginTop: 14 }}
          />
          {seg === 'available' ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                <MapPin size={14} color={t.inkSlate} strokeWidth={1.8} />
                <Text style={{ fontSize: type.meta, color: t.inkSlate }}>
                  Showing needs within {radiusKm} km of you
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Distance ${radiusKm} kilometres — tap to change`}
                onPress={() => setRadiusIdx((i) => (i + 1) % RADIUS_STEPS.length)}
                hitSlop={{ top: 6, bottom: 6 }}
                style={({ pressed }) => ({
                  height: 30,
                  paddingHorizontal: 12,
                  borderRadius: 15,
                  backgroundColor: t.surfaceFill,
                  borderWidth: 1,
                  borderColor: t.border,
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <Text style={{ fontSize: type.caption, fontWeight: '600', color: t.inkSlate }}>
                  {radiusKm} km
                </Text>
              </Pressable>
            </View>
          ) : (
            <View style={{ height: 10 }} />
          )}
        </View>
      }
      ListEmptyComponent={
        <View style={{ backgroundColor: t.canvas, borderWidth: 1, borderColor: t.border, borderRadius: 16, padding: 16 }}>
          {isLoading ? (
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
            <Text style={{ fontSize: type.body, lineHeight: 22, color: t.inkSlate }}>
              {seg === 'available'
                ? `No open needs within ${radiusKm} km right now. Try a wider distance, or check back soon.`
                : seg === 'applied'
                  ? "You haven't offered to help yet. Open Available and pick a need."
                  : 'No completed help yet — it will show here.'}
            </Text>
          )}
        </View>
      }
      renderItem={renderItem}
    />
  );
}
