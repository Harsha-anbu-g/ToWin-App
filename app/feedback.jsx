// Share Your Feedback (3m) — port of the website's Feedback.jsx: prototype
// notice, single-column name/email/message fields, seven 1–5 rating
// rows, pinned Submit. The star row and the founder/portfolio cards live in
// src/components/feedback/ (rulebook pass follow-up: the screen file keeps
// only the form). POST /feedback carries the same keys the website sends.
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { sendFeedback } from '../src/api/feedback';
import CreatorCard from '../src/components/feedback/CreatorCard';
import RatingRow from '../src/components/feedback/RatingRow';
import Button from '../src/components/ui/Button';
import Input from '../src/components/ui/Input';
import Screen from '../src/components/ui/Screen';
import { useToast } from '../src/context/ToastContext';
import { useTheme } from '../src/theme/ThemeContext';
import { spacing } from '../src/theme/tokens';
import { tr } from '../src/i18n';
import emphasize from '../src/i18n/emphasize';

// Hoisted so memo'd Inputs get the same style object every render
const FIELD_GAP = { marginBottom: spacing[4] };
const MESSAGE_INPUT_STYLE = { minHeight: 110, textAlignVertical: 'top' };

// Verbatim from the website's Feedback.jsx
const RATINGS = [
  { key: 'ratingIdea', get label() { return tr('Idea'); } },
  { key: 'ratingUi', get label() { return tr('How it looks'); } },
  { key: 'ratingTheme', get label() { return tr('Theme'); } },
  { key: 'ratingSecurity', get label() { return tr('Feeling safe'); } },
  { key: 'ratingEaseOfUse', get label() { return tr('Ease of Use'); } },
  { key: 'ratingPerformance', get label() { return tr('How fast it feels'); } },
  { key: 'ratingOverall', get label() { return tr('Overall'); } },
];

export default function Feedback() {
  const insets = useSafeAreaInsets();
  const { t, type, fontFamily } = useTheme();
  const { showToast } = useToast();
  const router = useRouter();

  // Arriving from "Report this answer" in the AI helper: quote the answer so the
  // person only has to say what was wrong with it. Lazy initialiser, so typing
  // into the field is never overwritten by a re-render.
  const { reportedAnswer } = useLocalSearchParams();
  const [form, setForm] = useState(() => ({
    message: reportedAnswer
      ? tr('I want to report an answer from the Towinly helper.\n\nThe answer was:\n"{reportedAnswer}"\n\nWhat was wrong with it:\n', { reportedAnswer })
      : '',
    name: '',
    email: '',
  }));
  const [ratings, setRatings] = useState({});
  const [fieldError, setFieldError] = useState('');
  const [loading, setLoading] = useState(false);

  const setRating = (key) => (v) => setRatings((r) => ({ ...r, [key]: v }));

  // Stable per-field handlers (the action.jsx pattern): Input is memo'd
  // (floating-label Paper fields), so a keystroke in one field must not
  // re-render its siblings.
  const setName = useCallback((v) => setForm((f) => ({ ...f, name: v })), []);
  const setEmail = useCallback((v) => setForm((f) => ({ ...f, email: v })), []);
  const setMessage = useCallback((v) => {
    setForm((f) => ({ ...f, message: v }));
    setFieldError('');
  }, []);

  // Return-key path (UX-708): Next walks name → email → message; the message
  // is multiline, so its return key types newlines and Submit stays a button.
  const emailRef = useRef(null);
  const messageRef = useRef(null);
  const focusEmail = useCallback(() => emailRef.current?.focus(), []);
  const focusMessage = useCallback(() => messageRef.current?.focus(), []);

  const submit = async () => {
    if (!form.message.trim()) {
      setFieldError(tr('Please write a message before submitting.'));
      return;
    }
    setFieldError('');
    setLoading(true);
    try {
      await sendFeedback({
        name: form.name.trim() || null,
        email: form.email.trim() || null,
        phone: null,
        message: form.message.trim(),
        ...Object.fromEntries(RATINGS.map(({ key }) => [key, ratings[key] || null])),
      });
      showToast(tr('Thank you. Your feedback helps Towinly grow.'), 'success');
      router.back();
    } catch (err) {
      showToast(err?.response?.data?.message || tr('Could not send it right now. Please try again.'), 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen back scroll={false} keyboard contentStyle={{ padding: 0 }}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingHorizontal: spacing[4], paddingBottom: spacing[6] }}
      >
        {/* What this form is for. Deliberately says nothing about beta or prototype
            status: Apple guideline 2.2 keeps betas on TestFlight, and the old wording
            told App Review the shipped app was unfinished. */}
        <View
          style={{
            backgroundColor: t.blueWash,
            borderWidth: 1,
            borderColor: t.blueSoft,
            borderRadius: 14,
            padding: 16,
          }}
        >
          <Text style={{ fontSize: type.body, color: t.ink2, lineHeight: 22 }}>
            {emphasize(
              tr('*We read every message.* What you write here shapes what gets built next, so tell us what helped and what got in your way.'),
              { fontWeight: '700' }
            )}
          </Text>
        </View>

        <Text
          accessibilityRole="header"
          style={{ fontFamily: fontFamily.display, fontSize: 26, color: t.ink, letterSpacing: -0.5, marginTop: 20 }}
        >
          {tr('Share Your Feedback')}
        </Text>
        <Text style={{ fontSize: type.meta, color: t.inkSlate, marginTop: 3, marginBottom: 16 }}>
          {tr('All fields are optional except your message.')}
        </Text>

        <Input
          label={tr('Name')}
          value={form.name}
          onChangeText={setName}
          autoCapitalize="words"
          textContentType="name"
          autoComplete="name"
          returnKeyType="next"
          submitBehavior="submit"
          onSubmitEditing={focusEmail}
          style={FIELD_GAP}
        />
        <Input
          ref={emailRef}
          label={tr('Email')}
          value={form.email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          textContentType="emailAddress"
          autoComplete="email"
          returnKeyType="next"
          submitBehavior="submit"
          onSubmitEditing={focusMessage}
          style={FIELD_GAP}
        />

        <Input
          ref={messageRef}
          label={tr('Message')}
          value={form.message}
          onChangeText={setMessage}
          error={fieldError}
          multiline
          numberOfLines={5}
          inputStyle={MESSAGE_INPUT_STYLE}
          helper={tr("Be honest! Include at least one thing you didn't like.")}
          style={FIELD_GAP}
        />

        <Text style={{ fontSize: type.meta, fontWeight: '600', color: t.inkSlate, marginBottom: 4 }}>
          {tr('Rate the app (optional)')}
        </Text>
        <View style={{ backgroundColor: t.canvas, borderWidth: 1, borderColor: t.border, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 4 }}>
          {RATINGS.map(({ key, label }, i) => (
            <View key={key} style={{ borderTopWidth: i === 0 ? 0 : 1, borderTopColor: t.hairline }}>
              <RatingRow label={label} value={ratings[key] ?? 0} onChange={setRating(key)} />
            </View>
          ))}
        </View>

        <CreatorCard />
      </ScrollView>

      {/* Pinned Submit Feedback */}
      <View
        style={{
          paddingHorizontal: spacing[4],
          paddingTop: spacing[2],
          // Clear the home-indicator gesture zone (rulebook: never pin the
          // primary under the system bar).
          paddingBottom: Math.max(insets.bottom, spacing[3]),
        }}
      >
        <Button
          title={loading ? tr('Sending…') : tr('Submit Feedback')}
          variant="primary"
          onPress={submit}
          loading={loading}
        />
      </View>
    </Screen>
  );
}
