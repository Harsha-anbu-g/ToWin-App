// People near you — a warm, face-first horizontal rail (Instagram energy,
// ToWin calm). Tap a face to see their profile; the full list lives in Friends.
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { FlatList, Pressable, Text, View } from 'react-native';
import api from '../../api/client';
import Avatar from '../ui/Avatar';
import { SkeletonLine } from '../ui/Skeleton';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../theme/ThemeContext';

export default function PeopleRail() {
  const { t, spacing, radius, text } = useTheme();
  const { user } = useAuth();
  const router = useRouter();

  const path = user?.role === 'HELPER' ? '/discover/elders' : '/discover/helpers';
  const { data, isLoading } = useQuery({
    queryKey: ['discover', path],
    queryFn: async () => (await api.get(path)).data,
  });
  const people = (data ?? []).slice(0, 10);

  if (isLoading) {
    return (
      <View style={{ flexDirection: 'row', gap: spacing[3] }}>
        {[0, 1, 2].map((i) => (
          <SkeletonLine key={i} width={92} height={118} style={{ borderRadius: radius.lg }} />
        ))}
      </View>
    );
  }

  if (people.length === 0) {
    return (
      <Text style={{ fontSize: text.base, lineHeight: 26, color: t.inkSlate }}>
        Nobody new nearby just now — new people join every day.
      </Text>
    );
  }

  return (
    <FlatList
      horizontal
      showsHorizontalScrollIndicator={false}
      data={people}
      keyExtractor={(p) => p.userId}
      contentContainerStyle={{ gap: spacing[3], paddingVertical: spacing[1] }}
      renderItem={({ item: p }) => (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${p.name}'s profile`}
          onPress={() => router.push(`/user/${p.userId}`)}
          style={({ pressed }) => ({
            width: 92,
            alignItems: 'center',
            backgroundColor: t.canvas,
            borderWidth: 1,
            borderColor: t.border,
            borderRadius: radius.lg,
            paddingVertical: spacing[3],
            paddingHorizontal: spacing[2],
            opacity: pressed ? 0.8 : 1,
          })}
        >
          <Avatar name={p.name} uri={p.photoUrl} size={56} />
          <Text numberOfLines={1} style={{ fontSize: text.sm, color: t.ink, marginTop: spacing[2] }}>
            {p.name?.split(' ')[0]}
            {p.age ? `, ${p.age}` : ''}
          </Text>
          {Number.isFinite(p.trustScore) ? (
            <Text style={{ fontSize: text.xs, color: t.trustGold, fontWeight: '600', marginTop: 1 }}>
              {p.trustScore} trust
            </Text>
          ) : (
            <Text style={{ fontSize: text.xs, color: t.ink4, marginTop: 1 }}>new here</Text>
          )}
        </Pressable>
      )}
    />
  );
}
