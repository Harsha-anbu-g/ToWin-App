// Change password — port of ChangePassword.jsx (POST /auth/change-password).
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';
import api from '../src/api/client';
import Button from '../src/components/ui/Button';
import Card from '../src/components/ui/Card';
import Input from '../src/components/ui/Input';
import Screen from '../src/components/ui/Screen';
import { useToast } from '../src/context/ToastContext';
import { useTheme } from '../src/theme/ThemeContext';

export default function ChangePassword() {
  const { t, spacing, text, fontFamily } = useTheme();
  const { showToast } = useToast();
  const router = useRouter();

  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setError('');
    if (next.length < 8) {
      setError('New password must be at least 8 characters');
      return;
    }
    if (next !== confirm) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      await api.post('/auth/change-password', { currentPassword: current, newPassword: next });
      showToast('Password updated.', 'success');
      router.back();
    } catch (err) {
      setError(err?.response?.data?.message || 'Could not change the password. Check your current one.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen title="Change password" keyboard scroll={false} contentStyle={{ justifyContent: 'center' }}>
      <Card>
        <Text style={{ fontFamily: fontFamily.display, fontSize: text.lg, color: t.ink, marginBottom: spacing[4] }}>
          Choose a new password
        </Text>
        <Input
          label="Current password"
          value={current}
          onChangeText={(v) => {
            setCurrent(v);
            setError('');
          }}
          secureTextEntry
          textContentType="password"
          style={{ marginBottom: spacing[4] }}
        />
        <Input
          label="New password (at least 8 characters)"
          value={next}
          onChangeText={(v) => {
            setNext(v);
            setError('');
          }}
          secureTextEntry
          textContentType="newPassword"
          style={{ marginBottom: spacing[4] }}
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
      </Card>
    </Screen>
  );
}
