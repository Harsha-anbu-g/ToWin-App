// Admin — the admin panel itself stays web-only (locked scope decision).
// This screen exists so an ADMIN login lands somewhere sensible instead of an
// elder feed, and points them to the website.
import { Text } from 'react-native';
import Button from '../src/components/ui/Button';
import Card from '../src/components/ui/Card';
import Screen from '../src/components/ui/Screen';
import { useAuth } from '../src/context/AuthContext';
import { useConfirm } from '../src/context/ConfirmContext';
import { useTheme } from '../src/theme/ThemeContext';

export default function AdminScreen() {
  const { t, spacing, text, fontFamily } = useTheme();
  const { logout } = useAuth();
  const confirm = useConfirm();

  // Same gate and wording as the profile screen — every Log out in the app
  // asks before it acts (HCI rule 5: error prevention).
  const confirmLogout = async () => {
    const ok = await confirm({
      title: 'Log out?',
      message:
        'You will need your username and password to get back in. If you are not sure you have them, stay logged in.',
      cancelLabel: 'Stay logged in',
      confirmLabel: 'Log out',
    });
    if (ok) logout();
  };

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
          website. Open it on a computer and log in with this same account.
        </Text>
        <Button title="Log out" variant="secondary" onPress={confirmLogout} style={{ marginTop: spacing[6] }} />
      </Card>
    </Screen>
  );
}
