// Demo accounts — a QUIET footer affordance under the auth forms (a hairline
// "or" divider + two soft buttons), not a promo banner above them. Demo
// logins bypass the rate limiter; one tap, no signup (elder-first trial).
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
  const { t, spacing, radius, type } = useTheme();
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
    <View style={{ marginTop: spacing[6] }}>
      {/* hairline "or" divider */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ flex: 1, height: 1, backgroundColor: t.border }} />
        <Text style={{ fontSize: type.caption, color: t.inkFaint2, letterSpacing: 1, textTransform: 'uppercase' }}>
          or
        </Text>
        <View style={{ flex: 1, height: 1, backgroundColor: t.border }} />
      </View>

      <Text style={{ fontSize: type.meta, color: t.inkSlate, textAlign: 'center', marginTop: spacing[4], marginBottom: spacing[3] }}>
        Just want to see how it works? Look around with a sample account.
      </Text>

      <View style={{ flexDirection: 'row', gap: spacing[2] }}>
        {['ELDER', 'HELPER'].map((role) => (
          <Pressable
            key={role}
            accessibilityRole="button"
            accessibilityLabel={DEMO[role].label}
            accessibilityState={{ disabled: !!guestLoading, busy: guestLoading === role }}
            disabled={!!guestLoading}
            onPress={() => handleGuest(role)}
            style={({ pressed }) => ({
              flex: 1,
              minHeight: 54,
              backgroundColor: t.canvas,
              borderWidth: 1,
              borderColor: t.border,
              borderRadius: radius.input,
              alignItems: 'center',
              justifyContent: 'center',
              paddingVertical: spacing[2],
              opacity: pressed || (guestLoading && guestLoading !== role) ? 0.6 : 1,
            })}
          >
            <Text style={{ fontSize: type.body, fontWeight: '600', color: t.blueDeep }}>
              {guestLoading === role ? 'Opening…' : DEMO[role].label}
            </Text>
            <Text style={{ fontSize: type.caption, color: t.inkSlate, marginTop: 1 }}>{DEMO[role].sub}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
