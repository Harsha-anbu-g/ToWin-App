// Daily check-in hero (3a) — the one feature on Home. The only warm surface
// left in the app: heroParchment fill, hairline border, radius 18. Uppercase
// label, the streak as a big serif numeral, the Monday–Sunday strip, then the
// 50pt "I'm here today" primary. One tap says "I'm okay" and walks the elder
// to their Dashboard (My Helpers) — instant state flip first (HCI rule 1).
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check } from 'lucide-react-native';
import { useRef, useState } from 'react';
import { Animated, Easing, Text, View } from 'react-native';
import api, { friendlyWriteError } from '../../api/client';
import { buildWeek } from '../../lib/streaks';
import { useToast } from '../../context/ToastContext';
import { useReducedMotion } from '../../lib/useReducedMotion';
import { useTheme } from '../../theme/ThemeContext';
import Button from '../ui/Button';
import LoadError from '../ui/LoadError';
import SkeletonCard from '../ui/Skeleton';

function WeekStrip({ week }) {
  const { t, radius, type } = useTheme();
  return (
    <View style={{ flexDirection: 'row', gap: 8 }}>
      {week.map((d, i) => (
        <View
          key={i}
          accessible
          accessibilityLabel={`${d.label}: ${
            d.done ? 'checked in' : d.today ? 'today' : d.future ? 'upcoming' : 'missed'
          }`}
          style={{ flex: 1, alignItems: 'center', gap: 5 }}
        >
          <View
            style={{
              width: 32,
              height: 32,
              borderRadius: radius.pill,
              alignItems: 'center',
              justifyContent: 'center',
              // Green lives only in the check mark itself — washes read minty
              ...(d.done
                ? { backgroundColor: 'transparent', borderWidth: 1, borderColor: t.border }
                : d.today
                  ? { backgroundColor: t.surface, borderWidth: 2, borderColor: t.blue }
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
              fontSize: type.meta,
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
  const reducedMotion = useReducedMotion();
  // Peak-end (rulebook pass 2026-07-27): the app used to toast and navigate
  // AWAY from the streak number the person just earned. Now the moment stays
  // on screen — the numeral settles in with one gentle scale (transform-only,
  // <300ms, ease-out; reduced motion snaps), and the person leaves when ready.
  const [justCheckedIn, setJustCheckedIn] = useState(false);
  const pop = useRef(new Animated.Value(1)).current;

  const { data: streak, isLoading, isError, refetch } = useQuery({
    queryKey: ['streak-me'],
    queryFn: async () => (await api.get('/streaks/me')).data,
  });

  const checkin = useMutation({
    mutationFn: async () => (await api.post('/streaks/checkin')).data,
    onSuccess: (data) => {
      queryClient.setQueryData(['streak-me'], data);
      setJustCheckedIn(true);
      if (!reducedMotion) {
        pop.setValue(0.92);
        Animated.timing(pop, {
          toValue: 1,
          duration: 240,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }).start();
      }
    },
    onError: (err) =>
      showToast(friendlyWriteError(err, 'Could not check in right now. Please try again.'), 'error'),
  });

  const done = streak?.alreadyCheckedIn;
  const current = streak?.currentStreak ?? 0;
  const week = buildWeek(streak);

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
      ) : isError ? (
        // A failed fetch must not show "0 days in a row" — that reads as a broken streak
        <LoadError bare what="your check-in" onRetry={refetch} />
      ) : (
        <>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
            <Animated.Text
              style={{
                fontFamily: fontFamily.display,
                fontSize: 56,
                lineHeight: 58,
                color: t.ink,
                fontVariant: ['tabular-nums'],
                transform: [{ scale: pop }],
              }}
            >
              {current}
            </Animated.Text>
            <Text style={{ fontSize: type.body, color: t.inkSlate }}>
              {current === 1 ? 'day in a row' : 'days in a row'}
            </Text>
          </View>

          <WeekStrip week={week} />

          <View>
            {done ? (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  minHeight: 44,
                }}
              >
                <Check size={16} color={t.greenDeep} strokeWidth={2.5} />
                <Text style={{ fontSize: type.body, fontWeight: '600', color: t.ink }}>
                  {justCheckedIn
                    ? `Day ${current} — see you tomorrow`
                    : 'Checked in for today'}
                </Text>
              </View>
            ) : (
              <Button
                title={checkin.isPending ? 'Checking in…' : "I'm here today"}
                variant="primary"
                onPress={() => checkin.mutate()}
                loading={checkin.isPending}
              />
            )}
            <Text style={{ fontSize: type.caption, color: t.inkSlate, textAlign: 'center', marginTop: 10 }}>
              One tap tells your people you're okay.
            </Text>
          </View>
        </>
      )}
    </View>
  );
}
