// Posted Help (3f) — the elder's requests in three segments: Looking for
// Help / In Progress / Completed. Each request is a row straight on the page,
// hairline-separated (user call 2026-07-12: outlined boxes read as a website):
// title + neutral status pill, plain meta line ("Shopping · Normal · posted
// yesterday"), then "N helpers want to help" with a tonal View that expands
// the applicant rows. Accept, complete, and remove keep their confirm dialogs
// (HCI rule 5). Shared by the elder's second tab and the pushed My requests
// screen (one source).
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import api, { friendlyWriteError } from '../../api/client';
import { applicantsLabel, timeAgo } from '../../lib/copy';
import { catLabel, NEED_STATUS } from '../../lib/needs';
import { markSeen } from '../../lib/seenIds';
import { seenKey } from '../../lib/storageKeys';
import { useAuth } from '../../context/AuthContext';
import { useConfirm } from '../../context/ConfirmContext';
import { useToast } from '../../context/ToastContext';
import { useTheme } from '../../theme/ThemeContext';
import Avatar from '../ui/Avatar';
import Button from '../ui/Button';
import SegmentedControl from '../ui/SegmentedControl';
import LoadError from '../ui/LoadError';
import SkeletonCard from '../ui/Skeleton';

function StatusPill({ status }) {
  const { t, radius, type } = useTheme();
  const pill = NEED_STATUS[status] ?? NEED_STATUS.OPEN;
  return (
    // A label, not a button: soft fill, no border, so it can't be mistaken
    // for something tappable next to the real View action.
    <View
      style={{
        backgroundColor: status === 'OPEN' ? t.surfaceFill : t[pill.bg],
        borderRadius: radius.pill,
        paddingHorizontal: 9,
        paddingVertical: 4,
        alignSelf: 'flex-start',
      }}
    >
      <Text style={{ fontSize: type.meta, fontWeight: '600', color: t[pill.color] }}>{pill.label}</Text>
    </View>
  );
}

