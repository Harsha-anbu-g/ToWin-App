// Add Friends (3g elder / 4d helper — one role-aware screen): three segments,
// Find New {Helpers|Elders} / New Invites (n) / Requested (n), a location row
// ("Showing X near you" + km control), and person cards with gold trust or
// "New here", distance, and a tonal Connect (neutral Requested once sent).
// Elder-first wording: always "friends", never "connections" (HCI rule 2).
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { MapPin } from '../../src/components/icons';
import { memo, useCallback, useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import RefreshControl from '../../src/components/ui/RefreshControl';
import api, { friendlyWriteError } from '../../src/api/client';
import Avatar from '../../src/components/ui/Avatar';
import Button from '../../src/components/ui/Button';
import Screen from '../../src/components/ui/Screen';
import SegmentedControl from '../../src/components/ui/SegmentedControl';
import LoadError from '../../src/components/ui/LoadError';
import SkeletonCard from '../../src/components/ui/Skeleton';
import { useAuth } from '../../src/context/AuthContext';
import { useConfirm } from '../../src/context/ConfirmContext';
import { useToast } from '../../src/context/ToastContext';
import { filterBlocked, getBlocked } from '../../src/lib/blockList';
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
        minHeight: 34, // min, not fixed — grows with the OS large-text setting
        paddingVertical: 6,
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

// Memoized so a list-level render doesn't re-render every card (UX-705).
const PersonRow = memo(function PersonRow({ person, trailing, onPress }) {
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
});

// One pending invite, with its accept/decline pair. Pending flags arrive as
// primitives so memo() comparison stays shallow and honest (UX-705).
const InviteCard = memo(function InviteCard({
  conn,
  onAccept,
  onDecline,
  acceptPending,
  declinePending,
  disabled,
}) {
  const { t, type } = useTheme();
  const router = useRouter();
  return (
    <View style={{ backgroundColor: t.canvas, borderWidth: 1, borderColor: t.border, borderRadius: 16, padding: 14 }}>
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
          loading={acceptPending}
          disabled={disabled}
          onPress={() => onAccept(conn)}
          style={{ flex: 1 }}
        />
        <Button
          title="Decline"
          variant="text"
          loading={declinePending}
          disabled={disabled}
          onPress={() => onDecline(conn)}
          style={{ flex: 1 }}
        />
      </View>
    </View>
  );
});

const RequestedCard = memo(function RequestedCard({ conn }) {
  const { t, type } = useTheme();
  const router = useRouter();
  return (
    <View style={{ backgroundColor: t.canvas, borderWidth: 1, borderColor: t.border, borderRadius: 16, padding: 14 }}>
      <PersonRow
        person={{
          name: conn.otherUserName,
          age: conn.otherUserAge,
          photoUrl: conn.otherUserPhotoUrl,
          trustScore: conn.otherUserTrustScore,
        }}
        onPress={() => router.push(`/user/${conn.otherUserId}`)}
        trailing={<TonalChip label="Requested" neutral />}
      />
      {/* Requests can't be withdrawn yet (backend has no
          cancel) — at least say plainly what waiting means. */}
      <Text style={{ fontSize: type.meta, color: t.inkSlate, marginTop: 8 }}>
        Waiting for {conn.otherUserName} to accept. They'll see your request in their invites.
      </Text>
    </View>
  );
});

const keyId = (item) => item.id;

export default function FriendsScreen() {
  const { t, spacing, type, fontFamily } = useTheme();
  const { user } = useAuth();
  const { showToast } = useToast();
  const confirm = useConfirm();
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
  const { data: connections, isLoading: connsLoading, isError: connsFailed, refetch: refetchConns } = useQuery({
    queryKey: ['connections'],
    queryFn: async () => (await api.get('/connections')).data,
  });

  const { data: blocked } = useQuery({
    queryKey: ['block-list', user?.userId],
    queryFn: () => getBlocked(user?.userId),
  });

  // Blocked people never appear — not in Find, and their invites vanish (UGC 1.2)
  const conns = filterBlocked(connections ?? [], blocked, (c) => c.otherUserId);
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
  const people = filterBlocked(discovered ?? [], blocked, (p) => p.userId).filter(
    (p) => !Number.isFinite(p.distanceKm) || p.distanceKm <= radiusKm
  );

  const request = useMutation({
    mutationFn: (targetUserId) => api.post('/connections/request', { targetUserId }),
    onSuccess: () => {
      showToast('Friend request sent!', 'success');
      queryClient.invalidateQueries({ queryKey: ['connections'] });
    },
    onError: (err) =>
      showToast(
        friendlyWriteError(err, err?.response?.data?.message || 'Could not send the request. Please try again.'),
        'error'
      ),
  });

  const respond = useMutation({
    mutationFn: ({ id, accept }) => api.post(`/connections/${id}/respond`, { accept }),
    onSuccess: (_res, { accept }) => {
      showToast(accept ? 'You are now friends!' : 'Request declined.', accept ? 'success' : 'info');
      queryClient.invalidateQueries({ queryKey: ['connections'] });
    },
    onError: (err) =>
      showToast(friendlyWriteError(err, 'Could not respond right now. Please try again.'), 'error'),
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ['discover', path] });
    await queryClient.invalidateQueries({ queryKey: ['connections'] });
    setRefreshing(false);
  };

  const { mutate: respondMutate } = respond;
  const acceptInvite = useCallback(
    (conn) => respondMutate({ id: conn.id, accept: true }),
    [respondMutate]
  );
  const declineInvite = useCallback(
    async (conn) => {
      // Declining is permanent on the backend — the label must not promise
      // "later", and it confirms first.
      const ok = await confirm({
        title: 'Decline this invite?',
        message: `${conn.otherUserName} will be told you declined. They can invite you again later.`,
        cancelLabel: 'Keep invite',
        confirmLabel: 'Decline',
        destructive: true,
      });
      if (ok) respondMutate({ id: conn.id, accept: false });
    },
    [confirm, respondMutate]
  );

  const renderPendingRow = useCallback(
    ({ item }) =>
      seg === 'invites' ? (
        <InviteCard
          conn={item}
          onAccept={acceptInvite}
          onDecline={declineInvite}
          acceptPending={
            respond.isPending && respond.variables?.id === item.id && !!respond.variables?.accept
          }
          declinePending={
            respond.isPending && respond.variables?.id === item.id && !respond.variables?.accept
          }
          disabled={respond.isPending}
        />
      ) : (
        <RequestedCard conn={item} />
      ),
    [seg, acceptInvite, declineInvite, respond.isPending, respond.variables]
  );

  const refreshControl = (
    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
  );

  // failed/retry: a dropped network must read as "couldn't load", never as
  // an encouraging-but-false "nobody new right now" (silent-failure audit).
  const emptyCard = (message, { failed, what, retry } = {}) => (
    <View style={{ backgroundColor: t.canvas, borderWidth: 1, borderColor: t.border, borderRadius: 16, padding: 16 }}>
      {(isLoading && seg === 'find') || (connsLoading && seg !== 'find') ? (
        // A pending load must never render "No new invites" (rulebook).
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
            initialNumToRender={8}
            refreshControl={refreshControl}
            contentContainerStyle={{ paddingBottom: 64, gap: 10 }}
            ListHeaderComponent={
              <View style={{ paddingBottom: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                  <MapPin size={14} color={t.inkSlate} strokeWidth={1.8} />
                  <Text style={{ fontSize: type.meta, color: t.inkSlate }}>
                    Showing {who} within
                  </Text>
                </View>
                {/* Direct choice, not a cycler — going from 25 back to 10 took
                    four taps and a memorized sequence (rulebook: recognition
                    over recall). */}
                <View
                  accessibilityRole="radiogroup"
                  accessibilityLabel={`Showing ${who} within`}
                  style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}
                >
                  {RADIUS_STEPS.map((km, i) => {
                    const active = i === radiusIdx;
                    return (
                      <Pressable
                        key={km}
                        accessibilityRole="radio"
                        accessibilityLabel={`${km} kilometers`}
                        aria-checked={active}
                        onPress={() => setRadiusIdx(i)}
                        // 36pt visual, hitSlop tops the target up to >=44pt (the
                        // kit Chip's trick — vertical only, so adjacent pills
                        // never overlap each other's target).
                        hitSlop={{ top: 4, bottom: 4 }}
                        style={({ pressed }) => ({
                          minHeight: 36,
                          paddingHorizontal: 14,
                          borderRadius: 18,
                          justifyContent: 'center',
                          backgroundColor: active ? t.blueWash : 'transparent',
                          borderWidth: 1,
                          borderColor: active ? t.blueSoft : t.border,
                          opacity: pressed ? 0.7 : 1,
                        })}
                      >
                        <Text
                          style={{
                            fontSize: type.meta,
                            fontWeight: '600',
                            color: active ? t.blueDeep : t.inkSlate,
                            fontVariant: ['tabular-nums'],
                          }}
                        >
                          {km} km
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
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
                      <TonalChip
                        label={request.isPending && request.variables === p.userId ? 'Sending…' : 'Connect'}
                        // A sent request can't be withdrawn (backend has no
                        // cancel), so a mis-tap must not send one — confirm
                        // first (HCI rule 5, error prevention).
                        onPress={
                          request.isPending
                            ? undefined
                            : async () => {
                                const ok = await confirm({
                                  title: 'Send a friend request?',
                                  message: `${p.name} will be asked to connect with you.`,
                                  cancelLabel: 'Not now',
                                  confirmLabel: 'Send request',
                                });
                                if (ok) request.mutate(p.userId);
                              }
                        }
                      />
                    )
                  }
                />
              );
            }}
          />
        ) : (
          <FlatList
            data={seg === 'invites' ? invites : requested}
            keyExtractor={keyId}
            renderItem={renderPendingRow}
            initialNumToRender={8}
            refreshControl={refreshControl}
            contentContainerStyle={{ paddingBottom: 64, gap: 10 }}
            ListEmptyComponent={
              seg === 'invites'
                ? emptyCard('No new invites. When someone asks to connect, they appear here.', {
                    failed: connsFailed,
                    what: 'your invites',
                    retry: refetchConns,
                  })
                : emptyCard('No requests waiting. People you ask to connect with appear here.', {
                    failed: connsFailed,
                    what: 'your requests',
                    retry: refetchConns,
                  })
            }
          />
        )}
      </View>
    </Screen>
  );
}
