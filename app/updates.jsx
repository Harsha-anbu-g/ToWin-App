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
// Nothing clears on opening the screen. A row keeps its "new" wash, and the
// bell keeps counting it, until the person taps THAT row (owner call
// 2026-08-28: "it should only disappear if they click that update, not just
// by opening the updates") — WhatsApp's grammar, where a chat stays unread
// until it is opened. A row leaves the list only when the thing it announced
// is over: a chat read, a request answered.
//
// The wash runs from one edge of the phone to the other. The page's gutter
// is on the rows, not on the list: a negative margin inside a scroll view is
// clipped at the scroll view's own edge, which is why the 2026-08-22 bleed
// fix left the wash short of the screen on every visit since (owner report
// 2026-08-28: "it is like half of the tab").
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
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
import { useUnseenTokens } from '../src/lib/seenIds';
import { UPDATES_CATEGORY, markUpdateSeen, timeAgo, useUpdatesFeed } from '../src/lib/updatesFeed';
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

function UpdateRow({ item, isNew, onOpen }) {
  const { t, spacing, type } = useTheme();
  const Icon = KIND_ICONS[item.kind] ?? Bell;
  const urgent = item.kind === 'family-sos';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${isNew ? 'New. ' : ''}${item.title}`}
      onPress={() => onOpen(item)}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        paddingVertical: 12,
        // The list is edge to edge (Screen padding 0); each row carries the
        // page gutter itself, so the wash behind it reaches both screen edges.
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
  const router = useRouter();
  const queryClient = useQueryClient();
  const { items, isLoading, isError } = useUpdatesFeed(user);
  const [refreshing, setRefreshing] = useState(false);

  // Live: a row is "new" until its own token is marked seen, and the set
  // updates the moment that happens. No focus effect marks anything — that
  // is what used to clear the whole screen's news on arrival.
  const unseen = new Set(
    useUnseenTokens(
      user?.userId,
      UPDATES_CATEGORY,
      items.map((i) => i.token)
    )
  );

  // Tapping a row is the one thing that marks it seen (Rule 6: the named
  // action lives in updatesFeed). The mark is not awaited: the row's wash
  // drops on the store's notify, and the page moves on at once.
  const openUpdate = useCallback(
    (item) => {
      markUpdateSeen(user?.userId, item);
      router.push(item.href);
    },
    [router, user?.userId]
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

  // The page gutter belongs to the rows (see the header comment), so the
  // three no-list states put it back themselves.
  const gutter = { padding: spacing[5] };

  return (
    <Screen back title="Updates" scroll={false} contentStyle={{ padding: 0 }}>
      {items.length === 0 && isLoading ? (
        // Nothing to show YET. Six sources feed this list and the first paint
        // happens before any of them answer.
        <View style={gutter}>
          <SkeletonCard lines={3} />
        </View>
      ) : items.length === 0 && isError ? (
        // The rule this screen used to break: a dropped request is never
        // dressed up as quiet. Six sources fed one `items.length === 0`, so a
        // total fetch failure and a genuinely empty week looked identical, and
        // the person was told there was nothing new when nothing had loaded.
        <View style={gutter}>
          <LoadError what="your updates" onRetry={reload} />
        </View>
      ) : items.length === 0 ? (
        <View style={[gutter, { alignItems: 'center', paddingTop: spacing[10], gap: spacing[3] }]}>
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
            isError ? (
              <View style={{ paddingHorizontal: spacing[5] }}>
                <LoadError what="all of your updates" onRetry={reload} bare />
              </View>
            ) : null
          }
          data={items}
          keyExtractor={(row) => row.token}
          renderItem={({ item: row }) => (
            <UpdateRow item={row} isNew={unseen.has(row.token)} onOpen={openUpdate} />
          )}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 40 }}
        />
      )}
    </Screen>
  );
}
