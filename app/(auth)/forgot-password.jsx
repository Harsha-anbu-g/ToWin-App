// Forgot password — port of Towinly/frontend/src/pages/ForgotPassword.jsx.
// The "sent" state ALWAYS shows, whether or not the account exists (we never
// reveal whether an email is registered).
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Text } from 'react-native';
import api from '../../src/api/client';
import Button from '../../src/components/ui/Button';
import Card from '../../src/components/ui/Card';
import Input from '../../src/components/ui/Input';
import Screen from '../../src/components/ui/Screen';
import TextLink from '../../src/components/ui/TextLink';
import { EMAIL_RE } from '../../src/lib/password';
import { useTheme } from '../../src/theme/ThemeContext';

export default function ForgotPassword() {
  const { t, spacing, text, fontFamily } = useTheme();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!EMAIL_RE.test(email.trim())) {
      setError('Enter a valid email address');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email });
      setSent(true);
    } catch (err) {
      if (err?.response) {
        // The server answered — never reveal whether the email exists.
        setSent(true);
      } else {
        // No reply at all: an offline elder must not wait for an email
        // that was never requested (HCI rule 9).
        setError('Check your connection and try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const backLink = (
    <TextLink
      label="Back to log in"
      onPress={() => router.replace('/(auth)/login')}
      style={{ marginTop: spacing[2] }}
    />
  );

  if (sent) {
    return (
      <Screen contentStyle={{ flexGrow: 1, justifyContent: 'center' }}>
        <Card>
          <Text
            accessibilityRole="header"
            style={{ fontFamily: fontFamily.display, fontSize: text.xl, color: t.ink, textAlign: 'center' }}
          >
            Check your email
          </Text>
          <Text style={{ fontSize: text.base, color: t.slate, textAlign: 'center', marginTop: spacing[3], lineHeight: 26 }}>
            If an account exists for that email, we've sent a link to reset your password. Be sure to
            check your Spam folder.
          </Text>
          <Button
            title="Back to log in"
            variant="primary"
            onPress={() => router.replace('/(auth)/login')}
            style={{ marginTop: spacing[6] }}
          />
        </Card>
      </Screen>
    );
  }

  return (
    // back + scrollable centered body — this screen is pushed from Log In and
    // clipped at large OS text with scroll off (rulebook pass).
    <Screen back keyboard contentStyle={{ flexGrow: 1, justifyContent: 'center' }}>
      <Card>
        <Text
          accessibilityRole="header"
          style={{ fontFamily: fontFamily.display, fontSize: text.xl, color: t.ink }}
        >
          Reset your password
        </Text>
        <Text style={{ fontSize: 16, color: t.slate, marginTop: spacing[2], marginBottom: spacing[5], lineHeight: 24 }}>
          Enter your email and we'll send you a link to set a new password.
        </Text>
        <Input
          label="Email"
          value={email}
          onChangeText={(v) => {
            setEmail(v);
            if (error) setError('');
          }}
          error={error}
          helper={email.trim() ? undefined : 'Enter your email first. Then the button below wakes up.'}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          textContentType="emailAddress"
          autoComplete="email"
          returnKeyType="send"
          onSubmitEditing={() => {
            // Mirrors the button's disabled gate: no email, no request.
            if (email.trim() && !loading) submit();
          }}
          style={{ marginBottom: spacing[5] }}
        />
        <Button
          title={loading ? 'Sending…' : 'Send reset link'}
          variant="primary"
          onPress={submit}
          loading={loading}
          disabled={!email.trim()}
          accessibilityHint={email.trim() ? undefined : 'Enter your email first'}
        />
        {backLink}
      </Card>
    </Screen>
  );
}
