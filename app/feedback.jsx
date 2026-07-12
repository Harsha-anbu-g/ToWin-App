// Share Your Feedback (3m) + creator card (3n) — port of the website's
// Feedback.jsx: prototype notice, name/email side by side, honest-message
// field, seven 1–5 rating rows (Idea…Overall, filled stars in brand blue),
// pinned Submit, then the founder card with contact rows and portfolio.
// POST /feedback carries the same keys the website sends.
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Image, Linking, Pressable, ScrollView, Text, View } from 'react-native';
import { Briefcase, Camera, Code2, Globe, Mail, MapPin, Phone, Star } from 'lucide-react-native';
import api from '../src/api/client';
import Button from '../src/components/ui/Button';
import Input from '../src/components/ui/Input';
import Screen from '../src/components/ui/Screen';
import { useToast } from '../src/context/ToastContext';
import { useTheme } from '../src/theme/ThemeContext';

// Verbatim from the website's Feedback.jsx
const RATINGS = [
  { key: 'ratingIdea', label: 'Idea' },
  { key: 'ratingUi', label: 'UI Design' },
  { key: 'ratingTheme', label: 'Theme' },
  { key: 'ratingSecurity', label: 'Security' },
  { key: 'ratingEaseOfUse', label: 'Ease of Use' },
  { key: 'ratingPerformance', label: 'Performance' },
  { key: 'ratingOverall', label: 'Overall' },
];

const CONTACTS = [
  { icon: Mail, label: 'agharsha.anbu@gmail.com', href: 'mailto:agharsha.anbu@gmail.com' },
  { icon: Phone, label: '+1 438-535-5782 (WhatsApp)', href: 'https://wa.me/14385355782' },
  { icon: MapPin, label: 'Montreal, Quebec, Canada', href: null },
  { icon: Briefcase, label: 'LinkedIn: harsha-anbu-gowri', href: 'https://www.linkedin.com/in/harsha-anbu-gowri/' },
  { icon: Code2, label: 'GitHub: Harsha-anbu-g', href: 'https://github.com/Harsha-anbu-g' },
  { icon: Camera, label: 'Instagram: harsha._.ag', href: 'https://www.instagram.com/harsha._.ag' },
];

const founder = require('../assets/founder.jpg');

