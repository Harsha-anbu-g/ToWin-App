// Demo accounts card — shown first on Login AND Register so visitors never
// miss the no-signup path (mirrors web). Demo logins bypass the rate limiter.
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../theme/ThemeContext';
import { yearsOld } from '../lib/copy';

// Ages track the demo accounts' seeded birthdates (DemoDataSeeder) — same as web.
const DEMO = {
  ELDER: { identifier: 'elder', password: '12345678', label: 'Try as an Elder', sub: `Margaret, ${yearsOld('1953-05-14')}` },
  HELPER: { identifier: 'helper', password: '123456789', label: 'Try as a Helper', sub: `Harsha, ${yearsOld('2003-03-14')}` },
};

export default function DemoAccountsCard({ onError }) {
  const { t, spacing, radius, text } = useTheme();
  const { login } = useAuth();
  const router = useRouter();
  const [guestLoading, setGuestLoading] = useState('');

  const handleGuest = async (role) => {
    setGuestLoading(role);
    onError?.('');
    try {
      const { identifier, password } = DEMO[role];
      const { data } = await api.post('/auth/login', { identifier, password });
      await login(data.token);
      router.replace('/'); // index routes by role/verification state
    } catch (err) {
      onError?.(
        err?.response?.status === 429
          ? err.response.data?.message || 'Too many attempts. Please try again later.'
          : 'Could not start demo session. Please try again.'
      );
    } finally {
      setGuestLoading('');
    }
  };

  return (
    <View
      style={{
        backgroundColor: t.blueWash,
        borderWidth: 1.5,
        borderColor: t.blue,
        borderRadius: radius.lg,
        padding: spacing[4],
        marginBottom: spacing[5],
      }}
    >
      <Text style={{ fontSize: text.sm, fontWeight: '600', color: t.ink, textAlign: 'center' }}>
        Just want to see how it works?
      </Text>
      <Text
        style={{
          fontSize: text.xs,
          color: t.inkSlate,
          textAlign: 'center',
          marginTop: 2,
          marginBottom: spacing[3],
        }}
      >
        Look around with a sample account, no account needed.
      </Text>
      <View style={{ flexDirection: 'row', gap: spacing[2] }}>
        {['ELDER', 'HELPER'].map((role) => (
          <Pressable
            key={role}
            accessibilityRole="button"
            accessibilityLabel={DEMO[role].label}
            disabled={!!guestLoading}
            onPress={() => handleGuest(role)}
            style={({ pressed }) => ({
              flex: 1,
              minHeight: 56,
              backgroundColor: t.canvas,
              borderWidth: 1.5,
              borderColor: pressed ? t.blue : t.blueSoft,
              borderRadius: radius.md,
              alignItems: 'center',
              justifyContent: 'center',
              paddingVertical: spacing[3],
              opacity: guestLoading && guestLoading !== role ? 0.5 : 1,
            })}
          >
            <Text style={{ fontSize: text.sm, fontWeight: '600', color: t.blueTeal }}>
              {guestLoading === role ? 'Opening…' : DEMO[role].label}
            </Text>
            <Text style={{ fontSize: 12, color: t.ink3, marginTop: 2 }}>{DEMO[role].sub}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
