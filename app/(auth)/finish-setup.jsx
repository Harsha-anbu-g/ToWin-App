// Finish setup — port of Towinly/frontend/src/pages/FinishSetup.jsx. Completes a
// Google sign-in (role + username + phone → POST /auth/oauth/complete). Google
// OAuth itself is deferred to the release phase, so this screen is only
// reachable once that lands — the no-token guard mirrors web behavior.
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { AlertCircle } from '../../src/components/icons';
import api from '../../src/api/client';
import Button from '../../src/components/ui/Button';
import Card from '../../src/components/ui/Card';
import Input from '../../src/components/ui/Input';
import Screen from '../../src/components/ui/Screen';
import TextLink from '../../src/components/ui/TextLink';
import { useAuth } from '../../src/context/AuthContext';
import { SIGN_IN_DEVICE_ERROR } from '../../src/lib/copy';
import { sanitizeUsername, USERNAME_RE } from '../../src/lib/password';
import { clearPendingOnboarding, getPendingOnboarding } from '../../src/lib/pendingOnboarding';
import { FULL_STAGES, PHONE_STAGE } from '../../src/lib/trustStages';
import { useTheme } from '../../src/theme/ThemeContext';

// Heading and group label read from one string, so they cannot drift apart.
const ROLE_PROMPT = 'I am joining as';

const ROLES = [
  { value: 'ELDER', label: 'Elder', desc: 'Looking for friends or help' },
  { value: 'HELPER', label: 'Helper', desc: 'Want to help others' },
];

export default function FinishSetup() {
  const { t, spacing, radius, text, type, fontFamily } = useTheme();
  const { login } = useAuth();
  const router = useRouter();
  // From the in-memory handoff oauth-callback wrote, never from the URL. This
  // screen used to read all three off the URL params behind a bare
  // presence check, so a crafted towinly:// link chose the name and email it
  // showed and the token it posted. Latched once with a lazy initialiser so
  // clearing the record on success cannot blank the screen mid-navigation.
  const [pendingFlow] = useState(getPendingOnboarding);
  const onboardingToken = pendingFlow?.onboardingToken;
  const googleEmail = pendingFlow?.email;
  const googleName = pendingFlow?.name;

  // No preselected identity (rulebook: nothing optional is preselected).
  const [role, setRole] = useState('');
  const [username, setUsername] = useState('');
  const [phone, setPhone] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  // Return-key path (UX-708): Next on the username lands in the phone field.
  const phoneRef = useRef(null);

  // Guard: reachable only right after THIS app completed a Google exchange.
  // With no pending flow, every unsolicited deep link lands here (mirrors web,
  // and mirrors the refusal oauth-callback.jsx already gives).
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
      // login() returns false when this device rejects the token (malformed, or
      // already expired against a clock set far ahead). Navigating anyway left
      // the person back at Login with the whole form done and nothing said.
      // Same handling as login.jsx.
      if (!(await login(data.token))) {
        setError(SIGN_IN_DEVICE_ERROR);
        return;
      }
      // Spent. A failure above deliberately leaves it, so the person can fix
      // the clock and press the button again without signing in with Google
      // all over.
      clearPendingOnboarding();
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
        <Text style={{ fontSize: type.body, color: t.ink3, textAlign: 'center', marginTop: spacing[2], marginBottom: spacing[5], lineHeight: 24 }}>
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
            <Text style={{ fontSize: type.body, color: t.blueDeep, textAlign: 'center' }}>
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

        {/* Same size and weight as register's prompt: the twins ask one
            question and had drifted to two different sizes. */}
        <Text style={{ fontSize: type.body, fontWeight: '700', color: t.ink, marginBottom: spacing[3] }}>
          {ROLE_PROMPT}
        </Text>
        {/* The two cards were loose Pressables with no group around them, so a
            screen reader read two radios belonging to nothing. */}
        <View
          accessibilityRole="radiogroup"
          accessibilityLabel={ROLE_PROMPT}
          style={{ flexDirection: 'row', gap: spacing[2], marginBottom: spacing[5] }}
        >
          {ROLES.map(({ value, label, desc }) => {
            const active = role === value;
            return (
              <Pressable
                key={value}
                accessibilityRole="radio"
                // aria-checked, not accessibilityState: see register.jsx.
                aria-checked={active}
                accessibilityLabel={`${label}. ${desc}`}
                onPress={() => setRole(value)}
                style={({ pressed }) => ({
                  flex: 1,
                  minHeight: 64,
                  padding: spacing[3],
                  // Same shape and border language as register.jsx's picker:
                  // this twin had drifted to radius.md and t.border, which
                  // measures ~1.3:1 on white and misses the 3:1 floor that
                  // fieldLine exists to hold (audit 2026-08-19).
                  borderRadius: radius.input,
                  borderWidth: active ? 2 : 1,
                  borderColor: active ? t.blue : t.fieldLine,
                  backgroundColor: active ? t.blueWash : t.canvas,
                  opacity: pressed ? 0.8 : 1,
                })}
              >
                <Text style={{ fontSize: type.body, fontWeight: '600', color: active ? t.blueDeep : t.ink }}>
                  {label}
                </Text>
                {/* Body size, not meta (register.jsx): this copy is read rather
                    than scanned, and misreading it signs the person up as the
                    wrong person. */}
                <Text style={{ fontSize: type.body, color: active ? t.blueDeep : t.inkSlate, marginTop: spacing[1], lineHeight: 24 }}>
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
          returnKeyType="next"
          submitBehavior="submit"
          onSubmitEditing={() => phoneRef.current?.focus()}
          style={{ marginBottom: spacing[4] }}
        />

        <Input
          ref={phoneRef}
          label="Phone number"
          value={phone}
          onChangeText={(v) => {
            setPhone(v);
            setFieldErrors((f) => ({ ...f, phone: '' }));
          }}
          error={fieldErrors.phone}
          helper={`Only shared after both people reach the ${FULL_STAGES[PHONE_STAGE]} trust stage.`}
          placeholder="+1 416 555 0123"
          keyboardType="phone-pad"
          textContentType="telephoneNumber"
          autoComplete="tel"
          returnKeyType="done"
          onSubmitEditing={() => {
            // Mirrors the Sign In button's role gate; the keyboard is not a
            // way around choosing who you are joining as.
            if (role && !loading) handleSubmit();
          }}
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
          label="Cancel and use a different account"
          onPress={() => {
            // Walking away spends nothing, so the record must not sit in memory
            // for the rest of the session waiting to be reused.
            clearPendingOnboarding();
            router.replace('/(auth)/login');
          }}
          muted
          style={{ marginTop: spacing[2] }}
        />
      </Card>
    </Screen>
  );
}
