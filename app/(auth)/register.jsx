// Register — port of ToWin/frontend/src/pages/Register.jsx for mobile:
// role choice first, sanitized username, strength meter, terms gate.
// NOTE: no account exists until the emailed link is opened — success routes
// to check-email, never logs in (mirrors web).
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Eye, EyeOff } from 'lucide-react-native';
import api from '../../src/api/client';
import Button from '../../src/components/ui/Button';
import DemoAccountsCard from '../../src/components/DemoAccountsCard';
import Input from '../../src/components/ui/Input';
import LegalModal from '../../src/components/LegalModal';
import Screen from '../../src/components/ui/Screen';
import { PRIVACY_CONTENT, TERMS_CONTENT } from '../../src/data/legalContent';
import { MATCH_GREEN, STRENGTH_FAIR, STRENGTH_WEAK } from '../../src/theme/parity';
import { EMAIL_RE, pwdStrength, sanitizeUsername, USERNAME_RE } from '../../src/lib/password';
import { useTheme } from '../../src/theme/ThemeContext';

const ROLES = [
  { value: 'ELDER', label: 'Elder', desc: 'Looking for friends or help' },
  { value: 'HELPER', label: 'Helper', desc: 'Want to help others' },
];

const STRENGTH_LABELS = ['', 'Weak', 'Fair', 'Good', 'Strong'];

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
  const { t, spacing, radius, text, fontFamily } = useTheme();
  const router = useRouter();

  const [form, setForm] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'ELDER',
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
  const strengthColors = [STRENGTH_WEAK, STRENGTH_FAIR, t.blue, t.blue];

  return (
    <Screen keyboard>
      {/* 3q: the form sits flat on the white page — no card chrome */}
      <View style={{ marginTop: spacing[4] }}>
        <Text
          accessibilityRole="header"
          style={{ fontFamily: fontFamily.display, fontSize: text.xl, color: t.ink, letterSpacing: -0.5 }}
        >
          Join ToWin.
        </Text>
        <Text style={{ fontSize: 16, color: t.ink3, marginTop: 4, marginBottom: spacing[5] }}>
          Create your free account in minutes.
        </Text>

        {/* Role cards — the first decision (3q): selected = 2px blue + wash */}
        <Text style={{ fontSize: text.sm, fontWeight: '700', color: t.ink, marginBottom: spacing[3] }}>
          First, who are you joining as?
        </Text>
        <View style={{ flexDirection: 'row', gap: spacing[2], marginBottom: spacing[5] }}>
          {ROLES.map(({ value, label, desc }) => {
            const active = form.role === value;
            return (
              <Pressable
                key={value}
                accessibilityRole="radio"
                accessibilityState={{ selected: active }}
                accessibilityLabel={`${label}. ${desc}`}
                onPress={() => setField('role', value)}
                style={{
                  flex: 1,
                  minHeight: 64,
                  padding: spacing[3],
                  borderRadius: radius.input,
                  borderWidth: active ? 2 : 1.5,
                  borderColor: active ? t.blue : t.border,
                  backgroundColor: active ? t.blueWash : t.canvas,
                }}
              >
                <Text style={{ fontSize: text.sm, fontWeight: '600', color: active ? t.blueDeep : t.ink }}>
                  {label}
                </Text>
                <Text style={{ fontSize: text.xs, color: active ? t.blueTeal : t.ink4, marginTop: 4, lineHeight: 17 }}>
                  {desc}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {error ? (
          <View
            accessibilityRole="alert"
            style={{
              backgroundColor: t.redTint,
              borderWidth: 1,
              borderColor: t.redLine,
              borderRadius: radius.md,
              padding: spacing[3],
              marginBottom: spacing[4],
            }}
          >
            <Text style={{ fontSize: text.sm, color: t.redError }}>{error}</Text>
          </View>
        ) : null}

        <Input
          label="Username"
          value={form.username}
          onChangeText={(v) => setField('username', sanitizeUsername(v))}
          error={fieldErrors.username}
          helper="3-20 characters. Letters, numbers, underscores. Visible to others."
          autoCapitalize="none"
          autoCorrect={false}
          textContentType="username"
          style={{ marginBottom: spacing[4] }}
        />

        <Input
          label="Email"
          value={form.email}
          onChangeText={(v) => setField('email', v)}
          error={fieldErrors.email}
          helper="We'll send a link to confirm it's really you."
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          textContentType="emailAddress"
          style={{ marginBottom: spacing[4] }}
        />

        <Input
          label="Password"
          value={form.password}
          onChangeText={(v) => setField('password', v)}
          error={fieldErrors.password}
          secureTextEntry={!showPwd}
          textContentType="newPassword"
          rightSlot={<EyeToggle shown={showPwd} onToggle={() => setShowPwd((v) => !v)} color={t.ink3} />}
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
            <Text style={{ fontSize: 12, color: t.ink3, marginLeft: 6 }}>
              {STRENGTH_LABELS[strength]}
            </Text>
          </View>
        ) : null}

        <Input
          label="Re-enter password"
          value={form.confirmPassword}
          onChangeText={(v) => setField('confirmPassword', v)}
          error={fieldErrors.confirmPassword}
          secureTextEntry={!showConfirm}
          textContentType="newPassword"
          rightSlot={<EyeToggle shown={showConfirm} onToggle={() => setShowConfirm((v) => !v)} color={t.ink3} />}
          style={{ marginTop: spacing[4] }}
        />
        {form.confirmPassword && form.password && form.confirmPassword === form.password ? (
          <Text style={{ fontSize: text.xs, color: MATCH_GREEN, marginTop: 4 }}>Passwords match</Text>
        ) : null}

        {/* Terms agreement — submit stays disabled until checked (HCI rule 5) */}
        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked: agreed }}
          accessibilityLabel="I agree to the Terms of Service and Privacy Policy"
          onPress={() => setAgreed((v) => !v)}
          style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing[3], marginTop: spacing[5] }}
        >
          <View
            style={{
              width: 22,
              height: 22,
              borderRadius: 6,
              borderWidth: 1.5,
              borderColor: agreed ? t.blue : t.ringIdle,
              backgroundColor: agreed ? t.blue : t.canvas,
              alignItems: 'center',
              justifyContent: 'center',
              marginTop: 2,
            }}
          >
            {agreed ? <Text style={{ color: t.actionInk, fontSize: 14, fontWeight: '700', lineHeight: 17 }}>✓</Text> : null}
          </View>
          <Text style={{ flex: 1, fontSize: 14, color: t.ink3, lineHeight: 21 }}>
            I agree to the{' '}
            <Text
              style={{ color: t.blueDeep, textDecorationLine: 'underline' }}
              onPress={() => setLegalOpen('terms')}
              accessibilityRole="link"
            >
              Terms of Service
            </Text>{' '}
            and{' '}
            <Text
              style={{ color: t.blueDeep, textDecorationLine: 'underline' }}
              onPress={() => setLegalOpen('privacy')}
              accessibilityRole="link"
            >
              Privacy Policy
            </Text>
          </Text>
        </Pressable>

        <Button
          title={loading ? 'Creating account…' : 'Create Account'}
          variant="primary"
          onPress={handleSubmit}
          loading={loading}
          disabled={!agreed}
          style={{ marginTop: spacing[5] }}
          accessibilityHint={agreed ? 'Creates your ToWin account' : 'Agree to the terms first'}
        />

        <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: spacing[5] }}>
          <Text style={{ fontSize: text.sm, color: t.ink3 }}>Already have an account? </Text>
          <Pressable accessibilityRole="link" onPress={() => router.push('/(auth)/login')} hitSlop={8}>
            <Text style={{ fontSize: text.sm, color: t.blueDeep, fontWeight: '600' }}>Log in</Text>
          </Pressable>
        </View>

        {/* Demo accounts live quietly under the form, not above it */}
        <DemoAccountsCard onError={setError} />
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
