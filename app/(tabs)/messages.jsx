// Messages inbox — conversations are your active friendships (web
// MessagesInbox.jsx builds rows from /connections). Tap → chat thread.
//
// FAM-510 (web parity 2026-07-26): the inbox is grouped by who each chat is
// with. A helper's chat with a family member, and a family member's chat
// with their parent, both belong under Family. Shared friendships carry a
// group updates thread (Groups). One group of chats on screen at a time,
// switched with tabs at the top — and only groups with a conversation get
// a tab at all.
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { ChevronRight, Users } from 'lucide-react-native';
import api from '../../src/api/client';
import Avatar from '../../src/components/ui/Avatar';
import Button from '../../src/components/ui/Button';
import LoadError from '../../src/components/ui/LoadError';
import Screen from '../../src/components/ui/Screen';
import SegmentedControl from '../../src/components/ui/SegmentedControl';
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

const GROUP_LABELS = { family: 'Family', elders: 'Elders', helpers: 'Helpers' };

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

export default function MessagesInbox() {
  const { t, spacing, text, type, fontFamily } = useTheme();
  const { user } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['connections'],
    queryFn: async () => (await api.get('/connections')).data,
  });
  const { data: blocked } = useQuery({ queryKey: ['block-list'], queryFn: getBlocked });

  // Family updates threads a linked family member can read (their parents'
  // shared friendships). Errors fold to empty — the inbox must keep working
  // for people with no family at all.
  const { data: journeyData } = useQuery({
    queryKey: ['family-journey'],
    queryFn: async () => {
      try {
        return (await api.get('/family/journey')).data;
      } catch {
        return { elders: [] };
      }
    },
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

  // Only groups with a conversation get a tab. Order (user call 2026-07-26):
  // the people you help or who help you come first, then Groups, then Family
  // last. An elder therefore opens on Helpers and a helper on Elders, and both
  // read people · Groups · Family from left to right.
  const sections = [
    ...['helpers', 'elders'].map((key) =>
      active.some((c) => groupOf(c) === key) ? { key, label: GROUP_LABELS[key] } : null
    ),
    groupThreads.length > 0 ? { key: 'groups', label: 'Groups' } : null,
    active.some((c) => groupOf(c) === 'family')
      ? { key: 'family', label: GROUP_LABELS.family }
      : null,
  ].filter(Boolean);
  const currentTab = sections.some((s) => s.key === activeTab)
    ? activeTab
    : (sections[0]?.key ?? null);

  const rows = currentTab === 'groups' ? [] : active.filter((c) => groupOf(c) === currentTab);
  const hasAnyConversation = active.length > 0 || groupThreads.length > 0;

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['connections'] }),
      queryClient.invalidateQueries({ queryKey: ['family-journey'] }),
    ]);
    setRefreshing(false);
  };

  return (
    <Screen scroll={false} contentStyle={{ padding: 0 }}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={t.blue} />}
        // 120: the Ask-AI pill floats over this tab — the last row must clear it.
        contentContainerStyle={{ paddingHorizontal: spacing[4], paddingTop: spacing[3], paddingBottom: 120 }}
      >
        <Text
          accessibilityRole="header"
          style={{ fontFamily: fontFamily.display, fontSize: 28, color: t.ink, letterSpacing: -0.5, marginBottom: spacing[4] }}
        >
          Messages
        </Text>

        {isLoading ? (
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
        ) : (
          <View>
            {/* One group on screen at a time; a single group needs no tabs. */}
            {sections.length > 1 ? (
              <SegmentedControl
                segments={sections}
                value={currentTab}
                onChange={setActiveTab}
                style={{ marginBottom: spacing[3] }}
              />
            ) : null}

            {currentTab === 'groups'
              ? groupThreads.map((g, i) => (
                  <View key={g.id}>
                    {i > 0 ? (
                      <View style={{ height: 1, backgroundColor: t.hairline, marginLeft: 62 }} />
                    ) : null}
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Updates thread: ${g.title}`}
                      onPress={() => router.push(`/chat/${g.id}?channel=family`)}
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
                        <Text style={{ fontSize: 16, fontWeight: '600', color: t.ink }}>{g.title}</Text>
                        <Text style={{ fontSize: type.meta, color: t.inkSlate, marginTop: 2 }}>
                          Small updates thread — everyone sharing it reads along
                        </Text>
                      </View>
                      <ChevronRight size={18} color={t.inkFaint2} strokeWidth={1.8} />
                    </Pressable>
                  </View>
                ))
              : rows.map((conn, i) => (
                  <View key={conn.id}>
                    {i > 0 ? (
                      // Inset separator aligned with the text column, not full-bleed
                      <View style={{ height: 1, backgroundColor: t.hairline, marginLeft: 62 }} />
                    ) : null}
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
                  </View>
                ))}
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}
