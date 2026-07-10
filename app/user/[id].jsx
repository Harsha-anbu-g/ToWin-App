// Friend/user profile — port of UserProfile.jsx essentials: profile + reviews
// (GET /profile/{id}, GET /reviews/user/{id}), with message / add-friend /
// end-friendship / report actions. Trust climbing lives on the Trust screen.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Alert, Text, View } from 'react-native';
import api from '../../src/api/client';
import Avatar from '../../src/components/ui/Avatar';
import Button from '../../src/components/ui/Button';
import Card from '../../src/components/ui/Card';
import Screen from '../../src/components/ui/Screen';
import TrustBadge from '../../src/components/ui/TrustBadge';
import { useToast } from '../../src/context/ToastContext';
import { useTheme } from '../../src/theme/ThemeContext';

function ChipRow({ items }) {
  const { t, radius, text, spacing } = useTheme();
  if (!items?.length) return null;
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2], marginTop: spacing[3] }}>
      {items.map((item) => (
        <View
          key={item}
          style={{
            backgroundColor: t.greyFill,
            borderWidth: 1,
            borderColor: t.greyLine,
            borderRadius: radius.pill,
            paddingHorizontal: spacing[3],
            paddingVertical: 5,
          }}
        >
          <Text style={{ fontSize: text.sm, color: t.inkSlate }}>{item}</Text>
        </View>
      ))}
    </View>
  );
}

const REPORT_REASONS = ['Unsafe behavior', 'Harassment', 'Scam or fraud', 'Something else'];

export default function UserProfile() {
  const { t, spacing, text, fontFamily } = useTheme();
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile', id],
    queryFn: async () => (await api.get(`/profile/${id}`)).data,
    enabled: !!id,
  });

  const { data: reviews } = useQuery({
    queryKey: ['reviews', id],
    queryFn: async () => (await api.get(`/reviews/user/${id}`)).data,
    enabled: !!id,
  });

  const { data: connections } = useQuery({
    queryKey: ['connections'],
    queryFn: async () => (await api.get('/connections')).data,
  });
  const conn = (connections ?? []).find((c) => c.otherUserId === id);

  const request = useMutation({
    mutationFn: () => api.post('/connections/request', { targetUserId: id }),
    onSuccess: () => {
      showToast('Friend request sent!', 'success');
      queryClient.invalidateQueries({ queryKey: ['connections'] });
    },
    onError: (err) =>
      showToast(err?.response?.data?.message || 'Could not send the request. Please try again.', 'error'),
  });

  const endFriendship = useMutation({
    mutationFn: () => api.delete(`/connections/${conn.id}`),
    onSuccess: () => {
      showToast('Friendship ended.', 'info');
      queryClient.invalidateQueries({ queryKey: ['connections'] });
    },
    onError: () => showToast('Could not do that right now. Please try again.', 'error'),
  });

  const report = useMutation({
    mutationFn: (reason) => api.post('/reports', { reportedUserId: id, reason, description: reason }),
    onSuccess: () => showToast('Report sent. Thank you for keeping ToWin safe.', 'success'),
    onError: () => showToast('Could not send the report. Please try again.', 'error'),
  });

  const confirmEnd = () =>
    Alert.alert(
      'End this friendship?',
      `You and ${profile?.name ?? 'this person'} will no longer be connected. This cannot be undone.`,
      [
        { text: 'Keep friendship', style: 'cancel' },
        { text: 'End it', style: 'destructive', onPress: () => endFriendship.mutate() },
      ]
    );

  const pickReportReason = () =>
    Alert.alert('Report this person', 'What went wrong?', [
      ...REPORT_REASONS.map((reason) => ({ text: reason, onPress: () => report.mutate(reason) })),
      { text: 'Cancel', style: 'cancel' },
    ]);

  return (
    <Screen back title={profile?.name ?? 'Profile'}>
      {isLoading ? (
        <Card>
          <Text style={{ fontSize: text.base, color: t.inkSlate }}>Loading profile…</Text>
        </Card>
      ) : !profile ? (
        <Card>
          <Text style={{ fontSize: text.base, lineHeight: 26, color: t.inkSlate }}>
            We couldn't load this profile. Pull down to try again, or go back.
          </Text>
          <Button title="Back" variant="secondary" onPress={() => router.back()} style={{ marginTop: spacing[5] }} />
        </Card>
      ) : (
        <>
          <Card>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[4] }}>
              <Avatar name={profile.name} uri={profile.photoUrl} size={64} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: fontFamily.display, fontSize: text.xl, color: t.ink }}>
                  {profile.name}
                  {profile.age ? `, ${profile.age}` : ''}
                </Text>
                {profile.city ? (
                  <Text style={{ fontSize: text.sm, color: t.inkSlate, marginTop: 2 }}>{profile.city}</Text>
                ) : null}
              </View>
              {Number.isFinite(profile.trustScore) ? <TrustBadge score={profile.trustScore} /> : null}
            </View>

            {profile.bio ? (
              <Text style={{ fontSize: text.base, lineHeight: 27, color: t.ink2, marginTop: spacing[4] }}>
                {profile.bio}
              </Text>
            ) : null}

            <ChipRow items={profile.interests ?? profile.skillsOffered} />
            <ChipRow items={profile.languages} />

            <View style={{ gap: spacing[3], marginTop: spacing[5] }}>
              {conn?.status === 'ACTIVE' ? (
                <Button
                  title="Message"
                  variant="primary"
                  onPress={() => router.push(`/chat/${conn.id}`)}
                />
              ) : conn?.status === 'PENDING' ? (
                <Text style={{ fontSize: text.sm, color: t.inkSlate, textAlign: 'center' }}>
                  Friend request pending
                </Text>
              ) : (
                <Button
                  title={request.isPending ? 'Sending…' : 'Add as friend'}
                  variant="primary"
                  onPress={() => request.mutate()}
                  loading={request.isPending}
                />
              )}
            </View>
          </Card>

          {(reviews ?? []).length > 0 ? (
            <Card style={{ marginTop: spacing[4] }}>
              <Text
                accessibilityRole="header"
                style={{ fontFamily: fontFamily.display, fontSize: text.lg, color: t.ink }}
              >
                What others say
              </Text>
              {reviews.map((r, i) => (
                <View
                  key={r.id ?? i}
                  style={{
                    marginTop: spacing[4],
                    paddingTop: spacing[4],
                    borderTopWidth: i === 0 ? 0 : 1,
                    borderTopColor: t.hairline,
                  }}
                >
                  <Text style={{ fontSize: text.sm, color: t.trustGold, fontWeight: '600' }}>
                    {'★'.repeat(Math.round(r.rating ?? 0))}
                    <Text style={{ color: t.idleGrey }}>{'★'.repeat(Math.max(0, 5 - Math.round(r.rating ?? 0)))}</Text>
                  </Text>
                  {r.comment ? (
                    <Text style={{ fontSize: text.base, lineHeight: 26, color: t.ink2, marginTop: 4 }}>
                      {r.comment}
                    </Text>
                  ) : null}
                  {r.reviewerName ? (
                    <Text style={{ fontSize: text.sm, color: t.inkSlate, marginTop: 4 }}>— {r.reviewerName}</Text>
                  ) : null}
                </View>
              ))}
            </Card>
          ) : null}

          <View style={{ gap: spacing[3], marginTop: spacing[4] }}>
            {conn?.status === 'ACTIVE' ? (
              <Button title="End friendship" variant="destructive" onPress={confirmEnd} />
            ) : null}
            <Button title="Report this person" variant="text" onPress={pickReportReason} />
          </View>
        </>
      )}
    </Screen>
  );
}
