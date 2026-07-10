// Open requests nearby — the helper's main feed card (GET /needs/open; the
// full browse lives behind the center Find requests button). Apply is one tap
// (not destructive — no confirm, HCI rule 7); withdraw confirms.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Alert, Text, View } from 'react-native';
import api from '../../api/client';
import Button from '../ui/Button';
import Card from '../ui/Card';
import { useToast } from '../../context/ToastContext';
import { catLabel } from '../../lib/needs';
import { useTheme } from '../../theme/ThemeContext';

export function useApplyMutations() {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['needs-open'] });
    queryClient.invalidateQueries({ queryKey: ['needs-applications'] });
  };

  const apply = useMutation({
    mutationFn: (needId) => api.post(`/needs/${needId}/apply`),
    onSuccess: () => {
      showToast('Offer sent — the elder will see it right away.', 'success');
      refresh();
    },
    onError: (err) =>
      showToast(err?.response?.data?.message || 'Could not send your offer. Please try again.', 'error'),
  });

  const withdraw = useMutation({
    mutationFn: (needId) => api.delete(`/needs/${needId}/apply`),
    onSuccess: () => {
      showToast('Offer withdrawn.', 'success');
      refresh();
    },
    onError: () => showToast('Could not withdraw right now. Please try again.', 'error'),
  });

  return { apply, withdraw };
}

export function RequestRow({ need, apply, withdraw, divider }) {
  const { t, spacing, text } = useTheme();
  const mine = need.myApplicationStatus;

  const confirmWithdraw = () =>
    Alert.alert('Withdraw your offer?', `You'll stop offering to help with "${need.title}".`, [
      { text: 'Keep offering', style: 'cancel' },
      { text: 'Withdraw', style: 'destructive', onPress: () => withdraw.mutate(need.id) },
    ]);

  return (
    <View
      style={{
        paddingTop: spacing[4],
        marginTop: spacing[4],
        borderTopWidth: divider ? 1 : 0,
        borderTopColor: t.hairline,
      }}
    >
      <Text style={{ fontSize: text.base, fontWeight: '600', color: t.ink }}>{need.title}</Text>
      <Text style={{ fontSize: text.sm, color: t.inkSlate, marginTop: 2 }}>
        {catLabel(need.category)}
        {need.urgency === 'URGENT' ? ' · Urgent' : ''}
        {need.elderName ? ` · for ${need.elderName}` : ''}
        {Number.isFinite(need.distanceKm) && need.distanceKm > 0 ? ` · ${need.distanceKm.toFixed(0)} km` : ''}
      </Text>
      {need.description ? (
        <Text numberOfLines={2} style={{ fontSize: text.sm, color: t.inkSlate, marginTop: 4, lineHeight: 20 }}>
          {need.description}
        </Text>
      ) : null}
      <View style={{ marginTop: spacing[3] }}>
        {mine === 'PENDING' ? (
          <Button title="Withdraw my offer" variant="secondary" onPress={confirmWithdraw} />
        ) : mine === 'ACCEPTED' ? (
          <View
            style={{
              backgroundColor: t.greenTint,
              borderRadius: 11,
              paddingVertical: spacing[2],
              paddingHorizontal: spacing[3],
              alignSelf: 'flex-start',
            }}
          >
            <Text style={{ fontSize: text.sm, fontWeight: '600', color: t.greenDeep }}>
              You're helping with this
            </Text>
          </View>
        ) : (
          <Button title="Offer to help" variant="secondary" onPress={() => apply.mutate(need.id)} />
        )}
      </View>
    </View>
  );
}

export default function OpenRequestsCard() {
  const { t, spacing, text, fontFamily } = useTheme();
  const router = useRouter();
  const { apply, withdraw } = useApplyMutations();

  const { data, isLoading } = useQuery({
    queryKey: ['needs-open'],
    queryFn: async () => (await api.get('/needs/open')).data,
  });
  const needs = (Array.isArray(data) ? data : data?.content ?? []).slice(0, 4);

  return (
    <Card>
      <Text
        accessibilityRole="header"
        style={{ fontFamily: fontFamily.display, fontSize: text.lg, color: t.ink }}
      >
        Requests near you
      </Text>

      {isLoading ? (
        <Text style={{ marginTop: spacing[3], fontSize: text.base, color: t.inkSlate }}>Looking around…</Text>
      ) : needs.length === 0 ? (
        <Text style={{ marginTop: spacing[3], fontSize: text.base, lineHeight: 26, color: t.inkSlate }}>
          No open requests right now. Check back soon — elders post new ones every day.
        </Text>
      ) : (
        needs.map((need, i) => (
          <RequestRow key={need.id} need={need} apply={apply} withdraw={withdraw} divider={i > 0} />
        ))
      )}

      <Button
        title="See all requests"
        variant="secondary"
        onPress={() => router.push('/(tabs)/action')}
        style={{ marginTop: spacing[5] }}
      />
    </Card>
  );
}
