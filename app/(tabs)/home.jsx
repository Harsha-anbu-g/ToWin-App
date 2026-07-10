// Placeholder Home — US-008/US-009 build the real elder/helper feeds.
import { Text } from 'react-native';
import Card from '../../src/components/ui/Card';
import Screen from '../../src/components/ui/Screen';
import { useAuth } from '../../src/context/AuthContext';
import { useTheme } from '../../src/theme/ThemeContext';

export default function HomePlaceholder() {
  const { t, text, fontFamily } = useTheme();
  const { user } = useAuth();

  return (
    <Screen title="ToWin">
      <Card>
        <Text
          accessibilityRole="header"
          style={{ fontFamily: fontFamily.display, fontSize: text.lg, color: t.ink }}
        >
          Welcome home
        </Text>
        <Text style={{ marginTop: 8, fontSize: text.base, lineHeight: 27, color: t.inkSlate }}>
          You are logged in{user?.role ? ` as ${user.role.toLowerCase()}` : ''}. Your feed
          arrives in the next build step.
        </Text>
      </Card>
    </Screen>
  );
}
