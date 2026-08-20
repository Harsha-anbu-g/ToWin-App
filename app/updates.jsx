// Updates — every notification in one place, opened from the bell in the
// top right corner (owner call 2026-08-19: "like Instagram"). Friend
// requests, new friends, offers on posted help, where my own offers stand,
// family alerts, keyholder asks, reviews, unread chats: one list, newest
// first, split into New and Earlier like Instagram's activity feed.
//
// What "New" means here: unseen when this visit started. The rows are marked
// seen the moment the list is on screen — the bell badge clears — but the
// section holds for the whole visit, so what was new stays visibly new while
// the person reads it (HCI 1: the screen tells you what changed; marking
// instantly and collapsing the section would erase the answer mid-read).
import { useQueryClient } from '@tanstack/react-query';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import {
  AlertCircle,
  BadgeCheck,
  Bell,
  FileText,
  HandHeart,
  KeyRound,
  MessageCircle,
  Star,
  UsersRound,
} from '../src/components/icons';
import RefreshControl from '../src/components/ui/RefreshControl';
import Screen from '../src/components/ui/Screen';
import { useAuth } from '../src/context/AuthContext';
import { loadSeen, unseenTokens } from '../src/lib/seenIds';
import { seenKey } from '../src/lib/storageKeys';
import { UPDATES_CATEGORY, markUpdatesSeen, timeAgo, useUpdatesFeed } from '../src/lib/updatesFeed';
import { useTheme } from '../src/theme/ThemeContext';

// One glyph per kind of news, so a row is recognisable before it is read.
const KIND_ICONS = {
  'friend-request': UsersRound,
  'friend-new': UsersRound,
  message: MessageCircle,
  applicant: HandHeart,
  'offer-accepted': BadgeCheck,
  'offer-declined': FileText,
  'family-sos': AlertCircle,
  'family-alert': Bell,
  'keyholder-ask': KeyRound,
  review: Star,
};

function UpdateRow({ item, isNew }) {
  const { t, spacing, type } = useTheme();
  const router = useRouter();
  const Icon = KIND_ICONS[item.kind] ?? Bell;
  const urgent = item.kind === 'family-sos';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${isNew ? 'New. ' : ''}${item.title}`}
      onPress={() => router.push(item.href)}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        paddingVertical: 12,
        marginHorizontal: -spacing[4],
        paddingHorizontal: spacing[4],
        backgroundColor: pressed ? t.surfaceFill : isNew ? t.blueWash : 'transparent',
      })}
    >
      <View
        style={{
          width: 44,
          height: 44,
          borderRadius: 22,
          backgroundColor: urgent ? t.redWash2 : t.blueWash,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon size={20} color={urgent ? t.red : t.blueDeep} strokeWidth={2} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 16, color: t.ink, fontWeight: isNew ? '600' : '400' }}>
          {item.title}
        </Text>
        {item.body ? (
          <Text numberOfLines={1} style={{ fontSize: type.meta, color: t.inkSlate, marginTop: 2 }}>
            {item.body}
          </Text>
        ) : null}
      </View>
      {item.at ? (
        <Text style={{ fontSize: type.meta, color: t.inkSlate, fontVariant: ['tabular-nums'] }}>
          {timeAgo(item.at)}
        </Text>
      ) : null}
    </Pressable>
  );
}

function SectionHeading({ children }) {
  const { t, type, spacing } = useTheme();
  return (
    <Text
      accessibilityRole="header"
      style={{
        fontSize: type.meta,
        fontWeight: '600',
        color: t.inkSlate,
        textTransform: 'uppercase',
        letterSpacing: 0.4,
        marginTop: spacing[4],
        marginBottom: spacing[1],
      }}
    >
      {children}
    </Text>
  );
}

export default function UpdatesScreen() {
  const { t, spacing, text } = useTheme();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { items } = useUpdatesFeed(user);
  const [refreshing, setRefreshing] = useState(false);

  // Tokens that were unseen when this visit started — they stay in "New"
  // until the person leaves, even though the badge clears immediately.
  const newThisVisit = useRef(new Set());
  const storageKey = seenKey(user?.userId, UPDATES_CATEGORY);
  useFocusEffect(
    useCallback(() => {
      let alive = true;
      (async () => {
        await loadSeen(storageKey);
        if (!alive) return;
        for (const token of unseenTokens(storageKey, items.map((i) => i.token))) {
          newThisVisit.current.add(token);
        }
        markUpdatesSeen(user?.userId, items);
      })();
      return () => {
        alive = false;
      };
    }, [storageKey, user?.userId, items])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    const feedKeys = [
      ['connections'],
      ['needs-mine'],
      ['needs-applications'],
      ['family-alerts'],
      ['passon-asked-of-me'],
      ['reviews-mine'],
    ];
    await Promise.all(feedKeys.map((queryKey) => queryClient.invalidateQueries({ queryKey })));
    setRefreshing(false);
  }, [queryClient]);

  const fresh = items.filter((i) => newThisVisit.current.has(i.token));
  const earlier = items.filter((i) => !newThisVisit.current.has(i.token));
  // One flat list with heading rows: two FlatLists can't share one scroll.
  const rows = [
    ...(fresh.length ? [{ heading: 'New' }, ...fresh] : []),
    ...(earlier.length ? [{ heading: fresh.length ? 'Earlier' : null }, ...earlier] : []),
  ].filter((r) => !('heading' in r) || r.heading);

  return (
    <Screen back title="Updates" scroll={false}>
      {items.length === 0 ? (
        <View style={{ alignItems: 'center', paddingTop: spacing[10], gap: spacing[3] }}>
          <Bell size={40} color={t.inkFaint2} strokeWidth={1.5} />
          <Text style={{ fontSize: text.base, color: t.inkSlate, textAlign: 'center' }}>
            Nothing new right now.{'\n'}Friend requests, offers, and messages will show up here.
          </Text>
        </View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(row, i) => ('heading' in row ? `h:${row.heading}:${i}` : row.token)}
          renderItem={({ item: row }) =>
            'heading' in row ? (
              <SectionHeading>{row.heading}</SectionHeading>
            ) : (
              <UpdateRow item={row} isNew={newThisVisit.current.has(row.token)} />
            )
          }
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 40 }}
        />
      )}
    </Screen>
  );
}
