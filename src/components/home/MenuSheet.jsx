// The ☰ menu — a drawer that slides in from the LEFT (where the button
// lives), grouped rows inside. One feature per row, one feature per screen.
// Motion: transform only — 240ms ease-out in, 200ms accelerate out; reduced
// motion renders in place.
import { useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  Modal,
  Pressable,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Archive,
  BookOpen,
  Briefcase,
  CalendarCheck,
  ChevronRight,
  HandHelping,
  LogOut,
  PhoneCall,
  Plus,
  Puzzle,
  Search,
  UserRoundPlus,
  Users,
  UsersRound,
  X,
} from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import focusForScreenReader from '../../lib/focusForScreenReader';
import { useConfirm } from '../../context/ConfirmContext';
import { useReducedMotion } from '../../lib/useReducedMotion';
import { useTheme } from '../../theme/ThemeContext';
import TortoiseMark from '../TortoiseMark';

function Row({ icon: Icon, label, sublabel, onPress, first }) {
  const { t, spacing, text } = useTheme();
  // Plain arrow fns render a custom leading slot (the brand tortoise);
  // lucide icons (forwardRef objects, $$typeof set) get the standard look.
  const leading =
    typeof Icon === 'function' && !Icon.$$typeof ? (
      <Icon />
    ) : (
      <Icon size={24} color={t.blueDeep} strokeWidth={2} />
    );
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing[4],
        minHeight: 60,
        paddingHorizontal: spacing[5],
        borderTopWidth: first ? 0 : 1,
        borderTopColor: t.hairline,
        backgroundColor: pressed ? t.hoverWash : 'transparent',
      })}
    >
      <View style={{ width: 24, alignItems: 'center' }}>{leading}</View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: text.base, color: t.ink }}>{label}</Text>
        {sublabel ? (
          <Text style={{ fontSize: text.xs, color: t.inkSlate, marginTop: 1 }}>{sublabel}</Text>
        ) : null}
      </View>
      <ChevronRight size={20} color={t.ink4} />
    </Pressable>
  );
}

function Group({ children }) {
  const { t, radius, spacing } = useTheme();
  return (
    <View
      style={{
        backgroundColor: t.canvas,
        borderWidth: 1,
        borderColor: t.border,
        borderRadius: radius.xl,
        overflow: 'hidden',
        marginBottom: spacing[4],
      }}
    >
      {children}
    </View>
  );
}

