// Streaks — port of Streaks.jsx: greeting, this week's strip, one-tap check-in,
// current + longest streak. Check-in state flips instantly (HCI rule 1).
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Text, View } from 'react-native';
import api, { friendlyWriteError } from '../src/api/client';
import Button from '../src/components/ui/Button';
import Card from '../src/components/ui/Card';
import LoadError from '../src/components/ui/LoadError';
import Screen from '../src/components/ui/Screen';
import { useToast } from '../src/context/ToastContext';
import { buildWeek, greeting } from '../src/lib/streaks';
import { useTheme } from '../src/theme/ThemeContext';

function WeekStrip({ week }) {
  const { t, spacing, text } = useTheme();
  return (
    <View style={{ flexDirection: 'row', gap: spacing[2], marginTop: spacing[4] }}>
      {week.map((day, i) => (
        <View key={i} style={{ flex: 1, alignItems: 'center', gap: 6 }}>
          <View
            style={{
              width: 34,
              height: 34,
              borderRadius: 17,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: day.done ? t.greenTint : day.today ? t.blueTint : t.greyFill,
              borderWidth: day.today ? 2 : 1,
              borderColor: day.done ? t.greenLine : day.today ? t.blue : t.greyLine,
              opacity: day.future ? 0.45 : 1,
            }}
          >
            {day.done ? (
              <Text style={{ fontSize: 14, fontWeight: '700', color: t.greenDeep }}>✓</Text>
            ) : (
              <Text style={{ fontSize: text.xs, fontWeight: '600', color: day.today ? t.blueDeep : t.steelText }}>
                {day.label}
              </Text>
            )}
          </View>
        </View>
      ))}
    </View>
  );
}

export default function StreaksScreen() {
  const { t, spacing, text, fontFamily } = useTheme();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const { data: streak, isError, refetch } = useQuery({
    queryKey: ['streak-me'],
    queryFn: async () => (await api.get('/streaks/me')).data,
  });

  const checkin = useMutation({
    mutationFn: async () => (await api.post('/streaks/checkin')).data,
    onSuccess: (data) => {
      queryClient.setQueryData(['streak-me'], data);
      showToast('Checked in — see you tomorrow!', 'success');
    },
    onError: (err) =>
      showToast(friendlyWriteError(err, 'Could not check in right now. Please try again.'), 'error'),
  });

  const week = buildWeek(streak);
  const done = streak?.alreadyCheckedIn;

  return (
    <Screen back title="Check-in">
      <Card>
        <Text
          accessibilityRole="header"
          style={{ fontFamily: fontFamily.display, fontSize: text.xl, color: t.ink }}
        >
          {greeting()}.
        </Text>
        <Text style={{ fontSize: text.base, lineHeight: 26, color: t.inkSlate, marginTop: spacing[2] }}>
          One tap a day tells your people you're okay — slow and steady, like the tortoise.
        </Text>

        {isError ? (
          // A failed fetch must not render an unchecked week + "0 days" streak
          <LoadError bare what="your check-in" onRetry={refetch} style={{ marginTop: spacing[4] }} />
        ) : (
          <>
        <WeekStrip week={week} />

        {done ? (
          <View
            style={{
              backgroundColor: t.greenTint,
              borderRadius: 11,
              padding: spacing[3],
              marginTop: spacing[5],
            }}
          >
            <Text style={{ fontSize: text.base, color: t.greenDeep, lineHeight: 25 }}>
              You're checked in for today. See you tomorrow!
            </Text>
          </View>
        ) : (
          <Button
            title={checkin.isPending ? 'Checking in…' : "I'm here today"}
            variant="primary"
            onPress={() => checkin.mutate()}
            loading={checkin.isPending}
            style={{ marginTop: spacing[5] }}
          />
        )}
          </>
        )}
      </Card>

      {isError ? null : (
      <Card style={{ marginTop: spacing[4] }}>
        <View style={{ flexDirection: 'row' }}>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={{ fontSize: text['2xl'], color: t.ink, fontWeight: '600', fontVariant: ['tabular-nums'] }}>
              {streak?.currentStreak ?? 0}
            </Text>
            <Text style={{ fontSize: text.sm, color: t.inkSlate, marginTop: 2 }}>days in a row</Text>
          </View>
          <View style={{ width: 1, backgroundColor: t.hairline }} />
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={{ fontSize: text['2xl'], color: t.ink, fontWeight: '600', fontVariant: ['tabular-nums'] }}>
              {streak?.longestStreak ?? 0}
            </Text>
            <Text style={{ fontSize: text.sm, color: t.inkSlate, marginTop: 2 }}>longest ever</Text>
          </View>
        </View>
      </Card>
      )}
    </Screen>
  );
}
