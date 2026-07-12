// Ask AI (3l) — the tortoise helper as a sheet: blueWash header with the
// ai-tortoise avatar ("Ask AI / Your ToWin helper"), a greeting bubble with a
// Read-aloud chip, three suggestion buttons, and a mic · pill · send composer.
// Entry point is a wash pill FAB (tortoise + "Ask AI", 2px blue border).
// Same API: POST /assistant/chat {message, history} → {reply}; friendly
// fallback on any failure. Mounted in the tabs layout only (HCI rule 8).
// The very first question is gated by a one-time plain-words consent note
// naming Groq, the outside AI service (App Store AI-consent rule, STORE-203).
import * as Speech from 'expo-speech';
import { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Mic, Send, Volume2, X } from 'lucide-react-native';
import api from '../api/client';
import { useToast } from '../context/ToastContext';
import { grantAiConsent, hasAiConsent } from '../lib/aiConsent';
import { useReducedMotion } from '../lib/useReducedMotion';
import { useTheme } from '../theme/ThemeContext';

const FALLBACK =
  "I couldn't answer just now. Please try again in a moment — or ask a real person through Share feedback in your Profile.";

const GREETING =
  "Hi! I'm your ToWin helper. Ask me anything in plain words — how trust works, what to do today, or where to find things.";

const SUGGESTIONS = [
  'What should I do today?',
  'How does the Trust Journey work?',
  'What is my trust score?',
];

const mascot = require('../../assets/ai-tortoise-small.png');

export default function AskAiAssistant() {
  const { t, spacing, radius, type, text } = useTheme();
  const { showToast } = useToast();
  const reducedMotion = useReducedMotion();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const inputRef = useRef(null);

  // A session expiry mid-request unmounts the tabs tree (and this sheet with
  // it) — the resolved fetch must not setState on the dead component.
  const mounted = useRef(true);
  useEffect(() => () => {
    mounted.current = false;
  }, []);

  const headerRef = useRef(null); // screen-reader focus lands here on open

  const [aiConsented, setAiConsented] = useState(false);
  useEffect(() => {
    hasAiConsent().then((ok) => {
      if (mounted.current && ok) setAiConsented(true);
    });
  }, []);

  // One-time disclosure naming the AI provider before anything is sent
  // (App Store AI-consent rule). Resolves true to continue the send, false to
  // cancel — the typed question stays in the composer either way.
  const ensureAiConsent = () => {
    if (aiConsented) return Promise.resolve(true);
    return new Promise((resolve) => {
      Alert.alert(
        'Before your first question',
        "ToWin's helper uses Groq, an outside AI service, to write its answers. " +
          'Your question, this chat, and a short summary of your own ToWin activity ' +
          '(like your first name and trust score) are shared with Groq — never your ' +
          'contact details. Is that okay?',
        [
          { text: 'Not now', style: 'cancel', onPress: () => resolve(false) },
          {
            text: "Yes, that's okay",
            onPress: () => {
              setAiConsented(true);
              grantAiConsent();
              resolve(true);
            },
          },
        ],
        { cancelable: true, onDismiss: () => resolve(false) }
      );
    });
  };

  // Read a message out loud (web parity: speechSynthesis → expo-speech).
  // A fresh tap always restarts from the top.
  const speak = (content) => {
    Speech.stop();
    Speech.speak(content, { rate: 0.95 });
  };

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
    const history = messages.slice(-6);
    setMessages((prev) => [...prev, { role: 'user', content: q }]);
    setThinking(true);
    // Screen readers get no visual "Thinking…" cue — say it, then say the reply.
    AccessibilityInfo.announceForAccessibility('Thinking…');
    try {
      const { data } = await api.post('/assistant/chat', { message: q, history });
      if (!mounted.current) return;
      setMessages((prev) => [...prev, { role: 'assistant', content: data.reply }]);
      AccessibilityInfo.announceForAccessibility(data.reply);
    } catch {
      if (!mounted.current) return;
      setMessages((prev) => [...prev, { role: 'assistant', content: FALLBACK }]);
      AccessibilityInfo.announceForAccessibility(FALLBACK);
    } finally {
      if (mounted.current) setThinking(false);
    }
  };

  return (
    <>
      {/* Wash pill FAB — tortoise + label, above the tab bar */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Ask AI, your ToWin helper"
        onPress={() => setOpen(true)}
        style={({ pressed }) => ({
          position: 'absolute',
          right: 16,
          bottom: 118, // clear of the tab bar and the raised center button
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
        animationType={reducedMotion ? 'none' : 'slide'}
        onRequestClose={close}
      >
        <View style={{ flex: 1, backgroundColor: t.scrim, justifyContent: 'flex-end' }}>
          <View
            style={{
              backgroundColor: t.surface,
              borderTopLeftRadius: radius['2xl'],
              borderTopRightRadius: radius['2xl'],
              maxHeight: '80%',
              minHeight: '55%',
              overflow: 'hidden',
            }}
          >
            {/* Wash header: mascot + Ask AI / Your ToWin helper */}
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
                <Text style={{ fontSize: type.body, fontWeight: '600', color: t.ink }}>Ask AI</Text>
                <Text style={{ fontSize: type.caption, color: t.inkSlate }}>Your ToWin helper</Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close"
                onPress={close}
                hitSlop={8}
                style={{ minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}
              >
                <X size={22} color={t.ink3} />
              </Pressable>
            </View>

            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
              style={{ flex: 1 }}
            >
              <FlatList
                data={messages}
                keyExtractor={(_, i) => String(i)}
                contentContainerStyle={{ padding: spacing[4], gap: spacing[2] }}
                ListEmptyComponent={
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
                      onPress={() => speak(GREETING)}
                      hitSlop={{ top: 6, bottom: 6 }}
                      style={({ pressed }) => ({
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 5,
                        alignSelf: 'flex-start',
                        height: 30,
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
                      <Text style={{ fontSize: type.caption, fontWeight: '600', color: t.inkSlate }}>
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
                          onPress={() => send(s)}
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
                }
                renderItem={({ item }) => (
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
                    {item.role === 'assistant' ? (
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Read this answer aloud"
                        onPress={() => speak(item.content)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        style={({ pressed }) => ({
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 5,
                          alignSelf: 'flex-start',
                          marginTop: 6,
                          opacity: pressed ? 0.6 : 1,
                        })}
                      >
                        <Volume2 size={13} color={t.inkSlate} strokeWidth={1.8} />
                        <Text style={{ fontSize: type.caption, fontWeight: '600', color: t.inkSlate }}>
                          Read aloud
                        </Text>
                      </Pressable>
                    ) : null}
                  </View>
                )}
                ListFooterComponent={
                  thinking ? (
                    <Text style={{ fontSize: text.sm, color: t.ink4, marginTop: spacing[2] }}>Thinking…</Text>
                  ) : null
                }
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
            </KeyboardAvoidingView>
          </View>
        </View>
      </Modal>
    </>
  );
}
