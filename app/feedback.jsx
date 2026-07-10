// Share feedback — port of Feedback.jsx: message + optional contact details +
// two 1–5 ratings (the idea / the look), POST /feedback.
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Star } from 'lucide-react-native';
import api from '../src/api/client';
import Button from '../src/components/ui/Button';
import Card from '../src/components/ui/Card';
import Input from '../src/components/ui/Input';
import Screen from '../src/components/ui/Screen';
import { useToast } from '../src/context/ToastContext';
import { useTheme } from '../src/theme/ThemeContext';

function Stars({ label, value, onChange }) {
  const { t, spacing, text } = useTheme();
  return (
    <View style={{ marginBottom: spacing[4] }}>
      <Text style={{ fontSize: text.sm, fontWeight: '500', color: t.inkSlate, marginBottom: spacing[2] }}>
        {label}
      </Text>
      <View style={{ flexDirection: 'row', gap: spacing[1] }}>
        {[1, 2, 3, 4, 5].map((n) => (
          <Pressable
            key={n}
            accessibilityRole="button"
            accessibilityLabel={`${n} star${n > 1 ? 's' : ''}`}
            accessibilityState={{ selected: value >= n }}
            onPress={() => onChange(value === n ? 0 : n)}
            hitSlop={4}
            style={{ minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}
          >
            <Star
              size={28}
              color={value >= n ? t.starGold : t.idleGrey}
              fill={value >= n ? t.starGold : 'transparent'}
            />
          </Pressable>
        ))}
      </View>
    </View>
  );
}

export default function Feedback() {
  const { t, spacing, text, fontFamily } = useTheme();
  const { showToast } = useToast();
  const router = useRouter();

  const [form, setForm] = useState({ message: '', name: '', email: '', phone: '' });
  const [ratingIdea, setRatingIdea] = useState(0);
  const [ratingUi, setRatingUi] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    setError('');
    if (!form.message.trim()) {
      setError('Please write a few words first.');
      return;
    }
    setLoading(true);
    try {
      await api.post('/feedback', {
        name: form.name.trim() || null,
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        message: form.message.trim(),
        ratingIdea: ratingIdea || null,
        ratingUi: ratingUi || null,
      });
      showToast('Thank you — your feedback helps ToWin grow.', 'success');
      router.back();
    } catch (err) {
      setError(err?.response?.data?.message || 'Could not send it right now. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen title="Share feedback" keyboard>
      <Card>
        <Text style={{ fontFamily: fontFamily.display, fontSize: text.lg, color: t.ink }}>
          Tell us what you think
        </Text>
        <Text style={{ fontSize: text.base, lineHeight: 26, color: t.inkSlate, marginTop: spacing[2], marginBottom: spacing[4] }}>
          Every message is read by a person. Plain words are perfect.
        </Text>

        {error ? (
          <View
            accessibilityRole="alert"
            style={{
              backgroundColor: t.redTint,
              borderWidth: 1,
              borderColor: t.redLine,
              borderRadius: 11,
              padding: spacing[3],
              marginBottom: spacing[4],
            }}
          >
            <Text style={{ fontSize: text.sm, color: t.redError }}>{error}</Text>
          </View>
        ) : null}

        <Input
          label="Your feedback"
          value={form.message}
          onChangeText={(v) => setForm((f) => ({ ...f, message: v }))}
          multiline
          numberOfLines={5}
          inputStyle={{ minHeight: 120, textAlignVertical: 'top' }}
          style={{ marginBottom: spacing[4] }}
        />

        <Stars label="How much do you like the idea?" value={ratingIdea} onChange={setRatingIdea} />
        <Stars label="How does the app look and feel?" value={ratingUi} onChange={setRatingUi} />

        <Input
          label="Name (optional)"
          value={form.name}
          onChangeText={(v) => setForm((f) => ({ ...f, name: v }))}
          style={{ marginBottom: spacing[4] }}
        />
        <Input
          label="Email (optional)"
          value={form.email}
          onChangeText={(v) => setForm((f) => ({ ...f, email: v }))}
          autoCapitalize="none"
          keyboardType="email-address"
          style={{ marginBottom: spacing[5] }}
        />

        <Button
          title={loading ? 'Sending…' : 'Send feedback'}
          variant="primary"
          onPress={submit}
          loading={loading}
        />
      </Card>
    </Screen>
  );
}
