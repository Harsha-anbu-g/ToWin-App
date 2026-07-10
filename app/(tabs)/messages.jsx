// Messages — placeholder until US-013 (inbox) / US-014 (chat thread).
import { Text } from 'react-native';
import Card from '../../src/components/ui/Card';
import Screen from '../../src/components/ui/Screen';
import { useTheme } from '../../src/theme/ThemeContext';

export default function MessagesScreen() {
  const { t, text } = useTheme();

  return (
    <Screen title="Messages">
      <Card>
        <Text style={{ fontSize: text.base, lineHeight: 27, color: t.inkSlate }}>
          Your conversations arrive in the next build step.
        </Text>
      </Card>
    </Screen>
  );
}
