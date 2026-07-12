// My requests — pushed from the ☰ menu; same shared Posted Help list as the
// elder's second tab (one source of truth for the request cards + actions).
import { View } from 'react-native';
import PostedHelpList from '../src/components/needs/PostedHelpList';
import Screen from '../src/components/ui/Screen';
import { useTheme } from '../src/theme/ThemeContext';

export default function MyRequests() {
  const { spacing } = useTheme();
  return (
    <Screen back title="My requests" scroll={false} contentStyle={{ padding: 0 }}>
      <View style={{ flex: 1, paddingHorizontal: spacing[4] }}>
        <PostedHelpList />
      </View>
    </Screen>
  );
}
