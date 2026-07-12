// Home — My Helpers lives here (user decision 2026-07-12): greeting, then
// the trust ladders. The daily check-in is its own screen (/checkin) and the
// first Home visit of a day walks there ONCE if today isn't checked in yet.
// Helpers see their quiet doorways (their ladders live on the My Elders tab).
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState, useCallback } from 'react';
import { RefreshControl, ScrollView } from 'react-native';
import api from '../../src/api/client';
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

  // Live trust score for the gold pill (rounded, like the web navbar)
  const { data: trust } = useQuery({
    queryKey: ['trust-my-score'],
    queryFn: async () => (await api.get('/trust/my-score')).data,
  });

  // Once-a-day check-in walk (evaluated once per mount, after streak loads)
  const { data: streak } = useQuery({
    queryKey: ['streak-me'],
    queryFn: async () => (await api.get('/streaks/me')).data,
    enabled: !!user,
  });
  const gated = useRef(false);
  useEffect(() => {
    if (gated.current || !streak) return;
    gated.current = true;
    (async () => {
      const prompted = await getPromptedDay();
      if (shouldPromptCheckin(streak, prompted)) {
        await markPromptedToday();
        router.push('/checkin');
      }
    })();
  }, [streak, router]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries();
    setRefreshing(false);
  }, [queryClient]);

  return (
    <Screen scroll={false} contentStyle={{ padding: 0 }}>
      <NavRow
        trustScore={trust ? Math.round(trust.totalScore) : undefined}
        onMenu={() => setMenuOpen(true)}
        onAddFriends={() => router.push('/friends')}
      />
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={t.blue} />}
        contentContainerStyle={{ paddingHorizontal: spacing[4], paddingTop: spacing[2], paddingBottom: spacing[12], gap: spacing[4] }}
      >
        <GreetingHeader />
        {isHelper ? <MyEldersPanel /> : <MyHelpersPanel />}
      </ScrollView>

      <MenuSheet visible={menuOpen} onClose={() => setMenuOpen(false)} />
    </Screen>
  );
}
