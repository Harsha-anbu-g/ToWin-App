// Home — My Helpers lives here (user decision 2026-07-12): greeting, then
// the trust ladders. The daily check-in is its own screen (/checkin) and the
// first Home visit of a day walks there ONCE if today isn't checked in yet.
// Helpers see their quiet doorways (their ladders live on the My Elders tab).
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState, useCallback } from 'react';
import { RefreshControl, ScrollView } from 'react-native';
import api from '../../src/api/client';
import FamilyHomePanel from '../../src/components/family/FamilyHomePanel';
import GreetingHeader from '../../src/components/home/GreetingHeader';
import MenuSheet from '../../src/components/home/MenuSheet';
import MyEldersPanel from '../../src/components/trust/MyEldersPanel';
import MyHelpersPanel from '../../src/components/trust/MyHelpersPanel';
import NavRow from '../../src/components/ui/NavRow';
import Screen from '../../src/components/ui/Screen';
import { useAuth } from '../../src/context/AuthContext';
import { getPromptedDay, markPromptedToday, shouldPromptCheckin } from '../../src/lib/checkinGate';
import { useTheme } from '../../src/theme/ThemeContext';

export default function HomeScreen() {
  const { t, spacing } = useTheme();
  const { user } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const isHelper = user?.role === 'HELPER';
  // FAMILY (family-in-trust 2026-07-19): home is the family panel — no
  // streaks, no check-in walk, no friend discovery. Elder/helper flow is
  // untouched below; the family branch returns early after the shared hooks.
  const isFamily = user?.role === 'FAMILY';

  // Live trust score for the gold pill (rounded, like the web navbar)
  const { data: trust } = useQuery({
    queryKey: ['trust-my-score'],
    queryFn: async () => (await api.get('/trust/my-score')).data,
  });

  // Once-a-day check-in walk (evaluated once per mount, after streak loads).
  // FAMILY never fetches streaks, so `streak` stays undefined and the gate
  // effect below never fires for them.
  const { data: streak } = useQuery({
    queryKey: ['streak-me'],
    queryFn: async () => (await api.get('/streaks/me')).data,
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
    // stampede every mounted screen's queries at once.
    const homeKeys = isFamily
      ? [
          ['family-links'],
          ['family-journey'],
          ['family-alerts'],
          ['trust-my-score'],
          ['profile-me'],
        ]
      : [
          ['connections'],
          ['trust-my-score'],
          ['streak-me'],
          ['profile-me'],
          ['needs-open'],
          ['needs-applications'],
          ['block-list'],
        ];
    await Promise.all(homeKeys.map((queryKey) => queryClient.invalidateQueries({ queryKey })));
    setRefreshing(false);
  }, [queryClient, isFamily]);

  if (isFamily) {
    return (
      // `keyboard` because the add-parent form lives mid-page — without it the
      // keyboard covers the identifier field on small phones.
      <Screen scroll={false} keyboard contentStyle={{ padding: 0 }}>
        <NavRow trustScore={trust ? Math.round(trust.totalScore) : undefined} onMenu={() => setMenuOpen(true)} />
        <ScrollView
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={t.blue} />}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingHorizontal: spacing[4], paddingTop: spacing[2], paddingBottom: 120, gap: spacing[4] }} // 120 clears the Ask-AI FAB band so the last card is never under it
        >
          <GreetingHeader />
          <FamilyHomePanel />
        </ScrollView>

        <MenuSheet visible={menuOpen} onClose={() => setMenuOpen(false)} />
      </Screen>
    );
  }

  return (
    <Screen scroll={false} contentStyle={{ padding: 0 }}>
      <NavRow
        trustScore={trust ? Math.round(trust.totalScore) : undefined}
        onMenu={() => setMenuOpen(true)}
        onAddFriends={() => router.push('/friends')}
      />
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={t.blue} />}
        contentContainerStyle={{ paddingHorizontal: spacing[4], paddingTop: spacing[2], paddingBottom: 120, gap: spacing[4] }} // 120 clears the Ask-AI FAB band so the last card is never under it
      >
        <GreetingHeader />
        {isHelper ? <MyEldersPanel /> : <MyHelpersPanel />}
        {/* SOS hidden for now (user call 2026-07-17) — SosCard stays in the
            codebase for when it returns. */}
      </ScrollView>

      <MenuSheet visible={menuOpen} onClose={() => setMenuOpen(false)} />
    </Screen>
  );
}
