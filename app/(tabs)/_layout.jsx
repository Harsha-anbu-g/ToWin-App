// Redesign tab shell (handoff §Navigation): 5 slots, role-aware.
// Elder (and BOTH): Home · Posted Help · [Post Help FAB] · Messages · Profile
// Helper:           Home · My Elders  · [Offer Help FAB] · Messages · Profile
// Active tab = blueDeep icon and label at a heavier stroke; inactive =
// inkSlate at 1.8px; icons 22, labels always visible (elder-first). The
// gliding glass lens was removed 2026-08-19 (owner on the TestFlight build:
// "no lens at all, normal is good at bottom"), came back 2026-08-22 and went
// again 2026-09-25 (owner: "the 3d lens in the bottom bar, remove it, that not
// good"). Colour and a heavier icon stroke alone mark the active tab now, the
// way the platform default does. The frosted capsule stays. The center FAB is a
// 54pt raised circle with a 3px page-colored ring; it turns blueDeep while its
// own screen is open. Tab bar is a translucent surface with a hairline top
// border — no shadows.
import { useQuery } from '@tanstack/react-query';
import { Redirect, Tabs } from 'expo-router';
import { BlurView } from 'expo-blur';
import { FILL, GlassView, hasLiquidGlass } from '../../src/components/ui/glass';
import {
  TAB_BAR_FAB_SIZE,
  TAB_BAR_HEIGHT,
  TAB_BAR_RADIUS,
  isFloatingTabBar,
  tabBarBottom,
  tabBarCapsuleWidth,
} from '../../src/lib/tabBarMetrics';
import { useEffect, useState } from 'react';
import {
  FileText,
  MessageCircle,
  Plus,
  Search,
  UserRound,
  UsersRound,
} from '../../src/components/icons';
import {
  Platform,
  Pressable,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { listMyConnections } from '../../src/api/connections';
import { listMyHelpRequests } from '../../src/api/needs';
import { getUnreadMessageCount } from '../../src/api/messages';
import AskAiAssistant from '../../src/components/AskAiAssistant';
import BottomEdgeBlur from '../../src/components/ui/BottomEdgeBlur';
import { useAuth } from '../../src/context/AuthContext';
import { haptic } from '../../src/lib/haptics';
import { setAppBadgeCountAsync } from '../../src/lib/pushNotifications';
import { centerActionFor, homeTabFor, secondTabFor } from '../../src/lib/roles';
import { useUnseenTokens } from '../../src/lib/seenIds';
import { TRUST_STEPS_CATEGORY, isStepNewsPending, peopleWithNews, stepNewsTokens, stepsAwaitingMe } from '../../src/lib/trustStepBadges';
import { offersWaitingCount } from '../../src/lib/offersWaiting';
import { useTheme } from '../../src/theme/ThemeContext';

// `count` renders the badge ourselves instead of via tabBarBadge: the library's
// Badge Text exposes no maxFontSizeMultiplier, so at large OS text an uncapped
// count would balloon out of the bar (UX-701).
//
// Every badge is the same color — one bar carrying two badge colors read as
// two different kinds of thing (owner call 2026-08-19). That one color is now
// badgeFill (owner call 2026-08-22: "this red is not good"): the settled
// non-inverting badge blue, 4.60:1 with white and ≥3:1 on every surface in
// both themes, so the numeral stays constant white day and night.
const tabIcon = (Icon, count) =>
  function TabIcon({ color, focused }) {
    const { t, fontScaleCaps } = useTheme();
    const shown = count > 0 ? count : null;
    return (
      // No fill — color and stroke weight mark the active tab.
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
              // badgeFill, the settled non-inverting badge blue — the unread
              // red retired app-wide (owner call 2026-08-22).
              backgroundColor: t.badgeFill,
              color: t.badgeText,
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

// The bar's own material. On an iPhone that can draw it (iOS 26+) this is
// Apple's real Liquid Glass: content refracts at the bar's edge and the
// specular rim tracks the phone's tilt. That edge bending is the whole effect,
// and it is the part a hand-drawn blur can never fake. Older iOS keeps the
// blur-and-wash it always had. Android's view blur is costly and uneven, so
// its bar stays the solid surface it has always been. No sliding bubble under
// the active tab (owner call 2026-09-25): purely the bar's BACKGROUND layer,
// so every real tab button, badge, and screen-reader label stays exactly as the
// library renders it.
function GlassTabBackground() {
  const { mode } = useTheme();
  return (
    <View style={{ flex: 1 }}>
      {/* The sheet. iOS 26: real glass, radiused so the rim highlight and the
          edge refraction follow the capsule's own corners, not the parent's
          clip. Older iOS: the blur it always had. Android: solid (costly,
          uneven view blur) — the bar's own backgroundColor carries it. */}
      {Platform.OS !== 'android' ? (
        hasLiquidGlass ? (
          <GlassView
            glassEffectStyle="regular"
            // The app's night mode is opt-in only, never OS-driven (theme
            // rules) — without this the glass follows the OS and can go dark
            // under light-theme labels (verify sweep 2026-08-22).
            colorScheme={mode === 'dark' ? 'dark' : 'light'}
            // Frost, like WhatsApp's bar: untinted regular glass over the
            // app's white screens was near-invisible (owner report 2026-08-22,
            // "capsule should be big and well seem by eyes"). The tint keeps
            // the refraction and the rim while giving the capsule a body.
            tintColor={mode === 'dark' ? 'rgba(38,37,35,0.55)' : 'rgba(255,255,255,0.55)'}
            style={[FILL, isFloatingTabBar && { borderRadius: TAB_BAR_RADIUS }]}
          />
        ) : (
          <BlurView intensity={30} tint={mode === 'dark' ? 'dark' : 'light'} style={FILL} />
        )
      ) : null}
    </View>
  );
}

// The bar's fill sits UNDER TabBarBackground, so it has to get out of the way
// when the real glass draws — a 72%-opaque wash laid over Liquid Glass is just
// a wash, and the effect disappears. Android draws no background layer at all,
// so its fill stays the opaque canvas.
function tabBarFill(t, mode) {
  if (Platform.OS === 'android') return t.canvas;
  if (hasLiquidGlass) return 'transparent';
  return mode === 'dark' ? 'rgba(32,31,29,0.78)' : 'rgba(255,255,255,0.72)';
}

// Every tab scene carries the WhatsApp bottom edge: content blurs
// progressively as it slides into the bar's band (BottomEdgeBlur). Rendered
// per scene, under the tab bar — module-level so the navigator sees one
// stable function across re-renders.
const sceneWithBottomEdge = ({ children }) => (
  <>
    {children}
    <BottomEdgeBlur />
  </>
);

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
          width: TAB_BAR_FAB_SIZE,
          height: TAB_BAR_FAB_SIZE,
          borderRadius: TAB_BAR_FAB_SIZE / 2,
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

  // Badges. The hub tab counts new people (web b37420d; seen-state lives in
  // src/lib/seenIds and the hub marks its tokens seen on focus). Posted Help
  // counts helpers WAITING for an answer — every offer on a still-OPEN
  // request — and it stays until the elder accepts or removes the request,
  // never clearing just because the tab was opened (owner call 2026-08-28:
  // "in bottom bar posted help should show a notification"; same grammar as
  // the Messages badge, which counts people waiting, and as Updates, which
  // clears per row). An OPEN request's offers are all pending: accepting one
  // makes the request ASSIGNED, so the count is exactly who is still waiting.
  const { data: connectionsData } = useQuery({
    queryKey: ['connections'],
    queryFn: listMyConnections,
    enabled: !!user,
  });
  const isElderSeat = user?.role === 'ELDER' || user?.role === 'BOTH';
  const { data: needsData } = useQuery({
    queryKey: ['needs-mine'],
    queryFn: listMyHelpRequests,
    enabled: !!user && isElderSeat,
  });
  const isHelperSeat = user?.role === 'HELPER' || user?.role === 'BOTH';
  const conns = Array.isArray(connectionsData) ? connectionsData : [];
  const connTokens = conns
    .filter((c) => c.status === 'ACTIVE' && c.type !== 'FAMILY' && c.type !== 'PEER')
    .map((c) => `${c.id}:${c.status}`);
  const newPeople = useUnseenTokens(user?.userId, 'connections', connTokens);
  // Trust steps, both seats (owner calls 2026-08-28, src/lib/trustStepBadges):
  // the elder's hub counts helpers who accepted a step the elder has not
  // followed with the next Start (news, seeded so an old ladder is never
  // new, kept "until I accept"); the helper's hub counts elders whose step
  // is waiting for their accept, until they accept it. One number, people
  // (owner call 2026-08-26), a person with both counted once.
  const stepNews = useUnseenTokens(
    user?.userId,
    TRUST_STEPS_CATEGORY,
    isElderSeat ? stepNewsTokens(conns) : [],
    { seed: true }
  );
  const newsPending = isElderSeat ? conns.filter((c) => isStepNewsPending(c, stepNews)).map((c) => c.id) : [];
  const awaitingMe = isHelperSeat ? stepsAwaitingMe(conns).map((c) => c.id) : [];
  const connBadge = peopleWithNews(newPeople, [...newsPending, ...awaitingMe]);
  const applicantsBadge = offersWaitingCount(needsData?.content);

  // Unread conversations badge — backend returns a plain integer (NavBar.jsx parity)
  const { data: unread } = useQuery({
    queryKey: ['unread-count'],
    queryFn: getUnreadMessageCount,
    refetchInterval: 15_000, // one cheap grouped count; the badge lands within 15s
    enabled: !!user,
  });

  const action = centerActionFor(user?.role);
  const second = secondTabFor(user?.role);
  const homeTab = homeTabFor(user?.role);
  // FAMILY has no center action at all (roles.js) — the slot disappears and
  // the bar is Home · Messages · Profile.
  const ActionIcon = action?.key === 'find' ? Search : Plus;
  // The visible slots, in render order. The action keeps its center slot on
  // every platform (owner call 2026-08-22: "keep the original format and
  // order" — the Apple side-circle grammar was built and reverted the same day).
  const slots = [
    'home',
    ...(second?.name === 'posted-help' ? ['posted-help'] : []),
    ...(action ? ['action'] : []),
    'messages',
    'profile',
  ];

  // The capsule is the screen minus a fixed gap each side (tabBarCapsuleWidth)
  // and centred, so a slot is barW / slots. It is centred inside the bar's own
  // shell, not the window: on the phone the two are the same width; on a wide
  // web window the shell is the centred column, and a window-based `left`
  // parked the capsule off-centre (seen 2026-08-28). Measured once per layout,
  // window width until then.
  const { width: windowW } = useWindowDimensions();
  const [shellW, setShellW] = useState(null);
  const winW = shellW ?? windowW;
  const barW = isFloatingTabBar ? tabBarCapsuleWidth(winW) : winW;
  const barLeft = isFloatingTabBar ? (winW - barW) / 2 : 0;
  const slotW = slots.length > 0 ? barW / slots.length : 0;

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
    <View
      style={{ flex: 1 }}
      onLayout={(e) => {
        const w = e.nativeEvent.layout.width;
        setShellW((prev) => (prev === w ? prev : w));
      }}
    >
    <Tabs
      // UX-703: every tab press answers back. The bar emits tabPress from every
      // slot's onPress (the center FAB's custom button included), so one
      // listener gives the whole shell the same light impact. Visible feedback
      // is the library's own press state (opacity dip on iOS/web, ripple on
      // Android) plus the FAB's pressed opacity below.
      screenListeners={{ tabPress: () => haptic.impact() }}
      screenLayout={sceneWithBottomEdge}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: t.blueDeep,
        tabBarInactiveTintColor: t.inkSlate,
        // Custom label, not tabBarLabelStyle: the library's Label offers no
        // maxFontSizeMultiplier, and at large OS text an uncapped 11px label
        // wraps the whole bar (UX-701). 11 stays the hard platform floor.
        // The label gets a box as wide as its whole slot. The library pads
        // its inner button 5pt on every side (tabVerticalUiKit) and that
        // padding is out of tabBarItemStyle's reach, so in a 72pt slot a bare
        // Text had 62pt and "Posted Help" / "My Helpers" showed dots at
        // iPhone 16 Pro width (seen on the web build 2026-08-28) — the exact
        // thing ruled out on 2026-08-22 ("no ...... in the bar it should show
        // full name"). The slot-wide View overflows that padding evenly on
        // both sides.
        tabBarLabel: ({ color, children }) => (
          <View style={{ width: slotW, alignItems: 'center' }}>
            <Text
              numberOfLines={1}
              maxFontSizeMultiplier={fontScaleCaps.chrome}
              style={{
                fontSize: type.tabLabel,
                fontWeight: '600',
                color,
                // No maxWidth cap (see above): a full name beats an ellipsis.
              }}
            >
              {children}
            </Text>
          </View>
        ),
        // Floating translucent bar (owner call 2026-08-17: the iOS look) —
        // content scrolls beneath it and blurs through TabBarBackground. The
        // wash over the blur keeps icons and labels at full contrast. Android
        // skips the blur, so its bar stays the solid canvas it always was.
        // iOS: a detached capsule floating above the home indicator, content
        // visible around it — the iOS 26 grammar the owner pointed at in
        // WhatsApp and Instagram (2026-08-22). Android keeps its platform's own
        // edge-to-edge bar; a floating iOS capsule there would be a hand-drawn
        // copy of another platform's control (native controls first).
        tabBarStyle: isFloatingTabBar
          ? {
              position: 'absolute',
              // A small fixed gap each side, WhatsApp's shape (owner call
              // 2026-08-28); barW/barLeft are the same numbers the label boxes
              // are sized by. Symmetric insets, never
              // `left` + `width`: the library's own style already carries
              // `right: 0`, and on the owner's iPhone that trio resolved with
              // the capsule shoved to the left edge (2026-08-28 screenshot)
              // while desktop Chrome centred it. Two equal insets cannot be
              // read two ways.
              // `start`/`end`, NOT `left`/`right`: the library places the bar with
              // `start: 0, end: 0`, and on native Yoga the RTL-aware start/end win over
              // left/right whenever both are set — so `left: 21, right: 21` drew a
              // full-width bar on the phone (Radon simulator, 2026-08-28) while the
              // web, where both map to one CSS property and the later wins, showed 21.
              // With `left` + `width` the same rule shoved the capsule to the left
              // edge. Same axis as the library, so ours is the one read.
              start: barLeft,
              end: barLeft,
              // Inside the home-indicator zone, as WhatsApp's sits (tabBarMetrics).
              bottom: tabBarBottom(insets),
              height: TAB_BAR_HEIGHT,
              borderRadius: TAB_BAR_RADIUS,
              // Clips the blur fallback to the capsule; the GlassView carries
              // its own radius so the rim follows the shape.
              overflow: 'hidden',
              backgroundColor: tabBarFill(t, mode),
              // A hairline ring on glass too: the frosted capsule needs a
              // findable edge on white screens (owner report 2026-08-22 — the
              // borderless capsule could not be seen). Repeated per-side on
              // purpose: the library sets its own borderTopWidth, and in RN a
              // per-side value always beats our generic borderWidth.
              borderWidth: 1,
              borderTopWidth: 1,
              borderColor: t.border,
              // 8/6, not symmetric: tuned so the elder 11pt label floor sits
              // clear of the capsule's bottom corner arc. The safe-area padding
              // that lived inside the bar is gone — the capsule floats.
              paddingTop: 8,
              paddingBottom: 6,
            }
          : {
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: tabBarFill(t, mode),
              borderTopWidth: 1,
              borderTopColor: t.border,
              // 76, not 64: room for the center circle to sit fully INSIDE its
              // Pressable (Android drops touches outside parent bounds).
              height: TAB_BAR_HEIGHT + insets.bottom,
              paddingTop: 8,
              paddingBottom: Math.max(insets.bottom, 8),
            },
        tabBarBackground: () => <GlassTabBackground />,
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
          tabBarAccessibilityLabel: tabA11yLabel('Posted Help', applicantsBadge, 'waiting'),
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
