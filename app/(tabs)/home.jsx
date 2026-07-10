// Home — the Instagram-shaped shell header (wordmark left, Friends top-right).
// The feed cards arrive in US-008 (elder) / US-009 (helper).
import { useRouter } from 'expo-router';
import { Pressable, Text } from 'react-native';
import { UserPlus } from 'lucide-react-native';
import Card from '../../src/components/ui/Card';
import Screen from '../../src/components/ui/Screen';
import { useAuth } from '../../src/context/AuthContext';
import { useTheme } from '../../src/theme/ThemeContext';

export default function HomeScreen() {
  const { t, spacing, text, fontFamily } = useTheme();
  const { user } = useAuth();
  const router = useRouter();

  return (
    <Screen
      headerLeft={
        <Text
          accessibilityRole="header"
          style={{
            fontFamily: fontFamily.display,
            fontSize: text.lg,
            color: t.blueTeal,
            fontWeight: '600',
            letterSpacing: -0.3,
          }}
        >
          ToWin
        </Text>
      }
      headerRight={
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Friends"
          accessibilityHint="See your friends and add new ones"
          onPress={() => router.push('/friends')}
          hitSlop={8}
          style={({ pressed }) => ({
            minWidth: 44,
            minHeight: 44,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: pressed ? 0.7 : 1,
          })}
        >
          <UserPlus size={24} color={t.blueDeep} />
        </Pressable>
      }
    >
      <Card>
        <Text
          accessibilityRole="header"
          style={{ fontFamily: fontFamily.display, fontSize: text.lg, color: t.ink }}
        >
          Welcome home
        </Text>
        <Text style={{ marginTop: spacing[2], fontSize: text.base, lineHeight: 27, color: t.inkSlate }}>
          You are logged in{user?.role ? ` as ${user.role.toLowerCase()}` : ''}. Your feed
          arrives in the next build step.
        </Text>
      </Card>
    </Screen>
  );
}