function NeedCard({ need, onAccept, onComplete, onRemove, pending }) {
  const { t, radius, type } = useTheme();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const applicants = need.applications ?? [];
  const meta = [catLabel(need.category), need.urgency === 'URGENT' ? 'Urgent' : 'Normal',
    need.createdAt ? `posted ${timeAgo(need.createdAt)}` : null].filter(Boolean).join(' · ');

  return (
    // Each request is its own bordered card on the page (user call 2026-07-26:
    // hairline-separated rows ran together and read as one long list).
    <View
      style={{
        backgroundColor: t.canvas,
        borderWidth: 1,
        borderColor: t.border,
        borderRadius: radius.card,
        padding: 16,
        marginTop: 12,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
        <Text style={{ fontSize: type.body, fontWeight: '600', lineHeight: 22, flex: 1, color: t.ink }}>
          {need.title}
        </Text>
        <StatusPill status={need.status} />
      </View>
      <Text style={{ fontSize: type.meta, color: t.inkSlate, marginTop: 6 }}>{meta}</Text>

      {need.status === 'OPEN' && applicants.length > 0 ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 }}>
          <Text style={{ fontSize: type.meta, fontWeight: '600', color: t.blueDeep, flex: 1 }}>
            {applicantsLabel(applicants.length)}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={open ? 'Hide helpers' : 'View helpers'}
            accessibilityState={{ expanded: open }}
            onPress={() => setOpen((v) => !v)}
            hitSlop={{ top: 6, bottom: 6 }}
            style={({ pressed }) => ({
              // minHeight, not height: the label must grow with the user's text
              // size instead of clipping (34 is the default-size look).
              minHeight: 34,
              paddingHorizontal: 16,
              paddingVertical: 8,
              borderRadius: radius.pill,
              backgroundColor: 'transparent',
              borderWidth: 1,
              borderColor: t.blueSoft,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <Text style={{ fontSize: type.meta, fontWeight: '600', color: t.blueDeep }}>
              {open ? 'Hide' : 'View'}
            </Text>
          </Pressable>
        </View>
      ) : null}

      {open && need.status === 'OPEN'
        ? applicants.map((app) => (
            <View key={app.helperId} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 12 }}>
              {/* The elder is making the platform's core trust decision here —
                  tapping the person opens their full profile (bio, trust,
                  reviews), the same link helpers get to elders. */}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`View ${app.helperName}'s profile`}
                onPress={() => router.push(`/user/${app.helperId}`)}
                hitSlop={6}
                style={({ pressed }) => ({
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                  flex: 1,
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <Avatar name={app.helperName} uri={app.helperPhotoUrl} size={40} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: type.body, color: t.ink }}>{app.helperName}</Text>
                  {app.message ? (
                    <Text numberOfLines={2} style={{ fontSize: type.meta, color: t.inkSlate }}>
                      {app.message}
                    </Text>
                  ) : null}
                </View>
              </Pressable>
              <Button
                title="Accept"
                variant="secondary"
                loading={pending.acceptingHelperId === app.helperId}
                onPress={() => onAccept(need, app)}
              />
            </View>
          ))
        : null}

      {/* Card actions sit on one right-aligned row: a full-width red Remove
          under every request shouted louder than the request itself.
          Remove must not live inside the applicant expansion — a request with
          zero applicants has no expansion, yet still has to be deletable (HCI rule 3). */}
      {need.status === 'ASSIGNED' || need.status === 'OPEN' ? (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: 8,
            marginTop: 14,
          }}
        >
          {need.status === 'ASSIGNED' ? (
            <Button
              title="Mark completed"
              variant="secondary"
              size="small"
              loading={pending.completing}
              onPress={() => onComplete(need)}
            />
          ) : null}
          {need.status === 'OPEN' ? (
            <Button
              title="Remove"
              variant="text"
              size="small"
              loading={pending.removing}
              onPress={() => onRemove(need)}
            />
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

export default function PostedHelpList({ initialSegment = 'open' }) {
  const { t, type } = useTheme();
  const { showToast } = useToast();
  const confirm = useConfirm();
  const queryClient = useQueryClient();
  const router = useRouter();
  const [seg, setSeg] = useState(initialSegment);
  const [refreshing, setRefreshing] = useState(false);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['needs-mine'],
    queryFn: async () => (await api.get('/needs/mine')).data,
  });
  const needs = data?.content ?? [];

  // Reading this list clears the red "new applicants" tab badge (web
  // b37420d: the dashboard marks its tab's tokens seen on open).
  const { user } = useAuth();
  const applicantTokens = useMemo(
    () =>
      (data?.content ?? []).flatMap((n) =>
        (n.applications ?? []).map((a) => `${n.id}:${a.helperId}`)
      ),
    [data]
  );
  useFocusEffect(
    useCallback(() => {
      if (applicantTokens.length) markSeen(seenKey(user?.userId, 'applicants'), applicantTokens);
    }, [user?.userId, applicantTokens])
  );

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['needs-mine'] });
  const onRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  const accept = useMutation({
    mutationFn: ({ needId, helperId }) => api.post(`/needs/${needId}/accept/${helperId}`),
    onSuccess: () => {
      showToast('Helper accepted. They can now message you.', 'success');
      refresh();
    },
    onError: (err) =>
      showToast(friendlyWriteError(err, 'Could not accept right now. Please try again.'), 'error'),
  });
  const complete = useMutation({
    mutationFn: (needId) => api.post(`/needs/${needId}/complete`),
    onSuccess: () => {
      showToast('Marked as completed. Well done!', 'success');
      refresh();
    },
    onError: (err) =>
      showToast(friendlyWriteError(err, 'Could not mark completed. Please try again.'), 'error'),
  });
  const remove = useMutation({
    mutationFn: (needId) => api.delete(`/needs/${needId}`),
    onSuccess: () => {
      showToast('Request removed.', 'success');
      refresh();
    },
    onError: (err) =>
      showToast(friendlyWriteError(err, 'Could not remove it. Please try again.'), 'error'),
  });

  // The row clamps long applications to 2 lines — the confirm dialog carries
  // the FULL message so the elder reads it all before deciding.
  const confirmAccept = async (need, app) => {
    const ok = await confirm({
      title: 'Accept this helper?',
      message:
        `${app.helperName} will be your helper for "${need.title}".` +
        (app.message ? `\n\nTheir message:\n“${app.message}”` : ''),
      cancelLabel: 'Not now',
      confirmLabel: 'Accept',
    });
    if (ok) accept.mutate({ needId: need.id, helperId: app.helperId });
  };
  const confirmComplete = async (need) => {
    const ok = await confirm({
      title: 'Mark as completed?',
      message: `"${need.title}" will move to your finished requests.`,
      cancelLabel: 'Not yet',
      // A verb, not an adjective (rulebook alert-button audit).
      confirmLabel: 'Mark completed',
    });
    if (ok) complete.mutate(need.id);
  };
  const confirmRemove = async (need) => {
    const ok = await confirm({
      title: 'Remove this request?',
      message: `"${need.title}" will be taken down. This cannot be undone.`,
      cancelLabel: 'Keep it',
      confirmLabel: 'Remove',
      destructive: true,
    });
    if (ok) remove.mutate(need.id);
  };

  const looking = needs.filter((n) => n.status === 'OPEN');
  const inProgress = needs.filter((n) => n.status === 'ASSIGNED');
  const finished = needs.filter((n) => n.status === 'COMPLETED' || n.status === 'CANCELLED');
  const shown = seg === 'open' ? looking : seg === 'progress' ? inProgress : finished;

  return (
    <ScrollView
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={t.blue} />}
      contentContainerStyle={{ paddingBottom: 120 }} // clears the Ask-AI FAB band on the posted-help tab
    >
      <SegmentedControl
        segments={[
          { key: 'open', label: 'Looking for Help', count: looking.length },
          { key: 'progress', label: 'In Progress', count: inProgress.length },
          { key: 'done', label: 'Completed', count: finished.length },
        ]}
        value={seg}
        onChange={setSeg}
        style={{ marginTop: 14 }}
      />

      {isLoading ? (
        <SkeletonCard />
      ) : isError ? (
        <LoadError what="your requests" onRetry={refetch} style={{ marginTop: 14 }} />
      ) : shown.length === 0 ? (
        <View style={{ paddingVertical: 24 }}>
          <Text style={{ fontSize: type.body, color: t.inkSlate, lineHeight: 22 }}>
            {seg === 'open'
              ? 'Nothing here yet. Ask your neighbors for a hand. It takes a minute.'
              : seg === 'progress'
                ? 'No requests in progress. When you accept a helper, it moves here.'
                : 'No completed requests yet.'}
          </Text>
          {/* A real starter action — never "tap the blue button below"
              (rulebook: no color-and-position references; empty states carry
              their own action). */}
          {seg === 'open' ? (
            <Button
              title="Post a help request"
              variant="secondary"
              onPress={() => router.push('/(tabs)/action')}
              style={{ marginTop: 16 }}
            />
          ) : null}
        </View>
      ) : (
        <View style={{ marginTop: 2 }}>
          {shown.map((need) => (
            <View key={need.id}>
              <NeedCard
                need={need}
                onAccept={confirmAccept}
                onComplete={confirmComplete}
                onRemove={confirmRemove}
                pending={{
                  acceptingHelperId:
                    accept.isPending && accept.variables?.needId === need.id
                      ? accept.variables.helperId
                      : null,
                  completing: complete.isPending && complete.variables === need.id,
                  removing: remove.isPending && remove.variables === need.id,
                }}
              />
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}
