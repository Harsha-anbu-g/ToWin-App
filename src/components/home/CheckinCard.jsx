// Daily check-in hero (3a) — the one feature on Home. The only warm surface
// left in the app: heroParchment fill, hairline border, radius 18. Uppercase
// label, the streak as a big serif numeral, the Monday–Sunday strip, then the
// 50pt "I'm here today" primary. One tap says "I'm okay" and walks the elder
// to their Dashboard (My Helpers) — instant state flip first (HCI rule 1).
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Check } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';
import api from '../../api/client';
import { buildWeek } from '../../lib/streaks';
import { useToast } from '../../context/ToastContext';
import { useTheme } from '../../theme/ThemeContext';
import Button from '../ui/Button';
import SkeletonCard from '../ui/Skeleton';

function WeekStrip({ week }) {
  const { t, radius, type } = useTheme();
  return (
    <View style={{ flexDirection: 'row', gap: 8 }}>
      {week.map((d, i) => (
        <View key={i} style={{ flex: 1, alignItems: 'center', gap: 5 }}>
          <View
            style={{
              width: 32,
              height: 32,
              borderRadius: radius.pill,
              alignItems: 'center',
              justifyContent: 'center',
              ...(d.done
                ? { backgroundColor: t.greenTint, borderWidth: 1, borderColor: t.greenLine }
                : d.today
                  ? { backgroundColor: t.canvas, borderWidth: 2, borderColor: t.blue }
                  : { backgroundColor: t.greyFill3 }),
            }}
          >
            {d.done ? (
              <Check size={14} color={t.greenDeep} strokeWidth={2.5} />
            ) : d.today ? (
              <Text style={{ fontSize: type.caption, fontWeight: '600', color: t.blueDeep }}>·</Text>
            ) : null}
          </View>
          <Text
            style={{
              fontSize: 11,
              fontWeight: d.today ? '600' : '400',
              color: d.today ? t.blueDeep : d.future ? t.greyText2 : t.inkSlate,
            }}
          >
            {d.label}
          </Text>
        </View>
      ))}
    </View>
  );
}

export default function CheckinCard() {
  const { t, spacing, radius, type, fontFamily } = useTheme();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const router = useRouter();

  const { data: streak, isLoading } = useQuery({
    queryKey: ['streak-me'],
    queryFn: async () => (await api.get('/streaks/me')).data,
  });

  const checkin = useMutation({
    mutationFn: async () => (await api.post('/streaks/checkin')).data,
    onSuccess: (data) => {
      queryClient.setQueryData(['streak-me'], data);
      showToast('Checked in — see you tomorrow!', 'success');
      router.push('/(tabs)/dashboard'); // 3d: My Helpers, tab bar stays under it
    },
    onError: () => showToast('Could not check in right now. Please try again.', 'error'),
  });

  const done = streak?.alreadyCheckedIn;
  const current = streak?.currentStreak ?? 0;
  const week = buildWeek(streak);

  // Already checked in: the big hero steps aside for the rest of the day —
  // one quiet confirmation row (tap for streak details), no repeated ask.
  if (!isLoading && done) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Checked in for today — ${current} ${current === 1 ? 'day' : 'days'} in a row. See your streak`}
        onPress={() => router.push('/streaks')}
        style={({ pressed }) => ({
          backgroundColor: t.heroParchment,
          borderWidth: 1,
          borderColor: t.border,
          borderRadius: radius.card,
          paddingVertical: 14,
          paddingHorizontal: 16,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          opacity: pressed ? 0.8 : 1,
        })}
      >
        <View
          style={{
            width: 32,
            height: 32,
            borderRadius: radius.pill,
            backgroundColor: t.greenTint,
            borderWidth: 1,
            borderColor: t.greenLine,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Check size={15} color={t.greenDeep} strokeWidth={2.5} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: type.body, fontWeight: '600', color: t.ink }}>
            Checked in for today
          </Text>
          <Text style={{ fontSize: type.meta, color: t.inkSlate, marginTop: 1, fontVariant: ['tabular-nums'] }}>
            {current} {current === 1 ? 'day' : 'days'} in a row — see you tomorrow
          </Text>
        </View>
      </Pressable>
    );
  }

  return (
    <View
      style={{
        backgroundColor: t.heroParchment,
        borderWidth: 1,
        borderColor: t.border,
        borderRadius: radius.hero,
        padding: spacing[5],
        gap: spacing[5],
      }}
    >
      <Text
        accessibilityRole="header"
        style={{
          fontSize: type.caption,
          fontWeight: '600',
          letterSpacing: 1,
          textTransform: 'uppercase',
          color: t.inkSlate,
        }}
      >
        Daily check-in
      </Text>

      {isLoading ? (
        <SkeletonCard lines={3} />
      ) : (
        <>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 9 }}>
            <Text
              style={{
                fontFamily: fontFamily.display,
                fontSize: 56,
                lineHeight: 58,
                color: t.ink,
                fontVariant: ['tabular-nums'],
              }}
            >
              {current}
            </Text>
            <Text style={{ fontSize: type.body, color: t.inkSlate }}>
              {current === 1 ? 'day in a row' : 'days in a row'}
            </Text>
          </View>

          <WeekStrip week={week} />

          <View>
            <Button
              title={checkin.isPending ? 'Checking in…' : "I'm here today"}
              variant="primary"
              onPress={() => checkin.mutate()}
              loading={checkin.isPending}
            />
            <Text style={{ fontSize: type.caption, color: t.inkSlate, textAlign: 'center', marginTop: 10 }}>
              One tap tells your people you're okay.
            </Text>
          </View>
        </>
      )}
    </View>
  );
}
