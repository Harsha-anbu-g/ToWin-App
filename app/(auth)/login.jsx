// Login — port of ToWin/frontend/src/pages/Login.jsx for mobile (single column):
// demo accounts first (they bypass the login rate limiter), then the form card.
// Login body field is `identifier` (username/email/phone), NOT `email`.
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Eye, EyeOff } from 'lucide-react-native';
import api from '../../src/api/client';
import Button from '../../src/components/ui/Button';
import DemoAccountsCard from '../../src/components/DemoAccountsCard';
import { showDemoAccounts } from '../../src/lib/appEnv';
import TortoiseMark from '../../src/components/TortoiseMark';
import Input from '../../src/components/ui/Input';
import Screen from '../../src/components/ui/Screen';
import { useAuth } from '../../src/context/AuthContext';
import { useTheme } from '../../src/theme/ThemeContext';

export default function Login() {
  const { t, spacing, radius, text, fontFamily } = useTheme();
  const { login, sessionExpired } = useAuth();
  const router = useRouter();

  const [form, setForm] = useState({ identifier: '', password: '' });
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);

  const finishLogin = async (token) => {
    await login(token);
    router.replace('/'); // index routes by role/verification state
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

  return (
    <Screen keyboard>
      {/* App-shaped opening: quiet brand lockup with breathing room */}
      <View style={{ alignItems: 'center', marginTop: spacing[8], marginBottom: spacing[6] }}>
        <TortoiseMark size={52} />
        <Text style={{ fontSize: 22, fontWeight: '600', color: t.greenDeep, letterSpacing: -0.5, marginTop: spacing[2] }}>
          ToWin
        </Text>
      </View>

      {/* 3p: the form sits flat on the white page — no card chrome */}
      <View>
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

        {/* Demo accounts live quietly under the form, not above it — hidden in
            store builds so the shared credentials never ship (audit). */}
        {showDemoAccounts() ? <DemoAccountsCard onError={setError} /> : null}
      </View>
    </Screen>
  );
}
