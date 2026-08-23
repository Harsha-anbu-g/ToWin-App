// Register — port of Towinly/frontend/src/pages/Register.jsx for mobile:
// role choice first, sanitized username, strength meter, terms gate.
// NOTE: no account exists until the emailed link is opened — success routes
// to check-email, never logs in (mirrors web).
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { AlertCircle, CalendarCheck, Check, Lock, Mail, UserRound } from '../../src/components/icons';
import api from '../../src/api/client';
import Button from '../../src/components/ui/Button';
import DemoAccountsCard from '../../src/components/DemoAccountsCard';
import GoogleLoginButton from '../../src/components/auth/GoogleLoginButton';
import { showDemoAccounts } from '../../src/lib/appEnv';
import Input from '../../src/components/ui/Input';
import PasswordInput from '../../src/components/ui/PasswordInput';
import LegalModal from '../../src/components/LegalModal';
import Screen from '../../src/components/ui/Screen';
import TextLink from '../../src/components/ui/TextLink';
import { PRIVACY_CONTENT, TERMS_CONTENT } from '../../src/data/legalContent';
import { announce } from '../../src/lib/announce';
import { yearsOld } from '../../src/lib/copy';
import { parseFlexibleDate } from '../../src/lib/flexibleDate';
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
const FIELD_GAP = { marginBottom: spacing[5] };
const FIELD_GAP_TOP = { marginTop: spacing[5] };

// The consent box, and the indent that keeps the two legal links under its
// label. Written twice as a bare 22, the two drifted apart the moment either
// moved (audit 2026-08-19).
const CHECKBOX_SIZE = 22;

// One document behind one link. Two links opening two sheets put two more
// buttons on a page that already had ten, and nobody reads one of these
// without the other (owner call 2026-08-19). Hoisted so the concatenation is
// not rebuilt on every keystroke.
const LEGAL_SECTIONS = [...TERMS_CONTENT, ...PRIVACY_CONTENT];

