// Posted Help — the elder's second tab (3f). Serif title + the shared
// segmented list (Looking for Help / In Progress / Completed).
import { Text, View } from 'react-native';
import PostedHelpList from '../../src/components/needs/PostedHelpList';
import Screen from '../../src/components/ui/Screen';
import { useTheme } from '../../src/theme/ThemeContext';

export default function PostedHelp() {
  const { t, spacing, fontFamily } = useTheme();
  return (
    // keyboard: the search box above the list (2026-08-28) opens one, and the
    // rows it narrows must stay above it, not under it (UX-702).
    <Screen scroll={false} keyboard contentStyle={{ padding: 0 }}>
      <View style={{ flex: 1, paddingHorizontal: spacing[4], paddingTop: spacing[3] }}>
        <Text
          accessibilityRole="header"
          style={{ fontFamily: fontFamily.display, fontSize: 28, color: t.ink, letterSpacing: -0.5 }}
        >
          Posted Help
        </Text>
        <PostedHelpList />
      </View>
    </Screen>
  );
}
