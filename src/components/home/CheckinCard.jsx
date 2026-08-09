// Daily check-in hero (3a) — the one feature on Home. The only warm surface
// left in the app: heroParchment fill, hairline border, radius 18.
//
// The card leads with the reason rather than the score (web Streaks parity,
// 2026-08-02): tapping "I'm here today" is what puts "All looks well —
// Margaret checked in today" on her family's own page, and she should be able
// to see that is what she is doing — by name, before she taps. The streak
// sits underneath: the reward, not the reason.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Check } from 'lucide-react-native';
import { useRef, useState } from 'react';
import { Animated, Text, View } from 'react-native';
import api, { friendlyWriteError } from '../../api/client';
import { familyNamesLabel } from '../../lib/copy';
import { buildWeek } from '../../lib/streaks';
import { useToast } from '../../context/ToastContext';
import { useReducedMotion } from '../../lib/useReducedMotion';
import { DURATION, EASE } from '../../theme/motion';
import { useTheme } from '../../theme/ThemeContext';
import Button from '../ui/Button';
import LoadError from '../ui/LoadError';
import SkeletonCard from '../ui/Skeleton';
import TextLink from '../ui/TextLink';

/**
 * Who today's check-in reaches — directly under the button, because it is the
 * reason the button exists, not a footnote. With nobody linked this becomes a
 * quiet invitation. Never a warning: an elder with no family on Towinly is
 * not doing anything wrong.
 */
function FamilyNote({ names, checkedIn }) {
  const { t, text } = useTheme();
  const router = useRouter();
  const label = familyNamesLabel(names);

  if (!label) {
    return (
      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'center',
          columnGap: 4,
          marginTop: 10,
        }}
      >
        <TextLink label="Add your family" onPress={() => router.push('/family')} />
        <Text style={{ fontSize: text.sm, color: t.inkSlate, lineHeight: 22 }}>
          and they will see you checked in.
        </Text>
      </View>
    );
  }

  return (
    <Text
      accessibilityLiveRegion="polite"
      style={{
        fontSize: text.sm,
        fontWeight: '600',
        color: checkedIn ? t.greenDeep : t.inkSlate,
        textAlign: 'center',
        lineHeight: 22,
        marginTop: 10,
      }}
    >
      {checkedIn ? `${label} can see you checked in.` : `${label} will see this.`}
    </Text>
  );
}

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

  // Who sees this check-in. Only links where she sits in the elder seat — the
  // family she watches over herself are on the other side and see nothing. A
  // failure leaves the list empty, which shows the invitation instead; the
  // check-in itself never waits on this call.
  const { data: familyLinks } = useQuery({
    queryKey: ['family-links'],
    queryFn: async () => (await api.get('/family/links')).data,
  });
  const familyNames = (familyLinks?.activeLinks || [])
    .filter((l) => l.iAmElder)
    .map((l) => l.otherUserName)
    .filter(Boolean);

  const checkin = useMutation({
    mutationFn: async () => (await api.post('/streaks/checkin')).data,
    onSuccess: (data) => {
      queryClient.setQueryData(['streak-me'], data);
      setJustCheckedIn(true);
      if (!reducedMotion) {
        pop.setValue(0.92);
        Animated.timing(pop, {
          toValue: 1,
          duration: DURATION.base,
          easing: EASE.out,
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
      {isLoading ? (
        <SkeletonCard lines={3} />
      ) : isError ? (
        // A failed fetch must not show "0 days in a row" — that reads as a broken streak
        <LoadError bare what="your check-in" onRetry={refetch} />
      ) : (
        <>
          {/* The reason, before the score: who this one tap reassures. */}
          <Text
            accessibilityRole="header"
            style={{
              fontFamily: fontFamily.display,
              fontSize: 28,
              lineHeight: 33,
              color: t.ink,
              letterSpacing: -0.5,
            }}
          >
            {done ? "Your family knows you're alright today." : "Let your family know you're alright."}
          </Text>

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
                    ? `Day ${current} . See you tomorrow`
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
            <FamilyNote names={familyNames} checkedIn={done} />
          </View>

          {/* The run of days behind it — the reward, not the reason. */}
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
        </>
      )}
    </View>
  );
}
