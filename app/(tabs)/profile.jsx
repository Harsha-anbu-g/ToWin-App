// Profile — placeholder until US-018 (stats row, settings). Logout works now
// so testers can switch between the demo accounts.
import { Text } from 'react-native';
import Button from '../../src/components/ui/Button';
import Card from '../../src/components/ui/Card';
import Screen from '../../src/components/ui/Screen';
import { useAuth } from '../../src/context/AuthContext';
import { useTheme } from '../../src/theme/ThemeContext';

export default function ProfileScreen() {
  const { t, spacing, text, fontFamily } = useTheme();
  const { user, logout } = useAuth();

  return (
    <Screen title="Profile">
      <Card>
        <Text
          accessibilityRole="header"
          style={{ fontFamily: fontFamily.display, fontSize: text.lg, color: t.ink }}
        >
          My profile
        </Text>
        <Text style={{ marginTop: spacing[2], fontSize: text.base, lineHeight: 27, color: t.inkSlate }}>
          Logged in{user?.role ? ` as ${user.role.toLowerCase()}` : ''}. Your trust score,
          friends, and settings arrive in the next build steps.
        </Text>
        <Button
          title="Log out"
          variant="secondary"
          onPress={logout}
          style={{ marginTop: spacing[6] }}
          accessibilityHint="Signs you out of ToWin"
        />
      </Card>
    </Screen>
  );
}
