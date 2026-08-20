// Redesign tab shell (handoff §Navigation): 5 slots, role-aware.
// Elder (and BOTH): Home · Posted Help · [Post Help FAB] · Messages · Profile
// Helper:           Home · My Elders  · [Offer Help FAB] · Messages · Profile
// Active tab = blueDeep icon and label at a heavier stroke; inactive =
// inkSlate at 1.8px; icons 22, labels always visible (elder-first). The
// gliding glass lens was removed 2026-08-19 (owner on the TestFlight build:
// "no lens at all, normal is good at bottom") — color alone marks the active
// tab now, the way the platform default does. The center FAB is a 54pt
// raised circle with a 3px page-colored ring; it turns blueDeep while its
// own screen is open. Tab bar is a translucent surface with a hairline top
// border — no shadows.
import { useQuery } from '@tanstack/react-query';
import { Redirect, Tabs } from 'expo-router';
import { BlurView } from 'expo-blur';
import { useEffect } from 'react';
import {
  FileText,
  MessageCircle,
  Plus,
  Search,
  UserRound,
  UsersRound,
} from '../../src/components/icons';
import { Platform, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import api from '../../src/api/client';
import AskAiAssistant from '../../src/components/AskAiAssistant';
import { useAuth } from '../../src/context/AuthContext';
import { haptic } from '../../src/lib/haptics';
import { setAppBadgeCountAsync } from '../../src/lib/pushNotifications';
import { centerActionFor, homeTabFor, secondTabFor } from '../../src/lib/roles';
import { useUnseenBadge } from '../../src/lib/seenIds';
import { useTheme } from '../../src/theme/ThemeContext';

// `count` renders the badge ourselves instead of via tabBarBadge: the library's
// Badge Text exposes no maxFontSizeMultiplier, so at large OS text an uncapped
// count would balloon out of the bar (UX-701).
//
// Every badge is the same red (owner call 2026-08-19: "the message
// notification should also in the red color") — Messages used to wear a
// gentler deep sky while new-activity counts wore red, and one bar carrying
// two badge colors read as two different kinds of thing. Red on white clears
// 5.89:1; in night mode the red lightens and the numeral takes the dark
// canvas, which lands at the same ratio.
const tabIcon = (Icon, count) =>
  function TabIcon({ color, focused }) {
    const { t, fontScaleCaps } = useTheme();
    const shown = count > 0 ? count : null;
    return (
      // No fill and no lens — color and stroke weight mark the active tab.
      <View
        style={{
          paddingHorizontal: 16,
          paddingVertical: 3,
        }}
      >
        <Icon size={22} color={color} strokeWidth={focused ? 2.2 : 1.8} />
        {shown != null ? (
          // Hidden from assistive tech: the icon renders twice (stacked
          // active/inactive crossfade copies), so a focusable count here would
          // be announced twice — the count lives in the tab's own label.
          <Text
            numberOfLines={1}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            maxFontSizeMultiplier={fontScaleCaps.chrome}
            style={{
              position: 'absolute',
              top: -4,
              right: 6,
              minWidth: 16,
              height: 16,
              lineHeight: 15,
              borderRadius: 8,
              paddingHorizontal: 4,
              overflow: 'hidden',
              textAlign: 'center',
              fontSize: 11,
              fontWeight: '600',
              backgroundColor: t.red,
              color: t.canvas,
            }}
          >
            {shown}
          </Text>
        ) : null}
      </View>
    );
  };

// The spoken name of a tab, count folded in ("Messages, 3 unread"): a badge
// number read on its own means nothing to a screen reader user. iOS also gets
// the ", tab" the library only adds to plain string labels; Android announces
// the role natively, and with no count the default children reading is right.
function tabA11yLabel(label, count = 0, noun = '') {
  const withCount = count > 0 ? `${label}, ${count} ${noun}` : label;
  if (Platform.OS === 'ios') return `${withCount}, tab`;
  return count > 0 ? withCount : undefined;
}

// The bar's own glass: content scrolls beneath and blurs through. Android's
// view blur is costly — its bar stays a solid surface. The gliding lens that
// used to ride on top of this is gone (owner call 2026-08-19).
function TabBarBackground() {
  const { mode } = useTheme();
  if (Platform.OS === 'android') return null;
  return (
    <BlurView
      intensity={30}
      tint={mode === 'dark' ? 'dark' : 'light'}
      style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
    />
  );
}

function CenterActionButton({ label, Icon, onPress, accessibilityState, t, type, fontScaleCaps, pressRipple }) {
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
      android_ripple={pressRipple}
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
        maxFontSizeMultiplier={fontScaleCaps.chrome}
        style={{
          fontSize: type.tabLabel,
          // Explicit, because this label is ours rather than the library's:
          // without it the line box was exactly the font size and the "p"
          // descenders in "Post Help" were sliced off (seen 2026-08-19). The
          // raised circle leaves the stack a couple of points taller than the
          // bar's content box, so flex was shrinking this line and clipping
          // it — the label keeps its full height instead.
          lineHeight: Math.round(type.tabLabel * 1.25),
          flexShrink: 0,
          fontWeight: '600',
          color: t.blueDeep,
          marginTop: 2,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export default function TabsLayout() {
  const { t, mode, type, fontScaleCaps, pressRipple } = useTheme();
  const { user, booted } = useAuth();
  const insets = useSafeAreaInsets();

  // Red "new activity" badges (web b37420d): new people on the hub tab, new
  // applicants on Posted Help. Seen-state lives in src/lib/seenIds; the
  // screens mark their tokens seen on focus.
  const { data: connectionsData } = useQuery({
    queryKey: ['connections'],
    queryFn: async () => (await api.get('/connections')).data,
    enabled: !!user,
  });
  const isElderSeat = user?.role === 'ELDER' || user?.role === 'BOTH';
  const { data: needsData } = useQuery({
    queryKey: ['needs-mine'],
    queryFn: async () => (await api.get('/needs/mine')).data,
    enabled: !!user && isElderSeat,
  });
  const connTokens = (Array.isArray(connectionsData) ? connectionsData : [])
    .filter((c) => c.status === 'ACTIVE' && c.type !== 'FAMILY')
    .map((c) => `${c.id}:${c.status}`);
  const applicantTokens = (needsData?.content ?? []).flatMap((n) =>
    (n.applications ?? []).map((a) => `${n.id}:${a.helperId}`)
  );
  const connBadge = useUnseenBadge(user?.userId, 'connections', connTokens);
  const applicantsBadge = useUnseenBadge(user?.userId, 'applicants', applicantTokens);

  // Unread conversations badge — backend returns a plain integer (NavBar.jsx parity)
  const { data: unread } = useQuery({
    queryKey: ['unread-count'],
    queryFn: async () => (await api.get('/messages/unread-count')).data,
    refetchInterval: 30_000,
    enabled: !!user,
  });

  const action = centerActionFor(user?.role);
  const second = secondTabFor(user?.role);
  const homeTab = homeTabFor(user?.role);
  // FAMILY has no center action at all (roles.js) — the slot disappears and
  // the bar is Home · Messages · Profile.
  const ActionIcon = action?.key === 'find' ? Search : Plus;
  // The app icon's badge mirrors unread conversations (owner call
  // 2026-08-17: Apple behavior everywhere) — cleared when the count is,
  // and on logout, when unread goes undefined → 0.
  useEffect(() => {
    setAppBadgeCountAsync(Number(unread) || 0);
  }, [unread]);

  // Auth guard: after logout or a dead session (401), leaving the user inside
  // the tabs would render silently empty screens — bounce to Log In instead
  // (the landing story is first-launch-only; returning users skip it). Sits
  // BELOW the hooks so the hook order never changes between renders.
  if (booted && !user) return <Redirect href="/(auth)/login" />;

  return (
    <View style={{ flex: 1 }}>
    <Tabs
      // UX-703: every tab press answers back. The bar emits tabPress from every
      // slot's onPress (the center FAB's custom button included), so one
      // listener gives the whole shell the same light impact. Visible feedback
      // is the library's own press state (opacity dip on iOS/web, ripple on
      // Android) plus the FAB's pressed opacity below.
      screenListeners={{ tabPress: () => haptic.impact() }}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: t.blueDeep,
        tabBarInactiveTintColor: t.inkSlate,
        // Custom label, not tabBarLabelStyle: the library's Label offers no
        // maxFontSizeMultiplier, and at large OS text an uncapped 11px label
        // wraps the whole bar (UX-701). 11 stays the hard platform floor.
        tabBarLabel: ({ color, children }) => (
          <Text
            numberOfLines={1}
            maxFontSizeMultiplier={fontScaleCaps.chrome}
            style={{
              fontSize: type.tabLabel,
              fontWeight: '600',
              color,
            }}
          >
            {children}
          </Text>
        ),
        // Floating translucent bar (owner call 2026-08-17: the iOS look) —
        // content scrolls beneath it and blurs through TabBarBackground. The
        // wash over the blur keeps icons and labels at full contrast. Android
        // skips the blur, so its bar stays the solid canvas it always was.
        tabBarStyle: {
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor:
            Platform.OS === 'android'
              ? t.canvas
              : mode === 'dark'
                ? 'rgba(32,31,29,0.78)'
                : 'rgba(255,255,255,0.72)',
          borderTopWidth: 1,
          borderTopColor: t.border,
          // 76, not 64: room for the center circle to sit fully INSIDE its
          // Pressable (Android drops touches outside parent bounds).
          height: 76 + insets.bottom,
          paddingTop: 8,
          paddingBottom: Math.max(insets.bottom, 8),
        },
        tabBarBackground: () => <TabBarBackground />,
        sceneStyle: { backgroundColor: t.surface },
      }}
    >
      {/* First tab IS the relationship hub — My Helpers / My Elders by role */}
      <Tabs.Screen
        name="home"
        options={{
          title: homeTab.label,
          tabBarIcon: tabIcon(UsersRound, connBadge),
          tabBarAccessibilityLabel: tabA11yLabel(homeTab.label, connBadge, 'new'),
        }}
      />
      <Tabs.Screen
        name="posted-help"
        options={{
          title: 'Posted Help',
          tabBarIcon: tabIcon(FileText, applicantsBadge),
          href: second?.name === 'posted-help' ? undefined : null,
          tabBarAccessibilityLabel: tabA11yLabel('Posted Help', applicantsBadge, 'new'),
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
                    fontScaleCaps={fontScaleCaps}
                    pressRipple={pressRipple}
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
          tabBarIcon: tabIcon(MessageCircle, unread),
          tabBarAccessibilityLabel: tabA11yLabel('Messages', unread, 'unread'),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: tabIcon(UserRound),
          tabBarAccessibilityLabel: tabA11yLabel('Profile'),
        }}
      />
    </Tabs>
    {/* Ask-AI floating helper — tabs only; chat thread + feedback pin their own bottom UI */}
    <AskAiAssistant />
    </View>
  );
}
