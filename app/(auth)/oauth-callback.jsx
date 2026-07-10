// OAuth callback — port of OAuthCallback.jsx. Handles the Google redirect
// (towin://oauth-callback?code=…&state=…): exchanges the code, then either logs
// in (READY) or continues to finish-setup (NEEDS_ONBOARDING). The Google button
// itself ships in the release phase; this landing is ready for it.
// SECURITY: the exchange runs ONLY when the deep link's `state` matches a flow
// this app started (consumeOAuthFlow) — an unsolicited or replayed link is
// refused, closing OAuth login-CSRF. The PKCE code_verifier is sent so the
// server can bind the code to this client.
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Text } from 'react-native';
import api from '../../src/api/client';
import Button from '../../src/components/ui/Button';
import Card from '../../src/components/ui/Card';
import Screen from '../../src/components/ui/Screen';
import { useAuth } from '../../src/context/AuthContext';
import { consumeOAuthFlow } from '../../src/lib/oauthFlow';
import { useTheme } from '../../src/theme/ThemeContext';

export default function OAuthCallback() {
  const { t, spacing, text, fontFamily } = useTheme();
  const { code, state, error: oauthError } = useLocalSearchParams();
  const { login } = useAuth();
  const router = useRouter();
  const [error, setError] = useState('');
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    (async () => {
      if (oauthError || !code) {
        setError('Could not connect with Google. Please try again.');
        return;
      }

      const codeVerifier = await consumeOAuthFlow(state);
      if (!codeVerifier) {
        // No pending sign-in from THIS app (or state mismatch) — refuse.
        setError('Could not verify this sign-in attempt. Please start again from the log in screen.');
        return;
      }

      api
        .post('/auth/oauth/exchange', { code, state, codeVerifier })
        .then(async ({ data }) => {
        if (data.status === 'READY') {
          await login(data.token);
          router.replace('/'); // index routes by role/verification state
        } else if (data.status === 'NEEDS_ONBOARDING') {
          router.replace({
            pathname: '/(auth)/finish-setup',
            params: { onboardingToken: data.onboardingToken, email: data.email, name: data.name },
          });
        } else {
          setError('Something went wrong. Please try again.');
        }
        })
        .catch(() => setError('Something went wrong. Please try again.'));
    })();
  }, [code, state, oauthError, login, router]);

  return (
    <Screen scroll={false} contentStyle={{ justifyContent: 'center' }}>
      <Card>
        {error ? (
          <>
            <Text
              accessibilityRole="alert"
              style={{ fontSize: text.base, lineHeight: 26, color: t.redError, textAlign: 'center' }}
            >
              {error}
            </Text>
            <Button
              title="Back to log in"
              variant="primary"
              onPress={() => router.replace('/(auth)/login')}
              style={{ marginTop: spacing[5] }}
            />
          </>
        ) : (
          <>
            <ActivityIndicator color={t.blue} />
            <Text
              accessibilityRole="header"
              style={{
                fontFamily: fontFamily.display,
                fontSize: text.lg,
                color: t.ink,
                textAlign: 'center',
                marginTop: spacing[4],
              }}
            >
              Connecting with Google…
            </Text>
          </>
        )}
      </Card>
    </Screen>
  );
}
