// Admin — the admin panel itself stays web-only (locked scope decision).
// This screen exists so an ADMIN login lands somewhere sensible instead of an
// elder feed, and points them to the website.
import { Text } from 'react-native';
import Button from '../src/components/ui/Button';
import Card from '../src/components/ui/Card';
import Screen from '../src/components/ui/Screen';
import { useAuth } from '../src/context/AuthContext';
import { useTheme } from '../src/theme/ThemeContext';

export default function AdminScreen() {
  const { t, spacing, text, fontFamily } = useTheme();
  const { logout } = useAuth();

  return (
    <Screen scroll={false} contentStyle={{ justifyContent: 'center' }}>
      <Card>
        <Text
          accessibilityRole="header"
          style={{ fontFamily: fontFamily.display, fontSize: text.xl, color: t.ink }}
        >
          Admin tools live on the website
        </Text>
        <Text style={{ fontSize: text.base, lineHeight: 27, color: t.inkSlate, marginTop: spacing[3] }}>
          You're signed in as an admin. Managing users, reports, and reviews happens on the Towinly
          website — open it on a computer and log in with this same account.
        </Text>
        <Button title="Log out" variant="secondary" onPress={logout} style={{ marginTop: spacing[6] }} />
      </Card>
    </Screen>
  );
}
