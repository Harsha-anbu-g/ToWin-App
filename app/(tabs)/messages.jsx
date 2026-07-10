// Messages inbox — conversations are your active friendships (web
// MessagesInbox.jsx builds rows from /connections). Tap → chat thread.
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import api from '../../src/api/client';
import Avatar from '../../src/components/ui/Avatar';
import Button from '../../src/components/ui/Button';
import Card from '../../src/components/ui/Card';
import Screen from '../../src/components/ui/Screen';
import { useTheme } from '../../src/theme/ThemeContext';

export default function MessagesInbox() {
  const { t, spacing, text, fontFamily } = useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['connections'],
    queryFn: async () => (await api.get('/connections')).data,
  });
  const conversations = (data ?? []).filter((c) => c.status === 'ACTIVE');

  const onRefresh = async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ['connections'] });
    setRefreshing(false);
  };

  return (
    <Screen title="Messages" scroll={false} contentStyle={{ padding: 0 }}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={t.blue} />}
        contentContainerStyle={{ padding: spacing[5], paddingBottom: spacing[12] }}
      >
        {isLoading ? (
          <Card>
            <Text style={{ fontSize: text.base, color: t.inkSlate }}>Loading your conversations…</Text>
          </Card>
        ) : conversations.length === 0 ? (
          <Card>
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
          </Card>
        ) : (
          <Card>
            {conversations.map((conn, i) => (
              <Pressable
                key={conn.id}
                accessibilityRole="button"
                accessibilityLabel={`Chat with ${conn.otherUserName}`}
                onPress={() => router.push(`/chat/${conn.id}`)}
                style={({ pressed }) => ({
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: spacing[3],
                  paddingVertical: spacing[3],
                  borderTopWidth: i === 0 ? 0 : 1,
                  borderTopColor: t.hairline,
                  opacity: pressed ? 0.8 : 1,
                })}
              >
                <Avatar name={conn.otherUserName} uri={conn.otherUserPhotoUrl} size={52} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: text.base, fontWeight: '600', color: t.ink }}>
                    {conn.otherUserName}
                  </Text>
                  <Text style={{ fontSize: text.sm, color: t.inkSlate, marginTop: 1 }}>
                    Tap to open the chat
                  </Text>
                </View>
              </Pressable>
            ))}
          </Card>
        )}
      </ScrollView>
    </Screen>
  );
}
