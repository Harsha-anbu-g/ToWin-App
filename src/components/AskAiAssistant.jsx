// Ask AI (3l) — the tortoise helper as a sheet: blueWash header with the
// ai-tortoise avatar ("Ask AI / Your Towinly helper"), a greeting bubble with a
// Read-aloud chip, three suggestion buttons, and a mic · pill · send composer.
// Entry point is a wash pill FAB (tortoise + "Ask AI", 2px blue border).
// Same API: POST /assistant/chat {message, history} → {reply}; friendly
// fallback on any failure. Mounted in the tabs layout only (HCI rule 8).
// The very first question is gated by a one-time plain-words consent note
// naming Groq, the outside AI service (App Store AI-consent rule, STORE-203).
import * as Speech from 'expo-speech';
import { usePathname, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  Image,
  Modal,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Flag, Mic, Send, Volume2, X } from './icons';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useConfirm } from '../context/ConfirmContext';
import { useToast } from '../context/ToastContext';
import { announce } from '../lib/announce';
import focusForScreenReader from '../lib/focusForScreenReader';
import KeyboardAvoider from './ui/KeyboardAvoider';
import { grantAiConsent, hasAiConsent } from '../lib/aiConsent';
import { useReducedMotion } from '../lib/useReducedMotion';
import { useTheme } from '../theme/ThemeContext';

const FALLBACK =
  "I couldn't answer just now. Please try again in a moment, or ask a real person through Share feedback in your Profile.";

const GREETING =
  "Hi! I'm your Towinly helper. Ask me anything in plain words: how trust works, what to do today, or where to find things.";

const SUGGESTIONS = [
  'What should I do today?',
  'How does the Trust Journey work?',
  'What is my trust score?',
];

const mascot = require('../../assets/ai-tortoise-small.png');

// Module scope so the list's key function never changes identity (see the
// memoization note in AskAiAssistant).
const keyOf = (m) => String(m.id);

