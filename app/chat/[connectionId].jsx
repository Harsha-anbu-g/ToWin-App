// Chat thread — port of Messages.jsx: 5s polling, mark-seen on focus, bubbles
// (incoming t.bubbleIn / outgoing t.blueTint), day separators, WhatsApp-simple.
// Drafts survive leaving the chat (HCI rule 9); a failed send restores the
// text and offers retry. The assistant FAB stays off this screen (HCI rule 8).
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Send } from 'lucide-react-native';
import api from '../../src/api/client';
import Avatar from '../../src/components/ui/Avatar';
import { useAuth } from '../../src/context/AuthContext';
import { useToast } from '../../src/context/ToastContext';
import { useTheme } from '../../src/theme/ThemeContext';

// Drafts survive navigation for the session (keyed per conversation).
const drafts = new Map();

const dayLabel = (iso) => {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const same = (a, b) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  if (same(d, today)) return 'Today';
  if (same(d, yesterday)) return 'Yesterday';
  return d.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
};

const timeLabel = (iso) =>
  new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });

export default function ChatThread() {
  const { t, spacing, radius, text } = useTheme();
  const { connectionId } = useLocalSearchParams();
  const { user } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [input, setInput] = useState(drafts.get(connectionId) ?? '');
  useEffect(() => {
    drafts.set(connectionId, input);
  }, [connectionId, input]);

  const { data: connections } = useQuery({
    queryKey: ['connections'],
    queryFn: async () => (await api.get('/connections')).data,
  });
  const conn = (connections ?? []).find((c) => c.id === connectionId);

  const { data } = useQuery({
    queryKey: ['messages', connectionId],
    queryFn: async () => (await api.get(`/messages/${connectionId}?size=50`)).data,
    refetchInterval: 5000, // web Messages.jsx polls every 5s
    enabled: !!connectionId,
  });
  const messages = [...(data?.content ?? (Array.isArray(data) ? data : []))].sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt) // newest first (inverted list)
  );

  // Mark seen when the thread is open and new messages arrive
  const seenOnce = useRef('');
  useEffect(() => {
    const newestIncoming = messages.find((m) => m.senderId !== user?.userId);
    if (newestIncoming && seenOnce.current !== newestIncoming.id) {
      seenOnce.current = newestIncoming.id;
      api.post(`/messages/${connectionId}/seen`).catch(() => {});
      queryClient.invalidateQueries({ queryKey: ['unread-count'] });
    }
  }, [messages, connectionId, user?.userId, queryClient]);

  const send = useMutation({
    mutationFn: (content) => api.post(`/messages/${connectionId}/send`, { content }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages', connectionId] });
    },
    onError: (_err, content) => {
      setInput(content); // restore the text — never silently drop it (HCI rule 9)
      showToast("Message didn't send. Tap send to try again.", 'error');
    },
  });

  const handleSend = () => {
    const content = input.trim();
    if (!content || send.isPending) return;
    setInput('');
    drafts.set(connectionId, '');
    send.mutate(content);
  };

  const renderItem = ({ item, index }) => {
    const mine = item.senderId === user?.userId;
    // Inverted list: the "previous" message in time is the NEXT index
    const prev = messages[index + 1];
    const showDay = !prev || dayLabel(prev.createdAt) !== dayLabel(item.createdAt);
    return (
      <View>
        {showDay ? (
          <Text
            style={{
              alignSelf: 'center',
              fontSize: text.xs,
              color: t.ink4,
              marginVertical: spacing[3],
            }}
          >
            {dayLabel(item.createdAt)}
          </Text>
        ) : null}
        <View
          style={{
            alignSelf: mine ? 'flex-end' : 'flex-start',
            maxWidth: '80%',
            backgroundColor: mine ? t.blueTint : t.bubbleIn,
            borderRadius: radius.lg,
            paddingHorizontal: spacing[4],
            paddingVertical: spacing[3],
            marginBottom: spacing[2],
          }}
        >
          <Text style={{ fontSize: text.base, lineHeight: 25, color: t.ink }}>{item.content}</Text>
          <Text
            style={{
              fontSize: 11,
              color: t.ink4,
              marginTop: 3,
              alignSelf: 'flex-end',
              fontVariant: ['tabular-nums'],
            }}
          >
            {timeLabel(item.createdAt)}
            {mine ? (item.seenAt ? ' · Seen' : ' · Sent') : ''}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: t.surface }}>
      {/* Header: back + who you're talking to (chat shows ONLY the conversation) */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing[3],
          paddingHorizontal: spacing[4],
          paddingVertical: spacing[3],
          borderBottomWidth: 1,
          borderBottomColor: t.border,
          backgroundColor: t.canvas,
        }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back to messages"
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/messages'))}
          hitSlop={8}
          style={{ minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}
        >
          <ArrowLeft size={24} color={t.blueDeep} />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${conn?.otherUserName ?? 'Friend'}'s profile`}
          onPress={() => conn && router.push(`/user/${conn.otherUserId}`)}
          style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[3], flex: 1 }}
        >
          <Avatar name={conn?.otherUserName} uri={conn?.otherUserPhotoUrl} size={38} />
          <Text style={{ fontSize: text.base, fontWeight: '600', color: t.ink }}>
            {conn?.otherUserName ?? 'Chat'}
          </Text>
        </Pressable>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <FlatList
          inverted
          data={messages}
          keyExtractor={(m) => m.id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: spacing[4] }}
          ListEmptyComponent={
            <Text
              style={{
                fontSize: text.base,
                color: t.inkSlate,
                textAlign: 'center',
                transform: [{ scaleY: -1 }], // un-flip inside the inverted list
                lineHeight: 26,
              }}
            >
              Say hello — every friendship starts with one message.
            </Text>
          }
        />

        {/* Composer pinned above the keyboard */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'flex-end',
            gap: spacing[2],
            padding: spacing[3],
            borderTopWidth: 1,
            borderTopColor: t.border,
            backgroundColor: t.canvas,
          }}
        >
          <TextInput
            accessibilityLabel="Message"
            value={input}
            onChangeText={setInput}
            placeholder="Write a message…"
            placeholderTextColor={t.ink4}
            multiline
            style={{
              flex: 1,
              minHeight: 44,
              maxHeight: 120,
              backgroundColor: t.surface,
              borderWidth: 1,
              borderColor: t.border,
              borderRadius: radius.md,
              paddingHorizontal: spacing[4],
              paddingVertical: spacing[3],
              fontSize: text.base,
              color: t.ink,
            }}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Send message"
            accessibilityState={{ disabled: !input.trim() || send.isPending }}
            disabled={!input.trim() || send.isPending}
            onPress={handleSend}
            style={({ pressed }) => ({
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: input.trim() ? t.actionFill : t.btnDisabled,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: pressed ? 0.85 : 1,
            })}
          >
            <Send size={20} color={t.actionInk} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
