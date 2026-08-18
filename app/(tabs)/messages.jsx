// Messages inbox — conversations are your active friendships (web
// MessagesInbox.jsx builds rows from /connections). Tap → chat thread.
//
// FAM-510 (web parity 2026-07-26): the inbox is grouped by who each chat is
// with. A helper's chat with a family member, and a family member's chat
// with their parent, both belong under Family. Shared friendships carry a
// group updates thread (Groups). One group of chats on screen at a time,
// switched with tabs at the top. Web f6e5e84 (2026-08-02): every heading the
// account can ever fill stays on screen even while empty — people first, then
// Groups, then Family — and an empty tab explains itself.
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { memo, useCallback, useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import RefreshControl from '../../src/components/ui/RefreshControl';
import { ChevronRight, MessageCircle, Users } from '../../src/components/icons';
import api from '../../src/api/client';
import Avatar from '../../src/components/ui/Avatar';
import Button from '../../src/components/ui/Button';
import LoadError from '../../src/components/ui/LoadError';
import Screen from '../../src/components/ui/Screen';
import SegmentedControl from '../../src/components/ui/SegmentedControl';
import SwipeSegments from '../../src/components/ui/SwipeSegments';
import SkeletonCard from '../../src/components/ui/Skeleton';
import { useAuth } from '../../src/context/AuthContext';
import { filterBlocked, getBlocked } from '../../src/lib/blockList';
import { useTheme } from '../../src/theme/ThemeContext';

// Which tab a one-to-one chat belongs under (web groupOf, MessagesInbox.jsx).
const groupOf = (c) => {
  if (c.otherUserRole === 'FAMILY') return 'family';
  if (c.type === 'FAMILY') return 'family'; // a parent↔family chat, the family member's side
  if (c.otherUserRole === 'ELDER' || c.otherUserRole === 'BOTH') return 'elders';
  return 'helpers';
};

const GROUP_LABELS = { family: 'Family', elders: 'Elders', helpers: 'Helpers', groups: 'Groups' };

// Every heading this account can ever fill stays on screen even while empty,
// in a fixed order — one-to-one chats first, then Groups, then Family (web
// f6e5e84). Only a bucket the role can never fill (e.g. a helper chatting
// with another helper) is left out.
const ROLE_TAB_ORDER = {
  ELDER: ['helpers', 'groups', 'family'],
  HELPER: ['elders', 'groups', 'family'],
  FAMILY: ['helpers', 'groups', 'family'],
};
const DEFAULT_TAB_ORDER = ['elders', 'helpers', 'groups', 'family'];
const EMPTY_TAB_COPY = {
  groups: 'No group chats yet. When a friendship is shared with family, its updates will show here.',
  elders: 'No chats with elders yet. Offer to help on your dashboard to start one.',
  helpers: 'No chats with helpers yet. Connect with someone on your dashboard to start one.',
  family: 'No family chats yet. When a family member joins you here, your chat with them will show up.',
};

// Relative timestamp for inbox rows — glanceable, never a full date string.
const timeAgo = (iso) => {
  if (!iso) return '';
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

// Rows are memoized so a list-level render (tab switch, refresh tick) does
// not re-render every row the inbox holds (UX-705).
const GroupThreadRow = memo(function GroupThreadRow({ id, title }) {
  const { t, spacing, type } = useTheme();
  const router = useRouter();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Updates thread: ${title}`}
      onPress={() => router.push(`/chat/${id}?channel=family`)}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        paddingVertical: 14,
        marginHorizontal: -spacing[4],
        paddingHorizontal: spacing[4],
        backgroundColor: pressed ? t.surfaceFill : 'transparent',
      })}
    >
      {/* A thread of people, not a person — the icon says so. */}
      <View
        style={{
          width: 48,
          height: 48,
          borderRadius: 24,
          backgroundColor: t.blueWash,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Users size={22} color={t.blueDeep} strokeWidth={2} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 16, fontWeight: '600', color: t.ink }}>{title}</Text>
        <Text style={{ fontSize: type.meta, color: t.inkSlate, marginTop: 2 }}>
          Small updates thread. Everyone sharing it reads along
        </Text>
      </View>
      <ChevronRight size={18} color={t.inkFaint2} strokeWidth={1.8} />
    </Pressable>
  );
});

const ConversationRow = memo(function ConversationRow({ conn }) {
  const { t, spacing } = useTheme();
  const router = useRouter();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Chat with ${conn.otherUserName}`}
      onPress={() => router.push(`/chat/${conn.id}`)}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        paddingVertical: 14,
        // Full-bleed press highlight; text stays column-aligned
        marginHorizontal: -spacing[4],
        paddingHorizontal: spacing[4],
        backgroundColor: pressed ? t.surfaceFill : 'transparent',
      })}
    >
      <Avatar name={conn.otherUserName} uri={conn.otherUserPhotoUrl} size={48} />
      <View style={{ flex: 1 }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: spacing[2],
          }}
        >
          <Text
            numberOfLines={1}
            style={{ flexShrink: 1, fontSize: 16, fontWeight: '600', color: t.ink }}
          >
            {conn.otherUserName}
          </Text>
          {conn.lastMessageAt ? (
            <Text
              style={{
                fontSize: 13,
                color: conn.unreadCount > 0 ? t.blueDeep : t.inkSlate,
                fontWeight: conn.unreadCount > 0 ? '600' : '400',
                fontVariant: ['tabular-nums'],
              }}
            >
              {timeAgo(conn.lastMessageAt)}
            </Text>
          ) : null}
        </View>
        {/* The scanline: last message beats a static prompt;
            "Margaret's family" rides here when there's no
            conversation yet (rulebook: glanceable rows). */}
        <Text
          numberOfLines={1}
          style={{
            fontSize: 14,
            color: conn.unreadCount > 0 ? t.ink : t.inkSlate,
            fontWeight: conn.unreadCount > 0 ? '600' : '400',
            marginTop: 2,
          }}
        >
          {conn.lastMessagePreview || conn.otherUserContext || 'Say hello'}
        </Text>
      </View>
      {conn.unreadCount > 0 ? (
        <View
          style={{
            minWidth: 22,
            height: 22,
            borderRadius: 11,
            paddingHorizontal: 6,
            backgroundColor: t.badgeFill,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text
            style={{
              fontSize: 12,
              fontWeight: '700',
              color: t.actionInk,
              fontVariant: ['tabular-nums'],
            }}
          >
            {conn.unreadCount}
          </Text>
        </View>
      ) : (
        <ChevronRight size={18} color={t.inkFaint2} strokeWidth={1.8} />
      )}
    </Pressable>
  );
});

