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
import { Redirect, Tabs, usePathname, useRouter } from 'expo-router';
import { BlurView } from 'expo-blur';
import { useEffect, useRef, useState } from 'react';
import {
  FileText,
  MessageCircle,
  Plus,
  Search,
  UserRound,
  UsersRound,
} from '../../src/components/icons';
import {
  Animated,
  PanResponder,
  Platform,
  Pressable,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import GlassLens, { hasLiquidGlass } from '../../src/components/ui/GlassLens';
import api from '../../src/api/client';
import AskAiAssistant from '../../src/components/AskAiAssistant';
import { useAuth } from '../../src/context/AuthContext';
import { haptic } from '../../src/lib/haptics';
import { setAppBadgeCountAsync } from '../../src/lib/pushNotifications';
import { useReducedMotion } from '../../src/lib/useReducedMotion';
import { centerActionFor, homeTabFor, secondTabFor } from '../../src/lib/roles';
import { useUnseenBadge } from '../../src/lib/seenIds';
import { DURATION, EASE } from '../../src/theme/motion';
import { useTheme } from '../../src/theme/ThemeContext';

// `badge` renders the count ourselves instead of via tabBarBadge: the library's
// Badge Text exposes no maxFontSizeMultiplier, so at large OS text an uncapped
// count would balloon out of the bar (UX-701). tone 'new' is the red "new
// activity" storm (web b37420d); 'unread' is the gentle deep sky — a badge is
// not an action, and its 11px numeral needs the real 4.5:1 (badgeFill waiver).
const tabIcon = (Icon, badge) =>
  function TabIcon({ color, focused }) {
    const { t, fontScaleCaps } = useTheme();
    const count = badge && badge.count > 0 ? badge.count : null;
    return (
      // No static fill — the bar's gliding glass lens (GlassTabBackground)
      // carries the active highlight now.
      <View
        style={{
          paddingHorizontal: 16,
          paddingVertical: 3,
          borderRadius: 999,
        }}
      >
        <Icon size={22} color={color} strokeWidth={focused ? 2.2 : 1.8} />
        {count != null ? (
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
              backgroundColor: badge.tone === 'unread' ? t.badgeFill : t.red,
              color: badge.tone === 'unread' ? t.actionInk : t.canvas,
            }}
          >
            {count}
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

// The lens capsule's geometry inside the 76pt bar: it wraps the WHOLE tab
// item — icon and label together (owner call 2026-08-17: "the lens should
// also cover the letter").
const LENS_TOP = 3;
const LENS_H = 58; // generous: icon row + the full label line, with air below

// The bar's glass sheet + the finger-following lens (owner calls
// 2026-08-17: the WhatsApp/Apple effect — a glass capsule that glides to
// the tab you choose and rides along under your finger when you drag the
// bar). Purely visual: it renders as the bar's BACKGROUND layer, so every
// real tab button, badge, and screen-reader label stays exactly as the
// library renders it. The layout above owns the animated values.
function GlassTabBackground({ animX, animW, shown, scale, ready }) {
  const { t, mode } = useTheme();
  return (
    <View style={{ flex: 1 }}>
      {/* The bar's own glass: content scrolls beneath and blurs through.
          Android's view blur is costly — its bar stays a solid surface. */}
      {Platform.OS !== 'android' ? (
        <BlurView
          intensity={30}
          tint={mode === 'dark' ? 'dark' : 'light'}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        />
      ) : null}
      {ready ? (
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: LENS_TOP,
            height: LENS_H,
            width: animW,
            borderRadius: 999,
            overflow: 'hidden',
            // Real Liquid Glass draws its own edge; only the fallback
            // composite needs the hairline to read as a capsule.
            borderWidth: hasLiquidGlass ? 0 : 1,
            borderColor: t.blueSoft,
            opacity: shown,
            transform: [{ translateX: animX }, { scale }],
          }}
        >
          <GlassLens tint={mode === 'dark' ? 'dark' : 'light'} washColor={t.blueTint} />
        </Animated.View>
      ) : null}
    </View>
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
        style={{ fontSize: type.tabLabel, fontWeight: '600', color: t.blueDeep, marginTop: 2 }}
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
  // The visible slots, in render order — the glass lens maps pathname → slot.
  const slots = [
    'home',
    ...(second?.name === 'posted-help' ? ['posted-help'] : []),
    ...(action ? ['action'] : []),
    'messages',
    'profile',
  ];

  // ---- The gliding glass lens (owner calls 2026-08-17: WhatsApp feel) ----
  // The bar spans the full window, so geometry needs no onLayout: slot width
  // is windowW / slots. The lens springs to the active tab on navigation and
  // rides directly under the finger during a horizontal drag on the bar.
  const { width: winW, height: winH } = useWindowDimensions();
  const pathname = usePathname();
  const router = useRouter();
  const reducedMotion = useReducedMotion();
  const slotW = slots.length > 0 ? winW / slots.length : 0;
  const barH = 76 + insets.bottom;
  const activeIndex = slots.indexOf(pathname.replace(/^\//, ''));
  const lensable = activeIndex >= 0 && slots[activeIndex] !== 'action';

  // The capsule hugs each tab's CONTENT, WhatsApp-style (owner report
  // 2026-08-17: a fixed width let long words poke out and drowned short
  // ones). Every rendered label reports its true width from onLayout —
  // covering the OS text-size setting — and the lens resizes as it glides.
  const [labelWidths, setLabelWidths] = useState({});
  const noteLabel = (title, w) =>
    setLabelWidths((prev) => (Math.abs((prev[title] ?? 0) - w) < 1 ? prev : { ...prev, [title]: w }));
  const slotTitles = {
    home: homeTab.label,
    'posted-help': 'Posted Help',
    messages: 'Messages',
    profile: 'Profile',
  };
  const lensWFor = (i, sw, widths) => {
    if (sw <= 0) return 0;
    const measured = widths[slotTitles[slots[i]]];
    // Icon row is 22pt wide; the label is usually the wider of the two.
    const content = Math.max(measured ?? 0, 22);
    const hug = measured ? content + 32 : Math.min(sw - 6, 96); // pre-measure fallback
    return Math.max(56, Math.min(hug, sw - 4));
  };

  const lensX = useRef(new Animated.Value(0)).current;
  const lensWAnim = useRef(new Animated.Value(0)).current;
  const lensShown = useRef(new Animated.Value(0)).current;
  const lensScale = useRef(new Animated.Value(1)).current;
  const dragging = useRef(false);
  const placed = useRef(false); // first render positions without animating

  // One spring voice for every lens move: quick, critically damped — the
  // organic WhatsApp glide, no visible bounce (Emil rule still holds).
  // JS-driven: width is a layout prop the native driver can't animate, and
  // one view can't mix drivers — the bar is a single small view, so the JS
  // driver keeps up fine.
  const LENS_SPRING = { damping: 26, stiffness: 320, mass: 0.9, useNativeDriver: false };
  const centerOf = (i, sw, lw) => i * sw + (sw - lw) / 2;

  useEffect(() => {
    if (slotW <= 0 || dragging.current) return;
    if (!lensable) {
      if (reducedMotion) lensShown.setValue(0);
      else Animated.timing(lensShown, { toValue: 0, duration: DURATION.fast, easing: EASE.exit, useNativeDriver: false }).start();
      return;
    }
    const lw = lensWFor(activeIndex, slotW, labelWidths);
    const dest = centerOf(activeIndex, slotW, lw);
    if (reducedMotion || !placed.current) {
      placed.current = true;
      lensX.setValue(dest);
      lensWAnim.setValue(lw);
      lensShown.setValue(1);
      return;
    }
    Animated.timing(lensShown, { toValue: 1, duration: DURATION.fast, easing: EASE.out, useNativeDriver: false }).start();
    Animated.spring(lensX, { toValue: dest, ...LENS_SPRING }).start();
    Animated.spring(lensWAnim, { toValue: lw, ...LENS_SPRING }).start();
    // The spring config is a stable literal and the Animated.Values are refs —
    // only real geometry/route/measure changes should re-run this.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIndex, lensable, slotW, labelWidths, reducedMotion]);

  // Live state for the drag responder (created once; reads through the ref).
  const live = useRef({ hovered: -1 });
  live.current = {
    ...live.current,
    slots, slotW, winW, winH, barH, activeIndex, lensable, labelWidths,
    grab: () => {
      dragging.current = true;
      live.current.hovered = -1;
      haptic.selection();
      Animated.spring(lensScale, { toValue: 1.08, ...LENS_SPRING }).start();
      Animated.timing(lensShown, { toValue: 1, duration: DURATION.fast, easing: EASE.out, useNativeDriver: false }).start();
    },
    track: (pageX) => {
      const { winW: w, slots: s, slotW: sw, labelWidths: widths } = live.current;
      // Hug whichever tab the finger is over: the width morphs mid-glide.
      const over = Math.min(s.length - 1, Math.max(0, Math.floor(pageX / sw)));
      if (over !== live.current.hovered) {
        live.current.hovered = over;
        Animated.spring(lensWAnim, { toValue: lensWFor(over, sw, widths), ...LENS_SPRING }).start();
      }
      const lw = lensWFor(over, sw, widths);
      lensX.setValue(Math.min(Math.max(pageX - lw / 2, 2), w - lw - 2));
    },
    drop: (pageX) => {
      const { slots: s, slotW: sw, activeIndex: cur, labelWidths: widths } = live.current;
      dragging.current = false;
      Animated.spring(lensScale, { toValue: 1, ...LENS_SPRING }).start();
      let idx = Math.min(s.length - 1, Math.max(0, Math.floor(pageX / sw)));
      if (s[idx] === 'action') {
        // The FAB opens a form — a drag never lands on it; roll to the
        // nearer ordinary tab instead.
        idx = pageX / sw - idx < 0.5 ? Math.max(0, idx - 1) : Math.min(s.length - 1, idx + 1);
        if (s[idx] === 'action') idx = Math.max(0, cur);
      }
      const lw = lensWFor(idx, sw, widths);
      Animated.spring(lensX, { toValue: centerOf(idx, sw, lw), ...LENS_SPRING }).start();
      Animated.spring(lensWAnim, { toValue: lw, ...LENS_SPRING }).start();
      if (idx !== cur && s[idx]) {
        haptic.impact();
        router.push(`/${s[idx]}`);
      }
    },
    cancel: () => {
      const { slotW: sw, activeIndex: cur, lensable: ok, labelWidths: widths } = live.current;
      dragging.current = false;
      Animated.spring(lensScale, { toValue: 1, ...LENS_SPRING }).start();
      if (ok) {
        const lw = lensWFor(cur, sw, widths);
        Animated.spring(lensX, { toValue: centerOf(cur, sw, lw), ...LENS_SPRING }).start();
        Animated.spring(lensWAnim, { toValue: lw, ...LENS_SPRING }).start();
      }
    },
  };

  // Captures only a clearly horizontal drag that starts INSIDE the bar; taps
  // fall through to the real tab buttons untouched, and gestures anywhere
  // else on the screen never reach this.
  const barPan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponderCapture: (e, g) => {
        const { winH: h, barH: bh } = live.current;
        return (
          e.nativeEvent.pageY > h - bh &&
          Math.abs(g.dx) > 10 &&
          Math.abs(g.dx) > Math.abs(g.dy) * 1.5
        );
      },
      onPanResponderGrant: () => live.current.grab(),
      onPanResponderMove: (e) => live.current.track(e.nativeEvent.pageX),
      onPanResponderRelease: (e) => live.current.drop(e.nativeEvent.pageX),
      onPanResponderTerminate: () => live.current.cancel(),
    })
  ).current;

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
    <View style={{ flex: 1 }} {...barPan.panHandlers}>
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
            // Each label reports its rendered width so the lens can hug it.
            onLayout={(e) => noteLabel(children, e.nativeEvent.layout.width)}
            style={{ fontSize: type.tabLabel, fontWeight: '600', color }}
          >
            {children}
          </Text>
        ),
        // Floating glass bar (owner call 2026-08-17: the iOS look) — content
        // scrolls beneath it and blurs through GlassTabBackground. The wash
        // over the blur keeps icons and labels at full contrast. Android
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
        tabBarBackground: () => (
          <GlassTabBackground
            animX={lensX}
            animW={lensWAnim}
            shown={lensShown}
            scale={lensScale}
            ready={slotW > 0}
          />
        ),
        sceneStyle: { backgroundColor: t.surface },
      }}
    >
      {/* First tab IS the relationship hub — My Helpers / My Elders by role */}
      <Tabs.Screen
        name="home"
        options={{
          title: homeTab.label,
          tabBarIcon: tabIcon(UsersRound, { count: connBadge, tone: 'new' }),
          tabBarAccessibilityLabel: tabA11yLabel(homeTab.label, connBadge, 'new'),
        }}
      />
      <Tabs.Screen
        name="posted-help"
        options={{
          title: 'Posted Help',
          tabBarIcon: tabIcon(FileText, { count: applicantsBadge, tone: 'new' }),
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
          tabBarIcon: tabIcon(MessageCircle, { count: unread, tone: 'unread' }),
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
