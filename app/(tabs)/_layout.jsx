// Redesign tab shell (handoff §Navigation): 5 slots, role-aware.
// Elder (and BOTH): Home · Posted Help · [Post Help FAB] · Messages · Profile
// Helper:           Home · My Elders  · [Offer Help FAB] · Messages · Profile
// Active tab = blueDeep at 2px stroke; inactive = inkSlate at 1.8px; icons 22,
// labels 10/600 always visible (elder-first). The center FAB is a 54pt raised
// circle with a 3px page-colored ring; it turns blueDeep while its own screen
// is open. Tab bar is a white surface with a hairline top border — no shadows.
import { useQuery } from '@tanstack/react-query';
import { Redirect, Tabs } from 'expo-router';
import {
  FileText,
  Home,
  MessageCircle,
  Plus,
  Search,
  UserRound,
  UsersRound,
} from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import api from '../../src/api/client';
import AskAiAssistant from '../../src/components/AskAiAssistant';
import { useAuth } from '../../src/context/AuthContext';
import { centerActionFor, secondTabFor } from '../../src/lib/roles';
import { useTheme } from '../../src/theme/ThemeContext';

const tabIcon = (Icon) =>
  function TabIcon({ color, focused }) {
    return <Icon size={22} color={color} strokeWidth={focused ? 2 : 1.8} />;
  };

function CenterActionButton({ label, Icon, onPress, accessibilityState, t }) {
  // The ONE filled primary of the shell. The whole slot is the target (>=44pt).
  const active = !!accessibilityState?.selected;
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
          width: 54,
          height: 54,
          borderRadius: 27,
          marginTop: -18, // raised above the bar
          backgroundColor: active ? t.blueDeep : t.actionFill,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 3,
          borderColor: t.canvas,
        }}
      >
        <Icon size={24} color={t.actionInk} strokeWidth={2.2} />
      </View>
      <Text
        numberOfLines={1}
        style={{ fontSize: 10, fontWeight: '600', color: t.blueDeep, marginTop: 3 }}
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
  // the tabs would render silently empty screens — bounce to Log In instead
  // (the landing story is first-launch-only; returning users skip it).
  if (booted && !user) return <Redirect href="/(auth)/login" />;

  const action = centerActionFor(user?.role);
  const second = secondTabFor(user?.role);
  const ActionIcon = action.key === 'find' ? Search : Plus;

  return (
    <View style={{ flex: 1 }}>
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: t.blueDeep,
        tabBarInactiveTintColor: t.inkSlate,
        tabBarLabelStyle: { fontSize: 10, fontWeight: '600' },
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
        options={{ title: 'Home', tabBarIcon: tabIcon(Home) }}
      />
      <Tabs.Screen
        name="posted-help"
        options={{
          title: 'Posted Help',
          tabBarIcon: tabIcon(FileText),
          href: second.name === 'posted-help' ? undefined : null,
        }}
      />
      <Tabs.Screen
        name="my-elders"
        options={{
          title: 'My Elders',
          tabBarIcon: tabIcon(UsersRound),
          href: second.name === 'my-elders' ? undefined : null,
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
          tabBarIcon: tabIcon(MessageCircle),
          tabBarBadge: unread > 0 ? unread : undefined,
          tabBarBadgeStyle: {
            backgroundColor: t.blue, // gentle, not a red storm (HCI-RULES)
            color: t.actionInk,
            fontSize: 11,
          },
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: 'Profile', tabBarIcon: tabIcon(UserRound) }}
      />
    </Tabs>
    {/* Ask-AI floating helper — tabs only; chat thread + feedback pin their own bottom UI */}
    <AskAiAssistant />
    </View>
  );
}
