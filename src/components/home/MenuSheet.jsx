// The ☰ menu — an iOS-style grouped sheet. One feature per row, one feature
// per screen (the app pattern, not the website's everything-stacked feed).
import { useRouter } from 'expo-router';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import {
  BookOpen,
  CalendarCheck,
  ChevronRight,
  ClipboardList,
  HandHelping,
  PhoneCall,
  Puzzle,
  Search,
  Turtle,
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

  const isHelper = user?.role === 'HELPER';
  const isElder = user?.role === 'ELDER' || user?.role === 'BOTH';

  const go = (href) => {
    onClose();
    router.push(href);
  };

  return (
    <Modal
      visible={visible}
      animationType={reducedMotion ? 'none' : 'slide'}
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, backgroundColor: t.surface }}>
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
            onPress={onClose}
            hitSlop={8}
            style={{ minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}
          >
            <X size={24} color={t.ink3} />
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={{ paddingHorizontal: spacing[5], paddingBottom: spacing[12] }}>
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
      </View>
    </Modal>
  );
}
