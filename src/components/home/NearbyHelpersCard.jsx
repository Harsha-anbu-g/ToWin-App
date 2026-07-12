// Nearby helpers preview — top three from discovery, with the full list living
// in Friends (top-right). Mirrors ElderDashboard's discover section, simplified
// for the feed (no location prompt in v1 — backend falls back gracefully).
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Text, View } from 'react-native';
import api from '../../api/client';
import Avatar from '../ui/Avatar';
import Button from '../ui/Button';
import Card from '../ui/Card';
import SkeletonCard from '../ui/Skeleton';
import TrustBadge from '../ui/TrustBadge';
import { filterBlocked, getBlocked } from '../../lib/blockList';
import { useTheme } from '../../theme/ThemeContext';

export default function NearbyHelpersCard() {
  const { t, spacing, text, fontFamily } = useTheme();
  const router = useRouter();

  const { data: helpers, isLoading } = useQuery({
    queryKey: ['discover-helpers'],
    queryFn: async () => (await api.get('/discover/helpers')).data,
  });
  const { data: blocked } = useQuery({ queryKey: ['block-list'], queryFn: getBlocked });

  // Blocked helpers never resurface in discovery (UGC 1.2)
  const preview = filterBlocked(helpers ?? [], blocked, (h) => h.userId).slice(0, 3);

  return (
    <Card>
      <Text
        accessibilityRole="header"
        style={{ fontFamily: fontFamily.display, fontSize: text.lg, color: t.ink }}
      >
        Helpers near you
      </Text>

      {isLoading ? (
        <SkeletonCard />
      ) : preview.length === 0 ? (
        <Text style={{ marginTop: spacing[3], fontSize: text.base, lineHeight: 26, color: t.inkSlate }}>
          No helpers to show just yet. Check back soon — new helpers join all the time.
        </Text>
      ) : (
        preview.map((h) => (
          <View
            key={h.userId}
            style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[3], marginTop: spacing[4] }}
          >
            <Avatar name={h.name} uri={h.photoUrl} size={44} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: text.base, color: t.ink }}>
                {h.name}
                {h.age ? `, ${h.age}` : ''}
              </Text>
              <Text numberOfLines={1} style={{ fontSize: text.sm, color: t.inkSlate }}>
                {h.city ?? 'Nearby'}
                {Number.isFinite(h.distanceKm) && h.distanceKm > 0 ? ` · ${h.distanceKm.toFixed(0)} km` : ''}
              </Text>
            </View>
            {Number.isFinite(h.trustScore) ? <TrustBadge score={h.trustScore} /> : null}
          </View>
        ))
      )}

      <Button
        title="See all in Friends"
        variant="secondary"
        onPress={() => router.push('/friends')}
        style={{ marginTop: spacing[5] }}
      />
    </Card>
  );
}