function RatingRow({ label, value, onChange }) {
  const { t, type } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 44 }}>
      <Text style={{ fontSize: type.body, color: t.ink }}>{label}</Text>
      <View style={{ flexDirection: 'row' }}>
        {[1, 2, 3, 4, 5].map((n) => (
          <Pressable
            key={n}
            accessibilityRole="button"
            accessibilityLabel={`${label}: ${n} star${n > 1 ? 's' : ''}`}
            accessibilityState={{ selected: value >= n }}
            onPress={() => onChange(value === n ? 0 : n)}
            hitSlop={2}
            style={{ minWidth: 34, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}
          >
            <Star
              size={20}
              color={value >= n ? t.blue : t.idleGrey}
              fill={value >= n ? t.blue : 'transparent'}
            />
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function CreatorCard() {
  const { t, type } = useTheme();
  const open = (href) => href && Linking.openURL(href).catch(() => {});
  return (
    <>
      <View style={{ backgroundColor: t.canvas, borderWidth: 1, borderColor: t.border, borderRadius: 18, padding: 20, marginTop: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <Image
            source={founder}
            accessibilityLabel="Portrait of Harshavardhan"
            style={{ width: 52, height: 52, borderRadius: 26, borderWidth: 1, borderColor: t.border }}
          />
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 16, fontWeight: '600', lineHeight: 21, color: t.ink }}>
              Harshavardhan Anbuchezhian Gowri
            </Text>
            <Text style={{ fontSize: type.meta, color: t.inkSlate }}>Harsha</Text>
          </View>
        </View>
        <Text style={{ fontSize: 13.5, color: t.blueDeep, fontWeight: '600', marginTop: 14, lineHeight: 19 }}>
          Full-Stack Engineer · Aspiring Entrepreneur · AI-Driven Developer
        </Text>
        <Text style={{ fontSize: 12.5, color: t.inkSlate, marginTop: 2 }}>
          Master's in Applied Computer Science · Concordia University, Montreal
        </Text>
        <View style={{ height: 1, backgroundColor: t.border, marginVertical: 14 }} />
        <Text style={{ fontSize: 14, fontWeight: '600', lineHeight: 21, color: t.ink }}>
          This isn't a university project. ToWin is my future startup.
        </Text>
        <Text style={{ fontSize: 13.5, color: t.inkSlate, lineHeight: 21, marginTop: 6 }}>
          I'm building something real, and your feedback is what shapes it. Love the idea? Want to
          connect? Let's talk!
        </Text>
        <View style={{ gap: 10, marginTop: 16 }}>
          {CONTACTS.map(({ icon: Icon, label, href }) => (
            <Pressable
              key={label}
              accessibilityRole={href ? 'link' : 'text'}
              accessibilityLabel={label}
              onPress={href ? () => open(href) : undefined}
              disabled={!href}
              hitSlop={{ top: 4, bottom: 4 }}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                gap: 10,
                opacity: pressed ? 0.6 : 1,
              })}
            >
              <Icon size={16} color={t.blue} strokeWidth={1.8} />
              <Text style={{ fontSize: 13.5, color: href ? t.blueDeep : t.inkSlate }}>{label}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Portfolio card: gold underlined link + gold pill */}
      <Pressable
        accessibilityRole="link"
        accessibilityLabel="Visit my portfolio"
        onPress={() => open('https://portfolioharsha.vercel.app/')}
        style={({ pressed }) => ({
          backgroundColor: t.canvas,
          borderWidth: 1,
          borderColor: t.border,
          borderRadius: 18,
          paddingVertical: 16,
          paddingHorizontal: 20,
          marginTop: 12,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          opacity: pressed ? 0.8 : 1,
        })}
      >
        <View>
          <Text style={{ fontSize: type.caption, color: t.inkSlate }}>Want to know more?</Text>
          <Text
            style={{
              fontSize: 14,
              fontWeight: '700',
              color: t.trustGold,
              textDecorationLine: 'underline',
              marginTop: 2,
            }}
          >
            Visit my portfolio
          </Text>
        </View>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            backgroundColor: t.trustGold,
            paddingVertical: 9,
            paddingHorizontal: 16,
            borderRadius: 999,
          }}
        >
          <Globe size={13} color={t.actionInk} strokeWidth={2} />
          <Text style={{ fontSize: type.meta, fontWeight: '600', color: t.actionInk }}>My Portfolio</Text>
        </View>
      </Pressable>
    </>
  );
}

export default function Feedback() {
  const { t, spacing, type, fontFamily } = useTheme();
  const { showToast } = useToast();
  const router = useRouter();

  const [form, setForm] = useState({ message: '', name: '', email: '' });
  const [ratings, setRatings] = useState({});
  const [fieldError, setFieldError] = useState('');
  const [loading, setLoading] = useState(false);

  const setRating = (key) => (v) => setRatings((r) => ({ ...r, [key]: v }));

  const submit = async () => {
    if (!form.message.trim()) {
      setFieldError('Please write a message before submitting.');
      return;
    }
    setFieldError('');
    setLoading(true);
    try {
      await api.post('/feedback', {
        name: form.name.trim() || null,
        email: form.email.trim() || null,
        phone: null,
        message: form.message.trim(),
        ...Object.fromEntries(RATINGS.map(({ key }) => [key, ratings[key] || null])),
      });
      showToast('Thank you — your feedback helps ToWin grow.', 'success');
      router.back();
    } catch (err) {
      showToast(err?.response?.data?.message || 'Could not send it right now. Please try again.', 'error');
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
        {/* Prototype notice */}
        <View
          style={{
            backgroundColor: t.blueWash,
            borderWidth: 1,
            borderColor: t.blueSoft,
            borderRadius: 14,
            padding: 14,
          }}
        >
          <Text style={{ fontSize: type.meta, color: t.ink2, lineHeight: 20 }}>
            <Text style={{ fontWeight: '700' }}>ToWin is an early prototype.</Text> You're trying a
            work in progress. Your feedback here directly shapes what gets built.
          </Text>
        </View>

        <Text
          accessibilityRole="header"
          style={{ fontFamily: fontFamily.display, fontSize: 26, color: t.ink, letterSpacing: -0.5, marginTop: 18 }}
        >
          Share Your Feedback
        </Text>
        <Text style={{ fontSize: type.meta, color: t.inkSlate, marginTop: 3, marginBottom: 16 }}>
          All fields are optional except your message.
        </Text>

        {/* Name / Email side by side */}
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: spacing[4] }}>
          <Input
            label="Name"
            value={form.name}
            onChangeText={(v) => setForm((f) => ({ ...f, name: v }))}
            style={{ flex: 1 }}
          />
          <Input
            label="Email"
            value={form.email}
            onChangeText={(v) => setForm((f) => ({ ...f, email: v }))}
            autoCapitalize="none"
            keyboardType="email-address"
            style={{ flex: 1 }}
          />
        </View>

        <Input
          label="Message"
          value={form.message}
          onChangeText={(v) => {
            setForm((f) => ({ ...f, message: v }));
            setFieldError('');
          }}
          error={fieldError}
          multiline
          numberOfLines={5}
          inputStyle={{ minHeight: 110, textAlignVertical: 'top' }}
          helper="Be honest! Include at least one thing you didn't like."
          style={{ marginBottom: spacing[4] }}
        />

        <Text style={{ fontSize: type.meta, fontWeight: '600', color: t.inkSlate, marginBottom: 4 }}>
          Rate the app (optional)
        </Text>
        <View style={{ backgroundColor: t.canvas, borderWidth: 1, borderColor: t.border, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 4 }}>
          {RATINGS.map(({ key, label }, i) => (
            <View key={key} style={{ borderTopWidth: i === 0 ? 0 : 1, borderTopColor: t.hairline }}>
              <RatingRow label={label} value={ratings[key] ?? 0} onChange={setRating(key)} />
            </View>
          ))}
        </View>

        <CreatorCard />
      </ScrollView>

      {/* Pinned Submit Feedback */}
      <View style={{ paddingHorizontal: spacing[4], paddingTop: spacing[2], paddingBottom: spacing[3] }}>
        <Button
          title={loading ? 'Sending…' : 'Submit Feedback'}
          variant="primary"
          onPress={submit}
          loading={loading}
        />
      </View>
    </Screen>
  );
}