// The empty state: greeting bubble, a Read-aloud chip, three suggested
// questions. Its own component so the sheet can hand FlatList one element whose
// identity survives a keystroke in the composer.
function AskAiIntro({ onSpeak, onAsk }) {
  const { t, spacing, radius, type, fontScaleCaps, pressRipple } = useTheme();
  return (
    <View>
      {/* Greeting bubble (16/16/16/4) + Read aloud chip */}
      <View
        style={{
          alignSelf: 'flex-start',
          maxWidth: '90%',
          backgroundColor: t.blueWash,
          borderWidth: 1,
          borderColor: t.blueSoft,
          borderTopLeftRadius: 16,
          borderTopRightRadius: 16,
          borderBottomRightRadius: 16,
          borderBottomLeftRadius: 4,
          paddingHorizontal: spacing[4],
          paddingVertical: spacing[3],
        }}
      >
        <Text style={{ fontSize: type.body, lineHeight: 22, color: t.ink }}>{GREETING}</Text>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Read the greeting aloud"
        onPress={() => onSpeak(GREETING)}
        android_ripple={pressRipple}
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          gap: 5,
          alignSelf: 'flex-start',
          // A real 44pt box, min not fixed: React Native Web drops hitSlop, so
          // the 30pt chip this replaced was a 30pt target on phone web, and a
          // fixed height would clip the label at the large-text cap.
          minHeight: 44,
          paddingVertical: 6,
          paddingHorizontal: 12,
          borderRadius: radius.pill,
          backgroundColor: t.surfaceFill,
          borderWidth: 1,
          borderColor: t.border,
          marginTop: 8,
          opacity: pressed ? 0.7 : 1,
        })}
      >
        <Volume2 size={13} color={t.inkSlate} strokeWidth={1.8} />
        <Text
          maxFontSizeMultiplier={fontScaleCaps.body}
          style={{ fontSize: type.meta, fontWeight: '600', color: t.inkSlate }}
        >
          Read aloud
        </Text>
      </Pressable>

      {/* Three suggested questions */}
      <View style={{ gap: 8, marginTop: spacing[5] }}>
        {SUGGESTIONS.map((s) => (
          <Pressable
            key={s}
            accessibilityRole="button"
            accessibilityLabel={s}
            onPress={() => onAsk(s)}
            android_ripple={pressRipple}
            style={({ pressed }) => ({
              backgroundColor: t.canvas,
              borderWidth: 1,
              borderColor: t.border,
              borderRadius: radius.input,
              paddingHorizontal: spacing[4],
              paddingVertical: 12,
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <Text style={{ fontSize: type.body, color: t.blueDeep, fontWeight: '500' }}>{s}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

// One bubble. Memoized so appending an answer redraws the new bubble only,
// instead of every bubble already on screen.
const MessageBubble = memo(function MessageBubble({ item, onSpeak, onReport }) {
  const { t, spacing, radius, type, text, fontScaleCaps, pressRipple } = useTheme();
  return (
    <View
      style={{
        alignSelf: item.role === 'user' ? 'flex-end' : 'flex-start',
        maxWidth: '85%',
        backgroundColor: item.role === 'user' ? t.blueTint : t.canvas,
        borderWidth: item.role === 'user' ? 0 : 1,
        borderColor: t.border,
        borderRadius: radius.card,
        paddingHorizontal: spacing[4],
        paddingVertical: spacing[3],
      }}
    >
      <Text style={{ fontSize: text.base, lineHeight: 25, color: t.ink }}>{item.content}</Text>
      {/* Measured at 320pt (iPhone SE): the two labels together are wider
          than an 85% bubble allows, and React Native never shrinks a row
          child, so `nowrap` pushed "Report this answer" clean through the
          bubble's right padding. Wrapping lets it take its own line on the
          narrowest phone and keeps both on one line everywhere wider. The
          44pt height is a real box rather than hitSlop, which React Native
          Web drops entirely. */}
      {item.role === 'assistant' ? (
        <View
          testID="ai-answer-actions"
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            alignItems: 'center',
            columnGap: spacing[4],
            rowGap: spacing[1],
          }}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Read this answer aloud"
            onPress={() => onSpeak(item.content)}
            android_ripple={pressRipple}
            hitSlop={{ left: 8, right: 8 }}
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: 44,
              gap: 5,
              opacity: pressed ? 0.6 : 1,
            })}
          >
            <Volume2 size={13} color={t.inkSlate} strokeWidth={1.8} />
            {/* meta, not caption: this is the control a low-vision elder taps to
                have the answer read out. tokens.js keeps caption for text that
                does nothing when you touch it. */}
            <Text
              maxFontSizeMultiplier={fontScaleCaps.body}
              style={{ fontSize: type.meta, fontWeight: '600', color: t.inkSlate }}
            >
              Read aloud
            </Text>
          </Pressable>
          {/* Google Play's AI-Generated Content policy requires an in-app way to
              flag offensive AI output. The /reports endpoint needs a
              reportedUserId and there is no user behind a Groq answer, so this
              carries the answer into the feedback form instead. */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Report this answer"
            onPress={() => onReport(item.content)}
            android_ripple={pressRipple}
            hitSlop={{ left: 8, right: 8 }}
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: 44,
              gap: 5,
              opacity: pressed ? 0.6 : 1,
            })}
          >
            <Flag size={13} color={t.inkSlate} strokeWidth={1.8} />
            <Text
              maxFontSizeMultiplier={fontScaleCaps.body}
              style={{ fontSize: type.meta, fontWeight: '600', color: t.inkSlate }}
            >
              Report this answer
            </Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
});

export default function AskAiAssistant() {
  const { t, spacing, type, text, fontFamily, fontScaleCaps, pressRipple } = useTheme();
  const { showToast } = useToast();
  const reducedMotion = useReducedMotion();
  const pathname = usePathname();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const inputRef = useRef(null);
  // Stable per-message ids: index keys shift on every append, forcing every
  // bubble to re-render — visible lag on older phones after a few exchanges.
  const msgSeq = useRef(0);

  // A session expiry mid-request unmounts the tabs tree (and this sheet with
  // it) — the resolved fetch must not setState on the dead component.
  const mounted = useRef(true);
  useEffect(() => () => {
    mounted.current = false;
  }, []);

  const headerRef = useRef(null); // screen-reader focus lands here on open

  const { user } = useAuth();
  const confirm = useConfirm();
  const [aiConsented, setAiConsented] = useState(false);
  useEffect(() => {
    hasAiConsent(user?.userId).then((ok) => {
      if (mounted.current) setAiConsented(ok);
    });
  }, [user?.userId]);

  // One-time disclosure naming the AI provider before anything is sent
  // (App Store AI-consent rule). Resolves true to continue the send, false to
  // cancel — the typed question stays in the composer either way.
  // Was a hand-rolled Promise around Alert.alert. On web that never settled —
  // Alert is a no-op there, so no button could ever resolve it and Send hung
  // forever with no spinner and no error. confirm() owns the promise now, and
  // dismissing it resolves false by contract, so the { onDismiss } arg is gone.
  const ensureAiConsent = async () => {
    if (aiConsented) return true;
    const ok = await confirm({
      title: 'Before your first question',
      message:
        "Towinly's helper uses Groq, an outside AI service, to write its answers. " +
        'Your question, this chat, and a short summary of your own Towinly activity ' +
        '(like your first name and trust score) are shared with Groq. Your contact ' +
        'details are never shared. The answers are written by a machine, so they can ' +
        'be wrong. Every answer has a "Report this answer" button if one looks wrong ' +
        'or upsetting. Is that okay?',
      cancelLabel: 'Not now',
      confirmLabel: "Yes, that's okay",
    });
    if (!ok) return false;
    setAiConsented(true);
    grantAiConsent(user?.userId);
    return true;
  };

  // Hand a bad AI answer to the feedback form, with the answer already quoted so
  // the person only has to say what was wrong with it. Closes the sheet first:
  // it is a Modal, and navigating underneath it would leave it covering the form.
  // useCallback throughout this section: every one of these reaches the message
  // list, and the list only skips a redraw when all its props keep their
  // identity. useRouter() hands back a module-level singleton, so router is a
  // safe dependency.
  const reportAnswer = useCallback(
    (content) => {
      Speech.stop();
      setOpen(false);
      router.push({ pathname: '/feedback', params: { reportedAnswer: content } });
    },
    [router]
  );

  // Read a message out loud (web parity: speechSynthesis → expo-speech).
  // A fresh tap always restarts from the top.
  const speak = useCallback((content) => {
    Speech.stop();
    Speech.speak(content, { rate: 0.95 });
  }, []);

  const close = () => {
    Speech.stop();
    setOpen(false);
  };

  // No speech-to-text lives inside Expo Go — but the iPhone keyboard's own
  // dictation mic does the job today, so the mic hands the user over to it.
  const startVoice = () => {
    inputRef.current?.focus();
    showToast('Tap the microphone on your keyboard to speak your question.', 'info');
  };

  const send = async (question) => {
    const q = question.trim();
    if (!q || thinking) return;
    if (!(await ensureAiConsent())) return;
    setInput('');
    // History keeps the API contract: {role, content} only, no local ids.
    const history = messages.slice(-6).map(({ role, content }) => ({ role, content }));
    setMessages((prev) => [...prev, { id: msgSeq.current++, role: 'user', content: q }]);
    setThinking(true);
    // Screen readers get no visual "Thinking…" cue — say it, then say the reply.
    announce('Thinking…');
    try {
      const { data } = await api.post('/assistant/chat', { message: q, history });
      if (!mounted.current) return;
      setMessages((prev) => [...prev, { id: msgSeq.current++, role: 'assistant', content: data.reply }]);
      announce(data.reply);
    } catch {
      if (!mounted.current) return;
      // "Please try again" must not mean retyping — put the question back
      // unless the user already started typing a new one (HCI rule 9).
      setInput((cur) => cur || q);
      setMessages((prev) => [...prev, { id: msgSeq.current++, role: 'assistant', content: FALLBACK }]);
      announce(FALLBACK);
    } finally {
      if (mounted.current) setThinking(false);
    }
  };

  // Everything the message list is handed has to survive a keystroke. The
  // composer's text lives in this component, so each keystroke renders the whole
  // sheet; FlatList is a PureComponent, and a single rebuilt prop (an inline
  // renderItem, a fresh style object) re-renders every mounted bubble, each with
  // two Pressables. That was visible keyboard lag on an old phone after a few
  // exchanges. `send` closes over the messages, so the suggestions read it
  // through a ref rather than carrying its identity (the chat thread's UX-708
  // latest-ref pattern).
  const sendRef = useRef(send);
  useEffect(() => {
    sendRef.current = send;
  });
  const askSuggestion = useCallback((question) => sendRef.current(question), []);
  const listContent = useMemo(() => ({ padding: spacing[4], gap: spacing[2] }), [spacing]);
  const intro = useMemo(
    () => <AskAiIntro onSpeak={speak} onAsk={askSuggestion} />,
    [speak, askSuggestion]
  );
  const renderItem = useCallback(
    ({ item }) => <MessageBubble item={item} onSpeak={speak} onReport={reportAnswer} />,
    [speak, reportAnswer]
  );
  const listFooter = useMemo(
    () =>
      thinking ? (
        <Text style={{ fontSize: text.sm, color: t.ink4, marginTop: spacing[2] }}>Thinking…</Text>
      ) : null,
    [thinking, t, text, spacing]
  );

  // The action screen pins its own bottom UI (elder: the one filled Post Help
  // primary) in the exact band the FAB floats in — never cover it (HCI rule 8).
  if (pathname === '/action') return null;

  return (
    <>
      {/* Wash pill FAB — tortoise + label, above the tab bar */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Ask AI, your Towinly helper"
        onPress={() => setOpen(true)}
        android_ripple={pressRipple}
        style={({ pressed }) => ({
          position: 'absolute',
          right: 16,
          // Clear of the tab bar (76 + safe-area) and the raised center button.
          bottom: 76 + insets.bottom + 16,
          height: 44,
          paddingHorizontal: 14,
          borderRadius: 22,
          backgroundColor: t.blueWash,
          borderWidth: 2,
          borderColor: t.blue,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 7,
          opacity: pressed ? 0.85 : 1,
        })}
      >
        <Image source={mascot} style={{ width: 24, height: 24 }} resizeMode="contain" />
        <Text style={{ fontSize: type.meta, fontWeight: '600', color: t.blueDeep }}>Ask AI</Text>
      </Pressable>

      <Modal
        visible={open}
        transparent
        statusBarTranslucent
        navigationBarTranslucent
        animationType={reducedMotion ? 'none' : 'slide'}
        onRequestClose={close}
        // Android Modal doesn't relocate TalkBack focus on its own — hand it to
        // the sheet header so focus isn't stuck on the hidden screen behind it.
        onShow={() => focusForScreenReader(headerRef)}
      >
        {/* Full page (user call 2026-07-17): the helper owns the whole screen
            instead of a bottom sheet. */}
        <View style={{ flex: 1, backgroundColor: t.surface, paddingTop: insets.top, paddingBottom: insets.bottom }}>
          <View style={{ flex: 1, overflow: 'hidden' }}>
            {/* Wash header: mascot + Ask AI / Your Towinly helper */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 11,
                paddingHorizontal: spacing[5],
                paddingVertical: spacing[3],
                backgroundColor: t.blueWash,
                borderBottomWidth: 1,
                borderBottomColor: t.blueSoft,
              }}
            >
              <Image source={mascot} style={{ width: 34, height: 34 }} resizeMode="contain" />
              <View style={{ flex: 1 }}>
                {/* A declared heading, so it dresses like every other heading in
                    the app: Newsreader, weight 400 only, never a fontWeight. */}
                <Text
                  ref={headerRef}
                  accessibilityRole="header"
                  maxFontSizeMultiplier={fontScaleCaps.body}
                  style={{ fontFamily: fontFamily.display, fontSize: type.cardTitle, color: t.ink }}
                >
                  Ask AI
                </Text>
                <Text style={{ fontSize: type.caption, color: t.inkSlate }}>Your Towinly helper</Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close"
                onPress={close}
                android_ripple={pressRipple}
                hitSlop={8}
                style={({ pressed }) => ({
                  minWidth: 44,
                  minHeight: 44,
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <X size={22} color={t.ink3} />
              </Pressable>
            </View>

            <KeyboardAvoider>
              <FlatList
                data={messages}
                keyExtractor={keyOf}
                contentContainerStyle={listContent}
                ListEmptyComponent={intro}
                renderItem={renderItem}
                ListFooterComponent={listFooter}
              />

              {/* Composer: mic circle · pill input · send circle */}
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
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Speak your question"
                  onPress={startVoice}
                  android_ripple={pressRipple}
                  style={({ pressed }) => ({
                    width: 44,
                    height: 44,
                    borderRadius: 22,
                    backgroundColor: t.blueWash,
                    borderWidth: 1,
                    borderColor: t.blueSoft,
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: pressed ? 0.7 : 1,
                  })}
                >
                  <Mic size={19} color={t.blueDeep} strokeWidth={1.8} />
                </Pressable>
                <TextInput
                  ref={inputRef}
                  accessibilityLabel="Your question"
                  value={input}
                  onChangeText={setInput}
                  placeholder="Type your question…"
                  placeholderTextColor={t.ink4}
                  multiline
                  style={{
                    flex: 1,
                    minHeight: 44,
                    maxHeight: 100,
                    backgroundColor: t.surfaceFill,
                    borderRadius: 22,
                    paddingHorizontal: spacing[4],
                    paddingVertical: spacing[3],
                    fontSize: type.body,
                    color: t.ink,
                  }}
                />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Send question"
                  accessibilityState={{ disabled: !input.trim() || thinking }}
                  disabled={!input.trim() || thinking}
                  onPress={() => send(input)}
                  android_ripple={pressRipple}
                  style={({ pressed }) => ({
                    width: 44,
                    height: 44,
                    borderRadius: 22,
                    backgroundColor: input.trim() && !thinking ? t.actionFill : t.btnDisabled,
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: pressed ? 0.85 : 1,
                  })}
                >
                  <Send size={20} color={t.actionInk} />
                </Pressable>
              </View>
            </KeyboardAvoider>
          </View>
        </View>
      </Modal>
    </>
  );
}
