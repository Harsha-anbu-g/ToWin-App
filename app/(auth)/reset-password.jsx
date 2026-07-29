// Reset password — port of Towinly/frontend/src/pages/ResetPassword.jsx.
// Reached via the emailed deep link (towin://reset-password?token=…).
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Text } from 'react-native';
import api from '../../src/api/client';
import Button from '../../src/components/ui/Button';
import Card from '../../src/components/ui/Card';
import PasswordInput from '../../src/components/ui/PasswordInput';
import Screen from '../../src/components/ui/Screen';
import TextLink from '../../src/components/ui/TextLink';
import { useTheme } from '../../src/theme/ThemeContext';

export default function ResetPassword() {
  const { t, spacing, text, fontFamily } = useTheme();
  const { token } = useLocalSearchParams();
  const router = useRouter();
  const [pw, setPw] = useState('');
  const [confirm, setConfirm] = useState('');
  // Per-field errors — the length error must sit under the field it names,
  // not under the confirm field (rulebook pass 2026-07-27).
  const [fieldErrors, setFieldErrors] = useState({});
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  const heading = { fontFamily: fontFamily.display, fontSize: text.xl, color: t.ink };
  const centerBody = { fontSize: text.base, color: t.slate, textAlign: 'center', marginTop: spacing[3], lineHeight: 26 };

  const submit = async () => {
    const errs = {};
    if (pw.length < 8) errs.pw = 'Password must be at least 8 characters';
    if (!errs.pw && pw !== confirm) errs.confirm = 'Passwords do not match';
    setFieldErrors(errs);
    if (Object.keys(errs).length) return;
    setLoading(true);
    try {
      await api.post('/auth/reset-password', { token, newPassword: pw });
      setDone(true);
    } catch (err) {
      setFieldErrors({
        confirm: err?.response?.data?.message || 'This reset link is invalid or has expired.',
      });
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <Screen scroll={false} contentStyle={{ justifyContent: 'center' }}>
        <Card>
          <Text accessibilityRole="header" style={{ ...heading, textAlign: 'center' }}>
            Invalid link
          </Text>
          <Text style={centerBody}>This reset link is missing its token.</Text>
          <Button
            title="Request a new link"
            variant="primary"
            onPress={() => router.replace('/(auth)/forgot-password')}
            style={{ marginTop: spacing[6] }}
          />
        </Card>
      </Screen>
    );
  }

  if (done) {
    return (
      <Screen scroll={false} contentStyle={{ justifyContent: 'center' }}>
        <Card>
          <Text accessibilityRole="header" style={{ ...heading, textAlign: 'center' }}>
            Password updated
          </Text>
          <Text style={centerBody}>You can now log in with your new password.</Text>
          <Button
            title="Go to log in"
            variant="primary"
            onPress={() => router.replace('/(auth)/login')}
            style={{ marginTop: spacing[6] }}
          />
        </Card>
      </Screen>
    );
  }

  return (
    // Scrollable + centered via flexGrow — scroll={false} clipped the button
    // at large OS text sizes (rulebook pass).
    <Screen keyboard contentStyle={{ flexGrow: 1, justifyContent: 'center' }}>
      <Card>
        <Text accessibilityRole="header" style={heading}>
          Choose a new password
        </Text>
        <PasswordInput
          label="New password (at least 8 characters)"
          value={pw}
          onChangeText={(v) => {
            setPw(v);
            setFieldErrors((f) => ({ ...f, pw: '' }));
          }}
          error={fieldErrors.pw}
          textContentType="newPassword"
          autoComplete="new-password"
          style={{ marginTop: spacing[5], marginBottom: spacing[4] }}
        />
        <PasswordInput
          label="Re-enter new password"
          value={confirm}
          onChangeText={(v) => {
            setConfirm(v);
            setFieldErrors((f) => ({ ...f, confirm: '' }));
          }}
          error={fieldErrors.confirm}
          textContentType="newPassword"
          autoComplete="new-password"
          style={{ marginBottom: spacing[5] }}
        />
        <Button
          title={loading ? 'Saving…' : 'Update password'}
          variant="primary"
          onPress={submit}
          loading={loading}
        />
        <TextLink
          label="Back to log in"
          onPress={() => router.replace('/(auth)/login')}
          style={{ marginTop: spacing[2] }}
        />
      </Card>
    </Screen>
  );
}
