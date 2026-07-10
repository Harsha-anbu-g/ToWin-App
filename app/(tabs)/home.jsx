// Home — ONE feature on screen (the daily check-in), like a real app.
// Everything else lives behind the ☰ menu: my requests, people near you,
// trust, game, emergency, guide. Header: ☰ left · wordmark · Friends right.
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { Menu, UserPlus } from 'lucide-react-native';
import CheckinCard from '../../src/components/home/CheckinCard';
import GreetingHeader from '../../src/components/home/GreetingHeader';
import MenuSheet from '../../src/components/home/MenuSheet';
import Screen from '../../src/components/ui/Screen';
import { useTheme } from '../../src/theme/ThemeContext';

function HeaderButton({ label, hint, onPress, children }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={hint}
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => ({
        minWidth: 44,
        minHeight: 44,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: pressed ? 0.7 : 1,
      })}
    >
      {children}
    </Pressable>
  );
}

export default function HomeScreen() {
  const { t, spacing, text } = useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

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
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2] }}>
          <HeaderButton label="Menu" hint="My requests, people, trust, game, and more" onPress={() => setMenuOpen(true)}>
            <Menu size={26} color={t.ink} />
          </HeaderButton>
          <Text
            accessibilityRole="header"
            // Wordmark is the UI sans at 600 (web: SF Pro Display) — the serif
            // is reserved for headings at weight 400 only.
            style={{ fontSize: text.lg, color: t.blueTeal, fontWeight: '600', letterSpacing: -0.37 }}
          >
            ToWin
          </Text>
        </View>
      }
      headerRight={
        <HeaderButton label="Friends" hint="See your friends and add new ones" onPress={() => router.push('/friends')}>
          <UserPlus size={24} color={t.blueDeep} />
        </HeaderButton>
      }
    >
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={t.blue} />}
        contentContainerStyle={{ padding: spacing[5], paddingBottom: spacing[12], gap: spacing[5] }}
      >
        <GreetingHeader />
        <CheckinCard />
      </ScrollView>

      <MenuSheet visible={menuOpen} onClose={() => setMenuOpen(false)} />
    </Screen>
  );
}
