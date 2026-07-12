// Add Friends (3g elder / 4d helper — one role-aware screen): three segments,
// Find New {Helpers|Elders} / New Invites (n) / Requested (n), a location row
// ("Showing X near you" + km control), and person cards with gold trust or
// "New here", distance, and a tonal Connect (neutral Requested once sent).
// Elder-first wording: always "friends", never "connections" (HCI rule 2).
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { MapPin } from 'lucide-react-native';
import { useState } from 'react';
import { FlatList, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import api from '../../src/api/client';
import Avatar from '../../src/components/ui/Avatar';
import Button from '../../src/components/ui/Button';
import Screen from '../../src/components/ui/Screen';
import SegmentedControl from '../../src/components/ui/SegmentedControl';
import LoadError from '../../src/components/ui/LoadError';
import SkeletonCard from '../../src/components/ui/Skeleton';
import { useAuth } from '../../src/context/AuthContext';
import { useToast } from '../../src/context/ToastContext';
import { useTheme } from '../../src/theme/ThemeContext';

// The km control cycles through the web's radius steps; people are filtered
// client-side by their distanceKm (the discover API returns everyone nearby).
const RADIUS_STEPS = [5, 10, 25, 50, 100];

function TonalChip({ label, onPress, neutral = false }) {
  const { t, radius, type } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      disabled={!onPress}
      hitSlop={{ top: 6, bottom: 6 }}
      style={({ pressed }) => ({
        height: 34,
        paddingHorizontal: 16,
        borderRadius: radius.pill,
        backgroundColor: neutral ? t.surfaceFill : 'transparent',
        borderWidth: 1,
        borderColor: neutral ? t.border : t.blueSoft,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <Text style={{ fontSize: type.meta, fontWeight: '600', color: neutral ? t.inkSlate : t.blueDeep }}>
        {label}
      </Text>
    </Pressable>
  );
}

function PersonRow({ person, trailing, onPress }) {
  const { t, radius, type } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${person.name}'s profile`}
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: t.canvas,
        borderWidth: 1,
        borderColor: t.border,
        borderRadius: radius.card,
        padding: 14,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        opacity: pressed ? 0.8 : 1,
      })}
    >
      <Avatar name={person.name} uri={person.photoUrl} size={48} />
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: type.body, fontWeight: '600', color: t.ink }}>
          {person.name}
          {person.age ? `, ${person.age}` : ''}
        </Text>
        <Text numberOfLines={1} style={{ fontSize: type.meta, marginTop: 2 }}>
          {Number.isFinite(person.trustScore) && person.trustScore > 0 ? (
            <Text style={{ color: t.trustGold, fontWeight: '600', fontVariant: ['tabular-nums'] }}>
              {person.trustScore} trust
            </Text>
          ) : (
            <Text style={{ color: t.inkSlate }}>New here</Text>
          )}
          <Text style={{ color: t.inkSlate }}>
            {Number.isFinite(person.distanceKm) && person.distanceKm > 0
              ? ` · ${person.distanceKm.toFixed(0)} km`
              : person.city
                ? ` · ${person.city}`
                : ''}
          </Text>
        </Text>
      </View>
      {trailing}
    </Pressable>
  );
}

