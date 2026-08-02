// Daily check-in (its own screen): shown ONCE a day — Home walks here on
// the first open of a day when today's check-in is still waiting. Hero card
// + the quiet Peekaboo row; "Not now" always available (elder freedom).
// Checking in (or skipping) lands on Home = My Helpers.
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import CheckinCard from '../src/components/home/CheckinCard';
import GreetingHeader from '../src/components/home/GreetingHeader';
import PeekabooRow from '../src/components/home/PeekabooRow';
import FirstTimeCard from '../src/components/ui/FirstTimeCard';
import Screen from '../src/components/ui/Screen';
import TextLink from '../src/components/ui/TextLink';
import api from '../src/api/client';
import { KEYS } from '../src/lib/storageKeys';
import { useTheme } from '../src/theme/ThemeContext';

export default function Checkin() {
  const { spacing } = useTheme();
  const router = useRouter();
  const toHome = () => router.replace('/(tabs)/home');

  // Only to word the exit honestly: before checking in it's "Not now",
  // after it's simply "Take me home" (the card no longer auto-navigates —
  // the streak moment stays on screen until the person chooses to leave).
  const { data: streak } = useQuery({
    queryKey: ['streak-me'],
    queryFn: async () => (await api.get('/streaks/me')).data,
  });
  const done = streak?.alreadyCheckedIn;

  return (
    <Screen back contentStyle={{ gap: spacing[4] }}>
      <GreetingHeader />
      <FirstTimeCard
        flag={KEYS.checkinExplained}
        title="What's a check-in?"
        body="One tap on “I'm here today” tells your trusted people you're okay. Skipping a day is fine — it's a gentle signal, never a duty."
        linkTitle="Read the Guide"
        onLink={() => router.push('/guide')}
      />
      <CheckinCard />
      <PeekabooRow />
      {/* A real 44pt exit — this screen opens unrequested once a day, so its
          way out must never be a 13pt underline (rulebook). */}
      <TextLink
        label={done ? 'Take me home' : 'Not now — take me home'}
        muted={!done}
        onPress={toHome}
      />
    </Screen>
  );
}
