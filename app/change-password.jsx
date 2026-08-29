// Change password — port of ChangePassword.jsx (POST /auth/change-password).
// Rulebook pass 2026-07-27: show-password eyes on all three fields (the
// highest-error-rate screen in the app had none), per-field errors so the
// length message sits under the field it names, autofill hints, and a
// scrollable body so large OS text can't clip the button.
import { useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { Text } from 'react-native';
import api from '../src/api/client';
import Button from '../src/components/ui/Button';
import Card from '../src/components/ui/Card';
import PasswordInput from '../src/components/ui/PasswordInput';
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
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(false);
  // Return-key path (UX-708): Next walks the three fields, Done submits.
  const nextRef = useRef(null);
  const confirmRef = useRef(null);

  // DEEP-38: Input is memo'd so sibling Paper fields can skip re-renders while
  // someone types; that only holds if each field keeps one handler identity.
  // Setters are stable, so [] deps. Clearing the field's own error on every
  // keystroke is the behaviour the old inline closures already had.
  const onCurrent = useCallback((v) => {
    setCurrent(v);
    setFieldErrors((f) => ({ ...f, current: '' }));
  }, []);
  const onNext = useCallback((v) => {
    setNext(v);
    setFieldErrors((f) => ({ ...f, next: '' }));
  }, []);
  const onConfirm = useCallback((v) => {
    setConfirm(v);
    setFieldErrors((f) => ({ ...f, confirm: '' }));
  }, []);

  const submit = async () => {
    const errs = {};
    if (next.length < 8) errs.next = 'New password must be at least 8 characters';
    if (!errs.next && next !== confirm) errs.confirm = 'Passwords do not match';
    setFieldErrors(errs);
    if (Object.keys(errs).length) return;
    setLoading(true);
    try {
      await api.post('/auth/change-password', { currentPassword: current, newPassword: next });
      showToast('Password updated.', 'success');
      router.back();
    } catch (err) {
      setFieldErrors({
        current:
          err?.response?.data?.message || 'Could not change the password. Check your current one.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen back title="Change password" keyboard contentStyle={{ flexGrow: 1, justifyContent: 'center' }}>
      <Card>
        <Text style={{ fontFamily: fontFamily.display, fontSize: text.lg, color: t.ink, marginBottom: spacing[4] }}>
          Choose a new password
        </Text>
        <PasswordInput
          label="Current password"
          value={current}
          onChangeText={onCurrent}
          error={fieldErrors.current}
          textContentType="password"
          autoComplete="current-password"
          returnKeyType="next"
          submitBehavior="submit"
          onSubmitEditing={() => nextRef.current?.focus()}
          style={{ marginBottom: spacing[4] }}
        />
        <PasswordInput
          ref={nextRef}
          label="New password (at least 8 characters)"
          value={next}
          onChangeText={onNext}
          error={fieldErrors.next}
          textContentType="newPassword"
          autoComplete="new-password"
          returnKeyType="next"
          submitBehavior="submit"
          onSubmitEditing={() => confirmRef.current?.focus()}
          style={{ marginBottom: spacing[4] }}
        />
        <PasswordInput
          ref={confirmRef}
          label="Re-enter new password"
          value={confirm}
          onChangeText={onConfirm}
          error={fieldErrors.confirm}
          textContentType="newPassword"
          autoComplete="new-password"
          returnKeyType="done"
          onSubmitEditing={() => {
            if (!loading) submit();
          }}
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
