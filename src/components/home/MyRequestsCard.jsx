// My requests — the elder's needs with embedded applicants (GET /needs/mine →
// data.content; applicants come INSIDE each need, per NeedResponse). Accept,
// complete, and remove all confirm first (HCI rule 5).
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Text, View } from 'react-native';
import api from '../../api/client';
import Avatar from '../ui/Avatar';
import Button from '../ui/Button';
import Card from '../ui/Card';
import { useToast } from '../../context/ToastContext';
import { catLabel, NEED_STATUS, sortNeeds } from '../../lib/needs';
import { applicantsLabel } from '../../lib/copy';
import { useTheme } from '../../theme/ThemeContext';

function StatusPill({ status }) {
  const { t, radius, text } = useTheme();
  const pill = NEED_STATUS[status] ?? NEED_STATUS.OPEN;
  return (
    <View
      style={{
        backgroundColor: t[pill.bg],
        borderRadius: radius.pill,
        paddingHorizontal: 10,
        paddingVertical: 3,
        alignSelf: 'flex-start',
      }}
    >
      <Text style={{ fontSize: text.xs, fontWeight: '600', color: t[pill.color] }}>{pill.label}</Text>
    </View>
  );
}

export default function MyRequestsCard() {
  const { t, spacing, text, fontFamily } = useTheme();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['needs-mine'],
    queryFn: async () => (await api.get('/needs/mine')).data,
  });
  const needs = [...(data?.content ?? [])].sort(sortNeeds);

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['needs-mine'] });

  const accept = useMutation({
    mutationFn: ({ needId, helperId }) => api.post(`/needs/${needId}/accept/${helperId}`),
    onSuccess: () => {
      showToast('Helper accepted — they can now message you.', 'success');
      refresh();
    },
    onError: () => showToast('Could not accept right now. Please try again.', 'error'),
  });

  const complete = useMutation({
    mutationFn: (needId) => api.post(`/needs/${needId}/complete`),
    onSuccess: () => {
      showToast('Marked as completed. Well done!', 'success');
      refresh();
    },
    onError: () => showToast('Could not mark completed. Please try again.', 'error'),
  });

  const remove = useMutation({
    mutationFn: (needId) => api.delete(`/needs/${needId}`),
    onSuccess: () => {
      showToast('Request removed.', 'success');
      refresh();
    },
    onError: () => showToast('Could not remove it. Please try again.', 'error'),
  });

  const confirmAccept = (need, app) =>
    Alert.alert('Accept this helper?', `${app.helperName} will be your helper for "${need.title}".`, [
      { text: 'Not now', style: 'cancel' },
      { text: 'Accept', onPress: () => accept.mutate({ needId: need.id, helperId: app.helperId }) },
    ]);

  const confirmComplete = (need) =>
    Alert.alert('Mark as completed?', `"${need.title}" will move to your finished requests.`, [
      { text: 'Not yet', style: 'cancel' },
      { text: 'Completed', onPress: () => complete.mutate(need.id) },
    ]);

  const confirmRemove = (need) =>
    Alert.alert('Remove this request?', `"${need.title}" will be taken down. This cannot be undone.`, [
      { text: 'Keep it', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => remove.mutate(need.id) },
    ]);

  return (
    <Card>
      <Text
        accessibilityRole="header"
        style={{ fontFamily: fontFamily.display, fontSize: text.lg, color: t.ink }}
      >
        My requests
      </Text>

      {isLoading ? (
        <Text style={{ marginTop: spacing[3], fontSize: text.base, color: t.inkSlate }}>Loading…</Text>
      ) : needs.length === 0 ? (
        <Text style={{ marginTop: spacing[3], fontSize: text.base, lineHeight: 26, color: t.inkSlate }}>
          No requests yet. Tap the blue "Ask for help" button below to post your first one.
        </Text>
      ) : (
        needs.map((need, i) => (
          <View
            key={need.id}
            style={{
              paddingTop: spacing[4],
              marginTop: spacing[4],
              borderTopWidth: i === 0 ? 0 : 1,
              borderTopColor: t.hairline,
            }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: spacing[3] }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: text.base, fontWeight: '600', color: t.ink }}>{need.title}</Text>
                <Text style={{ fontSize: text.sm, color: t.inkSlate, marginTop: 2 }}>
                  {catLabel(need.category)}
                  {need.urgency === 'URGENT' ? ' · Urgent' : ''}
                </Text>
              </View>
              <StatusPill status={need.status} />
            </View>

            {need.status === 'OPEN' && (need.applications?.length ?? 0) > 0 ? (
              <View style={{ marginTop: spacing[3] }}>
                <Text style={{ fontSize: text.sm, fontWeight: '600', color: t.blueDeep }}>
                  {applicantsLabel(need.applications.length)}
                </Text>
                {need.applications.map((app) => (
                  <View
                    key={app.helperId}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[3], marginTop: spacing[3] }}
                  >
                    <Avatar name={app.helperName} uri={app.helperPhotoUrl} size={40} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: text.base, color: t.ink }}>{app.helperName}</Text>
                      {app.message ? (
                        <Text numberOfLines={2} style={{ fontSize: text.sm, color: t.inkSlate }}>
                          {app.message}
                        </Text>
                      ) : null}
                    </View>
                    <Button
                      title="Accept"
                      variant="secondary"
                      onPress={() => confirmAccept(need, app)}
                      style={{ paddingHorizontal: spacing[4], minHeight: 44 }}
                    />
                  </View>
                ))}
              </View>
            ) : null}

            <View style={{ flexDirection: 'row', gap: spacing[3], marginTop: spacing[3] }}>
              {need.status === 'ASSIGNED' ? (
                <Button
                  title="Mark completed"
                  variant="secondary"
                  onPress={() => confirmComplete(need)}
                  style={{ flex: 1 }}
                />
              ) : null}
              {need.status === 'OPEN' ? (
                <Button
                  title="Remove"
                  variant="destructive"
                  onPress={() => confirmRemove(need)}
                  style={{ flex: 1 }}
                />
              ) : null}
            </View>
          </View>
        ))
      )}
    </Card>
  );
}
