// Login — port of ToWin/frontend/src/pages/Login.jsx for mobile (single column):
// demo accounts first (they bypass the login rate limiter), then the form card.
// Login body field is `identifier` (username/email/phone), NOT `email`.
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Eye, EyeOff } from 'lucide-react-native';
import api from '../../src/api/client';
import Button from '../../src/components/ui/Button';
import Card from '../../src/components/ui/Card';
import Input from '../../src/components/ui/Input';
import Screen from '../../src/components/ui/Screen';
import { useAuth } from '../../src/context/AuthContext';
import { useTheme } from '../../src/theme/ThemeContext';
import { yearsOld } from '../../src/lib/copy';

// Ages track the demo accounts' seeded birthdates (DemoDataSeeder) — same as web.
const DEMO = {
  ELDER: { identifier: 'elder', password: '12345678', label: 'Try as an Elder', sub: `Margaret, ${yearsOld('1953-05-14')}` },
  HELPER: { identifier: 'helper', password: '123456789', label: 'Try as a Helper', sub: `Harsha, ${yearsOld('2003-03-14')}` },
};

export default function Login() {
  const { t, spacing, radius, text, fontFamily } = useTheme();
  const { login, sessionExpired } = useAuth();
  const router = useRouter();

  const [form, setForm] = useState({ identifier: '', password: '' });
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [guestLoading, setGuestLoading] = useState('');
  const [showPwd, setShowPwd] = useState(false);

  const finishLogin = async (token) => {
    await login(token);
    router.replace('/'); // index routes by role/verification state
  };

  const handleGuest = async (role) => {
    setGuestLoading(role);
    setError('');
    try {
      const { identifier, password } = DEMO[role];
      const { data } = await api.post('/auth/login', { identifier, password });
      await finishLogin(data.token);
    } catch (err) {
      setError(
        err?.response?.status === 429
          ? err.response.data?.message || 'Too many attempts. Please try again later.'
          : 'Could not start demo session. Please try again.'
      );
    } finally {
      setGuestLoading('');
    }
  };

  const handleSubmit = async () => {
    setError('');
    const errs = {};
    if (!form.identifier.trim()) errs.identifier = 'Enter your username, Gmail, or phone number';
    if (form.password.length < 6) errs.password = 'Password must be at least 6 characters';
    setFieldErrors(errs);
    if (Object.keys(errs).length) return;
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', form);
      await finishLogin(data.token);
    } catch (err) {
      setError(
        err?.response?.status === 429
          ? err.response.data?.message || 'Too many attempts. Please try again later.'
          : 'Invalid username or password.'
      );
    } finally {
      setLoading(false);
    }
  };

  const sans = { fontSize: text.sm, color: t.inkSlate };

  return (
    <Screen keyboard>
      {/* Demo accounts — shown first so users don't miss it (mirrors web) */}
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
        <Text style={{ ...sans, fontWeight: '600', color: t.ink, textAlign: 'center' }}>
          Just want to see how it works?
        </Text>
        <Text style={{ fontSize: text.xs, color: t.inkSlate, textAlign: 'center', marginTop: 2, marginBottom: spacing[3] }}>
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

      <Card>
        <Text
          accessibilityRole="header"
          style={{ fontFamily: fontFamily.display, fontSize: text.xl, color: t.ink, letterSpacing: -0.5 }}
        >
          Welcome back.
        </Text>
        <Text style={{ fontSize: 16, color: t.ink3, marginTop: 4, marginBottom: spacing[5] }}>
          Log in to your ToWin account.
        </Text>

        {sessionExpired ? (
          <View
            style={{
              backgroundColor: t.blueWash,
              borderWidth: 1,
              borderColor: t.blueSoft,
              borderRadius: radius.md,
              padding: spacing[3],
              marginBottom: spacing[4],
            }}
          >
            <Text style={{ fontSize: text.sm, color: t.blueTeal, lineHeight: 20 }}>
              For your safety, you were logged out after a period of inactivity. Please log in again.
            </Text>
          </View>
        ) : null}

        {error ? (
          <View
            accessibilityRole="alert"
            style={{
              backgroundColor: t.redTint,
              borderWidth: 1,
              borderColor: t.redLine,
              borderRadius: radius.md,
              padding: spacing[3],
              marginBottom: spacing[4],
            }}
          >
            <Text style={{ fontSize: text.sm, color: t.redError }}>{error}</Text>
          </View>
        ) : null}

        <Input
          label="Username, Gmail, or phone"
          value={form.identifier}
          onChangeText={(v) => {
            setForm((f) => ({ ...f, identifier: v }));
            setFieldErrors((f) => ({ ...f, identifier: '' }));
          }}
          error={fieldErrors.identifier}
          autoCapitalize="none"
          autoCorrect={false}
          textContentType="username"
          style={{ marginBottom: spacing[4] }}
        />

        <Input
          label="Password"
          value={form.password}
          onChangeText={(v) => {
            setForm((f) => ({ ...f, password: v }));
            setFieldErrors((f) => ({ ...f, password: '' }));
          }}
          error={fieldErrors.password}
          secureTextEntry={!showPwd}
          textContentType="password"
          rightSlot={
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={showPwd ? 'Hide password' : 'Show password'}
              onPress={() => setShowPwd((v) => !v)}
              hitSlop={8}
              style={{ minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}
            >
              {showPwd ? <EyeOff size={18} color={t.ink3} /> : <Eye size={18} color={t.ink3} />}
            </Pressable>
          }
        />

        <Pressable
          accessibilityRole="link"
          onPress={() => router.push('/(auth)/forgot-password')}
          hitSlop={8}
          style={{ alignSelf: 'flex-end', paddingVertical: spacing[3] }}
        >
          <Text style={{ fontSize: text.sm, color: t.blueDeep }}>Forgot password?</Text>
        </Pressable>

        <Button
          title={loading ? 'Logging in…' : 'Log In'}
          variant="primary"
          onPress={handleSubmit}
          loading={loading}
          accessibilityHint="Logs in to your ToWin account"
        />

        <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: spacing[5] }}>
          <Text style={{ fontSize: 14, color: t.ink3 }}>New here? </Text>
          <Pressable accessibilityRole="link" onPress={() => router.push('/(auth)/register')} hitSlop={8}>
            <Text style={{ fontSize: 14, color: t.blueDeep, fontWeight: '600' }}>Create Account</Text>
          </Pressable>
        </View>
      </Card>
    </Screen>
  );
}
