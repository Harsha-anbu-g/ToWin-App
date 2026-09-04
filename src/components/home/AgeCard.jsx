// Age card (web Streaks.jsx parity): the days an elder has lived, from date
// of birth. Warmth, not a metric — the web check-in page pairs the streak
// with "X days you have lived" so the run of check-ins sits inside a whole
// life. Without a date of birth it becomes a quiet invitation; a failed read
// renders nothing at all — never an error, and never the invitation, which
// would tell someone whose date is already saved to enter it again.
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Text, View } from 'react-native';
import { getMyProfile } from '../../api/profile';
import { computeAge } from '../../lib/streaks';
import { useTheme } from '../../theme/ThemeContext';
import Button from '../ui/Button';
import Card from '../ui/Card';
import SkeletonCard from '../ui/Skeleton';

export default function AgeCard() {
  const { t, text, spacing, fontFamily } = useTheme();
  const router = useRouter();

  const { data: me, isLoading, isError } = useQuery({
    queryKey: ['profile-me'],
    queryFn: getMyProfile,
  });

  if (isLoading) {
    return (
      <Card>
        <SkeletonCard lines={2} />
      </Card>
    );
  }

  // A failed read goes quiet (like GreetingHeader's plain hello): the card
  // simply is not there today. Only a real profile with no dateOfBirth may
  // show the invitation below.
  if (isError) return null;

  const age = computeAge(me?.dateOfBirth);

  if (!age) {
    return (
      <Card contentStyle={{ gap: spacing[2] }}>
        <Text style={{ fontSize: text.base, fontWeight: '600', color: t.ink }}>
          How many days have you lived?
        </Text>
        <Text style={{ fontSize: text.sm, color: t.inkSlate, lineHeight: 20 }}>
          Add your date of birth in your profile to see your life in days.
        </Text>
        <Button
          title="Add date of birth"
          variant="secondary"
          size="small"
          onPress={() => router.push('/profile-edit')}
          style={{ alignSelf: 'flex-start', marginTop: spacing[1] }}
        />
      </Card>
    );
  }

  return (
    <Card>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: spacing[4],
        }}
      >
        <View>
          {/* Same voice as the streak numeral above it: display serif, ink.
              greenDeep is the achieved/success token and days-lived is not an
              achievement state, so semantic green stays off this number. */}
          <Text
            style={{
              fontFamily: fontFamily.display,
              fontSize: text['2xl'],
              color: t.ink,
              letterSpacing: -0.5,
              fontVariant: ['tabular-nums'],
            }}
          >
            {age.totalDays.toLocaleString()}
          </Text>
          <Text
            style={{ fontSize: text.sm, fontWeight: '600', color: t.inkSlate, marginTop: 4 }}
          >
            days you have lived
          </Text>
        </View>
        <Text
          style={{ fontSize: text.sm, color: t.inkSlate, textAlign: 'right', lineHeight: 21 }}
        >
          {age.years} {age.years === 1 ? 'year' : 'years'},{'\n'}
          {age.months} {age.months === 1 ? 'month' : 'months'},{' '}
          {age.days} {age.days === 1 ? 'day' : 'days'} old
        </Text>
      </View>
    </Card>
  );
}
