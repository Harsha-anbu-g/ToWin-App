// Check email — port of ToWin/frontend/src/pages/CheckEmail.jsx. Shown right
// after a manual signup: the account does NOT exist yet (created only when the
// user opens the link), so nobody is logged in here.
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import api from '../../src/api/client';
import Button from '../../src/components/ui/Button';
import Card from '../../src/components/ui/Card';
import Screen from '../../src/components/ui/Screen';
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
      showToast('Please sign up again to get a new link.', 'error');
      return;
    }
    setSending(true);
    try {
      await api.post('/auth/resend-verification', { email });
      showToast('Verification email sent. Check your inbox.', 'success');
    } catch {
      showToast('Could not resend right now. Try again shortly.', 'error');
    } finally {
      setSending(false);
    }
  };

  return (
    <Screen scroll={false} contentStyle={{ justifyContent: 'center' }}>
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
          Open it to finish creating your account — then come back and log in.
        </Text>

        <View
          style={{
            backgroundColor: t.goldWash,
            borderRadius: radius.md,
            padding: spacing[4],
            marginTop: spacing[5],
          }}
        >
          <Text style={{ fontSize: text.sm, color: t.goldDeep, lineHeight: 21 }}>
            <Text style={{ fontWeight: '700' }}>Can't find it?</Text> Please check your{' '}
            <Text style={{ fontWeight: '700' }}>Spam</Text> or <Text style={{ fontWeight: '700' }}>Junk</Text>{' '}
            folder — the ToWin email often lands there. If you find it, mark it "Not spam" so future
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
        <Pressable
          accessibilityRole="link"
          onPress={() => router.replace('/(auth)/login')}
          hitSlop={8}
          style={{ alignSelf: 'center', paddingVertical: spacing[3] }}
        >
          <Text style={{ fontSize: text.sm, color: t.blueDeep, fontWeight: '600', textDecorationLine: 'underline' }}>
            Back to log in
          </Text>
        </Pressable>
      </Card>
    </Screen>
  );
}
