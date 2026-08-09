// Register — port of Towinly/frontend/src/pages/Register.jsx for mobile:
// role choice first, sanitized username, strength meter, terms gate.
// NOTE: no account exists until the emailed link is opened — success routes
// to check-email, never logs in (mirrors web).
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { yearsOld } from '../../src/lib/copy';
import { parseFlexibleDate } from '../../src/lib/flexibleDate';
import { MATCH_GREEN, STRENGTH_FAIR, STRENGTH_WEAK } from '../../src/theme/parity';
import { EMAIL_RE, pwdStrength, sanitizeUsername, USERNAME_RE } from '../../src/lib/password';
import { useTheme } from '../../src/theme/ThemeContext';
import { spacing } from '../../src/theme/tokens';

// Read twice: once as the visible heading, once as the label on the group of
// role cards. One constant so a reworded heading cannot leave the group saying
// something else.
const ROLE_PROMPT = 'First, who are you joining as?';

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

// The Terms have always said Towinly is not for under-18s, and the privacy policy
// has always said a date of birth is collected at signup. Neither was true until
// this field existed. Google Play also asks you to declare a target age and looks
// for a real gate behind an adults-only answer.
const MIN_AGE = 18;
// Nobody alive is older than this, so a four-digit typo lands here rather than
// silently passing the age check.
const MAX_AGE = 120;

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
      style={({ pressed }) => ({
        minWidth: 44,
        minHeight: 44,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: pressed ? 0.7 : 1,
      })}
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
    dateOfBirth: '',
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
  const setDateOfBirth = useCallback((v) => {
    setForm((f) => ({ ...f, dateOfBirth: v }));
    setFieldErrors((f) => ({ ...f, dateOfBirth: '' }));
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

  // Return-key path (UX-708): Next walks username → email → date of birth →
  // password → re-enter, Done on the last field submits. Stable callbacks
  // (memo'd Inputs); the submit goes through a latest-ref because it reads
  // fresh form state, and it mirrors the Create Account button's disabled
  // gate so the keyboard can never skip the role or terms consent.
  const emailRef = useRef(null);
  const dobRef = useRef(null);
  const passwordRef = useRef(null);
  const confirmRef = useRef(null);
  const focusEmail = useCallback(() => emailRef.current?.focus(), []);
  const focusDob = useCallback(() => dobRef.current?.focus(), []);
  const focusPassword = useCallback(() => passwordRef.current?.focus(), []);
  const focusConfirm = useCallback(() => confirmRef.current?.focus(), []);
  const submitRef = useRef(null);
  const submitFromKeyboard = useCallback(() => submitRef.current?.(), []);
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

    // Age gate. parseFlexibleDate returns null for empty, { error } for an
    // impossible date, or { value } as YYYY-MM-DD.
    const parsedDob = parseFlexibleDate(form.dateOfBirth);
    let dateOfBirth = '';
    if (!parsedDob) {
      errs.dateOfBirth = 'Enter your date of birth';
    } else if (parsedDob.error) {
      errs.dateOfBirth = parsedDob.error;
    } else {
      const age = yearsOld(parsedDob.value);
      if (age < 0) errs.dateOfBirth = 'That date is in the future, please check it.';
      else if (age > MAX_AGE) errs.dateOfBirth = 'Please check the year you typed.';
      else if (age < MIN_AGE) errs.dateOfBirth = `You have to be ${MIN_AGE} or over to join Towinly.`;
      else dateOfBirth = parsedDob.value;
    }

    setFieldErrors(errs);
    if (Object.keys(errs).length) return;
    setLoading(true);
    try {
      const { username, email, password, role } = form;
      // No account is created yet — the backend holds the signup until the user
      // opens the email link. So we don't log in here; we send them to check email.
      await api.post('/auth/register', { username, email, password, role, dateOfBirth });
      router.replace({ pathname: '/(auth)/check-email', params: { email } });
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    submitRef.current = () => {
      if (!agreed || !form.role) return;
      handleSubmit();
    };
  });

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
          {ROLE_PROMPT}
        </Text>
        {/* Wrapping row: ELDER + HELPER share the line, the full-width FAMILY
            card drops below it (gap covers both directions). */}
        {/* The heading above is a separate node — without a label on the group
            itself a screen reader announces three options and never says what
            question they answer. Same string, so the two cannot drift. */}
        <View
          accessibilityRole="radiogroup"
          accessibilityLabel={ROLE_PROMPT}
          style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2], marginBottom: spacing[5] }}
        >
          {ROLES.map(({ value, label, desc, fullWidth }) => {
            const active = form.role === value;
            return (
              <Pressable
                key={value}
                accessibilityRole="radio"
                // Was accessibilityState={{ selected }}: aria-selected is not an
                // attribute a radio carries, so the chosen role went unannounced.
                // aria-checked is the one spelling that lands on both sides —
                // RN merges it into accessibilityState, react-native-web writes
                // it to the DOM and ignores accessibilityState entirely.
                aria-checked={active}
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
          returnKeyType="next"
          submitBehavior="submit"
          onSubmitEditing={focusEmail}
          style={FIELD_GAP}
        />

        <Input
          ref={emailRef}
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
          returnKeyType="next"
          submitBehavior="submit"
          onSubmitEditing={focusDob}
          style={FIELD_GAP}
        />

        {/* Age gate. Free text on purpose: a spinning date wheel is hard work for
            an 80-year-old, and parseFlexibleDate already accepts "14 May 1953",
            "May 14, 1953" and "1953-05-14" alike. */}
        <Input
          ref={dobRef}
          label="Date of birth"
          value={form.dateOfBirth}
          onChangeText={setDateOfBirth}
          error={fieldErrors.dateOfBirth}
          helper="For example 14 May 1953. You have to be 18 or over to join."
          autoCapitalize="none"
          autoCorrect={false}
          textContentType="birthdate"
          autoComplete="birthdate-full"
          returnKeyType="next"
          submitBehavior="submit"
          onSubmitEditing={focusPassword}
          style={FIELD_GAP}
        />

        <Input
          ref={passwordRef}
          label="Password"
          value={form.password}
          onChangeText={setPassword}
          error={fieldErrors.password}
          secureTextEntry={!showPwd}
          textContentType="newPassword"
          autoComplete="new-password"
          returnKeyType="next"
          submitBehavior="submit"
          onSubmitEditing={focusConfirm}
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
          ref={confirmRef}
          label="Re-enter password"
          value={form.confirmPassword}
          onChangeText={setConfirmPassword}
          error={fieldErrors.confirmPassword}
          secureTextEntry={!showConfirm}
          textContentType="newPassword"
          autoComplete="new-password"
          returnKeyType="done"
          onSubmitEditing={submitFromKeyboard}
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
          style={({ pressed }) => ({
            flexDirection: 'row',
            alignItems: 'flex-start',
            gap: spacing[3],
            marginTop: spacing[5],
            opacity: pressed ? 0.7 : 1,
          })}
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
          {/* button, not link: these open a sheet over this screen. "Link"
              promises a screen reader it is going somewhere, and this is the
              last thing read before the agree checkbox. */}
          <Pressable
            accessibilityRole="button"
            onPress={() => setLegalOpen('terms')}
            style={({ pressed }) => ({
              minHeight: 44,
              justifyContent: 'center',
              opacity: pressed ? 0.6 : 1,
            })}
          >
            <Text style={{ fontSize: text.base, fontWeight: '600', color: t.blueDeep, textDecorationLine: 'underline' }}>
              Read the Terms
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => setLegalOpen('privacy')}
            style={({ pressed }) => ({
              minHeight: 44,
              justifyContent: 'center',
              opacity: pressed ? 0.6 : 1,
            })}
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
