// Chat thread — port of Messages.jsx: 5s polling, mark-seen on focus, bubbles
// (incoming t.bubbleIn / outgoing t.blueTint), day separators, WhatsApp-simple.
// Drafts survive leaving the chat (HCI rule 9); a failed send restores the
// text and offers retry. The assistant FAB stays off this screen (HCI rule 8).
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Pressable, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, ChevronRight, Send } from '../../src/components/icons';
import api, { friendlyWriteError } from '../../src/api/client';
import Avatar from '../../src/components/ui/Avatar';
import KeyboardAvoider from '../../src/components/ui/KeyboardAvoider';
import LoadError from '../../src/components/ui/LoadError';
import { SkeletonLine } from '../../src/components/ui/Skeleton';
import { useAuth } from '../../src/context/AuthContext';
import { useConfirm } from '../../src/context/ConfirmContext';
import { useToast } from '../../src/context/ToastContext';
import { announce } from '../../src/lib/announce';
import { getDraft, setDraft } from '../../src/lib/chatDrafts';
import { haptic } from '../../src/lib/haptics';
import { MESSAGING_STAGE, stageIndexOf } from '../../src/lib/trustStages';
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

// Loading sketch in the thread's own shape: a few quiet bubble blocks where
// the messages will land (UX-706: never a blank thread, never a spinner).
// Static like every Skeleton, so reduced motion has nothing to strip.
function ChatSkeleton() {
  const { spacing, radius } = useTheme();
  return (
    <View
      testID="chat-skeleton"
      accessibilityRole="progressbar"
      accessibilityLabel="Loading"
      // Un-flip inside the inverted list, same trick as LoadError above.
      style={{ transform: [{ scaleY: -1 }], gap: spacing[3] }}
    >
      <SkeletonLine width="55%" height={44} style={{ borderRadius: radius.lg }} />
      <SkeletonLine width="68%" height={44} style={{ borderRadius: radius.lg, alignSelf: 'flex-end' }} />
      <SkeletonLine width="45%" height={44} style={{ borderRadius: radius.lg }} />
    </View>
  );
}

