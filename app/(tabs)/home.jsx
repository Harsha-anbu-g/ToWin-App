// Home — My Helpers lives here (user decision 2026-07-12): greeting, then
// the trust ladders. The daily check-in is its own screen (/checkin) and the
// first Home visit of a day walks there ONCE if today isn't checked in yet.
// Helpers see their quiet doorways (their ladders live on the My Elders tab).
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { ChevronRight, Search, UsersRound } from 'lucide-react-native';
import { useEffect, useRef, useState, useCallback } from 'react';
import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import api from '../../src/api/client';
import GreetingHeader from '../../src/components/home/GreetingHeader';
import MenuSheet from '../../src/components/home/MenuSheet';
import MyHelpersPanel from '../../src/components/trust/MyHelpersPanel';
import NavRow from '../../src/components/ui/NavRow';
import Screen from '../../src/components/ui/Screen';
import { useAuth } from '../../src/context/AuthContext';
import { getPromptedDay, markPromptedToday, shouldPromptCheckin } from '../../src/lib/checkinGate';
import { useTheme } from '../../src/theme/ThemeContext';

// A quiet doorway row (helper home): icon · label · sub · chevron.
function QuietLink({ icon: Icon, label, sublabel, onPress }) {
  const { t, radius, type } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: t.canvas,
        borderWidth: 1,
        borderColor: t.border,
        borderRadius: radius.card,
        paddingVertical: 14,
        paddingHorizontal: 14,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <Icon size={22} color={t.blueDeep} strokeWidth={1.8} />
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: type.body, fontWeight: '600', color: t.ink }}>{label}</Text>
        <Text style={{ fontSize: type.meta, color: t.inkSlate, marginTop: 1 }}>{sublabel}</Text>
      </View>
      <ChevronRight size={18} color={t.inkFaint2} strokeWidth={1.8} />
    </Pressable>
  );
}

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
        {isHelper ? (
          <View style={{ gap: spacing[3] }}>
            <QuietLink
              icon={Search}
              label="Offer Help"
              sublabel="Needs from elders near you"
              onPress={() => router.push('/(tabs)/action')}
            />
            <QuietLink
              icon={UsersRound}
              label="My Elders"
              sublabel="The elders you help, and your trust ladders"
              onPress={() => router.push('/(tabs)/my-elders')}
            />
          </View>
        ) : (
          <MyHelpersPanel />
        )}
      </ScrollView>

      <MenuSheet visible={menuOpen} onClose={() => setMenuOpen(false)} />
    </Screen>
  );
}
