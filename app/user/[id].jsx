// Friend/user profile — port of UserProfile.jsx essentials: profile + reviews
// (GET /profile/{id}, GET /reviews/user/{id}), with message / add-friend /
// end-friendship / report actions. Trust climbing lives on the Trust screen.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';
import api, { friendlyWriteError } from '../../src/api/client';
import ActionChip from '../../src/components/ui/ActionChip';
import Avatar from '../../src/components/ui/Avatar';
import Button from '../../src/components/ui/Button';
import Card from '../../src/components/ui/Card';
import LoadError from '../../src/components/ui/LoadError';
import Screen from '../../src/components/ui/Screen';
import SkeletonCard from '../../src/components/ui/Skeleton';
import TrustBadge from '../../src/components/ui/TrustBadge';
import { useConfirm } from '../../src/context/ConfirmContext';
import { useToast } from '../../src/context/ToastContext';
import { blockUser, getBlocked, isBlocked, unblockUser } from '../../src/lib/blockList';
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
  const confirm = useConfirm();
  const queryClient = useQueryClient();

  // isError separates "the network dropped" (retry) from "this profile is
  // gone" — the two must never share one message (rulebook).
  const { data: profile, isLoading, isError, refetch } = useQuery({
    queryKey: ['profile', id],
    queryFn: async () => (await api.get(`/profile/${id}`)).data,
    enabled: !!id,
  });
  // In-screen report options (the 5-button Alert-as-picker is banned).
  const [reportOpen, setReportOpen] = useState(false);
  const [blocking, setBlocking] = useState(false);

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

  const { data: blockedList } = useQuery({ queryKey: ['block-list'], queryFn: getBlocked });
  const userIsBlocked = isBlocked(blockedList, id);

  const request = useMutation({
    mutationFn: () => api.post('/connections/request', { targetUserId: id }),
    onSuccess: () => {
      showToast('Friend request sent!', 'success');
      queryClient.invalidateQueries({ queryKey: ['connections'] });
    },
    onError: (err) =>
      showToast(
        friendlyWriteError(err, err?.response?.data?.message || 'Could not send the request. Please try again.'),
        'error'
      ),
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
    onSuccess: () => {
      setReportOpen(false);
      showToast('Report sent. Thank you for keeping Towinly safe.', 'success');
    },
    onError: (err) =>
      showToast(friendlyWriteError(err, 'Could not send the report. Please try again.'), 'error'),
  });

  const confirmEnd = async () => {
    const ok = await confirm({
      title: 'End this friendship?',
      message: `You and ${profile?.name ?? 'this person'} will no longer be connected. This cannot be undone.`,
      cancelLabel: 'Keep friendship',
      confirmLabel: 'End it',
      destructive: true,
    });
    if (ok) endFriendship.mutate();
  };

  // Device-side block (UGC 1.2): their content disappears everywhere for you,
  // and an active friendship ends so messages stop server-side too.
  // `blocking` keeps the button honest while the writes run (rulebook: every
  // mutation shows a pending state on the control that fired it).
  const doBlock = async () => {
    setBlocking(true);
    try {
      await blockUser({ id, name: profile?.name ?? '' });
      if (conn?.status === 'ACTIVE') endFriendship.mutate();
      queryClient.invalidateQueries({ queryKey: ['block-list'] });
      showToast("Blocked. You won't see this person anymore.", 'info');
    } finally {
      setBlocking(false);
    }
  };

  const confirmBlock = async () => {
    const ok = await confirm({
      title: `Block ${profile?.name ?? 'this person'}?`,
      message:
        "You won't see their help requests or messages anymore, and any friendship ends. " +
        'You can change your mind later in Profile → Blocked people.',
      confirmLabel: 'Block',
      destructive: true,
    });
    if (ok) doBlock();
  };

  const doUnblock = async () => {
    await unblockUser(id);
    queryClient.invalidateQueries({ queryKey: ['block-list'] });
    showToast('Unblocked.', 'info');
  };

  return (
    <Screen back title={profile?.name ?? 'Profile'}>
      {isLoading ? (
        <SkeletonCard lines={4} />
      ) : isError ? (
        // Network failure gets a retry — the old copy promised a pull-to-
        // refresh this screen never had (rulebook: never name an affordance
        // that doesn't exist).
        <LoadError what="this profile" onRetry={refetch} />
      ) : !profile ? (
        <Card>
          <Text style={{ fontSize: text.base, lineHeight: 26, color: t.inkSlate }}>
            This profile is no longer available.
          </Text>
          <Button title="Back" variant="secondary" onPress={() => router.back()} style={{ marginTop: spacing[5] }} />
        </Card>
      ) : userIsBlocked ? (
        <Card>
          <Text style={{ fontFamily: fontFamily.display, fontSize: text.lg, color: t.ink }}>
            You've blocked {profile.name}
          </Text>
          <Text style={{ fontSize: text.base, lineHeight: 26, color: t.inkSlate, marginTop: spacing[2] }}>
            You won't see their help requests or messages. If this was a mistake, you can undo it.
          </Text>
          <Button title="Unblock" variant="secondary" onPress={doUnblock} style={{ marginTop: spacing[5] }} />
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
                  <Text
                    accessibilityLabel={`${Math.round(r.rating ?? 0)} out of 5 stars`}
                    style={{ fontSize: text.sm, color: t.trustGold, fontWeight: '600' }}
                  >
                    {'★'.repeat(Math.round(r.rating ?? 0))}
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

          {/* Report options live in the screen, not a 5-button Alert (rulebook:
              more than ~3 choices is an action sheet / in-place list). */}
          {reportOpen ? (
            <Card style={{ marginTop: spacing[4] }}>
              <Text
                accessibilityRole="header"
                style={{ fontFamily: fontFamily.display, fontSize: text.lg, color: t.ink }}
              >
                What went wrong?
              </Text>
              <View style={{ gap: spacing[3], marginTop: spacing[4] }}>
                {REPORT_REASONS.map((reason) => (
                  <ActionChip
                    key={reason}
                    label={report.isPending && report.variables === reason ? 'Sending…' : reason}
                    disabled={report.isPending}
                    onPress={() => report.mutate(reason)}
                  />
                ))}
                <ActionChip label="Never mind" onPress={() => setReportOpen(false)} />
              </View>
            </Card>
          ) : null}

          <View style={{ gap: spacing[3], marginTop: spacing[5] }}>
            {conn?.status === 'ACTIVE' ? (
              <Button title="End friendship" variant="destructive" onPress={confirmEnd} />
            ) : null}
            <Button title="Report this person" variant="text" onPress={() => setReportOpen((v) => !v)} />
            <Button
              title={blocking ? 'Blocking…' : 'Block this person'}
              variant="destructive"
              onPress={confirmBlock}
              loading={blocking}
              disabled={blocking}
            />
          </View>
        </>
      )}
    </Screen>
  );
}
