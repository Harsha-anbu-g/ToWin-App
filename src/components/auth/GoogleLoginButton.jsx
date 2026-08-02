// "Log in with Google" — the same door the website opens, web build only.
//
// A full-page redirect to the backend's Spring OAuth entry point. Google hands
// back to the WEBSITE's /oauth/callback (app.oauth.frontend-redirect), which
// exchanges the one-time code and stores the JWT under the shared-origin
// 'token' key — exactly what the app's web session bridge (src/lib/webSession)
// already reads. New users finish onboarding on the website page, then the
// phone redirect carries them back into the app at /app/dashboard.
//
// Native renders NOTHING: shipping Google in the store build triggers Apple
// guideline 4.8 (Sign in with Apple becomes mandatory) and needs the
// deep-link PKCE flow (src/lib/oauthFlow) — a release-phase decision.
// The caption and divider live inside this component so the native build
// never shows a divider with nothing above it.
import { Platform, Pressable, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { API_BASE_URL } from '../../api/config';
import {
  GOOGLE_G_BLUE,
  GOOGLE_G_GREEN,
  GOOGLE_G_RED,
  GOOGLE_G_YELLOW,
} from '../../theme/parity';
import { useTheme } from '../../theme/ThemeContext';

export const GOOGLE_OAUTH_URL = `${API_BASE_URL.replace(/\/api$/, '')}/oauth2/authorization/google`;

// Google's four-color G, traced from the website's GoogleButton.
function GoogleG() {
  return (
    <Svg width={20} height={20} viewBox="0 0 48 48">
      <Path fill={GOOGLE_G_YELLOW} d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 7.9 3l5.7-5.7C34.1 6.5 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.9z" />
      <Path fill={GOOGLE_G_RED} d="M6.3 14.7l6.6 4.8C14.7 15.4 19 12 24 12c3.1 0 5.8 1.1 7.9 3l5.7-5.7C34.1 6.5 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <Path fill={GOOGLE_G_GREEN} d="M24 44c5.2 0 9.9-1.9 13.5-5.1l-6.2-5.2C29.4 35.5 26.8 36 24 36c-5.2 0-9.7-3.3-11.3-8H6.5C9.9 35.7 16.4 44 24 44z" />
      <Path fill={GOOGLE_G_BLUE} d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.6l6.2 5.2C41 36.2 44 30.5 44 24c0-1.3-.1-2.7-.4-3.9z" />
    </Svg>
  );
}

export default function GoogleLoginButton({
  label = 'Log in with Google',
  dividerLabel = 'or log in with username',
  style,
}) {
  const { t, radius, text, spacing } = useTheme();
  if (Platform.OS !== 'web') return null;

  return (
    <View style={style}>
      <Pressable
        accessibilityRole="link"
        accessibilityLabel={label}
        onPress={() => window.location.assign(GOOGLE_OAUTH_URL)}
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
          minHeight: 48,
          backgroundColor: t.canvas,
          borderWidth: 1.5,
          borderColor: pressed ? t.blueSoft : t.border,
          borderRadius: radius.pill,
        })}
      >
        <GoogleG />
        <Text style={{ fontSize: 16, fontWeight: '500', color: t.ink }}>{label}</Text>
      </Pressable>
      <Text style={{ fontSize: text.sm, color: t.ink4, textAlign: 'center', marginTop: spacing[2] }}>
        Fastest way in, no password to remember.
      </Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[3], marginVertical: spacing[5] }}>
        <View style={{ flex: 1, height: 1, backgroundColor: t.border }} />
        <Text style={{ fontSize: text.sm, color: t.ink4 }}>{dividerLabel}</Text>
        <View style={{ flex: 1, height: 1, backgroundColor: t.border }} />
      </View>
    </View>
  );
}
