// Home (3a) — ONE feature on screen: the daily check-in hero, then the quiet
// Peekaboo row. Nav row: ☰ menu · wordmark · live gold trust pill · person-add.
// Everything else stays behind the ☰ menu (my requests, trust, emergency…).
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { RefreshControl, ScrollView } from 'react-native';
import api from '../../src/api/client';
import CheckinCard from '../../src/components/home/CheckinCard';
import GreetingHeader from '../../src/components/home/GreetingHeader';
import MenuSheet from '../../src/components/home/MenuSheet';
import PeekabooRow from '../../src/components/home/PeekabooRow';
import NavRow from '../../src/components/ui/NavRow';
import Screen from '../../src/components/ui/Screen';
import { useTheme } from '../../src/theme/ThemeContext';

export default function HomeScreen() {
  const { t, spacing } = useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  // Live trust score for the gold pill (rounded, like the web navbar)
  const { data: trust } = useQuery({
    queryKey: ['trust-my-score'],
    queryFn: async () => (await api.get('/trust/my-score')).data,
  });

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
        <CheckinCard />
        <PeekabooRow />
      </ScrollView>

      <MenuSheet visible={menuOpen} onClose={() => setMenuOpen(false)} />
    </Screen>
  );
}
