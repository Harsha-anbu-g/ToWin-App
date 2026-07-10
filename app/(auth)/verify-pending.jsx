// Placeholder verify-pending gate — US-006 ports the full VerifyPending.jsx
// (resend + "I've verified — log in again"). Present now so the unverified
// redirect resolves instead of hitting an unmatched route.
import { Text } from 'react-native';
import Button from '../../src/components/ui/Button';
import Card from '../../src/components/ui/Card';
import Screen from '../../src/components/ui/Screen';
import { useAuth } from '../../src/context/AuthContext';
import { useTheme } from '../../src/theme/ThemeContext';

export default function VerifyPending() {
  const { t, spacing, text, fontFamily } = useTheme();
  const { logout } = useAuth();

  return (
    <Screen scroll={false} contentStyle={{ justifyContent: 'center' }}>
      <Card>
        <Text
          accessibilityRole="header"
          style={{ fontFamily: fontFamily.display, fontSize: text.xl, color: t.ink }}
        >
          Please verify your email
        </Text>
        <Text
          style={{
            marginTop: spacing[3],
            fontSize: text.base,
            lineHeight: 27,
            color: t.inkSlate,
          }}
        >
          We sent you a link. Open it in your email app, then log in again.
        </Text>
        <Button
          title="Back to log in"
          variant="primary"
          onPress={logout}
          style={{ marginTop: spacing[6] }}
        />
      </Card>
    </Screen>
  );
}
