// Messages inbox — conversations are your active friendships (web
// MessagesInbox.jsx builds rows from /connections). Tap → chat thread.
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import api from '../../src/api/client';
import Avatar from '../../src/components/ui/Avatar';
import Button from '../../src/components/ui/Button';
import LoadError from '../../src/components/ui/LoadError';
import Screen from '../../src/components/ui/Screen';
import { filterBlocked, getBlocked } from '../../src/lib/blockList';
import { useTheme } from '../../src/theme/ThemeContext';

export default function MessagesInbox() {
  const { t, spacing, text, fontFamily } = useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['connections'],
    queryFn: async () => (await api.get('/connections')).data,
  });
  const { data: blocked } = useQuery({ queryKey: ['block-list'], queryFn: getBlocked });
  // Blocked people never resurface in the inbox (UGC 1.2)
  const conversations = filterBlocked(
    (data ?? []).filter((c) => c.status === 'ACTIVE'),
    blocked,
    (c) => c.otherUserId
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ['connections'] });
    setRefreshing(false);
  };

  return (
    <Screen scroll={false} contentStyle={{ padding: 0 }}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={t.blue} />}
        contentContainerStyle={{ paddingHorizontal: spacing[4], paddingTop: spacing[3], paddingBottom: spacing[12] }}
      >
        <Text
          accessibilityRole="header"
          style={{ fontFamily: fontFamily.display, fontSize: 28, color: t.ink, letterSpacing: -0.5, marginBottom: spacing[4] }}
        >
          Messages
        </Text>

        {isLoading ? (
          <View style={{ paddingVertical: spacing[6] }}>
            <Text style={{ fontSize: text.base, color: t.inkSlate }}>Loading your conversations…</Text>
          </View>
        ) : isError ? (
          // Never dress a network failure up as "no conversations yet"
          <LoadError what="your conversations" onRetry={refetch} />
        ) : conversations.length === 0 ? (
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
            <Button
              title="Find friends"
              variant="primary"
              onPress={() => router.push('/friends')}
              style={{ marginTop: spacing[5] }}
            />
          </View>
        ) : (
          // Inbox rows sit straight on the page — no box around the list
          // (user call 2026-07-12: outlined list boxes read as a website).
          <View>
            {conversations.map((conn, i) => (
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
                    <Text style={{ fontSize: 16, fontWeight: '600', color: t.ink }}>
                      {conn.otherUserName}
                    </Text>
                    <Text style={{ fontSize: 13, color: t.inkSlate, marginTop: 2 }}>
                      Tap to open the chat
                    </Text>
                  </View>
                  <ChevronRight size={18} color={t.inkFaint2} strokeWidth={1.8} />
                </Pressable>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}
