// The ☰ menu — a drawer that slides in from the LEFT (where the button
// lives), grouped rows inside. One feature per row, one feature per screen.
// Motion: 240ms ease-out on transform only; reduced motion renders in place.
import { useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Animated, Easing, Modal, Pressable, ScrollView, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  BookOpen,
  CalendarCheck,
  ChevronRight,
  ClipboardList,
  HandHelping,
  PhoneCall,
  Puzzle,
  Turtle,
  Search,
  UsersRound,
  X,
} from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { useReducedMotion } from '../../lib/useReducedMotion';
import { useTheme } from '../../theme/ThemeContext';

function Row({ icon: Icon, label, sublabel, onPress, first }) {
  const { t, spacing, text } = useTheme();
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
      <Icon size={24} color={t.blueDeep} strokeWidth={2} />
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
  const { user } = useAuth();
  const router = useRouter();
  const reducedMotion = useReducedMotion();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const drawerW = Math.min(width * 0.82, 320);
  const slide = useRef(new Animated.Value(-drawerW)).current;
  const scrim = useRef(new Animated.Value(0)).current;

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
      Animated.timing(slide, { toValue: -drawerW, duration: 200, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(scrim, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => onClose());
  };

  const isHelper = user?.role === 'HELPER';
  const isElder = user?.role === 'ELDER' || user?.role === 'BOTH';

  const go = (href) => {
    onClose();
    router.push(href);
  };

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={close}>
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

        <ScrollView contentContainerStyle={{ paddingHorizontal: spacing[4], paddingBottom: spacing[12] }}>
          <Group>
            {isHelper ? (
              <>
                <Row first icon={Search} label="Requests near me" sublabel="Elders who could use a hand" onPress={() => go('/(tabs)/action')} />
                <Row icon={ClipboardList} label="My offers & jobs" sublabel="What I've offered to help with" onPress={() => go('/my-jobs')} />
              </>
            ) : (
              <>
                <Row first icon={HandHelping} label="My requests" sublabel="Help I've asked for" onPress={() => go('/my-requests')} />
                {user?.role === 'BOTH' ? (
                  <Row icon={ClipboardList} label="My offers & jobs" onPress={() => go('/my-jobs')} />
                ) : null}
              </>
            )}
            <Row icon={UsersRound} label="People near you" sublabel="Find and add new friends" onPress={() => go('/friends')} />
          </Group>

          <Group>
            <Row first icon={Turtle} label="My trust" sublabel="Your score and the ladder" onPress={() => go('/trust')} />
            <Row icon={CalendarCheck} label="Daily check-in" sublabel="Your streak, day by day" onPress={() => go('/streaks')} />
            <Row icon={Puzzle} label="Peekaboo game" sublabel="A quiet minute" onPress={() => go('/game')} />
          </Group>

          <Group>
            {isElder ? (
              <Row first icon={PhoneCall} label="Emergency" sublabel="SOS and your emergency contacts" onPress={() => go('/emergency-contacts')} />
            ) : null}
            <Row first={!isElder} icon={BookOpen} label="How ToWin works" onPress={() => go('/guide')} />
          </Group>
        </ScrollView>
      </Animated.View>
    </Modal>
  );
}
