// Center action — placeholder until US-010 (elder: post a request; helper:
// browse open requests). Role decides the copy so the demo already reads right.
import { Text } from 'react-native';
import Card from '../../src/components/ui/Card';
import Screen from '../../src/components/ui/Screen';
import { useAuth } from '../../src/context/AuthContext';
import { centerActionFor } from '../../src/lib/roles';
import { useTheme } from '../../src/theme/ThemeContext';

export default function ActionScreen() {
  const { t, spacing, text, fontFamily } = useTheme();
  const { user } = useAuth();
  const action = centerActionFor(user?.role);

  return (
    <Screen title={action.label}>
      <Card>
        <Text style={{ fontSize: text.base, lineHeight: 27, color: t.inkSlate }}>
          {action.key === 'find'
            ? 'Browsing open requests nearby arrives in the next build step.'
            : 'Posting a request for help arrives in the next build step.'}
        </Text>
      </Card>
    </Screen>
  );
}
