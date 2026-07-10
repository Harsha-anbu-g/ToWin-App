// My requests — one feature, one screen (reached from the ☰ menu).
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { RefreshControl, ScrollView } from 'react-native';
import MyRequestsCard from '../src/components/home/MyRequestsCard';
import Screen from '../src/components/ui/Screen';
import { useTheme } from '../src/theme/ThemeContext';

export default function MyRequests() {
  const { t, spacing } = useTheme();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ['needs-mine'] });
    setRefreshing(false);
  };

  return (
    <Screen back title="My requests" scroll={false} contentStyle={{ padding: 0 }}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={t.blue} />}
        contentContainerStyle={{ padding: spacing[5], paddingBottom: spacing[12] }}
      >
        <MyRequestsCard />
      </ScrollView>
    </Screen>
  );
}