// Inset separator aligned with the text column, not full-bleed
function RowSeparator() {
  const { t } = useTheme();
  return <View style={{ height: 1, backgroundColor: t.hairline, marginLeft: 62 }} />;
}

const keyId = (item) => item.id;

export default function MessagesInbox() {
  const { t, spacing, text, type, fontFamily, radius } = useTheme();
  const { user } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['connections'],
    queryFn: async () => (await api.get('/connections')).data,
  });
  const { data: blocked } = useQuery({
    queryKey: ['block-list', user?.userId],
    queryFn: () => getBlocked(user?.userId),
  });

  // Family updates threads a linked family member can read (their parents'
  // shared friendships). A failure must surface as a failure: folding it to
  // an empty list told family members they had no group chats when the
  // request simply dropped. The person tabs carry on regardless.
  const {
    data: journeyData,
    isError: journeyError,
    refetch: refetchJourney,
  } = useQuery({
    queryKey: ['family-journey'],
    queryFn: async () => (await api.get('/family/journey')).data,
  });

  // Blocked people never resurface in the inbox (UGC 1.2)
  const active = filterBlocked(
    (data ?? []).filter((c) => c.status === 'ACTIVE'),
    blocked,
    (c) => c.otherUserId
  );

  // Group updates threads: my parents' shared friendships (family side), plus
  // my own shared friendships (elder or helper side) — the same thread from
  // either seat, deduped by connection id.
  const journeyThreads = (journeyData?.elders ?? []).flatMap((e) =>
    (e.sharedHelpers ?? []).map((h) => ({
      id: h.connectionId,
      title: `${e.elderName} & ${h.helperName}`,
    }))
  );
  const ownThreads = active
    .filter((c) => c.sharedWithFamily)
    .map((c) => ({ id: c.id, title: `You & ${c.otherUserName}` }));
  const groupThreads = [...journeyThreads, ...ownThreads.filter(
    (o) => !journeyThreads.some((j) => j.id === o.id)
  )];

  // Tabs stay fixed per role; a tab with no chats shows a friendly empty note
  // instead of disappearing (web f6e5e84).
  const tabKeys = ROLE_TAB_ORDER[user?.role] || DEFAULT_TAB_ORDER;
  const sections = tabKeys.map((key) => ({ key, label: GROUP_LABELS[key] }));
  const rowsOf = (key) =>
    key === 'groups' ? groupThreads : active.filter((c) => groupOf(c) === key);
  // Land on the first tab that has a conversation, not on an empty one.
  const currentTab = sections.some((s) => s.key === activeTab)
    ? activeTab
    : (sections.find((s) => rowsOf(s.key).length > 0) ?? sections[0]).key;

  const rows = currentTab === 'groups' ? [] : rowsOf(currentTab);
  // A failed journey fetch leaves the group threads UNKNOWN, not empty — the
  // tabs stay up so Groups can say so and offer a retry, instead of the whole
  // inbox claiming "No conversations yet" to a family member who has plenty.
  const hasAnyConversation = active.length > 0 || groupThreads.length > 0 || journeyError;

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['connections'] }),
      queryClient.invalidateQueries({ queryKey: ['family-journey'] }),
    ]);
    setRefreshing(false);
  };

  // A settled screen with something to show; loading, failure and the two
  // empty shapes all render through ListEmptyComponent instead.
  const settled = !isLoading && !isError;
  const displayed = settled && hasAnyConversation
    ? (currentTab === 'groups' ? groupThreads : rows)
    : [];

  const renderRow = useCallback(
    ({ item }) =>
      currentTab === 'groups' ? (
        <GroupThreadRow id={item.id} title={item.title} />
      ) : (
        <ConversationRow conn={item} />
      ),
    [currentTab]
  );

  return (
    <Screen scroll={false} contentStyle={{ padding: 0 }}>
      {/* Swiping the inbox left/right steps the tabs, iOS-style. */}
      <SwipeSegments
        keys={sections.map((s) => s.key)}
        value={currentTab}
        onChange={setActiveTab}
        style={{ flex: 1 }}
      >
      <FlatList
        testID="inbox-list"
        data={displayed}
        keyExtractor={keyId}
        renderItem={renderRow}
        // ~76pt rows: a dozen fills any phone screen with headroom.
        initialNumToRender={12}
        ItemSeparatorComponent={RowSeparator}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        // 120: the Ask-AI pill floats over this tab — the last row must clear it.
        contentContainerStyle={{ paddingHorizontal: spacing[4], paddingTop: spacing[3], paddingBottom: 120 }}
        ListHeaderComponent={
          <View>
            <Text
              accessibilityRole="header"
              style={{ fontFamily: fontFamily.display, fontSize: type.title, color: t.ink, letterSpacing: -0.5, marginBottom: spacing[4] }}
            >
              Messages
            </Text>
            {settled && hasAnyConversation ? (
              // The tabs stay on screen for every account (web f6e5e84) —
              // an empty one explains itself below instead of vanishing.
              <SegmentedControl
                segments={sections}
                value={currentTab}
                onChange={setActiveTab}
                style={{ marginBottom: spacing[3] }}
              />
            ) : null}
          </View>
        }
        ListEmptyComponent={
          isLoading ? (
            // A skeleton, not a sentence — the row shape is known (rulebook).
            <SkeletonCard lines={3} />
          ) : isError ? (
            // Never dress a network failure up as "no conversations yet"
            <LoadError what="your conversations" onRetry={refetch} />
          ) : !hasAnyConversation ? (
            <View style={{ paddingVertical: spacing[6] }}>
              <Text
                accessibilityRole="header"
                style={{ fontFamily: fontFamily.display, fontSize: text.lg, color: t.ink }}
              >
                No conversations yet
              </Text>
              <Text style={{ marginTop: spacing[2], fontSize: text.base, lineHeight: 27, color: t.inkSlate }}>
                Chats open up once you're friends with someone. Find people near you in Friends.
              </Text>
              {user?.role !== 'FAMILY' ? (
                <Button
                  title="Find friends"
                  variant="primary"
                  onPress={() => router.push('/friends')}
                  style={{ marginTop: spacing[5] }}
                />
              ) : null}
            </View>
          ) : currentTab === 'groups' && journeyError ? (
            // Same rule as the main list one branch up: a dropped request is
            // never dressed up as "no group chats yet".
            <LoadError what="your group chats" onRetry={refetchJourney} />
          ) : (
            <View
              style={{
                backgroundColor: t.canvas,
                borderWidth: 1,
                borderColor: t.border,
                borderRadius: radius.card,
                paddingVertical: 40,
                paddingHorizontal: 24,
                alignItems: 'center',
              }}
            >
              <View
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 26,
                  backgroundColor: t.blueWash,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 14,
                }}
              >
                <MessageCircle size={24} color={t.blueDeep} strokeWidth={2} />
              </View>
              <Text
                style={{
                  fontSize: text.base,
                  color: t.inkSlate,
                  lineHeight: 26,
                  textAlign: 'center',
                  maxWidth: 380,
                }}
              >
                {EMPTY_TAB_COPY[currentTab]}
              </Text>
            </View>
          )
        }
      />
      </SwipeSegments>
    </Screen>
  );
}
