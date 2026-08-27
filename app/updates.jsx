// Updates — every notification in one place, opened from the bell in the
// top right corner (owner call 2026-08-19: "like Instagram"). Friend
// requests, new friends, offers on posted help, where my own offers stand,
// family alerts, keyholder asks, reviews, unread chats: one list, newest
// first, and it STAYS (owner call 2026-08-26: "it all goes when I click it,
// why? It should stay always, no clears in notification updates"). This
// retires the 2026-08-22 new-only rule: a person who opened the bell, read
// nothing, and came back found an empty screen and no way to see what the
// badge had counted.
//
// What clears is the badge, never the list, the way WhatsApp and Instagram
// do it. Rows unseen when this visit started are marked seen the moment the
// list is on screen, and they keep their "new" wash for the whole visit so
// what was new stays visibly new while the person reads it (HCI 1). A row
// leaves only when the thing it announced is over: a chat read, a request
// answered.
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
import LoadError from '../src/components/ui/LoadError';
import RefreshControl from '../src/components/ui/RefreshControl';
import Screen from '../src/components/ui/Screen';
import SkeletonCard from '../src/components/ui/Skeleton';
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
        // Bleed across the WHOLE gutter: Screen pads spacing[5], and the old
        // -spacing[4] left a 4pt white edge beside the wash (owner report
        // 2026-08-22: "the blue is not full").
        marginHorizontal: -spacing[5],
        paddingHorizontal: spacing[5],
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

// The six sources this screen shows. Named once: the pull gesture and the
// retry on the error card both walk this list.
const FEED_KEYS = [
  ['connections'],
  ['needs-mine'],
  ['needs-applications'],
  ['family-alerts'],
  ['passon-asked-of-me'],
  ['reviews-mine'],
];

export default function UpdatesScreen() {
  const { t, spacing, text } = useTheme();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { items, isLoading, isError } = useUpdatesFeed(user);
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

  // One list, two callers: the pull gesture and the retry on the error card.
  // A second hand-typed copy would drift the day a seventh source is added.
  const reload = useCallback(
    () => Promise.all(FEED_KEYS.map((queryKey) => queryClient.invalidateQueries({ queryKey }))),
    [queryClient]
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await reload();
    setRefreshing(false);
  }, [reload]);

  const isNew = (item) => newThisVisit.current.has(item.token);

  return (
    <Screen back title="Updates" scroll={false}>
      {items.length === 0 && isLoading ? (
        // Nothing to show YET. Six sources feed this list and the first paint
        // happens before any of them answer.
        <SkeletonCard lines={3} />
      ) : items.length === 0 && isError ? (
        // The rule this screen used to break: a dropped request is never
        // dressed up as quiet. Six sources fed one `items.length === 0`, so a
        // total fetch failure and a genuinely empty week looked identical, and
        // the person was told there was nothing new when nothing had loaded.
        <LoadError what="your updates" onRetry={reload} />
      ) : items.length === 0 ? (
        <View style={{ alignItems: 'center', paddingTop: spacing[10], gap: spacing[3] }}>
          <Bell size={40} color={t.inkFaint2} strokeWidth={1.5} />
          <Text style={{ fontSize: text.base, color: t.inkSlate, textAlign: 'center' }}>
            Nothing new right now.{'\n'}Friend requests, offers, and messages will show up here.
          </Text>
        </View>
      ) : (
        <FlatList
          ListHeaderComponent={
            // Some sources answered and some did not. The rows that arrived
            // still show; the gap is named above them rather than hidden.
            isError ? <LoadError what="all of your updates" onRetry={reload} bare /> : null
          }
          data={items}
          keyExtractor={(row) => row.token}
          renderItem={({ item: row }) => <UpdateRow item={row} isNew={isNew(row)} />}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 40 }}
        />
      )}
    </Screen>
  );
}
