// Placeholder tab shell — US-007 builds the real role-aware 4-tab bar
// (Home · center action · Messages · Profile). This exists so the index
// redirect resolves for logged-in users.
import { Redirect, Tabs } from 'expo-router';
import { Home } from 'lucide-react-native';
import { useAuth } from '../../src/context/AuthContext';
import { useTheme } from '../../src/theme/ThemeContext';

export default function TabsLayout() {
  const { t } = useTheme();
  const { user, booted } = useAuth();

  // Auth guard: after logout or a dead session (401), leaving the user inside
  // the tabs would render silently empty screens — bounce to welcome instead.
  if (booted && !user) return <Redirect href="/(auth)/welcome" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: t.blueDeep,
        tabBarInactiveTintColor: t.inkSlate,
        tabBarStyle: {
          backgroundColor: t.canvas,
          borderTopWidth: 1,
          borderTopColor: t.border,
        },
        sceneStyle: { backgroundColor: t.surface },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => <Home color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