export default function ChatThread() {
  const { mode, t, spacing, radius, text, type } = useTheme();
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

  // Failed sends stay on screen as bubbles marked "Didn't send" with retry in
  // place (UX-710) — never dumped back into the composer over whatever the
  // user typed since. Newest failure first, matching the inverted list.
  const [failedSends, setFailedSends] = useState([]);
  const failedRef = useRef(failedSends);
  useEffect(() => {
    failedRef.current = failedSends;
  }, [failedSends]);
  useEffect(
    () => () => {
      // Leaving the chat must not eat failed text (HCI rule 9): fold it into
      // the draft, oldest first, ahead of whatever is sitting in the composer.
      if (!failedRef.current.length) return;
      const unsent = [...failedRef.current].reverse().map((f) => f.content);
      setDraft(draftKey, [...unsent, getDraft(draftKey) ?? ''].filter(Boolean).join('\n'));
    },
    [draftKey]
  );

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

  const askConfirm = useConfirm();
  const {
    data: connections,
    isLoading: connsLoading,
    isError: connsError,
    refetch: refetchConns,
  } = useQuery({
    queryKey: ['connections'],
    queryFn: async () => (await api.get('/connections')).data,
  });
  const conn = (connections ?? []).find((c) => c.id === connectionId);
  // Until the list resolves, the locked/paused state is UNKNOWN — render no
  // footer rather than flashing an open composer at a below-Messaging chat
  // (a deep link lands here with a cold cache). A FAILED fetch is just as
  // unknown: an open composer there only produces a send the server refuses.
  const connUnknown = !conn && (connsLoading || connsError);

  // The backend send() gate, mirrored: a MAIN-channel, non-family connection
  // below Messaging is refused server-side — so say it in place instead of
  // letting the send 409 (HCI rules 3 + 9), same pattern as the PAUSED block.
  const trustLocked =
    !isFamilyChannel &&
    conn?.status === 'ACTIVE' &&
    conn.type !== 'FAMILY' &&
    stageIndexOf(conn) < MESSAGING_STAGE;
  // Backend rule (website ea03935): the elder starts each step — the helper
  // only ever ACCEPTS, and never sees a dead start button (TrustService
  // refuses a helper-initiated confirm; same guard as MyEldersPanel).
  const actsAsElder = user?.role === 'ELDER' || user?.role === 'BOTH';
  // Accepting is a HELPER-only state: TrustService refuses any helper-first
  // confirm, so the other side can never be waiting on an elder (owner call
  // 2026-08-17 — the elder's button always reads Start).
  const accepting = !actsAsElder && !!conn?.confirmedByOther;
  const stepLabel = accepting ? 'Accept the next step' : 'Start the next step';

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
        .then(() => {
          queryClient.invalidateQueries({ queryKey: ['unread-count'] });
          // The inbox row draws its bold text and count pill from
          // conn.unreadCount in ['connections'], and tab screens stay mounted
          // — without this the row a person just read stays unread all
          // session, sending them back into an empty thread again and again.
          queryClient.invalidateQueries({ queryKey: ['connections'] });
        })
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
      // The server's trust gate answers 409 "Trust level too low to message" —
      // name that reason instead of the generic retry line, and resync so the
      // lock panel takes over the composer: this only happens when the cached
      // list was stale. Match the exact gate phrase, NOT just 'trust': the
      // family chat-closed 409 also says "shared trust" and is a different rule.
      const refusedByTrustGate =
        err?.response?.status === 409 &&
        /trust level too low/i.test(err?.response?.data?.message ?? '');
      if (refusedByTrustGate) {
        // The lock panel is about to replace the composer, so a retry bubble
        // would only re-refuse — the draft keeps the words instead (HCI rule 9).
        setInput((cur) => (cur ? `${content} ${cur}` : content));
        queryClient.invalidateQueries({ queryKey: ['connections'] });
        showToast(
          'Your trust level is too low to message yet. Take the next trust step together first.',
          'error'
        );
        return;
      }
      // Every other failure marks the bubble in place with retry (UX-710) —
      // the message never silently vanishes and never overwrites the composer.
      setFailedSends((cur) => [{ id: `failed-${Date.now()}`, content }, ...cur]);
      showToast(friendlyWriteError(err, "Message didn't send. Tap the message to try again."), 'error');
    },
  });

  // Confirm-the-step from inside the locked chat — same endpoint and words as
  // the trust panels, so the action lives WHERE the lock is announced
  // (rulebook: recognition over recall, like Resume on the paused block).
  const confirmStep = useMutation({
    mutationFn: () => api.post(`/trust/${connectionId}/confirm`),
    onSuccess: () => {
      showToast(
        conn && !conn.confirmedByOther
          ? `Step confirmed. Waiting for ${conn.otherUserName} to agree too.`
          : 'You both agreed. One step up the ladder!',
        'success'
      );
      queryClient.invalidateQueries({ queryKey: ['trust-my-score'] });
      queryClient.invalidateQueries({ queryKey: ['connections'] });
    },
    onError: (err) =>
      showToast(friendlyWriteError(err, 'Could not confirm right now. Please try again.'), 'error'),
  });

  // askConfirm, not confirm — the same irreversible tap gets the same dialog
  // and words as the trust panels (HCI rule 4: identical action, identical
  // friction).
  const confirmStepTap = async () => {
    const ok = await askConfirm({
      title: accepting ? 'Accept the next step?' : 'Start the next step?',
      message: accepting
        ? `${conn.otherUserName} has asked to move one step up. Accepting climbs the ladder for both of you.`
        : `Trust grows only when BOTH of you agree. ${conn.otherUserName} will get a tap to accept.`,
      cancelLabel: 'Not yet',
      confirmLabel: accepting ? 'Accept' : 'Start',
    });
    if (ok) confirmStep.mutate();
  };

  const handleSend = () => {
    const content = input.trim();
    if (!content || send.isPending) return;
    haptic.impact(); // the message left the finger (UX-703)
    setInput('');
    setDraft(draftKey, '');
    send.mutate(content);
  };

  // Resume a paused friendship from inside the chat — the same endpoint the
  // trust panels use; the banner below offers it in place (rulebook pass).
  const resume = useMutation({
    mutationFn: () => api.post(`/trust/${connectionId}/resume`),
    onSuccess: () => {
      showToast('Welcome back. Trust steps and messages are on again.', 'success');
      queryClient.invalidateQueries({ queryKey: ['connections'] });
    },
    onError: (err) =>
      showToast(friendlyWriteError(err, 'Could not resume right now. Please try again.'), 'error'),
  });

  // The just-sent message must exist SOMEWHERE on screen while the server
  // works — a local bubble with a "Sending…" caption (HCI rules 1 + 9). It
  // resolves into the real message on success and becomes a "Didn't send"
  // bubble with retry on error (UX-710).
  const listData = useMemo(() => {
    const pending =
      send.isPending && typeof send.variables === 'string'
        ? [{ id: '__sending__', senderId: user?.userId, content: send.variables, sending: true, showDay: false }]
        : [];
    const failed = failedSends.map((f) => ({
      id: f.id,
      senderId: user?.userId,
      content: f.content,
      failed: true,
      showDay: false,
    }));
    return [...pending, ...failed, ...messages];
  }, [messages, send.isPending, send.variables, user?.userId, failedSends]);

  // Latest-ref pattern (UX-708 precedent): retrySend stays stable across
  // renders so the memoized renderItem never changes identity per keystroke.
  const { mutate: sendMutate } = send;
  const sendPendingRef = useRef(false);
  useEffect(() => {
    sendPendingRef.current = send.isPending;
  }, [send.isPending]);
  const retrySend = useCallback(
    (item) => {
      if (sendPendingRef.current) return;
      haptic.impact(); // the retry is the message leaving the finger again (UX-703)
      setFailedSends((cur) => cur.filter((f) => f.id !== item.id));
      sendMutate(item.content);
    },
    [sendMutate]
  );

  const renderItem = useCallback(({ item }) => {
    const mine = item.senderId === user?.userId;
    const bubbleStyle = {
      alignSelf: mine ? 'flex-end' : 'flex-start',
      maxWidth: '80%',
      backgroundColor: mine ? t.blueTint : t.bubbleIn,
      borderRadius: radius.lg,
      paddingHorizontal: spacing[4],
      paddingVertical: spacing[3],
      marginBottom: spacing[2],
    };
    const bubbleInner = (
      <>
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
            // A timestamp is glanceable at 13; "Didn't send. Tap to try again."
            // is the ONLY instruction for rescuing the message, so it takes the
            // type.meta floor for actionable secondary text.
            fontSize: item.failed ? type.meta : 13,
            // ink3, not ink4: ink4 measures 4.35:1 on the tinted bubbles (AA
            // needs 4.5). contrast-tokens.test.js pins ink3 on both bubbles.
            color: item.failed ? t.redDeep : t.ink3,
            marginTop: 3,
            alignSelf: 'flex-end',
            fontVariant: ['tabular-nums'],
          }}
        >
          {item.failed
            ? "Didn't send. Tap to try again."
            : item.sending
              ? 'Sending…'
              : `${timeLabel(item.createdAt)}${mine ? (item.seenAt ? ' · Seen' : ' · Sent') : ''}`}
        </Text>
      </>
    );
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
        {item.failed ? (
          // The failed bubble IS the retry control — the fix lives where the
          // problem is shown (HCI rules 6 + 9).
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Didn't send: ${item.content}. Tap to try again.`}
            onPress={() => retrySend(item)}
            style={({ pressed }) => ({ ...bubbleStyle, opacity: pressed ? 0.7 : 1 })}
          >
            {bubbleInner}
          </Pressable>
        ) : (
          <View style={bubbleStyle}>{bubbleInner}</View>
        )}
      </View>
    );
  }, [user?.userId, t, spacing, radius, text, type, isFamilyChannel, retrySend]);

  return (
    <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: t.surface }}>
      {/* Header: back + who you're talking to (chat shows ONLY the conversation) */}
      <View
        testID="chat-header"
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing[3],
          paddingHorizontal: spacing[4],
          paddingVertical: spacing[3],
          borderBottomWidth: 1,
          borderBottomColor: t.border,
          // t.surface, not t.canvas: the website's header is its PAGE colour
          // (--canvas is white there); in this app's tokens the page is
          // t.surface and t.canvas is the card parchment (UX-707).
          backgroundColor: t.surface,
        }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back to messages"
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/messages'))}
          hitSlop={8}
          style={({ pressed }) => ({
            minWidth: 44,
            minHeight: 44,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: pressed ? 0.7 : 1,
          })}
        >
          <ArrowLeft size={24} color={t.blueDeep} />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${conn?.otherUserName ?? 'Friend'}'s profile`}
          onPress={() => conn && router.push(`/user/${conn.otherUserId}`)}
          // The avatar row is 38px tall — hitSlop tops the target up to 44
          // effective without growing the header (UX-714 browser measure).
          hitSlop={{ top: 3, bottom: 3 }}
          style={({ pressed }) => ({
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing[3],
            flex: 1,
            opacity: pressed ? 0.7 : 1,
          })}
        >
          <Avatar name={conn?.otherUserName} uri={conn?.otherUserPhotoUrl} size={38} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: text.base, fontWeight: '600', color: t.ink }}>
              {conn?.otherUserName ?? 'Chat'}
            </Text>
            {isFamilyChannel ? (
              <Text style={{ fontSize: text.xs, color: t.inkSlate, marginTop: 1 }}>
                Family group. Everyone here reads along
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
              // And it must never be a blank screen either (UX-706).
              <ChatSkeleton />
            ) : isError ? (
              // A failed load must never masquerade as an empty chat (HCI rule 9)
              <LoadError
                what="your messages"
                onRetry={refetch}
                style={{ transform: [{ scaleY: -1 }] }} // un-flip inside the inverted list
              />
            ) : trustLocked || connUnknown ? (
              // A locked (or not-yet-known) chat must not say "Say hello" —
              // the lock panel explains the empty thread (web parity).
              null
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
                Say hello. Every friendship starts with one message.
              </Text>
            )
          }
        />

        {/* Paused friendships block sending server-side — say so plainly
            instead of letting a send fail (HCI rules 3 + 9) */}
        {connUnknown ? (
          // Still loading: nothing to say yet. Failed: a missing composer with
          // no explanation is its own silent failure — name it and offer the
          // way back (HCI rules 1 + 9).
          connsError ? (
            <View
              style={{
                padding: spacing[4],
                borderTopWidth: 1,
                borderTopColor: t.border,
                backgroundColor: t.canvas,
              }}
            >
              <LoadError what="this friendship" onRetry={refetchConns} bare />
            </View>
          ) : null
        ) : conn?.status === 'PAUSED' ? (
          <View
            style={{
              padding: spacing[4],
              borderTopWidth: 1,
              borderTopColor: t.border,
              backgroundColor: t.canvas,
            }}
          >
            <Text style={{ fontSize: text.base, color: t.inkSlate, textAlign: 'center', lineHeight: 24 }}>
              You two are on a break. Messages are paused.
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
        ) : trustLocked ? (
          <View
            style={{
              padding: spacing[4],
              borderTopWidth: 1,
              borderTopColor: t.border,
              backgroundColor: t.canvas,
            }}
          >
            <Text style={{ fontSize: text.base, color: t.inkSlate, textAlign: 'center', lineHeight: 24 }}>
              You're connected. Messages unlock at the next trust step.
            </Text>
            {conn.confirmedByMe ? (
              <Text
                style={{
                  fontSize: text.base,
                  color: t.inkSlate,
                  textAlign: 'center',
                  lineHeight: 24,
                  marginTop: spacing[1],
                }}
              >
                You've started the next step. Waiting for {conn.otherUserName} to accept.
              </Text>
            ) : actsAsElder || accepting ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={stepLabel}
                disabled={confirmStep.isPending}
                onPress={confirmStepTap}
                style={({ pressed }) => ({
                  alignSelf: 'center',
                  minHeight: 44,
                  justifyContent: 'center',
                  paddingHorizontal: spacing[4],
                  marginTop: spacing[1],
                  opacity: confirmStep.isPending ? 0.5 : pressed ? 0.6 : 1,
                })}
              >
                <Text style={{ fontSize: text.base, fontWeight: '600', color: t.blueDeep }}>
                  {confirmStep.isPending ? 'Confirming…' : stepLabel}
                </Text>
              </Pressable>
            ) : (
              <Text
                style={{
                  fontSize: text.base,
                  color: t.inkSlate,
                  textAlign: 'center',
                  lineHeight: 24,
                  marginTop: spacing[1],
                }}
              >
                {conn.otherUserName} starts each trust step. You'll get a tap here to accept.
              </Text>
            )}
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
            // The iOS keyboard dresses to match the app's own opt-in night
            // mode (never the OS setting) — Apple polish, Towinly's rule.
            keyboardAppearance={mode === 'dark' ? 'dark' : 'light'}
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
