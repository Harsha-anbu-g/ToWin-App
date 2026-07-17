// Chat thread — port of Messages.jsx: 5s polling, mark-seen on focus, bubbles
// (incoming t.bubbleIn / outgoing t.blueTint), day separators, WhatsApp-simple.
// Drafts survive leaving the chat (HCI rule 9); a failed send restores the
// text and offers retry. The assistant FAB stays off this screen (HCI rule 8).
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
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
import api, { friendlyWriteError } from '../../src/api/client';
import Avatar from '../../src/components/ui/Avatar';
import LoadError from '../../src/components/ui/LoadError';
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
    // Empty drafts are deleted (not stored as '') so the Map doesn't grow
    // one stale entry per conversation for the life of the app session.
    if (input) drafts.set(connectionId, input);
    else drafts.delete(connectionId);
  }, [connectionId, input]);

  // Only poll while this thread is the focused screen — pushing the friend's
  // profile on top (or backgrounding) must stop the 5s cycle. Also keeps the
  // mark-seen effect honest: unseen messages aren't "seen" by a buried screen.
  const [isFocused, setIsFocused] = useState(true);
  useFocusEffect(
    useCallback(() => {
      setIsFocused(true);
      return () => setIsFocused(false);
    }, [])
  );

  const { data: connections } = useQuery({
    queryKey: ['connections'],
    queryFn: async () => (await api.get('/connections')).data,
  });
  const conn = (connections ?? []).find((c) => c.id === connectionId);

  const { data, isError, refetch } = useQuery({
    queryKey: ['messages', connectionId],
    queryFn: async () => (await api.get(`/messages/${connectionId}?size=50`)).data,
    refetchInterval: isFocused ? 5000 : false, // web Messages.jsx polls every 5s — only while focused
    enabled: !!connectionId,
  });
  const messages = useMemo(() => {
    const sorted = [...(data?.content ?? (Array.isArray(data) ? data : []))].sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt) // newest first (inverted list)
    );
    // Precompute the day-separator here so renderItem doesn't need to read
    // sibling messages — keeping its identity stable means FlatList only
    // redraws rows when the data actually changes, not on every poll tick.
    return sorted.map((m, i) => {
      const prev = sorted[i + 1]; // inverted list: previous in time is the NEXT index
      return { ...m, showDay: !prev || dayLabel(prev.createdAt) !== dayLabel(m.createdAt) };
    });
  }, [data]);

  // Mark seen when the thread is open and new messages arrive
  const seenOnce = useRef('');
  useEffect(() => {
    if (!isFocused) return;
    const newestIncoming = messages.find((m) => m.senderId !== user?.userId);
    if (newestIncoming && seenOnce.current !== newestIncoming.id) {
      const isFirstLoad = seenOnce.current === '';
      seenOnce.current = newestIncoming.id;
      // Best-effort, but not invisible: a consistently failing mark-seen is
      // the only lead when "unread badges never clear" bug reports come in.
      api.post(`/messages/${connectionId}/seen`).catch((e) => {
        if (__DEV__) console.warn(`mark-seen failed for ${connectionId}:`, e?.message);
      });
      queryClient.invalidateQueries({ queryKey: ['unread-count'] });
      // Screen-reader users sitting in an open thread get no visual cue that
      // a reply landed — announce it (skip the announcement on first open).
      if (!isFirstLoad) {
        AccessibilityInfo.announceForAccessibility(
          `New message from ${conn?.otherUserName ?? 'your friend'}`
        );
      }
    }
  }, [messages, connectionId, user?.userId, queryClient, isFocused, conn?.otherUserName]);

  const send = useMutation({
    mutationFn: (content) => api.post(`/messages/${connectionId}/send`, { content }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages', connectionId] });
    },
    onError: (err, content) => {
      // Restore the failed text without eating anything typed since (HCI rule 9)
      setInput((cur) => (cur ? `${content} ${cur}` : content));
      showToast(friendlyWriteError(err, "Message didn't send. Tap send to try again."), 'error');
    },
  });

  const handleSend = () => {
    const content = input.trim();
    if (!content || send.isPending) return;
    setInput('');
    drafts.delete(connectionId);
    send.mutate(content);
  };

  const renderItem = useCallback(({ item }) => {
    const mine = item.senderId === user?.userId;
    return (
      <View>
        {item.showDay ? (
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
              fontSize: 13,
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
  }, [user?.userId, t, spacing, radius, text]);

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
            isError ? (
              // A failed load must never masquerade as an empty chat (HCI rule 9)
              <LoadError
                what="your messages"
                onRetry={refetch}
                style={{ transform: [{ scaleY: -1 }] }} // un-flip inside the inverted list
              />
            ) : (
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
            )
          }
        />

        {/* Paused friendships block sending server-side — say so plainly
            instead of letting a send fail (HCI rules 3 + 9) */}
        {conn?.status === 'PAUSED' ? (
          <View
            style={{
              padding: spacing[4],
              borderTopWidth: 1,
              borderTopColor: t.border,
              backgroundColor: t.canvas,
            }}
          >
            <Text style={{ fontSize: text.base, color: t.inkSlate, textAlign: 'center', lineHeight: 24 }}>
              You two are on a break — messages are paused. Resume from your Home screen to keep chatting.
            </Text>
          </View>
        ) : (
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
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
