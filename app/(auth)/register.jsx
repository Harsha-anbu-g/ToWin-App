// Register — port of Towinly/frontend/src/pages/Register.jsx for mobile:
// role choice first, sanitized username, strength meter, terms gate.
// NOTE: no account exists until the emailed link is opened — success routes
// to check-email, never logs in (mirrors web).
import { useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { AlertCircle, Check, Eye, EyeOff } from 'lucide-react-native';
import api from '../../src/api/client';
import Button from '../../src/components/ui/Button';
import DemoAccountsCard from '../../src/components/DemoAccountsCard';
import GoogleLoginButton from '../../src/components/auth/GoogleLoginButton';
import { showDemoAccounts } from '../../src/lib/appEnv';
import Input from '../../src/components/ui/Input';
import LegalModal from '../../src/components/LegalModal';
import Screen from '../../src/components/ui/Screen';
import TextLink from '../../src/components/ui/TextLink';
import { PRIVACY_CONTENT, TERMS_CONTENT } from '../../src/data/legalContent';
import { MATCH_GREEN, STRENGTH_FAIR, STRENGTH_WEAK } from '../../src/theme/parity';
import { EMAIL_RE, pwdStrength, sanitizeUsername, USERNAME_RE } from '../../src/lib/password';
import { useTheme } from '../../src/theme/ThemeContext';
import { spacing } from '../../src/theme/tokens';

const ROLES = [
  { value: 'ELDER', label: 'Elder', desc: 'Looking for friends or help' },
  { value: 'HELPER', label: 'Helper', desc: 'Want to help others' },
  // FAM-406 (2026-07-19): FAMILY is a public signup role (web parity). The
  // sentence-length label can't share a column, so this card spans the full
  // row below the two short ones. Google finish-setup stays ELDER/HELPER —
  // the backend rejects FAMILY on the OAuth path.
  {
    value: 'FAMILY',
    label: "I'm here for a family member",
    desc: "You'll link to your parent inside the app after you sign up.",
    fullWidth: true,
  },
];

const STRENGTH_LABELS = ['', 'Weak', 'Fair', 'Good', 'Strong'];

// Hoisted so memo'd Inputs get the same style object every render
const FIELD_GAP = { marginBottom: spacing[4] };
const FIELD_GAP_TOP = { marginTop: spacing[4] };

function EyeToggle({ shown, onToggle, color }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={shown ? 'Hide password' : 'Show password'}
      onPress={onToggle}
      hitSlop={8}
      style={{ minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}
    >
      {shown ? <EyeOff size={18} color={color} /> : <Eye size={18} color={color} />}
    </Pressable>
  );
}

export default function Register() {
  const { t, radius, text, type, fontFamily } = useTheme();
  const router = useRouter();

  const [form, setForm] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    // No preselected identity (rulebook: nothing optional is preselected) —
    // "who are you joining as?" is a real question, so it starts unanswered.
    role: '',
  });
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [legalOpen, setLegalOpen] = useState(null); // 'terms' | 'privacy' | null
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const setField = (key, value) => {
    setForm((f) => ({ ...f, [key]: value }));
    setFieldErrors((f) => ({ ...f, [key]: '' }));
  };

  // Stable per-field handlers + memo'd eye slots (the action.jsx pattern):
  // Input is memo'd (floating-label Paper fields), so a keystroke in one field
  // must not hand every sibling fresh props — the source of typing lag on
  // slow phones.
  const setUsername = useCallback((v) => {
    setForm((f) => ({ ...f, username: sanitizeUsername(v) }));
    setFieldErrors((f) => ({ ...f, username: '' }));
  }, []);
  const setEmail = useCallback((v) => {
    setForm((f) => ({ ...f, email: v }));
    setFieldErrors((f) => ({ ...f, email: '' }));
  }, []);
  const setPassword = useCallback((v) => {
    setForm((f) => ({ ...f, password: v }));
    setFieldErrors((f) => ({ ...f, password: '' }));
  }, []);
  const setConfirmPassword = useCallback((v) => {
    setForm((f) => ({ ...f, confirmPassword: v }));
    setFieldErrors((f) => ({ ...f, confirmPassword: '' }));
  }, []);
  const togglePwd = useCallback(() => setShowPwd((v) => !v), []);
  const toggleConfirm = useCallback(() => setShowConfirm((v) => !v), []);
  const pwdEye = useMemo(
    () => <EyeToggle shown={showPwd} onToggle={togglePwd} color={t.ink3} />,
    [showPwd, togglePwd, t.ink3]
  );
  const confirmEye = useMemo(
    () => <EyeToggle shown={showConfirm} onToggle={toggleConfirm} color={t.ink3} />,
    [showConfirm, toggleConfirm, t.ink3]
  );

  const handleSubmit = async () => {
    setError('');
    const errs = {};
    if (!USERNAME_RE.test(form.username))
      errs.username = 'Username must be 3-20 characters: lowercase letters, numbers, underscores only';
    if (!EMAIL_RE.test(form.email)) errs.email = 'Enter a valid email address';
    if (form.password.length < 8) errs.password = 'Password must be at least 8 characters';
    if (form.confirmPassword !== form.password) errs.confirmPassword = 'Passwords do not match';
    setFieldErrors(errs);
    if (Object.keys(errs).length) return;
    setLoading(true);
    try {
      const { username, email, password, role } = form;
      // No account is created yet — the backend holds the signup until the user
      // opens the email link. So we don't log in here; we send them to check email.
      await api.post('/auth/register', { username, email, password, role });
      router.replace({ pathname: '/(auth)/check-email', params: { email } });
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const strength = pwdStrength(form.password);
  // Good/Strong read green, not blue: blue on this screen means "tap me" (role
  // cards, primary button) and a meter is not interactive.
  const strengthColors = [STRENGTH_WEAK, STRENGTH_FAIR, MATCH_GREEN, MATCH_GREEN];

  return (
    <Screen back keyboard>
      {/* 3q: the form sits flat on the white page — no card chrome */}
      <View style={{ marginTop: spacing[4] }}>
        <Text
          accessibilityRole="header"
          style={{ fontFamily: fontFamily.display, fontSize: text.xl, color: t.ink, letterSpacing: -0.5 }}
        >
          Join Towinly.
        </Text>
        <Text style={{ fontSize: 16, color: t.ink3, marginTop: 4, marginBottom: spacing[5] }}>
          Create your free account in minutes.
        </Text>

        {/* Role cards — the first decision (3q): selected = 2px blue + wash */}
        <Text style={{ fontSize: text.sm, fontWeight: '700', color: t.ink, marginBottom: spacing[3] }}>
          First, who are you joining as?
        </Text>
        {/* Wrapping row: ELDER + HELPER share the line, the full-width FAMILY
            card drops below it (gap covers both directions). */}
        <View
          accessibilityRole="radiogroup"
          style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2], marginBottom: spacing[5] }}
        >
          {ROLES.map(({ value, label, desc, fullWidth }) => {
            const active = form.role === value;
            return (
              <Pressable
                key={value}
                accessibilityRole="radio"
                accessibilityState={{ selected: active }}
                accessibilityLabel={`${label}. ${desc}`}
                onPress={() => setField('role', value)}
                style={({ pressed }) => ({
                  ...(fullWidth ? { width: '100%' } : { flex: 1 }),
                  minHeight: 64,
                  padding: spacing[3],
                  borderRadius: radius.input,
                  borderWidth: active ? 2 : 1.5,
                  borderColor: active ? t.blue : t.fieldLine,
                  backgroundColor: active ? t.blueWash : t.canvas,
                  opacity: pressed ? 0.8 : 1,
                })}
              >
                <Text style={{ fontSize: text.sm, fontWeight: '600', color: active ? t.blueDeep : t.ink }}>
                  {label}
                </Text>
                {/* blueDeep/inkSlate, not teal/ink4 — this copy decides an
                    identity; it must clear 4.5:1 (rulebook). */}
                <Text style={{ fontSize: text.xs, color: active ? t.blueDeep : t.inkSlate, marginTop: 4, lineHeight: 18 }}>
                  {desc}
                </Text>
              </Pressable>
            );
          })}
        </View>

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

        {/* Google first (website parity) — web build only, nothing in stores. */}
        <GoogleLoginButton label="Continue with Google" dividerLabel="or sign up with username" />

        <Input
          label="Username"
          value={form.username}
          onChangeText={setUsername}
          error={fieldErrors.username}
          helper="3-20 characters. Letters, numbers, underscores. Visible to others."
          autoCapitalize="none"
          autoCorrect={false}
          textContentType="username"
          autoComplete="username-new"
          style={FIELD_GAP}
        />

        <Input
          label="Email"
          value={form.email}
          onChangeText={setEmail}
          error={fieldErrors.email}
          helper="We'll send a link to confirm it's really you."
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          textContentType="emailAddress"
          autoComplete="email"
          style={FIELD_GAP}
        />

        <Input
          label="Password"
          value={form.password}
          onChangeText={setPassword}
          error={fieldErrors.password}
          secureTextEntry={!showPwd}
          textContentType="newPassword"
          autoComplete="new-password"
          rightSlot={pwdEye}
        />
        {form.password ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 6 }}>
            {[1, 2, 3, 4].map((i) => (
              <View
                key={i}
                style={{
                  flex: 1,
                  height: 3,
                  borderRadius: radius.pill,
                  backgroundColor: i <= strength ? strengthColors[strength - 1] : t.border,
                }}
              />
            ))}
            <Text style={{ fontSize: type.meta, color: t.ink3, marginLeft: 6 }}>
              {STRENGTH_LABELS[strength]}
            </Text>
          </View>
        ) : null}

        <Input
          label="Re-enter password"
          value={form.confirmPassword}
          onChangeText={setConfirmPassword}
          error={fieldErrors.confirmPassword}
          secureTextEntry={!showConfirm}
          textContentType="newPassword"
          autoComplete="new-password"
          rightSlot={confirmEye}
          style={FIELD_GAP_TOP}
        />
        {form.confirmPassword && form.password && form.confirmPassword === form.password ? (
          <Text style={{ fontSize: text.xs, color: MATCH_GREEN, marginTop: 4 }}>Passwords match</Text>
        ) : null}

        {/* Terms agreement — submit stays disabled until checked (HCI rule 5).
            The row only toggles consent; the documents open from the two
            full-height links below, so a near-miss on a tiny inline link can
            never silently flip the checkbox (audit 2026-07-17). */}
        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked: agreed }}
          accessibilityLabel="I agree to the Terms of Service and Privacy Policy"
          onPress={() => setAgreed((v) => !v)}
          hitSlop={{ top: 6, bottom: 6 }}
          style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing[3], marginTop: spacing[5] }}
        >
          <View
            style={{
              width: 22,
              height: 22,
              borderRadius: 6,
              borderWidth: 1.5,
              borderColor: agreed ? t.blue : t.fieldLine,
              backgroundColor: agreed ? t.blue : t.canvas,
              alignItems: 'center',
              justifyContent: 'center',
              marginTop: 2,
            }}
          >
            {/* An icon, not a glyph in a fixed line box — the ✓ clipped at
                large OS text (rulebook). */}
            {agreed ? <Check size={15} color={t.actionInk} strokeWidth={3} /> : null}
          </View>
          <Text style={{ flex: 1, fontSize: text.base, color: t.ink3, lineHeight: 25 }}>
            I agree to the Terms of Service and Privacy Policy
          </Text>
        </Pressable>
        {/* rowGap: when the two 44pt links wrap they must not stack at 0pt */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: spacing[5], rowGap: spacing[2], marginLeft: 22 + spacing[3] }}>
          <Pressable
            accessibilityRole="link"
            onPress={() => setLegalOpen('terms')}
            style={{ minHeight: 44, justifyContent: 'center' }}
          >
            <Text style={{ fontSize: text.base, fontWeight: '600', color: t.blueDeep, textDecorationLine: 'underline' }}>
              Read the Terms
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="link"
            onPress={() => setLegalOpen('privacy')}
            style={{ minHeight: 44, justifyContent: 'center' }}
          >
            <Text style={{ fontSize: text.base, fontWeight: '600', color: t.blueDeep, textDecorationLine: 'underline' }}>
              Read the Privacy Policy
            </Text>
          </Pressable>
        </View>

        {/* The reason the button waits is written on screen, not hidden in an
            accessibility hint (rulebook: a greyed button must explain itself). */}
        {!form.role || !agreed ? (
          <Text style={{ fontSize: text.sm, color: t.inkSlate, lineHeight: 21, marginTop: spacing[4] }}>
            {!form.role
              ? 'Choose who you are joining as, and agree to the terms above.'
              : 'Agree to the terms above to continue.'}
          </Text>
        ) : null}
        <Button
          title={loading ? 'Creating account…' : 'Create Account'}
          variant="primary"
          onPress={handleSubmit}
          loading={loading}
          disabled={!agreed || !form.role}
          style={{ marginTop: spacing[3] }}
          accessibilityHint={
            agreed && form.role ? 'Creates your Towinly account' : 'Choose a role and agree to the terms first'
          }
        />

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: spacing[4],
          }}
        >
          <Text style={{ fontSize: 16, color: t.ink3 }}>Already have an account? </Text>
          <TextLink label="Log in" onPress={() => router.push('/(auth)/login')} />
        </View>

        {/* Demo accounts live quietly under the form, not above it — hidden in
            store builds so the shared credentials never ship (audit). */}
        {showDemoAccounts() ? <DemoAccountsCard onError={setError} /> : null}
      </View>

      <LegalModal
        title="Terms of Service"
        sections={TERMS_CONTENT}
        visible={legalOpen === 'terms'}
        onClose={() => setLegalOpen(null)}
      />
      <LegalModal
        title="Privacy Policy"
        sections={PRIVACY_CONTENT}
        visible={legalOpen === 'privacy'}
        onClose={() => setLegalOpen(null)}
      />
    </Screen>
  );
}
