// Friends — the people place (top-right icon on Home). Two segments:
// "My friends" (connections: pending requests to answer + active friendships)
// and "Add friends" (discovery by role). Elder-first wording: always "friends",
// never "connections" (HCI rule 2).
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { FlatList, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import api from '../../src/api/client';
import Avatar from '../../src/components/ui/Avatar';
import Button from '../../src/components/ui/Button';
import Card from '../../src/components/ui/Card';
import Screen from '../../src/components/ui/Screen';
import SkeletonCard from '../../src/components/ui/Skeleton';
import { useAuth } from '../../src/context/AuthContext';
import { useToast } from '../../src/context/ToastContext';
import { useTheme } from '../../src/theme/ThemeContext';

// Friendly names for the trust ladder stages (web TrustJourney wording).
const STAGE_LABEL = {
  JUST_CONNECTED: 'Just connected',
  CHATTING: 'Chatting',
  FRIENDLY: 'Friendly',
  PHONE_READY: 'Phone ready',
  MET_IN_PERSON: 'Met in person',
  HELPING_HAND: 'Helping hand',
  FULLY_TRUSTED: 'Fully trusted',
};

function Segmented({ value, onChange, options }) {
  const { t, radius, text, spacing } = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        backgroundColor: t.greyFill3,
        borderRadius: radius.pill,
        padding: 4,
        marginBottom: spacing[4],
      }}
    >
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <Pressable
            key={opt.value}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(opt.value)}
            style={{
              flex: 1,
              minHeight: 40,
              borderRadius: radius.pill,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: active ? t.segActive : 'transparent',
            }}
          >
            <Text
              style={{
                fontSize: text.sm,
                fontWeight: '600',
                color: active ? t.blueDeep : t.ink3,
              }}
            >
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function MyFriends() {
  const { t, spacing, text, fontFamily } = useTheme();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const router = useRouter();

  const { data, isLoading } = useQuery({
    queryKey: ['connections'],
    queryFn: async () => (await api.get('/connections')).data,
  });
  const connections = data ?? [];
  const pendingForMe = connections.filter((c) => c.status === 'PENDING' && !c.initiatedByMe);
  const pendingByMe = connections.filter((c) => c.status === 'PENDING' && c.initiatedByMe);
  const active = connections.filter((c) => c.status === 'ACTIVE');

  const respond = useMutation({
    mutationFn: ({ id, accept }) => api.post(`/connections/${id}/respond`, { accept }),
    onSuccess: (_res, { accept }) => {
      showToast(accept ? 'You are now friends!' : 'Request declined.', accept ? 'success' : 'info');
      queryClient.invalidateQueries({ queryKey: ['connections'] });
    },
    onError: () => showToast('Could not respond right now. Please try again.', 'error'),
  });

  const Row = ({ conn, children }) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${conn.otherUserName}'s profile`}
      onPress={() => router.push(`/user/${conn.otherUserId}`)}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing[3],
        paddingVertical: spacing[3],
        opacity: pressed ? 0.8 : 1,
      })}
    >
      <Avatar name={conn.otherUserName} uri={conn.otherUserPhotoUrl} size={48} />
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: text.base, color: t.ink }}>
          {conn.otherUserName}
          {conn.otherUserAge ? `, ${conn.otherUserAge}` : ''}
        </Text>
        <Text style={{ fontSize: text.sm, color: t.inkSlate, marginTop: 1 }}>
          {STAGE_LABEL[conn.currentTrustLevel] ?? 'Getting started'}
        </Text>
      </View>
      {children}
    </Pressable>
  );

  if (isLoading)
    return <Text style={{ fontSize: text.base, color: t.inkSlate }}>Loading your friends…</Text>;

  return (
    <View>
      {pendingForMe.length > 0 ? (
        <Card style={{ marginBottom: spacing[4] }}>
          <Text
            accessibilityRole="header"
            style={{ fontFamily: fontFamily.display, fontSize: text.lg, color: t.ink }}
          >
            Wants to be your friend
          </Text>
          {pendingForMe.map((conn) => (
            <View key={conn.id}>
              <Row conn={conn} />
              {conn.requestMessage ? (
                <Text style={{ fontSize: text.sm, color: t.inkSlate, marginBottom: spacing[2] }}>
                  “{conn.requestMessage}”
                </Text>
              ) : null}
              <View style={{ flexDirection: 'row', gap: spacing[3], marginBottom: spacing[2] }}>
                <Button
                  title="Accept"
                  variant="primary"
                  onPress={() => respond.mutate({ id: conn.id, accept: true })}
                  style={{ flex: 1 }}
                />
                <Button
                  title="Not now"
                  variant="secondary"
                  onPress={() => respond.mutate({ id: conn.id, accept: false })}
                  style={{ flex: 1 }}
                />
              </View>
            </View>
          ))}
        </Card>
      ) : null}

      <Card>
        <Text
          accessibilityRole="header"
          style={{ fontFamily: fontFamily.display, fontSize: text.lg, color: t.ink }}
        >
          My friends
        </Text>
        {active.length === 0 ? (
          <Text style={{ marginTop: spacing[3], fontSize: text.base, lineHeight: 26, color: t.inkSlate }}>
            No friends yet. Switch to "Add friends" above to find people near you.
          </Text>
        ) : (
          active.map((conn) => <Row key={conn.id} conn={conn} />)
        )}
        {pendingByMe.length > 0 ? (
          <View style={{ marginTop: spacing[4], borderTopWidth: 1, borderTopColor: t.hairline, paddingTop: spacing[4] }}>
            <Text style={{ fontSize: text.sm, fontWeight: '600', color: t.inkSlate }}>
              Waiting for an answer
            </Text>
            {pendingByMe.map((conn) => (
              <Row key={conn.id} conn={conn} />
            ))}
          </View>
        ) : null}
      </Card>
    </View>
  );
}

