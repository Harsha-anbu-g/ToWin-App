// Ask-AI assistant — port of AskAiAssistant.jsx: a floating button opening a
// simple question sheet (POST /assistant/chat {message, history} → {reply}).
// Friendly fallback on any failure; mounted in the tabs layout, hidden on the
// chat-thread and feedback screens (they pin their own bottom UI, HCI rule 8).
import { useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { MessageCircleQuestionMark, Send, X } from 'lucide-react-native';
import api from '../api/client';
import { useTheme } from '../theme/ThemeContext';

const FALLBACK =
  "I couldn't answer just now. Please try again in a moment — or ask a real person through Share feedback in your Profile.";

export default function AskAiAssistant() {
  const { t, spacing, radius, text } = useTheme();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);

  const ask = async () => {
    const question = input.trim();
    if (!question || thinking) return;
    setInput('');
    const history = messages.slice(-6);
    setMessages((prev) => [...prev, { role: 'user', content: question }]);
    setThinking(true);
    try {
      const { data } = await api.post('/assistant/chat', { message: question, history });
      setMessages((prev) => [...prev, { role: 'assistant', content: data.reply }]);
    } catch {
      setMessages((prev) => [...prev, { role: 'assistant', content: FALLBACK }]);
    } finally {
      setThinking(false);
    }
  };

  return (
    <>
      {/* Floating button — sits above the tab bar, clear of the center action */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Ask ToWin a question"
        onPress={() => setOpen(true)}
        style={({ pressed }) => ({
          position: 'absolute',
          right: 16,
          bottom: 92,
          width: 52,
          height: 52,
          borderRadius: 26,
          backgroundColor: t.canvas,
          borderWidth: 1.5,
          borderColor: t.blueSoft,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: pressed ? 0.8 : 1,
        })}
      >
        <MessageCircleQuestionMark size={24} color={t.blueDeep} />
      </Pressable>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <View style={{ flex: 1, backgroundColor: t.scrim, justifyContent: 'flex-end' }}>
          <View
            style={{
              backgroundColor: t.surface,
              borderTopLeftRadius: radius['2xl'],
              borderTopRightRadius: radius['2xl'],
              maxHeight: '80%',
              minHeight: '55%',
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingHorizontal: spacing[5],
                paddingVertical: spacing[4],
                borderBottomWidth: 1,
                borderBottomColor: t.border,
              }}
            >
              <Text style={{ fontSize: text.base, fontWeight: '600', color: t.ink }}>
                Ask ToWin anything
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close"
                onPress={() => setOpen(false)}
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
                  <Text style={{ fontSize: text.base, lineHeight: 26, color: t.inkSlate, textAlign: 'center', marginTop: spacing[6] }}>
                    Ask in plain words — like "How do I add a friend?" or "What is the trust
                    ladder?"
                  </Text>
                }
                renderItem={({ item }) => (
                  <View
                    style={{
                      alignSelf: item.role === 'user' ? 'flex-end' : 'flex-start',
                      maxWidth: '85%',
                      backgroundColor: item.role === 'user' ? t.blueTint : t.canvas,
                      borderWidth: item.role === 'user' ? 0 : 1,
                      borderColor: t.border,
                      borderRadius: radius.lg,
                      paddingHorizontal: spacing[4],
                      paddingVertical: spacing[3],
                    }}
                  >
                    <Text style={{ fontSize: text.base, lineHeight: 25, color: t.ink }}>{item.content}</Text>
                  </View>
                )}
                ListFooterComponent={
                  thinking ? (
                    <Text style={{ fontSize: text.sm, color: t.ink4, marginTop: spacing[2] }}>Thinking…</Text>
                  ) : null
                }
              />

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
                  accessibilityLabel="Send question"
                  accessibilityState={{ disabled: !input.trim() || thinking }}
                  disabled={!input.trim() || thinking}
                  onPress={ask}
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
