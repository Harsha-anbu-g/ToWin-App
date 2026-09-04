// Check email — port of Towinly/frontend/src/pages/CheckEmail.jsx. Shown right
// after a manual signup: the account does NOT exist yet (created only when the
// user opens the link), so nobody is logged in here.
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { resendVerificationEmail } from '../../src/api/auth';
import Button from '../../src/components/ui/Button';
import Card from '../../src/components/ui/Card';
import Screen from '../../src/components/ui/Screen';
import TextLink from '../../src/components/ui/TextLink';
import { useToast } from '../../src/context/ToastContext';
import { useTheme } from '../../src/theme/ThemeContext';

export default function CheckEmail() {
  const { t, spacing, radius, text, fontFamily } = useTheme();
  const { email } = useLocalSearchParams();
  const { showToast } = useToast();
  const router = useRouter();
  const [sending, setSending] = useState(false);

  const resend = async () => {
    if (!email) {
      // The error names the fix AND carries the action (rulebook: recovery in
      // place, never a dead-end toast).
      showToast('Please sign up again to get a new link.', 'error', {
        actionLabel: 'Sign up',
        onAction: () => router.replace('/(auth)/register'),
      });
      return;
    }
    setSending(true);
    try {
      await resendVerificationEmail({ email });
      showToast('Verification email sent. Check your inbox.', 'success');
    } catch {
      showToast('Could not resend right now. Try again shortly.', 'error');
    } finally {
      setSending(false);
    }
  };

  return (
    // Scrollable + centered — scroll off clipped the card at large OS text.
    <Screen contentStyle={{ flexGrow: 1, justifyContent: 'center' }}>
      <Card contentStyle={{ alignItems: 'stretch' }}>
        <Text
          accessibilityRole="header"
          style={{
            fontFamily: fontFamily.display,
            fontSize: text.xl,
            color: t.ink,
            textAlign: 'center',
          }}
        >
          Confirm your email
        </Text>
        <Text
          style={{
            fontSize: text.base,
            color: t.slate,
            textAlign: 'center',
            marginTop: spacing[3],
            lineHeight: 26,
          }}
        >
          We sent a confirmation link to{' '}
          {email ? <Text style={{ fontWeight: '600', color: t.ink }}>{email}</Text> : 'your email'}.
        </Text>
        <Text
          style={{
            fontSize: text.base,
            color: t.slate,
            textAlign: 'center',
            marginTop: spacing[2],
            lineHeight: 26,
          }}
        >
          Open it to finish creating your account, then come back and log in.
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
            folder. The Towinly email often lands there. If you find it, mark it "Not spam" so future
            emails reach your inbox.
          </Text>
        </View>

        <Button
          title={sending ? 'Sending…' : 'Resend email'}
          variant="primary"
          onPress={resend}
          loading={sending}
          style={{ marginTop: spacing[6] }}
        />
        <TextLink
          label="Back to log in"
          onPress={() => router.replace('/(auth)/login')}
          style={{ marginTop: spacing[2] }}
        />
      </Card>
    </Screen>
  );
}
