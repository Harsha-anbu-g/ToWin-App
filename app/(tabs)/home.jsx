// Home — the Instagram-shaped feed. Elder: check-in, my requests, nearby
// helpers, trust, game, SOS. Helper feed (US-009) swaps in by role.
// Pull-to-refresh refetches every card's query.
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { UserPlus } from 'lucide-react-native';
import Screen from '../../src/components/ui/Screen';
import CheckinCard from '../../src/components/home/CheckinCard';
import GameCard from '../../src/components/home/GameCard';
import MyJobsCard from '../../src/components/home/MyJobsCard';
import MyRequestsCard from '../../src/components/home/MyRequestsCard';
import NearbyHelpersCard from '../../src/components/home/NearbyHelpersCard';
import OpenRequestsCard from '../../src/components/home/OpenRequestsCard';
import SosCard from '../../src/components/home/SosCard';
import TrustSummaryCard from '../../src/components/home/TrustSummaryCard';
import { useAuth } from '../../src/context/AuthContext';
import { useTheme } from '../../src/theme/ThemeContext';

export default function HomeScreen() {
  const { t, spacing, text } = useTheme();
  const { user } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  // HELPER: helper feed. ELDER: elder feed. BOTH: elder feed + helper section
  // (web DashboardRouter parity — BOTH renders the elder dashboard).
  const isHelper = user?.role === 'HELPER';
  const isBoth = user?.role === 'BOTH';

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries();
    setRefreshing(false);
  }, [queryClient]);

  return (
    <Screen
      scroll={false}
      contentStyle={{ padding: 0 }}
      headerLeft={
        <Text
          accessibilityRole="header"
          // Wordmark is the UI sans at 600 (web: SF Pro Display) — the serif
          // is reserved for headings at weight 400 only.
          style={{ fontSize: text.lg, color: t.blueTeal, fontWeight: '600', letterSpacing: -0.37 }}
        >
          ToWin
        </Text>
      }
      headerRight={
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Friends"
          accessibilityHint="See your friends and add new ones"
          onPress={() => router.push('/friends')}
          hitSlop={8}
          style={({ pressed }) => ({
            minWidth: 44,
            minHeight: 44,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: pressed ? 0.7 : 1,
          })}
        >
          <UserPlus size={24} color={t.blueDeep} />
        </Pressable>
      }
    >
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={t.blue} />}
        contentContainerStyle={{ padding: spacing[5], paddingBottom: spacing[12], gap: spacing[4] }}
      >
        {isHelper ? (
          <View style={{ gap: spacing[4] }}>
            <TrustSummaryCard />
            <OpenRequestsCard />
            <MyJobsCard />
            <CheckinCard />
            <GameCard />
          </View>
        ) : (
          <View style={{ gap: spacing[4] }}>
            <CheckinCard />
            <MyRequestsCard />
            {isBoth ? <OpenRequestsCard /> : null}
            {isBoth ? <MyJobsCard /> : null}
            <NearbyHelpersCard />
            <TrustSummaryCard />
            <GameCard />
            <SosCard />
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}
