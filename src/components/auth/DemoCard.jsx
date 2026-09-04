// "Try as an Elder / Helper" demo card — ported from the web Login/Register.
// Shown first so a curious visitor never has to create an account to look
// around. Demo logins bypass the per-IP login rate limiter (backend rule).
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { logIn } from '../../api/auth';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../theme/ThemeContext';
import { yearsOld } from '../../lib/copy';

const DEMO = {
  ELDER: { identifier: 'elder', password: '12345678' },
  HELPER: { identifier: 'helper', password: '123456789' },
};

// Ages track the demo accounts' seeded birthdates (DemoDataSeeder) so the
// chips never drift from what the app itself computes.
const CHIPS = [
  { role: 'ELDER', label: 'Try as an Elder', sub: `Margaret, ${yearsOld('1953-05-14')}` },
  { role: 'HELPER', label: 'Try as a Helper', sub: `Harsha, ${yearsOld('2003-03-14')}` },
];

export default function DemoCard({ onError }) {
  const { t, spacing, radius, text } = useTheme();
  const { login } = useAuth();
  const router = useRouter();
  const [loadingRole, setLoadingRole] = useState('');

  const handleGuest = async (role) => {
    setLoadingRole(role);
    onError?.('');
    try {
      const data = await logIn(DEMO[role]);
      await login(data.token);
      router.replace('/');
    } catch (err) {
      onError?.(
        err?.response?.status === 429
          ? (err.response.data?.message || 'Too many attempts. Please try again later.')
          : 'Could not start demo session. Please try again.'
      );
    } finally {
      setLoadingRole('');
    }
  };

  return (
    <View
      style={{
        backgroundColor: t.blueWash,
        borderWidth: 1.5,
        borderColor: t.blue,
        borderRadius: 16,
        paddingHorizontal: spacing[4],
        paddingTop: spacing[4],
        paddingBottom: spacing[4],
        marginTop: spacing[3], // room for the overlapping DEMO badge
      }}
    >
      <View
        style={{
          position: 'absolute',
          top: -11,
          left: 0,
          right: 0,
          alignItems: 'center',
        }}
      >
        <Text
          style={{
            backgroundColor: t.actionFill,
            color: t.actionInk,
            fontSize: 11,
            fontWeight: '700',
            letterSpacing: 0.8,
            paddingHorizontal: spacing[3],
            paddingVertical: 3,
            borderRadius: radius.pill,
            overflow: 'hidden',
          }}
        >
          DEMO
        </Text>
      </View>

      <Text
        style={{
          fontSize: text.sm,
          fontWeight: '600',
          color: t.ink,
          textAlign: 'center',
          marginTop: spacing[1],
        }}
      >
        Just want to see how it works?
      </Text>
      <Text
        style={{
          fontSize: text.xs,
          color: t.inkSlate,
          textAlign: 'center',
          marginTop: spacing[1],
          marginBottom: spacing[3],
          lineHeight: text.xs * 1.5,
        }}
      >
        Look around with a sample account, no account needed.
      </Text>

      <View style={{ flexDirection: 'row', gap: spacing[2] }}>
        {CHIPS.map(({ role, label, sub }) => (
          <Pressable
            key={role}
            accessibilityRole="button"
            accessibilityLabel={label}
            disabled={!!loadingRole}
            onPress={() => handleGuest(role)}
            style={({ pressed }) => ({
              flex: 1,
              alignItems: 'center',
              backgroundColor: t.canvas,
              borderWidth: 1.5,
              borderColor: pressed ? t.blue : t.blueSoft,
              borderRadius: radius.md,
              paddingVertical: spacing[3],
              paddingHorizontal: spacing[2],
              opacity: loadingRole && loadingRole !== role ? 0.5 : 1,
              minHeight: 44,
            })}
          >
            <Text style={{ fontSize: text.sm, fontWeight: '600', color: t.blueTeal }}>
              {loadingRole === role ? 'Opening…' : label}
            </Text>
            <Text style={{ fontSize: 12, color: t.ink3, marginTop: 2 }}>{sub}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