function AddFriends() {
  const { t, spacing, text, fontFamily } = useTheme();
  const { user } = useAuth();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  // Elders discover helpers; helpers discover elders; BOTH sees helpers first.
  const path = user?.role === 'HELPER' ? '/discover/elders' : '/discover/helpers';

  const { data, isLoading } = useQuery({
    queryKey: ['discover', path],
    queryFn: async () => (await api.get(path)).data,
  });
  const people = data ?? [];

  const { data: connections } = useQuery({
    queryKey: ['connections'],
    queryFn: async () => (await api.get('/connections')).data,
  });
  const connectedIds = new Set((connections ?? []).map((c) => c.otherUserId));

  const request = useMutation({
    mutationFn: (targetUserId) => api.post('/connections/request', { targetUserId }),
    onSuccess: () => {
      showToast('Friend request sent!', 'success');
      queryClient.invalidateQueries({ queryKey: ['connections'] });
    },
    onError: (err) =>
      showToast(err?.response?.data?.message || 'Could not send the request. Please try again.', 'error'),
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ['discover', path] });
    await queryClient.invalidateQueries({ queryKey: ['connections'] });
    setRefreshing(false);
  };

  // Virtualized (50+ people rule): one FlatList, each person a row card.
  return (
    <FlatList
      data={isLoading ? [] : people}
      keyExtractor={(p) => p.userId}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={t.blue} />}
      contentContainerStyle={{ padding: spacing[5], paddingTop: 0, paddingBottom: spacing[12], gap: spacing[3] }}
      ListHeaderComponent={
        <Text
          accessibilityRole="header"
          style={{ fontFamily: fontFamily.display, fontSize: text.lg, color: t.ink, marginBottom: spacing[2] }}
        >
          People near you
        </Text>
      }
      ListEmptyComponent={
        <Card>
          {isLoading ? (
            <SkeletonCard />
          ) : (
            <Text style={{ fontSize: text.base, lineHeight: 26, color: t.inkSlate }}>
              Nobody new to show right now. Check back soon — new people join every day.
            </Text>
          )}
        </Card>
      }
      renderItem={({ item: p }) => {
        const already = connectedIds.has(p.userId);
        return (
          <Card style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[3] }}>
            <Avatar name={p.name} uri={p.photoUrl} size={48} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: text.base, color: t.ink }}>
                {p.name}
                {p.age ? `, ${p.age}` : ''}
              </Text>
              <Text numberOfLines={1} style={{ fontSize: text.sm, color: t.inkSlate }}>
                {p.city ?? 'Nearby'}
                {Number.isFinite(p.distanceKm) && p.distanceKm > 0 ? ` · ${p.distanceKm.toFixed(0)} km` : ''}
                {Number.isFinite(p.trustScore) ? ` · ${p.trustScore} trust` : ''}
              </Text>
            </View>
            {already ? (
              <Text style={{ fontSize: text.sm, color: t.greenDeep, fontWeight: '600' }}>Friends</Text>
            ) : (
              <Button
                title="Add"
                variant="secondary"
                onPress={() => request.mutate(p.userId)}
                style={{ paddingHorizontal: spacing[4] }}
              />
            )}
          </Card>
        );
      }}
    />
  );
}

export default function FriendsScreen() {
  const { t, spacing } = useTheme();
  const [seg, setSeg] = useState('mine');
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries();
    setRefreshing(false);
  };

  return (
    <Screen back title="Friends" scroll={false} contentStyle={{ padding: 0 }}>
      {/* Segments stay fixed; each segment owns its own scroll container */}
      <View style={{ paddingHorizontal: spacing[5], paddingTop: spacing[2] }}>
        <Segmented
          value={seg}
          onChange={setSeg}
          options={[
            { value: 'mine', label: 'My friends' },
            { value: 'add', label: 'Add friends' },
          ]}
        />
      </View>
      {seg === 'mine' ? (
        <ScrollView
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={t.blue} />}
          contentContainerStyle={{ padding: spacing[5], paddingTop: 0, paddingBottom: spacing[12] }}
        >
          <MyFriends />
        </ScrollView>
      ) : (
        <AddFriends />
      )}
    </Screen>
  );
}
