// The Instagram-shaped tab shell (spec): Home · big center action · Messages ·
// Profile. Role-aware center button — elder: "Ask for help" (post a request),
// helper: "Find requests". Labels always visible (elder-first); tab bar is a
// white surface with a warm top hairline; targets >=44pt.
import { useQuery } from '@tanstack/react-query';
import { Redirect, Tabs } from 'expo-router';
import { Home, MessageCircle, Plus, Search, UserRound } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import api from '../../src/api/client';
import { useAuth } from '../../src/context/AuthContext';
import { centerActionFor } from '../../src/lib/roles';
import { useTheme } from '../../src/theme/ThemeContext';

function CenterActionButton({ label, Icon, onPress, accessibilityState, t }) {
  // A raised sky-blue circle in the reserved center slot — the ONE filled
  // primary of the shell. The whole slot is the target (>=44pt everywhere).
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={accessibilityState}
      onPress={onPress}
      style={({ pressed }) => ({
        flex: 1,
        alignItems: 'center',
        justifyContent: 'flex-start',
        opacity: pressed ? 0.85 : 1,
      })}
    >
      <View
        style={{
          width: 56,
          height: 56,
          borderRadius: 28,
          marginTop: -18, // raised above the bar, Instagram-style
          backgroundColor: t.actionFill,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 3,
          borderColor: t.canvas,
        }}
      >
        <Icon size={26} color={t.actionInk} strokeWidth={2.2} />
      </View>
      <Text
        numberOfLines={1}
        style={{ fontSize: 11, fontWeight: '600', color: t.blueDeep, marginTop: 3 }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export default function TabsLayout() {
  const { t } = useTheme();
  const { user, booted } = useAuth();
  const insets = useSafeAreaInsets();

  // Unread conversations badge — backend returns a plain integer (NavBar.jsx parity)
  const { data: unread } = useQuery({
    queryKey: ['unread-count'],
    queryFn: async () => (await api.get('/messages/unread-count')).data,
    refetchInterval: 30_000,
    enabled: !!user,
  });

  // Auth guard: after logout or a dead session (401), leaving the user inside
  // the tabs would render silently empty screens — bounce to welcome instead.
  if (booted && !user) return <Redirect href="/(auth)/welcome" />;

  const action = centerActionFor(user?.role);
  const ActionIcon = action.key === 'find' ? Search : Plus;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: t.blueDeep,
        tabBarInactiveTintColor: t.inkSlate,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        tabBarStyle: {
          backgroundColor: t.canvas,
          borderTopWidth: 1,
          borderTopColor: t.border,
          height: 64 + insets.bottom,
          paddingTop: 6,
          paddingBottom: Math.max(insets.bottom, 8),
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
      <Tabs.Screen
        name="action"
        options={{
          title: action.label,
          tabBarButton: (props) => (
            <CenterActionButton
              label={action.label}
              Icon={ActionIcon}
              onPress={props.onPress}
              accessibilityState={props.accessibilityState}
              t={t}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: 'Messages',
          tabBarIcon: ({ color, size }) => <MessageCircle color={color} size={size} />,
          tabBarBadge: unread > 0 ? unread : undefined,
          tabBarBadgeStyle: {
            backgroundColor: t.blue, // gentle, not a red storm (HCI-RULES)
            color: '#fff',
            fontSize: 11,
          },
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => <UserRound color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