export default function Register() {
  const { t, radius, type, fontFamily } = useTheme();
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
  const [legalOpen, setLegalOpen] = useState(false);

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
  // The submit error renders near the top of a long page, above the role
  // cards; Create Account is at the bottom. Rejecting a duplicate email used
  // to change something nobody could see and nothing anybody could hear, so
  // the button read as dead. This scrolls it back under the person's eyes.
  const scrollRef = useRef(null);

  // Said out loud on the way in only. accessibilityRole="alert" below is a
  // live region in a browser but only a trait on iOS and Android, so without
  // this a rejected signup was silent for anyone who could not see the banner.
  const spokenError = useRef(null);
  useEffect(() => {
    if (error && error !== spokenError.current) announce(error);
    spokenError.current = error || null;
  }, [error]);

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
  // The app's own palette, not the three iOS system colors this used to
  // borrow: the old 'good' bar was a pale sage while the 'Passwords match'
  // line six rows below was greenDeep — two greens saying one thing, on
  // screen together (audit 2026-08-19).
  const strengthColors = [t.redError, t.redMild, t.greenDeep, t.greenDeep];

  return (
    // spacing[6] gutter + spacing[5] field gaps: login.jsx's rhythm, which
    // the owner already tuned. Register is the longest page in the flow and
    // was running the tightest (audit 2026-08-19).
    <Screen back keyboard scrollRef={scrollRef} contentStyle={{ paddingHorizontal: spacing[6] }}>
      {/* 3q: the form sits flat on the white page — no card chrome */}
      <View style={{ marginTop: spacing[4] }}>
        <Text
          accessibilityRole="header"
          style={{ fontFamily: fontFamily.display, fontSize: type.title, color: t.ink, letterSpacing: -0.5 }}
        >
          Join Towinly.
        </Text>
        {/* spacing[8] under each section, spacing[5] between fields inside one:
            "space within a group < space between groups" is the only grouping
            cue a single column has (rulebook §5). The page ran everything at
            16–24 and read as one solid block (owner call 2026-08-19). */}
        <Text style={{ fontSize: type.body, color: t.ink3, marginTop: spacing[1], marginBottom: spacing[8] }}>
          Create your free account in minutes.
        </Text>

        {/* Role cards — the first decision (3q): selected = 2px blue + wash */}
        {/* Body size, not sm: this is the screen's one real question. */}
        <Text style={{ fontSize: type.body, fontWeight: '700', color: t.ink, marginBottom: spacing[3] }}>
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
          style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2], marginBottom: spacing[8] }}
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
                  // 1pt idle matches the inputs below, 2pt active matches
                  // Paper's focused outline — one border language down the
                  // whole column (audit 2026-08-19).
                  borderWidth: active ? 2 : 1,
                  borderColor: active ? t.blue : t.fieldLine,
                  backgroundColor: active ? t.blueWash : t.canvas,
                  opacity: pressed ? 0.8 : 1,
                })}
              >
                {/* Body size, not sm: the option's own NAME was the smallest
                    text in the card while its description sat at 16, so every
                    card read upside-down. Weight and color carry the hierarchy
                    now (audit 2026-08-19). */}
                <Text style={{ fontSize: type.body, fontWeight: '600', color: active ? t.blueDeep : t.ink }}>
                  {label}
                </Text>
                {/* blueDeep/inkSlate, not teal/ink4 — this copy decides an
                    identity; it must clear 4.5:1 (rulebook). Body size, not
                    meta: it is read rather than scanned, and misreading it
                    signs the person up as the wrong person. */}
                <Text style={{ fontSize: type.body, color: active ? t.blueDeep : t.inkSlate, marginTop: spacing[1], lineHeight: 24 }}>
                  {desc}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {error ? (
          <View
            testID="register-error"
            accessible
            accessibilityRole="alert"
            // onLayout fires once the banner has a position, which is the first
            // moment there is anywhere to scroll to. `y` is measured inside the
            // scroll content, so it lands the banner just below the top edge.
            onLayout={(e) => {
              scrollRef.current?.scrollTo({ y: e.nativeEvent.layout.y, animated: true });
            }}
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
            {/* (24pt line box − 18pt icon) / 2 — the icon sits on the first
                line's optical centre rather than its ascender. */}
            <AlertCircle size={18} color={t.redError} strokeWidth={2} style={{ marginTop: 3 }} />
            {/* Body size, like every other sentence on this page. This was the
                last 14pt text left on the screen, and it is the one that says
                why the account was not created (audit 2026-08-19). */}
            <Text style={{ flex: 1, fontSize: type.body, color: t.redError, lineHeight: 24 }}>
              {error}
            </Text>
          </View>
        ) : null}

        {/* Google first (website parity) — web build only, nothing in stores. */}
        <GoogleLoginButton label="Continue with Google" dividerLabel="or sign up with username" />

        <Input
          label="Username"
          icon={UserRound}
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
          icon={Mail}
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
          icon={CalendarCheck}
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

        {/* The kit control, not a local copy of it: this was the only
            password screen in the app reimplementing the eye toggle
            (audit 2026-08-19). PasswordInput owns show/hide state and
            spreads the rest, ref included, straight through to Input. */}
        <PasswordInput
          ref={passwordRef}
          label="Password"
          icon={Lock}
          value={form.password}
          onChangeText={setPassword}
          error={fieldErrors.password}
          helper="At least 8 characters."
          textContentType="newPassword"
          autoComplete="new-password"
          returnKeyType="next"
          submitBehavior="submit"
          onSubmitEditing={focusConfirm}
        />
        {form.password ? (
          // spacing[2] is exactly where Input draws its own helper line, so
          // the meter reads as this field's helper rather than a stray row.
          // (A {/* */} comment here is an object literal to the parser.)
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[1], marginTop: spacing[2] }}>
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
            <Text style={{ fontSize: type.meta, color: t.ink3, marginLeft: spacing[2] }}>
              {STRENGTH_LABELS[strength]}
            </Text>
          </View>
        ) : null}

        <PasswordInput
          ref={confirmRef}
          label="Re-enter password"
          icon={Lock}
          value={form.confirmPassword}
          onChangeText={setConfirmPassword}
          error={fieldErrors.confirmPassword}
          textContentType="newPassword"
          autoComplete="new-password"
          returnKeyType="done"
          onSubmitEditing={submitFromKeyboard}
          style={FIELD_GAP_TOP}
        />
        {form.confirmPassword && form.password && form.confirmPassword === form.password ? (
          /* greenDeep at body size: the web's MATCH_GREEN measured 2.93:1 at
             13px, so the one line confirming the two passwords agree was the
             hardest thing on the page to read. */
          <Text style={{ fontSize: type.body, color: t.greenDeep, marginTop: spacing[1] }}>Passwords match</Text>
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
            marginTop: spacing[8],
            opacity: pressed ? 0.7 : 1,
          })}
        >
          <View
            style={{
              width: CHECKBOX_SIZE,
              height: CHECKBOX_SIZE,
              borderRadius: 6,
              // The same 1-idle / 2-chosen border language as the role cards
              // and the inputs — this box is a choice control like they are,
              // and it was the last 1.5pt line on the page (audit 2026-08-19).
              borderWidth: agreed ? 2 : 1,
              borderColor: agreed ? t.blue : t.fieldLine,
              backgroundColor: agreed ? t.blue : t.canvas,
              alignItems: 'center',
              justifyContent: 'center',
              // (24pt line box − 22pt box) / 2, the same optical centring the
              // alert icon uses.
              marginTop: 1,
            }}
          >
            {/* An icon, not a glyph in a fixed line box — the ✓ clipped at
                large OS text (rulebook). */}
            {agreed ? <Check size={15} color={t.actionInk} strokeWidth={3} /> : null}
          </View>
          <Text style={{ flex: 1, fontSize: type.body, color: t.ink3, lineHeight: 24 }}>
            I agree to the Terms of Service and Privacy Policy
          </Text>
        </Pressable>
        {/* Indented under the checkbox label so it reads as belonging to that
            sentence rather than as another thing to decide. One row now: the
            two links stacked because side by side they needed 314pt in a 311pt
            column, and two 44pt rows here was two more buttons on a page that
            already had ten.
            TextLink carries accessibilityRole="button" — the right role, since
            it opens a sheet rather than navigates — plus the 44pt floor, the
            pressed state and the Android ripple (audit 2026-08-19). */}
        <View style={{ alignItems: 'flex-start', marginLeft: CHECKBOX_SIZE + spacing[3] }}>
          <TextLink
            label="Read the Terms and Privacy Policy"
            onPress={() => setLegalOpen(true)}
            style={{ alignSelf: 'flex-start', paddingHorizontal: 0 }}
          />
        </View>

        {/* The reason the button waits is written on screen, not hidden in an
            accessibility hint (rulebook: a greyed button must explain itself). */}
        {!form.role || !agreed ? (
          <Text style={{ fontSize: type.body, color: t.inkSlate, lineHeight: 24, marginTop: spacing[4] }}>
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
            marginTop: spacing[8],
          }}
        >
          <Text style={{ fontSize: type.body, color: t.ink3 }}>Already have an account? </Text>
          <TextLink label="Log in" onPress={() => router.push('/(auth)/login')} />
        </View>

        {/* Demo accounts live quietly under the form, not above it — hidden in
            store builds so the shared credentials never ship (audit). */}
        {showDemoAccounts() ? <DemoAccountsCard onError={setError} collapsed /> : null}
      </View>

      <LegalModal
        title="Terms and Privacy Policy"
        sections={LEGAL_SECTIONS}
        visible={legalOpen}
        onClose={() => setLegalOpen(false)}
      />
    </Screen>
  );
}
