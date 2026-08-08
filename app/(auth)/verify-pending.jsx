// Full-page gate for a logged-in user who hasn't verified their email — port of
// Towinly/frontend/src/pages/VerifyPending.jsx. They cannot reach any app screen
// until they open the emailed link and sign in again (the `ev` claim lives in
// the signed JWT, so only a fresh login unlocks — no focus re-check can work).
import { Redirect, useRouter } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';
import api from '../../src/api/client';
import Button from '../../src/components/ui/Button';
import Card from '../../src/components/ui/Card';
import Screen from '../../src/components/ui/Screen';
import TextLink from '../../src/components/ui/TextLink';
import { useAuth } from '../../src/context/AuthContext';
import { useToast } from '../../src/context/ToastContext';
import { parseJwtPayload } from '../../src/lib/jwt';
import { useTheme } from '../../src/theme/ThemeContext';

export default function VerifyPending() {
  const { t, spacing, radius, text, fontFamily } = useTheme();
  const { user, logout } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();
  const [sending, setSending] = useState(false);

  if (!user) return <Redirect href="/(auth)/login" />;
  if (user.emailVerified !== false) return <Redirect href="/(tabs)/home" />;

  const email = parseJwtPayload(user.token)?.email;

  const resend = async () => {
    setSending(true);
    try {
      await api.post('/auth/resend-verification');
      showToast('Verification email sent. Check your inbox.', 'success');
    } catch (e) {
      showToast(e?.response?.data?.message || 'Could not send the email. Try again shortly.', 'error');
    } finally {
      setSending(false);
    }
  };

  const backToLogin = async () => {
    await logout();
    router.replace('/(auth)/login');
  };

  return (
    // Scrollable + centered — scroll off clipped the card at large OS text.
    <Screen contentStyle={{ flexGrow: 1, justifyContent: 'center' }}>
      <Card>
        <Text
          accessibilityRole="header"
          style={{ fontFamily: fontFamily.display, fontSize: text.xl, color: t.ink, textAlign: 'center' }}
        >
          Verify your email
        </Text>
        <Text style={{ fontSize: text.base, color: t.slate, textAlign: 'center', marginTop: spacing[3], lineHeight: 26 }}>
          We sent a verification link to{' '}
          {email ? <Text style={{ fontWeight: '600', color: t.ink }}>{email}</Text> : 'your email'}.
        </Text>
        <Text style={{ fontSize: text.base, color: t.slate, textAlign: 'center', marginTop: spacing[2], lineHeight: 26 }}>
          Open it to activate your account, then sign in again to continue.
        </Text>

        <View
          style={{
            backgroundColor: t.canvas,
            borderWidth: 1,
            borderColor: t.border,
            borderRadius: radius.card,
            padding: spacing[4],
            marginTop: spacing[5],
          }}
        >
          <Text style={{ fontSize: text.sm, color: t.inkSlate, lineHeight: 21 }}>
            <Text style={{ fontWeight: '700' }}>Can't find it?</Text> Please check your{' '}
            <Text style={{ fontWeight: '700' }}>Spam</Text> or <Text style={{ fontWeight: '700' }}>Junk</Text>{' '}
            folder. The Towinly verification email often lands there. If you find it, mark it "Not spam"
            so future emails reach your inbox.
          </Text>
        </View>

        <Button
          title={sending ? 'Sending…' : 'Resend email'}
          variant="primary"
          onPress={resend}
          loading={sending}
          style={{ marginTop: spacing[6] }}
        />
        {/* The label names its consequence — this signs the current session
            out so the fresh JWT can carry the verified claim (rulebook). */}
        <TextLink
          label="I've verified. Sign in again"
          onPress={backToLogin}
          style={{ marginTop: spacing[2] }}
        />
      </Card>
    </Screen>
  );
}
