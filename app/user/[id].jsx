// Friend/user profile — port of UserProfile.jsx essentials: profile + reviews
// (GET /profile/{id}, GET /reviews/user/{id}), with message / add-friend /
// end-friendship / report actions. Trust climbing lives on the Trust screen.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { BookOpen } from '../../src/components/icons';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import api, { friendlyWriteError } from '../../src/api/client';
import { FROM_PAGE } from '../../src/lib/passOnLocks';
import ActionChip from '../../src/components/ui/ActionChip';
import Avatar from '../../src/components/ui/Avatar';
import Button from '../../src/components/ui/Button';
import Card from '../../src/components/ui/Card';
import LoadError from '../../src/components/ui/LoadError';
import Screen from '../../src/components/ui/Screen';
import SkeletonCard from '../../src/components/ui/Skeleton';
import TrustBadge from '../../src/components/ui/TrustBadge';
import { useAuth } from '../../src/context/AuthContext';
import { useConfirm } from '../../src/context/ConfirmContext';
import { useToast } from '../../src/context/ToastContext';
import { blockUser, getBlocked, isBlocked, unblockUser } from '../../src/lib/blockList';
import { useTheme } from '../../src/theme/ThemeContext';

function ChipRow({ items }) {
  const { t, radius, type, spacing } = useTheme();
  if (!items?.length) return null;
  // Small tag chips (owner report 2026-08-17: interests dominated the
  // profile card) — meta-size labels in slim pills, like ordinary app tags.
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
            paddingHorizontal: 10,
            paddingVertical: 3,
          }}
        >
          <Text style={{ fontSize: type.meta, color: t.inkSlate }}>{item}</Text>
        </View>
      ))}
    </View>
  );
}

const REPORT_REASONS = ['Unsafe behavior', 'Harassment', 'Scam or fraud', 'Something else'];

export default function UserProfile() {
  const { t, spacing, text, type, fontFamily } = useTheme();
  // Blocks belong to the signed-in account, not the phone (blockList.js).
  const { user } = useAuth();
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

  // Until this resolves there is no answer to "are we already friends?", and a
  // missing answer is not the same as "no". Offering "Add as friend" to an
  // existing friend fires a request the server refuses (deep audit), so the
  // action slot waits and says why instead.
  const {
    data: connections,
    isLoading: connsLoading,
    isError: connsFailed,
    refetch: refetchConns,
  } = useQuery({
    queryKey: ['connections'],
    queryFn: async () => (await api.get('/connections')).data,
  });
  const conn = (connections ?? []).find((c) => c.otherUserId === id);
  const connUnknown = !conn && (connsLoading || connsFailed);

  const { data: blockedList } = useQuery({
    queryKey: ['block-list', user?.userId],
    queryFn: () => getBlocked(user?.userId),
  });
  const userIsBlocked = isBlocked(blockedList, id);

  // Pull-to-refresh (UX-704): reload exactly what this screen shows.
  const reload = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ['profile', id] }),
      queryClient.invalidateQueries({ queryKey: ['reviews', id] }),
      queryClient.invalidateQueries({ queryKey: ['connections'] }),
      queryClient.invalidateQueries({ queryKey: ['block-list'] }),
    ]);

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
      await blockUser(user?.userId, { id, name: profile?.name ?? '' });
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
    await unblockUser(user?.userId, id);
    queryClient.invalidateQueries({ queryKey: ['block-list'] });
    showToast('Unblocked.', 'info');
  };

  return (
    <Screen back title={profile?.name ?? 'Profile'} onRefresh={reload}>
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

            {/* What she passes on. Offered on an elder's profile only —
                helpers and family have no pass-on page. A slim row above the
                bio, never the loudest thing on somebody's profile. */}
            {profile.role === 'ELDER' || profile.role === 'BOTH' ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={FROM_PAGE.linkFromProfile(profile.name || 'this person')}
                onPress={() => router.push(`/passed-on/${id}`)}
                style={({ pressed }) => ({
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: spacing[3],
                  minHeight: 44,
                  marginTop: spacing[4],
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <View
                  aria-hidden
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    backgroundColor: t.greenTint,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <BookOpen size={16} color={t.trustGold} strokeWidth={2.2} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={{ fontSize: text.sm, fontWeight: '600', color: t.blueDeep }}>
                    {FROM_PAGE.linkFromProfile(profile.name || 'this person')}
                  </Text>
                  <Text style={{ fontSize: type.meta, color: t.inkSlate, marginTop: 2 }}>
                    {FROM_PAGE.linkBlurb}
                  </Text>
                </View>
              </Pressable>
            ) : null}

            {profile.bio ? (
              <Text style={{ fontSize: text.base, lineHeight: 27, color: t.ink2, marginTop: spacing[4] }}>
                {profile.bio}
              </Text>
            ) : null}

            <ChipRow items={profile.interests ?? profile.skillsOffered} />
            <ChipRow items={profile.languages} />

            <View style={{ gap: spacing[3], marginTop: spacing[5] }}>
              {connUnknown ? (
                connsFailed ? (
                  <LoadError bare what="your friendships" onRetry={refetchConns} />
                ) : (
                  <SkeletonCard lines={1} />
                )
              ) : conn?.status === 'ACTIVE' ? (
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
                  {/* "by Name", not an em dash before it: the character is banned
                      outright, and the word says who wrote this to a screen reader
                      as well as to the eye. */}
                  {r.reviewerName ? (
                    <Text style={{ fontSize: text.sm, color: t.inkSlate, marginTop: 4 }}>by {r.reviewerName}</Text>
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
