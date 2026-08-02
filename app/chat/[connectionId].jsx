// Chat thread — port of Messages.jsx: 5s polling, mark-seen on focus, bubbles
// (incoming t.bubbleIn / outgoing t.blueTint), day separators, WhatsApp-simple.
// Drafts survive leaving the chat (HCI rule 9); a failed send restores the
// text and offers retry. The assistant FAB stays off this screen (HCI rule 8).
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Pressable, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, ChevronRight, Send } from 'lucide-react-native';
import api, { friendlyWriteError } from '../../src/api/client';
import Avatar from '../../src/components/ui/Avatar';
import KeyboardAvoider from '../../src/components/ui/KeyboardAvoider';
import LoadError from '../../src/components/ui/LoadError';
import { useAuth } from '../../src/context/AuthContext';
import { useToast } from '../../src/context/ToastContext';
import { announce } from '../../src/lib/announce';
import { getDraft, setDraft } from '../../src/lib/chatDrafts';
import { useTheme } from '../../src/theme/ThemeContext';

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
  const { connectionId, channel: channelParam } = useLocalSearchParams();
  const { user } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();
  const queryClient = useQueryClient();

  // FAM-511: ?channel=family opens the shared updates thread on this
  // connection — the small thread the elder, their helper, and the family
  // read together. Everything else is the private MAIN chat, unchanged.
  const isFamilyChannel = channelParam === 'family' || channelParam === 'FAMILY_UPDATES';
  const channel = isFamilyChannel ? 'FAMILY_UPDATES' : 'MAIN';
  const channelQuery = isFamilyChannel ? '&channel=FAMILY_UPDATES' : '';

  // Drafts are per-thread, not per-connection — the group thread must never
  // swallow a half-written private message (or the other way round).
  const draftKey = isFamilyChannel ? `${connectionId}:family` : connectionId;
  const [input, setInput] = useState(getDraft(draftKey) ?? '');
  useEffect(() => {
    setDraft(draftKey, input);
  }, [draftKey, input]);

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

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['messages', connectionId, channel],
    queryFn: async () =>
      (await api.get(`/messages/${connectionId}?size=50${channelQuery}`)).data,
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
      api
        .post(`/messages/${connectionId}/seen`)
        // Refresh the badge only AFTER the seen-write commits — invalidating
        // first races the server and the refetch returns the stale count.
        .then(() => queryClient.invalidateQueries({ queryKey: ['unread-count'] }))
        .catch((e) => {
          if (__DEV__) console.warn(`mark-seen failed for ${connectionId}:`, e?.message);
        });
      // Screen-reader users sitting in an open thread get no visual cue that
      // a reply landed — announce it (skip the announcement on first open).
      if (!isFirstLoad) {
        announce(`New message from ${conn?.otherUserName ?? 'your friend'}`);
      }
    }
  }, [messages, connectionId, user?.userId, queryClient, isFocused, conn?.otherUserName]);

  const send = useMutation({
    mutationFn: (content) =>
      api.post(`/messages/${connectionId}/send${isFamilyChannel ? '?channel=FAMILY_UPDATES' : ''}`, {
        content,
      }),
    // Return the promise: the mutation then stays pending until the list
    // refetch lands, so the 'Sending…' bubble survives until the real message
    // is on screen (the just-sent message must exist SOMEWHERE at all times).
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['messages', connectionId, channel] }),
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
    setDraft(draftKey, '');
    send.mutate(content);
  };

  // Resume a paused friendship from inside the chat — the same endpoint the
  // trust panels use; the banner below offers it in place (rulebook pass).
  const resume = useMutation({
    mutationFn: () => api.post(`/trust/${connectionId}/resume`),
    onSuccess: () => {
      showToast('Welcome back — trust steps and messages are on again.', 'success');
      queryClient.invalidateQueries({ queryKey: ['connections'] });
    },
    onError: (err) =>
      showToast(friendlyWriteError(err, 'Could not resume right now. Please try again.'), 'error'),
  });

  // The just-sent message must exist SOMEWHERE on screen while the server
  // works — a local bubble with a "Sending…" caption (HCI rules 1 + 9). It
  // resolves into the real message on success and vanishes on error (the
  // text goes back into the composer).
  const listData = useMemo(() => {
    if (!send.isPending || typeof send.variables !== 'string') return messages;
    return [
      { id: '__sending__', senderId: user?.userId, content: send.variables, sending: true, showDay: false },
      ...messages,
    ];
  }, [messages, send.isPending, send.variables, user?.userId]);

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
          {/* Group thread: several people write here — every incoming bubble
              names its speaker (senderLabel carries "Sarah, for Margaret"
              style attribution when someone acts for the parent). */}
          {isFamilyChannel && !mine && (item.senderLabel || item.senderName) ? (
            <Text
              style={{ fontSize: text.xs, fontWeight: '600', color: t.blueDeep, marginBottom: 2 }}
            >
              {item.senderLabel || item.senderName}
            </Text>
          ) : null}
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
            {item.sending
              ? 'Sending…'
              : `${timeLabel(item.createdAt)}${mine ? (item.seenAt ? ' · Seen' : ' · Sent') : ''}`}
          </Text>
        </View>
      </View>
    );
  }, [user?.userId, t, spacing, radius, text, isFamilyChannel]);

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
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: text.base, fontWeight: '600', color: t.ink }}>
              {conn?.otherUserName ?? 'Chat'}
            </Text>
            {isFamilyChannel ? (
              <Text style={{ fontSize: text.xs, color: t.inkSlate, marginTop: 1 }}>
                Small updates thread — family reads along
              </Text>
            ) : null}
          </View>
          {/* The header opens the profile — say so (rulebook: no hidden taps). */}
          {conn ? <ChevronRight size={18} color={t.inkFaint2} strokeWidth={1.8} /> : null}
        </Pressable>
      </View>

      <KeyboardAvoider>
        <FlatList
          inverted
          data={listData}
          keyExtractor={(m) => m.id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: spacing[4] }}
          ListEmptyComponent={
            isLoading ? (
              // A pending load must never masquerade as an empty chat — the
              // "Say hello" prompt was flashing on full threads (rulebook).
              null
            ) : isError ? (
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
              You two are on a break — messages are paused.
            </Text>
            {/* The action lives WHERE the state is announced — never "go find
                Resume on another screen" (rulebook: recognition over recall). */}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Resume this friendship"
              disabled={resume.isPending}
              onPress={() => resume.mutate()}
              style={({ pressed }) => ({
                alignSelf: 'center',
                minHeight: 44,
                justifyContent: 'center',
                paddingHorizontal: spacing[4],
                marginTop: spacing[1],
                opacity: resume.isPending ? 0.5 : pressed ? 0.6 : 1,
              })}
            >
              <Text style={{ fontSize: text.base, fontWeight: '600', color: t.blueDeep }}>
                {resume.isPending ? 'Resuming…' : 'Resume'}
              </Text>
            </Pressable>
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
      </KeyboardAvoider>
    </SafeAreaView>
  );
}
