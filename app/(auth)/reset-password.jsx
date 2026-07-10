// Reset password — port of ToWin/frontend/src/pages/ResetPassword.jsx.
// Reached via the emailed deep link (towin://reset-password?token=…).
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text } from 'react-native';
import api from '../../src/api/client';
import Button from '../../src/components/ui/Button';
import Card from '../../src/components/ui/Card';
import Input from '../../src/components/ui/Input';
import Screen from '../../src/components/ui/Screen';
import { useTheme } from '../../src/theme/ThemeContext';

export default function ResetPassword() {
  const { t, spacing, text, fontFamily } = useTheme();
  const { token } = useLocalSearchParams();
  const router = useRouter();
  const [pw, setPw] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  const heading = { fontFamily: fontFamily.display, fontSize: text.xl, color: t.ink };
  const centerBody = { fontSize: text.base, color: t.slate, textAlign: 'center', marginTop: spacing[3], lineHeight: 26 };

  const submit = async () => {
    setError('');
    if (pw.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    if (pw !== confirm) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      await api.post('/auth/reset-password', { token, newPassword: pw });
      setDone(true);
    } catch (err) {
      setError(err?.response?.data?.message || 'This reset link is invalid or has expired.');
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
    <Screen keyboard scroll={false} contentStyle={{ justifyContent: 'center' }}>
      <Card>
        <Text accessibilityRole="header" style={heading}>
          Choose a new password
        </Text>
        <Input
          label="New password (at least 8 characters)"
          value={pw}
          onChangeText={(v) => {
            setPw(v);
            setError('');
          }}
          secureTextEntry
          textContentType="newPassword"
          style={{ marginTop: spacing[5], marginBottom: spacing[4] }}
        />
        <Input
          label="Re-enter new password"
          value={confirm}
          onChangeText={(v) => {
            setConfirm(v);
            setError('');
          }}
          secureTextEntry
          textContentType="newPassword"
          error={error}
          style={{ marginBottom: spacing[5] }}
        />
        <Button
          title={loading ? 'Saving…' : 'Update password'}
          variant="primary"
          onPress={submit}
          loading={loading}
        />
        <Pressable
          accessibilityRole="link"
          onPress={() => router.replace('/(auth)/login')}
          hitSlop={8}
          style={{ alignSelf: 'center', paddingVertical: spacing[3] }}
        >
          <Text style={{ fontSize: text.sm, color: t.blueDeep, fontWeight: '600', textDecorationLine: 'underline' }}>
            Back to log in
          </Text>
        </Pressable>
      </Card>
    </Screen>
  );
}
