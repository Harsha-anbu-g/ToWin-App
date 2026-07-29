// Finish setup — port of Towinly/frontend/src/pages/FinishSetup.jsx. Completes a
// Google sign-in (role + username + phone → POST /auth/oauth/complete). Google
// OAuth itself is deferred to the release phase, so this screen is only
// reachable once that lands — the no-token guard mirrors web behavior.
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { AlertCircle } from 'lucide-react-native';
import api from '../../src/api/client';
import Button from '../../src/components/ui/Button';
import Card from '../../src/components/ui/Card';
import Input from '../../src/components/ui/Input';
import Screen from '../../src/components/ui/Screen';
import TextLink from '../../src/components/ui/TextLink';
import { useAuth } from '../../src/context/AuthContext';
import { sanitizeUsername, USERNAME_RE } from '../../src/lib/password';
import { useTheme } from '../../src/theme/ThemeContext';

const ROLES = [
  { value: 'ELDER', label: 'Elder', desc: 'Looking for friends or help' },
  { value: 'HELPER', label: 'Helper', desc: 'Want to help others' },
];

export default function FinishSetup() {
  const { t, spacing, radius, text, fontFamily } = useTheme();
  const { login } = useAuth();
  const router = useRouter();
  const { onboardingToken, email: googleEmail, name: googleName } = useLocalSearchParams();

  // No preselected identity (rulebook: nothing optional is preselected).
  const [role, setRole] = useState('');
  const [username, setUsername] = useState('');
  const [phone, setPhone] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Guard: only reachable right after signing in with Google (mirrors web)
  if (!onboardingToken) {
    return (
      <Screen scroll={false} contentStyle={{ justifyContent: 'center' }}>
        <Card>
          <Text style={{ fontSize: text.base, color: t.inkSlate, textAlign: 'center', lineHeight: 26 }}>
            This page is only accessible after signing in with Google.
          </Text>
          <Button
            title="Go to log in"
            variant="primary"
            onPress={() => router.replace('/(auth)/login')}
            style={{ marginTop: spacing[5] }}
          />
        </Card>
      </Screen>
    );
  }

  const handleSubmit = async () => {
    setError('');
    const errs = {};
    if (!USERNAME_RE.test(username))
      errs.username = 'Username must be 3-20 characters: lowercase letters, numbers, underscores only';
    const digits = String(phone).replace(/[\s()-]/g, '');
    if (!/^\+?[0-9]{10,15}$/.test(digits)) errs.phone = 'Enter a valid phone number (10 to 15 digits)';
    setFieldErrors(errs);
    if (Object.keys(errs).length) return;
    setLoading(true);
    try {
      const { data } = await api.post('/auth/oauth/complete', {
        onboardingToken,
        role,
        phone: digits,
        username,
      });
      await login(data.token);
      router.replace('/');
    } catch (err) {
      setError(err?.response?.data?.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen keyboard>
      <Card>
        <Text
          accessibilityRole="header"
          style={{ fontFamily: fontFamily.display, fontSize: text.xl, color: t.ink, textAlign: 'center' }}
        >
          One last step
        </Text>
        <Text style={{ fontSize: 16, color: t.ink3, textAlign: 'center', marginTop: spacing[2], marginBottom: spacing[5], lineHeight: 24 }}>
          {googleName ? `Welcome, ${String(googleName).split(' ')[0]}! ` : ''}
          Tell us a little more to finish creating your account.
        </Text>

        {googleEmail ? (
          <View
            style={{
              backgroundColor: t.blueWash,
              borderWidth: 1,
              borderColor: t.blueSoft,
              borderRadius: radius.md,
              padding: spacing[3],
              marginBottom: spacing[5],
            }}
          >
            {/* blueDeep, not teal — teal on the wash measured 3.47:1 (rulebook) */}
            <Text style={{ fontSize: 14, color: t.blueDeep, textAlign: 'center' }}>
              Signing in as <Text style={{ fontWeight: '700' }}>{googleEmail}</Text>
            </Text>
          </View>
        ) : null}

        {error ? (
          <View
            accessible
            accessibilityRole="alert"
            style={{
              flexDirection: 'row',
              alignItems: 'flex-start',
              gap: spacing[2],
              backgroundColor: t.redTint,
              borderWidth: 1,
              borderColor: t.redLine,
              borderRadius: radius.md,
              padding: spacing[3],
              marginBottom: spacing[4],
            }}
          >
            <AlertCircle size={18} color={t.redError} strokeWidth={2} style={{ marginTop: 1 }} />
            <Text style={{ flex: 1, fontSize: text.sm, color: t.redError, lineHeight: 21 }}>
              {error}
            </Text>
          </View>
        ) : null}

        <Text style={{ fontSize: 14, fontWeight: '600', color: t.ink, marginBottom: spacing[3] }}>
          I am joining as
        </Text>
        <View style={{ flexDirection: 'row', gap: spacing[2], marginBottom: spacing[5] }}>
          {ROLES.map(({ value, label, desc }) => {
            const active = role === value;
            return (
              <Pressable
                key={value}
                accessibilityRole="radio"
                accessibilityState={{ selected: active }}
                accessibilityLabel={`${label}. ${desc}`}
                onPress={() => setRole(value)}
                style={({ pressed }) => ({
                  flex: 1,
                  minHeight: 64,
                  padding: spacing[3],
                  borderRadius: radius.md,
                  borderWidth: active ? 2 : 1.5,
                  borderColor: active ? t.blue : t.border,
                  backgroundColor: active ? t.blueWash : t.canvas,
                  opacity: pressed ? 0.8 : 1,
                })}
              >
                <Text style={{ fontSize: text.sm, fontWeight: '600', color: active ? t.blueDeep : t.ink }}>
                  {label}
                </Text>
                <Text style={{ fontSize: text.xs, color: active ? t.blueDeep : t.inkSlate, marginTop: 4, lineHeight: 18 }}>
                  {desc}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Input
          label="Username"
          value={username}
          onChangeText={(v) => {
            setUsername(sanitizeUsername(v));
            setFieldErrors((f) => ({ ...f, username: '' }));
          }}
          error={fieldErrors.username}
          helper="3-20 characters. Visible to others on your profile."
          placeholder="your_username"
          autoCapitalize="none"
          autoCorrect={false}
          textContentType="username"
          autoComplete="username-new"
          style={{ marginBottom: spacing[4] }}
        />

        <Input
          label="Phone number"
          value={phone}
          onChangeText={(v) => {
            setPhone(v);
            setFieldErrors((f) => ({ ...f, phone: '' }));
          }}
          error={fieldErrors.phone}
          helper="Only shared after both people reach the Phone Ready trust stage."
          placeholder="+1 416 555 0123"
          keyboardType="phone-pad"
          textContentType="telephoneNumber"
          autoComplete="tel"
          style={{ marginBottom: spacing[5] }}
        />

        {!role ? (
          <Text style={{ fontSize: text.sm, color: t.inkSlate, lineHeight: 21, marginBottom: spacing[3] }}>
            Choose who you are joining as above.
          </Text>
        ) : null}
        <Button
          title={loading ? 'Signing in…' : 'Sign In'}
          variant="primary"
          onPress={handleSubmit}
          loading={loading}
          disabled={!role}
          accessibilityHint={role ? undefined : 'Choose a role first'}
        />
        {/* The escape hatch (rulebook: every multi-step flow has a Cancel) —
            a person on the wrong Google account was trapped here before. */}
        <TextLink
          label="Cancel — use a different account"
          onPress={() => router.replace('/(auth)/login')}
          muted
          style={{ marginTop: spacing[2] }}
        />
      </Card>
    </Screen>
  );
}
