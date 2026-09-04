// Landing for the verification link (/verify-email?token=…). The token comes
// off the query string, so this works from the emailed https link and from a
// future towinly:// deep link alike — nothing here reads the scheme.
// Port of Towinly/frontend/src/pages/VerifyEmail.jsx: confirms the token with the
// backend and shows the result. No auth required.
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Text } from 'react-native';
import { verifyEmail } from '../../src/api/auth';
import Button from '../../src/components/ui/Button';
import Card from '../../src/components/ui/Card';
import Screen from '../../src/components/ui/Screen';
import { useTheme } from '../../src/theme/ThemeContext';

export default function VerifyEmail() {
  const { t, spacing, text, fontFamily } = useTheme();
  const { token } = useLocalSearchParams();
  const router = useRouter();
  const [state, setState] = useState('verifying'); // verifying | success | error | offline
  const ran = useRef(false);

  const verify = useCallback(() => {
    setState('verifying');
    verifyEmail({ token })
      .then(() => setState('success'))
      // No reply at all is a connection problem, not a dead link. Collapsing
      // the two told an elder on flaky wifi to sign up again and throw away a
      // link that still works (HCI rule 9, same split as forgot-password).
      .catch((err) => setState(err?.response ? 'error' : 'offline'));
  }, [token]);

  useEffect(() => {
    if (ran.current) return; // guard against double-invoke
    ran.current = true;
    if (!token) {
      setState('error');
      return;
    }
    verify();
  }, [token, verify]);

  const heading = { fontFamily: fontFamily.display, fontSize: text.xl, color: t.ink, textAlign: 'center' };
  const body = { fontSize: text.base, color: t.slate, textAlign: 'center', marginTop: spacing[3], lineHeight: 26 };

  return (
    <Screen scroll={false} contentStyle={{ justifyContent: 'center' }}>
      <Card>
        {state === 'verifying' ? (
          <>
            <ActivityIndicator color={t.blue} />
            <Text accessibilityRole="header" style={{ ...heading, marginTop: spacing[4] }}>
              Verifying your email…
            </Text>
            <Text style={body}>Just a moment.</Text>
          </>
        ) : null}
        {state === 'success' ? (
          <>
            <Text accessibilityRole="header" style={heading}>
              Email verified!
            </Text>
            <Text style={body}>Your account is ready. Please log in to get started.</Text>
            <Button
              title="Go to log in"
              variant="primary"
              onPress={() => router.replace('/(auth)/login')}
              style={{ marginTop: spacing[6] }}
            />
          </>
        ) : null}
        {state === 'offline' ? (
          <>
            <Text accessibilityRole="header" style={heading}>
              Couldn't reach Towinly
            </Text>
            <Text style={body}>
              Your link is still good. We just couldn't get through to check it. Please check your
              connection and try again.
            </Text>
            <Button
              title="Try again"
              variant="primary"
              onPress={verify}
              style={{ marginTop: spacing[6] }}
            />
          </>
        ) : null}
        {state === 'error' ? (
          <>
            <Text accessibilityRole="header" style={heading}>
              Link didn't work
            </Text>
            <Text style={body}>
              This link is invalid or has expired. Please sign up again to get a fresh one.
            </Text>
            <Button
              title="Back to sign up"
              variant="primary"
              onPress={() => router.replace('/(auth)/register')}
              style={{ marginTop: spacing[6] }}
            />
          </>
        ) : null}
      </Card>
    </Screen>
  );
}
