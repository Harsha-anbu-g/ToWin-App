// Daily check-in (its own screen): shown ONCE a day — Home walks here on
// the first open of a day when today's check-in is still waiting. Hero card
// + the quiet Peekaboo row; "Not now" always available (elder freedom).
// Checking in (or skipping) lands on Home = My Helpers.
import { useRouter } from 'expo-router';
import { Pressable, Text } from 'react-native';
import CheckinCard from '../src/components/home/CheckinCard';
import GreetingHeader from '../src/components/home/GreetingHeader';
import PeekabooRow from '../src/components/home/PeekabooRow';
import Screen from '../src/components/ui/Screen';
import { useTheme } from '../src/theme/ThemeContext';

export default function Checkin() {
  const { t, spacing, type } = useTheme();
  const router = useRouter();
  const toHome = () => router.replace('/(tabs)/home');

  return (
    <Screen back contentStyle={{ gap: spacing[4] }}>
      <GreetingHeader />
      <CheckinCard />
      <PeekabooRow />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Not now"
        onPress={toHome}
        hitSlop={{ top: 8, bottom: 8 }}
        style={{ alignSelf: 'center', paddingVertical: 10 }}
      >
        <Text style={{ fontSize: type.meta, color: t.inkSlate, textDecorationLine: 'underline' }}>
          Not now — take me home
        </Text>
      </Pressable>
    </Screen>
  );
}
