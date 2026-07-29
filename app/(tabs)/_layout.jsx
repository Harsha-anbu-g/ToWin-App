// Redesign tab shell (handoff §Navigation): 5 slots, role-aware.
// Elder (and BOTH): Home · Posted Help · [Post Help FAB] · Messages · Profile
// Helper:           Home · My Elders  · [Offer Help FAB] · Messages · Profile
// Active tab = blueDeep icon inside a sky-tint pill (user call 2026-07-12:
// stroke-weight alone was too subtle — "highlight more"); inactive = inkSlate
// at 1.8px; icons 22, labels 10/600 always visible (elder-first). The center
// FAB is a 54pt raised circle with a 3px page-colored ring; it turns blueDeep
// while its own screen is open. Tab bar is a white surface with a hairline
// top border — no shadows.
import { useQuery } from '@tanstack/react-query';
import { Redirect, Tabs } from 'expo-router';
import {
  FileText,
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
import { centerActionFor, homeTabFor, secondTabFor } from '../../src/lib/roles';
import { useTheme } from '../../src/theme/ThemeContext';

const tabIcon = (Icon) =>
  function TabIcon({ color, focused }) {
    const { t } = useTheme();
    return (
      <View
        style={{
          paddingHorizontal: 16,
          paddingVertical: 3,
          borderRadius: 999,
          backgroundColor: focused ? t.blueTint : 'transparent',
        }}
      >
        <Icon size={22} color={color} strokeWidth={focused ? 2.2 : 1.8} />
      </View>
    );
  };

function CenterActionButton({ label, Icon, onPress, accessibilityState, t, type }) {
  // The ONE filled primary of the shell. The whole slot is the target (>=44pt).
  // Rulebook pass 2026-07-27: the circle used marginTop:-18 to poke above the
  // bar — outside its Pressable's bounds, where Android drops touches, so the
  // FAB's top third was dead. The bar is 76pt now and the circle sits fully
  // inside its target; the white ring keeps the raised look.
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
          marginTop: -8, // slight lift, still fully inside the Pressable's box
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
        style={{ fontSize: type.tabLabel, fontWeight: '600', color: t.blueDeep, marginTop: 2 }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export default function TabsLayout() {
  const { t, type } = useTheme();
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
  const homeTab = homeTabFor(user?.role);
  // FAMILY has no center action at all (roles.js) — the slot disappears and
  // the bar is Home · Messages · Profile.
  const ActionIcon = action?.key === 'find' ? Search : Plus;

  return (
    <View style={{ flex: 1 }}>
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: t.blueDeep,
        tabBarInactiveTintColor: t.inkSlate,
        // 11 is the hard platform floor for tab labels — never lower (rulebook).
        tabBarLabelStyle: { fontSize: type.tabLabel, fontWeight: '600' },
        tabBarStyle: {
          backgroundColor: t.canvas,
          borderTopWidth: 1,
          borderTopColor: t.border,
          // 76, not 64: room for the center circle to sit fully INSIDE its
          // Pressable (Android drops touches outside parent bounds).
          height: 76 + insets.bottom,
          paddingTop: 8,
          paddingBottom: Math.max(insets.bottom, 8),
        },
        sceneStyle: { backgroundColor: t.surface },
      }}
    >
      {/* First tab IS the relationship hub — My Helpers / My Elders by role */}
      <Tabs.Screen
        name="home"
        options={{ title: homeTab.label, tabBarIcon: tabIcon(UsersRound) }}
      />
      <Tabs.Screen
        name="posted-help"
        options={{
          title: 'Posted Help',
          tabBarIcon: tabIcon(FileText),
          href: second?.name === 'posted-help' ? undefined : null,
        }}
      />
      {/* Old helper second tab — the hub moved to slot one; route redirects */}
      <Tabs.Screen name="my-elders" options={{ href: null }} />
      {/* Dashboard (3d) — check-in destination; not a tab, but keeps the tab bar */}
      <Tabs.Screen name="dashboard" options={{ href: null }} />
      <Tabs.Screen
        name="action"
        options={
          action
            ? {
                title: action.label,
                tabBarButton: (props) => (
                  <CenterActionButton
                    label={action.label}
                    Icon={ActionIcon}
                    onPress={props.onPress}
                    accessibilityState={props.accessibilityState}
                    t={t}
                    type={type}
                  />
                ),
              }
            : { href: null }
        }
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: 'Messages',
          tabBarIcon: tabIcon(MessageCircle),
          tabBarBadge: unread > 0 ? unread : undefined,
          tabBarBadgeStyle: {
            // Deep sky, not the action fill: gentle rather than a red storm
            // (HCI-RULES), but 11px white needs the real 4.5:1.
            backgroundColor: t.badgeFill,
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
