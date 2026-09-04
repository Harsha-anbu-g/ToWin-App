// Change password — port of ChangePassword.jsx (POST /auth/change-password).
// Rulebook pass 2026-07-27: show-password eyes on all three fields (the
// highest-error-rate screen in the app had none), per-field errors so the
// length message sits under the field it names, autofill hints, and a
// scrollable body so large OS text can't clip the button.
// Set-first-password port (website 2026-09): a Google-signup account has no
// password. The website reads hasPassword from GET /profile/me and, when it
// is false, shows a set-a-password flow posting to /auth/set-password with
// no current-password field. Same condition, same copy, same endpoint here.
// The read rides useQuery on ['profile-me'] so the cache AgeCard and Profile
// already filled answers instantly; a cold load shows a skeleton, never a
// blank screen, and the header stays quiet until the mode is known (HCI 1).
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { Text } from 'react-native';
import { changePassword, setPassword } from '../src/api/auth';
import { getMyProfile } from '../src/api/profile';
import Button from '../src/components/ui/Button';
import Card from '../src/components/ui/Card';
import PasswordInput from '../src/components/ui/PasswordInput';
import Screen from '../src/components/ui/Screen';
import SkeletonCard from '../src/components/ui/Skeleton';
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
  // Return-key path (UX-708): Next walks the fields, Done submits.
  const nextRef = useRef(null);
  const confirmRef = useRef(null);

  const { data: me, isError: profileFailed } = useQuery({
    queryKey: ['profile-me'],
    queryFn: getMyProfile,
  });
  // null while loading; false = Google-only account setting its first password
  // (website: hasPassword !== false, and a failed read counts as having one).
  const hasPassword = profileFailed ? true : me ? me.hasPassword !== false : null;

  const settingFirst = hasPassword === false;

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
    // The website's required attribute blocks an empty current password in
    // the browser; this guard is that same wall, so an empty currentPassword
    // never reaches the server.
    if (!settingFirst && !current) errs.current = 'Enter your current password.';
    if (next.length < 8) errs.next = 'New password must be at least 8 characters.';
    if (!errs.next && next !== confirm) errs.confirm = 'New passwords do not match.';
    setFieldErrors(errs);
    if (Object.keys(errs).length) return;
    setLoading(true);
    try {
      if (settingFirst) {
        await setPassword({ newPassword: next });
        showToast('Password set. Next time you can sign in with your username and password, or with Google.', 'success');
      } else {
        await changePassword({ currentPassword: current, newPassword: next });
        showToast('Password changed. You can use your new password next time you sign in.', 'success');
      }
      router.back();
    } catch (err) {
      const message = err?.response?.data?.message;
      setFieldErrors(
        settingFirst
          ? { next: message || 'Could not set password.' }
          : { current: message || 'Could not change the password. Check your current one.' }
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen
      back
      title={hasPassword === null ? '' : settingFirst ? 'Set a password' : 'Change password'}
      keyboard
      contentStyle={{ flexGrow: 1, justifyContent: 'center' }}
    >
      {hasPassword === null ? (
        // The one screen-blocking read gets a skeleton, like every other
        // loading card in the app — a slow connection must never mean a
        // header floating over nothing.
        <Card>
          <SkeletonCard lines={3} />
        </Card>
      ) : (
        <Card>
          <Text
            style={{
              fontFamily: fontFamily.display,
              fontSize: text.lg,
              color: t.ink,
              marginBottom: settingFirst ? spacing[2] : spacing[4],
            }}
          >
            {settingFirst ? 'Choose your first password' : 'Choose a new password'}
          </Text>
          {settingFirst && (
            <Text
              style={{
                fontSize: text.sm,
                lineHeight: text.sm * 1.5,
                color: t.ink3,
                marginBottom: spacing[4],
              }}
            >
              Choose a password so you can also sign in with your username. Signing in with
              Google will keep working.
            </Text>
          )}
          {!settingFirst && (
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
          )}
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
            title={loading ? 'Saving…' : settingFirst ? 'Set password' : 'Update password'}
            variant="primary"
            onPress={submit}
            loading={loading}
          />
        </Card>
      )}
    </Screen>
  );
}