export default function FriendsScreen() {
  const { t, spacing, type, fontFamily } = useTheme();
  const { user } = useAuth();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const router = useRouter();

  const [seg, setSeg] = useState('find');
  const [radiusIdx, setRadiusIdx] = useState(2); // 25 km default, like the web
  const [refreshing, setRefreshing] = useState(false);

  const isHelper = user?.role === 'HELPER';
  const path = isHelper ? '/discover/elders' : '/discover/helpers';
  const who = isHelper ? 'elders' : 'helpers';

  const { data: discovered, isLoading, isError: discoverFailed, refetch: refetchDiscover } = useQuery({
    queryKey: ['discover', path],
    queryFn: async () => (await api.get(path)).data,
  });
  const { data: connections, isError: connsFailed, refetch: refetchConns } = useQuery({
    queryKey: ['connections'],
    queryFn: async () => (await api.get('/connections')).data,
  });

  const conns = connections ?? [];
  const invites = conns.filter((c) => c.status === 'PENDING' && !c.initiatedByMe);
  const requested = conns.filter((c) => c.status === 'PENDING' && c.initiatedByMe);
  const statusOf = (userId) => {
    const c = conns.find((x) => x.otherUserId === userId);
    if (!c) return null;
    if (c.status === 'ACTIVE') return 'friends';
    if (c.status === 'PENDING') return c.initiatedByMe ? 'requested' : 'invited-me';
    return null;
  };

  const radiusKm = RADIUS_STEPS[radiusIdx];
  const people = (discovered ?? []).filter(
    (p) => !Number.isFinite(p.distanceKm) || p.distanceKm <= radiusKm
  );

  const request = useMutation({
    mutationFn: (targetUserId) => api.post('/connections/request', { targetUserId }),
    onSuccess: () => {
      showToast('Friend request sent!', 'success');
      queryClient.invalidateQueries({ queryKey: ['connections'] });
    },
    onError: (err) =>
      showToast(err?.response?.data?.message || 'Could not send the request. Please try again.', 'error'),
  });

  const respond = useMutation({
    mutationFn: ({ id, accept }) => api.post(`/connections/${id}/respond`, { accept }),
    onSuccess: (_res, { accept }) => {
      showToast(accept ? 'You are now friends!' : 'Request declined.', accept ? 'success' : 'info');
      queryClient.invalidateQueries({ queryKey: ['connections'] });
    },
    onError: () => showToast('Could not respond right now. Please try again.', 'error'),
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ['discover', path] });
    await queryClient.invalidateQueries({ queryKey: ['connections'] });
    setRefreshing(false);
  };

  const refreshControl = (
    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={t.blue} />
  );

  // failed/retry: a dropped network must read as "couldn't load", never as
  // an encouraging-but-false "nobody new right now" (silent-failure audit).
  const emptyCard = (message, { failed, what, retry } = {}) => (
    <View style={{ backgroundColor: t.canvas, borderWidth: 1, borderColor: t.border, borderRadius: 16, padding: 16 }}>
      {isLoading && seg === 'find' ? (
        <SkeletonCard />
      ) : failed ? (
        <LoadError bare what={what} onRetry={retry} />
      ) : (
        <Text style={{ fontSize: type.body, color: t.inkSlate, lineHeight: 22 }}>{message}</Text>
      )}
    </View>
  );

  return (
    <Screen back scroll={false} contentStyle={{ padding: 0 }}>
      <View style={{ flex: 1, paddingHorizontal: spacing[4] }}>
        <Text
          accessibilityRole="header"
          style={{ fontFamily: fontFamily.display, fontSize: 28, color: t.ink, letterSpacing: -0.5, marginTop: 4 }}
        >
          Add Friends
        </Text>

        <SegmentedControl
          segments={[
            { key: 'find', label: isHelper ? 'Find New Elders' : 'Find New Helpers' },
            { key: 'invites', label: 'New Invites', count: invites.length },
            { key: 'requested', label: 'Requested', count: requested.length },
          ]}
          value={seg}
          onChange={setSeg}
          style={{ marginTop: 14, marginBottom: 12 }}
        />

        {seg === 'find' ? (
          <FlatList
            data={isLoading ? [] : people}
            keyExtractor={(p) => p.userId}
            refreshControl={refreshControl}
            contentContainerStyle={{ paddingBottom: 64, gap: 10 }}
            ListHeaderComponent={
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 10 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <MapPin size={14} color={t.inkSlate} strokeWidth={1.8} />
                  <Text style={{ fontSize: type.meta, color: t.inkSlate }}>
                    Showing {who} near you
                  </Text>
                </View>
                <TonalChip
                  label={`${radiusKm} km`}
                  neutral
                  onPress={() => setRadiusIdx((i) => (i + 1) % RADIUS_STEPS.length)}
                />
              </View>
            }
            ListEmptyComponent={emptyCard(
              `Nobody new within ${radiusKm} km right now. Try a wider distance, or check back soon.`,
              { failed: discoverFailed, what: 'people near you', retry: refetchDiscover }
            )}
            renderItem={({ item: p }) => {
              const status = statusOf(p.userId);
              return (
                <PersonRow
                  person={p}
                  onPress={() => router.push(`/user/${p.userId}`)}
                  trailing={
                    status === 'friends' ? (
                      <Text style={{ fontSize: type.meta, color: t.greenDeep, fontWeight: '600' }}>Friends</Text>
                    ) : status === 'requested' ? (
                      <TonalChip label="Requested" neutral />
                    ) : (
                      <TonalChip label="Connect" onPress={() => request.mutate(p.userId)} />
                    )
                  }
                />
              );
            }}
          />
        ) : (
          <ScrollView refreshControl={refreshControl} contentContainerStyle={{ paddingBottom: 64, gap: 10 }}>
            {seg === 'invites'
              ? invites.length === 0
                ? emptyCard('No new invites. When someone asks to connect, they appear here.', {
                    failed: connsFailed,
                    what: 'your invites',
                    retry: refetchConns,
                  })
                : invites.map((conn) => (
                    <View key={conn.id} style={{ backgroundColor: t.canvas, borderWidth: 1, borderColor: t.border, borderRadius: 16, padding: 14 }}>
                      <PersonRow
                        person={{
                          name: conn.otherUserName,
                          age: conn.otherUserAge,
                          photoUrl: conn.otherUserPhotoUrl,
                          trustScore: conn.otherUserTrustScore,
                        }}
                        onPress={() => router.push(`/user/${conn.otherUserId}`)}
                      />
                      {conn.requestMessage ? (
                        <Text style={{ fontSize: type.meta, color: t.inkSlate, marginTop: 8 }}>
                          “{conn.requestMessage}”
                        </Text>
                      ) : null}
                      {/* Tonal, not filled — several invites would mean several
                          "primaries" on one screen (HCI rule 8) */}
                      <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
                        <Button
                          title="Accept"
                          variant="secondary"
                          onPress={() => respond.mutate({ id: conn.id, accept: true })}
                          style={{ flex: 1 }}
                        />
                        <Button
                          title="Not now"
                          variant="text"
                          onPress={() => respond.mutate({ id: conn.id, accept: false })}
                          style={{ flex: 1 }}
                        />
                      </View>
                    </View>
                  ))
              : requested.length === 0
                ? emptyCard('No requests waiting. People you ask to connect with appear here.', {
                    failed: connsFailed,
                    what: 'your requests',
                    retry: refetchConns,
                  })
                : requested.map((conn) => (
                    <PersonRow
                      key={conn.id}
                      person={{
                        name: conn.otherUserName,
                        age: conn.otherUserAge,
                        photoUrl: conn.otherUserPhotoUrl,
                        trustScore: conn.otherUserTrustScore,
                      }}
                      onPress={() => router.push(`/user/${conn.otherUserId}`)}
                      trailing={<TonalChip label="Requested" neutral />}
                    />
                  ))}
          </ScrollView>
        )}
      </View>
    </Screen>
  );
}
