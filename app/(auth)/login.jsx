// Login — port of Towinly/frontend/src/pages/Login.jsx for mobile (single column):
// demo accounts first (they bypass the login rate limiter), then the form card.
// Login body field is `identifier` (username/email/phone), NOT `email`.
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { AlertCircle, Eye, EyeOff, Lock, UserRound } from '../../src/components/icons';
import api, { friendlyAuthError } from '../../src/api/client';
import Button from '../../src/components/ui/Button';
import GoogleLoginButton from '../../src/components/auth/GoogleLoginButton';
import DemoAccountsCard from '../../src/components/DemoAccountsCard';
import { showDemoAccounts } from '../../src/lib/appEnv';
import TortoiseMark from '../../src/components/TortoiseMark';
import Input from '../../src/components/ui/Input';
import Screen from '../../src/components/ui/Screen';
import TextLink from '../../src/components/ui/TextLink';
import { useAuth } from '../../src/context/AuthContext';
import { SIGN_IN_DEVICE_ERROR } from '../../src/lib/copy';
import { useTheme } from '../../src/theme/ThemeContext';
import { spacing } from '../../src/theme/tokens';

// Hoisted so memo'd Inputs get the same style object every render
const FIELD_GAP = { marginBottom: spacing[5] };

export default function Login() {
  const { t, radius, type, fontFamily } = useTheme();
  const { login, sessionExpired } = useAuth();
  const router = useRouter();

  const [form, setForm] = useState({ identifier: '', password: '' });
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);

  // Stable per-field handlers + memo'd eye slot (the action.jsx pattern):
  // Input is memo'd (floating-label Paper fields), so a keystroke in one
  // field must not hand every sibling fresh props — the source of typing
  // lag on slow phones.
  const setIdentifier = useCallback((v) => {
    setForm((f) => ({ ...f, identifier: v }));
    setFieldErrors((f) => ({ ...f, identifier: '' }));
  }, []);
  const setPassword = useCallback((v) => {
    setForm((f) => ({ ...f, password: v }));
    setFieldErrors((f) => ({ ...f, password: '' }));
  }, []);
  const togglePwd = useCallback(() => setShowPwd((v) => !v), []);

  // Return-key path (UX-708): Next on the identifier lands in the password,
  // Go on the password submits. The handlers must be stable (memo'd Inputs),
  // but handleSubmit reads fresh form state every render, so the keyboard
  // submit goes through a latest-ref instead of a new closure per keystroke.
  const passwordRef = useRef(null);
  const focusPassword = useCallback(() => passwordRef.current?.focus(), []);
  const submitRef = useRef(null);
  const submitFromKeyboard = useCallback(() => submitRef.current?.(), []);
  const pwdEye = useMemo(
    () => (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={showPwd ? 'Hide password' : 'Show password'}
        onPress={togglePwd}
        hitSlop={8}
        style={({ pressed }) => ({
          minWidth: 44,
          minHeight: 44,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: pressed ? 0.7 : 1,
        })}
      >
        {showPwd ? <EyeOff size={18} color={t.ink3} /> : <Eye size={18} color={t.ink3} />}
      </Pressable>
    ),
    [showPwd, togglePwd, t.ink3]
  );

  const finishLogin = async (token) => {
    // login() returns false when this device rejects the token (malformed, or
    // already expired against a clock set far ahead). Navigating anyway sent
    // the person back to this same screen with nothing said at all.
    if (!(await login(token))) {
      setError(SIGN_IN_DEVICE_ERROR);
      return;
    }
    router.replace('/'); // index routes by role/verification state
  };

  const handleSubmit = async () => {
    setError('');
    const errs = {};
    if (!form.identifier.trim()) errs.identifier = 'Enter your username, Gmail, or phone number';
    // 8, matching the register rule — a 6-char floor here described a password
    // that cannot exist on any account (rulebook pass).
    if (form.password.length < 8) errs.password = 'Password must be at least 8 characters';
    setFieldErrors(errs);
    if (Object.keys(errs).length) return;
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', form);
      await finishLogin(data.token);
    } catch (err) {
      // Only a real 400 or 401 says the password is wrong. An offline phone,
      // the 15 second timeout and a 5xx each get their own sentence, because
      // the old single branch told an elder on weak wifi to change a password
      // that was never checked.
      setError(friendlyAuthError(err, 'Invalid username or password.'));
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    submitRef.current = handleSubmit;
  });

  return (
    // Wider side margin than the app default (user call 2026-07-26: the fields
    // ran edge to edge and the page read as one solid block). The type on this
    // screen is large, so it needs a larger gutter to breathe.
    <Screen keyboard contentStyle={{ paddingHorizontal: spacing[6], paddingTop: spacing[2] }}>
      {/* App-shaped opening: quiet brand lockup with breathing room */}
      <View style={{ alignItems: 'center', marginTop: spacing[8], marginBottom: spacing[8] }}>
        <TortoiseMark size={52} />
        <Text style={{ fontSize: 22, fontWeight: '600', color: t.greenDeep, letterSpacing: -0.5, marginTop: spacing[2] }}>
          Towinly
        </Text>
      </View>

      {/* 3p: the form sits flat on the white page — no card chrome */}
      <View>
        <Text
          accessibilityRole="header"
          style={{ fontFamily: fontFamily.display, fontSize: type.title, color: t.ink, letterSpacing: -0.5 }}
        >
          Welcome back.
        </Text>
        <Text style={{ fontSize: type.body, color: t.ink3, marginTop: spacing[2], marginBottom: spacing[6] }}>
          Log in to your Towinly account.
        </Text>

        {sessionExpired ? (
          <View
            style={{
              backgroundColor: t.blueWash,
              borderWidth: 1,
              borderColor: t.blueSoft,
              borderRadius: radius.input,
              padding: spacing[3],
              marginBottom: spacing[4],
            }}
          >
            {/* blueDeep, not blueTeal — teal on the wash measured 3.47:1 (rulebook) */}
            <Text style={{ fontSize: type.body, color: t.blueDeep, lineHeight: 24 }}>
              For your safety, you were logged out after a period of inactivity. Please log in again.
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
              borderRadius: radius.input,
              padding: spacing[3],
              marginBottom: spacing[4],
            }}
          >
            {/* Icon + color, never color alone (rulebook) */}
            {/* (24pt line box − 18pt icon) / 2 — the icon sits on the first
                line's optical centre rather than its ascender. */}
            <AlertCircle size={18} color={t.redError} strokeWidth={2} style={{ marginTop: 3 }} />
            <Text style={{ flex: 1, fontSize: type.body, color: t.redError, lineHeight: 24 }}>
              {error}
            </Text>
          </View>
        ) : null}

        {/* Google first — the easiest path, especially for new users (website
            parity). Web build only; renders nothing in the store apps. */}
        <GoogleLoginButton />

        <Input
          label="Username, Gmail, or phone"
          icon={UserRound}
          value={form.identifier}
          onChangeText={setIdentifier}
          error={fieldErrors.identifier}
          autoCapitalize="none"
          autoCorrect={false}
          textContentType="username"
          autoComplete="username"
          returnKeyType="next"
          submitBehavior="submit"
          onSubmitEditing={focusPassword}
          style={FIELD_GAP}
        />

        <Input
          ref={passwordRef}
          label="Password"
          icon={Lock}
          value={form.password}
          onChangeText={setPassword}
          error={fieldErrors.password}
          secureTextEntry={!showPwd}
          textContentType="password"
          autoComplete="current-password"
          returnKeyType="go"
          onSubmitEditing={submitFromKeyboard}
          rightSlot={pwdEye}
        />

        {/* marginBottom keeps this link's target clear of the Log In button
            (rulebook: >=8pt inert space between adjacent targets). */}
        <TextLink
          label="Forgot password?"
          onPress={() => router.push('/(auth)/forgot-password')}
          style={{ alignSelf: 'flex-end', marginTop: spacing[2], marginBottom: spacing[5] }}
        />

        <Button
          title={loading ? 'Logging in…' : 'Log In'}
          variant="primary"
          onPress={handleSubmit}
          loading={loading}
          accessibilityHint="Logs in to your Towinly account"
        />

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: spacing[6],
          }}
        >
          <Text style={{ fontSize: type.body, color: t.ink3 }}>New here? </Text>
          <TextLink label="Create Account" onPress={() => router.push('/(auth)/register')} />
        </View>

        {/* Demo accounts live quietly under the form, not above it — hidden in
            store builds so the shared credentials never ship (audit). */}
        {showDemoAccounts() ? <DemoAccountsCard onError={setError} /> : null}
      </View>
    </Screen>
  );
}
