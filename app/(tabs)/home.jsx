// Home — My Helpers lives here (user decision 2026-07-12): the trust ladders,
// straight away. The "Good morning, <name>" greeting was removed 2026-08-19
// (owner call) so the ladders start at the top of the page; it still opens the
// daily check-in screen, where it belongs to that moment. The first Home visit
// of a day walks to /checkin ONCE if today isn't checked in yet.
// Helpers see their quiet doorways (their ladders live on the My Elders tab).
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useFocusEffect, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { ScrollView } from 'react-native';
import RefreshControl from '../../src/components/ui/RefreshControl';
import api from '../../src/api/client';
import { getMyStreak } from '../../src/api/streaks';
import FamilyHomePanel from '../../src/components/family/FamilyHomePanel';
import MyEldersPanel from '../../src/components/trust/MyEldersPanel';
import MyHelpersPanel from '../../src/components/trust/MyHelpersPanel';
import NavRow from '../../src/components/ui/NavRow';
import Screen from '../../src/components/ui/Screen';
import { useAuth } from '../../src/context/AuthContext';
import { getPromptedDay, markPromptedToday, shouldPromptCheckin } from '../../src/lib/checkinGate';
import { markSeen } from '../../src/lib/seenIds';
import { seenKey } from '../../src/lib/storageKeys';
import { useUpdatesFeed } from '../../src/lib/updatesFeed';
import { useTheme } from '../../src/theme/ThemeContext';

export default function HomeScreen() {
  const { spacing } = useTheme();
  const { user } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  // The bell's red count — unseen items across every notification source.
  const { unseen: updatesCount } = useUpdatesFeed(user);

  const isHelper = user?.role === 'HELPER';
  // FAMILY (family-in-trust 2026-07-19): home is the family panel — no
  // streaks, no check-in walk, no friend discovery. Elder/helper flow is
  // untouched below; the family branch returns early after the shared hooks.
  const isFamily = user?.role === 'FAMILY';
  // The family seat's add-parent form opens from the nav row's left slot
  // (NavRow onAddParent), where the elder's Friends button lives, so the
  // switch sits here and the panel renders the form (owner call 2026-08-28,
  // elder as the base for every hub).
  const [addingParent, setAddingParent] = useState(false);

  // Live trust score for the gold pill (rounded, like the web navbar)
  const { data: trust } = useQuery({
    queryKey: ['trust-my-score'],
    queryFn: async () => (await api.get('/trust/my-score')).data,
  });

  // Opening Home reads the hub, so the red "new people" tab badge clears here
  // (web b37420d: the dashboard marks its tab's tokens seen on open).
  const { data: connectionsData } = useQuery({
    queryKey: ['connections'],
    queryFn: async () => (await api.get('/connections')).data,
  });
  const connTokens = useMemo(
    () =>
      (Array.isArray(connectionsData) ? connectionsData : [])
        .filter((c) => c.status === 'ACTIVE' && c.type !== 'FAMILY')
        .map((c) => `${c.id}:${c.status}`),
    [connectionsData]
  );
  useFocusEffect(
    useCallback(() => {
      if (connTokens.length) markSeen(seenKey(user?.userId, 'connections'), connTokens);
    }, [user?.userId, connTokens])
  );

  // Once-a-day check-in walk (evaluated once per mount, after streak loads).
  // FAMILY never fetches streaks, so `streak` stays undefined and the gate
  // effect below never fires for them.
  const { data: streak } = useQuery({
    queryKey: ['streak-me'],
    queryFn: getMyStreak,
    enabled: !!user && !isFamily,
  });
  const gated = useRef(false);
  useEffect(() => {
    if (gated.current || !streak) return;
    gated.current = true;
    // alive guard: getPromptedDay may resolve after logout/unmount — don't
    // navigate to the check-in walk from a screen that no longer exists.
    let alive = true;
    (async () => {
      const prompted = await getPromptedDay();
      if (!alive) return;
      if (shouldPromptCheckin(streak, prompted)) {
        await markPromptedToday();
        if (alive) router.push('/checkin');
      }
    })();
    return () => {
      alive = false;
    };
  }, [streak, router]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    // Refresh what Home actually shows — a blanket invalidateQueries() would
    // stampede every mounted screen's queries at once. The cost of a hand-kept
    // list is that a card added to Home later stays stale all session unless
    // its key is added here too, so home-refresh.test.js reads these back.
    const homeKeys = isFamily
      ? [
          ['family-links'],
          ['family-journey'],
          ['family-alerts'],
          ['family-standings'],
          ['trust-my-score'],
          ['profile-me'],
          ['passon-asked-of-me'], // KeyholderAsk, inside FamilyHomePanel
        ]
      : [
          ['connections'],
          ['trust-my-score'],
          ['streak-me'],
          ['profile-me'],
          ['needs-open'],
          ['needs-applications'],
          ['block-list'],
          ['passon-setup'],
          ['family-behind'], // who stands behind each elder (MyEldersPanel)
        ];
    await Promise.all(homeKeys.map((queryKey) => queryClient.invalidateQueries({ queryKey })));
    setRefreshing(false);
  }, [queryClient, isFamily]);

  if (isFamily) {
    return (
      // `keyboard` because the add-parent form lives mid-page — without it the
      // keyboard covers the identifier field on small phones.
      <Screen scroll={false} keyboard contentStyle={{ padding: 0 }}>
        <NavRow
          trustScore={trust ? Math.round(trust.totalScore) : undefined}
          onAddParent={() => setAddingParent(true)}
          onAlerts={() => router.push('/updates')}
          alertCount={updatesCount}
        />
        <ScrollView
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingHorizontal: spacing[4], paddingTop: spacing[2], paddingBottom: 120, gap: spacing[4] }} // 120 clears the Ask-AI FAB band so the last card is never under it
        >
          <FamilyHomePanel addingParent={addingParent} onAddingParentChange={setAddingParent} />
        </ScrollView>
      </Screen>
    );
  }

  return (
    <Screen scroll={false} contentStyle={{ padding: 0 }}>
      <NavRow
        trustScore={trust ? Math.round(trust.totalScore) : undefined}
        onAddFriends={() => router.push('/friends')}
        onAlerts={() => router.push('/updates')}
        alertCount={updatesCount}
      />
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={{ paddingHorizontal: spacing[4], paddingTop: spacing[2], paddingBottom: 120, gap: spacing[4] }} // 120 clears the Ask-AI FAB band so the last card is never under it
      >
        {isHelper ? <MyEldersPanel /> : <MyHelpersPanel />}
        {/* My boxes card removed from Home (owner call 2026-08-17):
            What I pass on stays reachable through the menu. */}
        {/* SOS hidden for now (user call 2026-07-17) — SosCard stays in the
            codebase for when it returns. */}
      </ScrollView>
    </Screen>
  );
}