export default function MenuSheet({ visible, onClose }) {
  const { t, spacing, text, fontFamily } = useTheme();
  const { user, logout } = useAuth();
  const confirm = useConfirm();
  const router = useRouter();
  const reducedMotion = useReducedMotion();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const drawerW = Math.min(width * 0.82, 320);
  const slide = useRef(new Animated.Value(-drawerW)).current;
  const scrim = useRef(new Animated.Value(0)).current;
  const headerRef = useRef(null); // screen-reader focus lands here on open

  useEffect(() => {
    if (!visible) return;
    if (reducedMotion) {
      slide.setValue(0);
      scrim.setValue(1);
      return;
    }
    slide.setValue(-drawerW);
    scrim.setValue(0);
    Animated.parallel([
      Animated.timing(slide, { toValue: 0, duration: 240, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(scrim, { toValue: 1, duration: 240, useNativeDriver: true }),
    ]).start();
  }, [visible, reducedMotion, drawerW, slide, scrim]);

  // Slide back out, then let the parent unmount the modal.
  const close = () => {
    if (reducedMotion) {
      onClose();
      return;
    }
    Animated.parallel([
      // Exits accelerate away (entrances decelerate in) — Material emphasized-accelerate
      Animated.timing(slide, { toValue: -drawerW, duration: 200, easing: Easing.bezier(0.3, 0, 0.8, 0.15), useNativeDriver: true }),
      Animated.timing(scrim, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => onClose());
  };

  const isHelper = user?.role === 'HELPER';
  const isElder = user?.role === 'ELDER' || user?.role === 'BOTH';
  // FAMILY (FAM-407 2026-07-19, web NavBar parity): watching over a parent —
  // no needs, streaks, or discovery surfaces, so the elder rows (Post Help,
  // Posted Help, My Helpers, Add Friends, Daily check-in) must never leak.
  const isFamily = user?.role === 'FAMILY';

  const go = (href) => {
    onClose();
    router.push(href);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={close}
      // Android Modal doesn't relocate TalkBack focus on its own — without
      // this, focus stays "stuck" on the hidden screen behind the drawer.
      onShow={() => focusForScreenReader(headerRef)}
    >
      {/* Scrim — tap anywhere outside the drawer to close */}
      <Animated.View style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: t.scrim, opacity: scrim }}>
        <Pressable accessibilityLabel="Close menu" onPress={close} style={{ flex: 1 }} />
      </Animated.View>

      <Animated.View
        style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          left: 0,
          width: drawerW,
          backgroundColor: t.surface,
          borderRightWidth: 1,
          borderRightColor: t.border,
          transform: [{ translateX: slide }],
          paddingTop: insets.top,
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: spacing[5],
            paddingVertical: spacing[4],
          }}
        >
          <Text
            ref={headerRef}
            accessibilityRole="header"
            style={{ fontFamily: fontFamily.display, fontSize: text.xl, color: t.ink, letterSpacing: -0.5 }}
          >
            Menu
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close menu"
            onPress={close}
            hitSlop={8}
            style={{ minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}
          >
            <X size={24} color={t.ink3} />
          </Pressable>
        </View>

        {/* Rows speak the redesign's names — the same words as the tabs and
            screen titles (Posted Help, Offer Help, My Helpers, Add Friends). */}
        <ScrollView contentContainerStyle={{ paddingHorizontal: spacing[4], paddingBottom: spacing[12] }}>
          <Group>
            {isHelper ? (
              <>
                <Row first icon={Search} label="Offer Help" sublabel="Needs from elders near you" onPress={() => go('/(tabs)/action')} />
                <Row icon={UsersRound} label="My Elders" sublabel="The elders you help" onPress={() => go('/(tabs)/home')} />
                {/* Helpers CAN apply (Offer Help) but had no way back to their
                    applications — /my-jobs existed unreachable (orphan fix). */}
                <Row icon={Briefcase} label="My offers & jobs" sublabel="Where your offers stand" onPress={() => go('/my-jobs')} />
              </>
            ) : isFamily ? (
              // Their whole world is the parents hub — no posting, no
              // discovery (web NavBar shows FAMILY no needs/friends links).
              <Row first icon={UsersRound} label="My Parents" sublabel="Your parents and news about them" onPress={() => go('/(tabs)/home')} />
            ) : (
              <>
                <Row first icon={Plus} label="Post Help" sublabel="Ask your neighbors for help" onPress={() => go('/(tabs)/action')} />
                <Row icon={HandHelping} label="Posted Help" sublabel="Help you've asked for" onPress={() => go('/(tabs)/posted-help')} />
                <Row icon={UsersRound} label="My Helpers" sublabel="Trust ladders with your helpers" onPress={() => go('/(tabs)/home')} />
                {/* Role BOTH has no Offer Help surface yet (its center action
                    is Post Help), so a "My offers" row would promise a list
                    that can never fill — hidden until an apply path exists. */}
              </>
            )}
            {!isFamily ? (
              <Row icon={UserRoundPlus} label="Add Friends" sublabel="Find people near you" onPress={() => go('/friends')} />
            ) : null}
          </Group>

          <Group>
            <Row first icon={() => <TortoiseMark size={24} />} label="Trust Score" sublabel="Your points and tier" onPress={() => go('/trust')} />
            {/* FAMILY has no streaks (home.jsx never fetches them) — a
                check-in row would open a surface the role doesn't have. */}
            {!isFamily ? (
              <Row icon={CalendarCheck} label="Daily check-in" sublabel="Your streak, day by day" onPress={() => go('/checkin')} />
            ) : null}
            <Row icon={Puzzle} label="Peekaboo" sublabel="A quiet minute with the tortoise" onPress={() => go('/game')} />
          </Group>

          <Group>
            {isElder ? (
              <>
                {/* Elder seat only (web ElderOnly guard on /family) — helpers
                    and FAMILY users have no family circle to manage. */}
                <Row first icon={Users} label="My Family" sublabel="Family who can see you're safe" onPress={() => go('/family')} />
                {/* The way in to What I pass on (web: "My boxes" beside
                    Messages in the top bar). Elder seat only, like the page. */}
                <Row icon={Archive} label="My boxes" sublabel="Stories, letters, and your sealed box" onPress={() => go('/pass-on')} />
                <Row icon={PhoneCall} label="Emergency contacts" sublabel="People to call if something happens" onPress={() => go('/emergency-contacts')} />
              </>
            ) : null}
            <Row first={!isElder} icon={BookOpen} label="Guide" sublabel="How Towinly works" onPress={() => go('/guide')} />
          </Group>

          {/* Logout lives in the menu for every seat — elder, helper and
              family (user call 2026-07-26). Confirmed, because an accidental
              tap costs a full sign-in. */}
          <Group>
            <Row
              first
              icon={LogOut}
              label="Log out"
              sublabel="Sign out of Towinly"
              onPress={async () => {
                const ok = await confirm({
                  title: 'Log out?',
                  message: 'You can sign back in any time.',
                  cancelLabel: 'Stay signed in',
                  confirmLabel: 'Log out',
                  destructive: true,
                });
                if (!ok) return;
                onClose();
                logout();
              }}
            />
          </Group>
        </ScrollView>
      </Animated.View>
    </Modal>
  );
}
