// Posted Help (3f) — the elder's requests in three segments: Looking for
// Help / In Progress / Completed. Each request is a hairline row showing its
// title alone until touched (owner call 2026-08-26: "just title, and once click it
// should show other details like remove and view, without clicking again").
// One touch opens everything: the meta line ("Shopping · Normal · posted
// yesterday"), who is helping, every helper who offered with their Accept,
// and Remove / Mark completed. The old "View" toggle inside the card is
// gone — it was a second click. Accept, complete, and remove keep their
// confirm dialogs (HCI rule 5). Shared by the elder's second tab and the
// pushed My requests screen (one source).
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useFocusEffect, useRouter } from 'expo-router';
import { ChevronRight } from '../icons';
import { memo, useCallback, useRef, useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import RefreshControl from '../ui/RefreshControl';
import api, { friendlyWriteError } from '../../api/client';
import { applicantsLabel, timeAgo } from '../../lib/copy';
import { catLabel } from '../../lib/needs';
import { trustStandingFor } from '../../lib/trustStanding';
import { centerActionFor } from '../../lib/roles';
import { filterByQuery } from '../../lib/searchFilter';
import LocationPrimer from '../location/LocationPrimer';
import useDevicePosition from '../../lib/useDevicePosition';
import { useConfirm } from '../../context/ConfirmContext';
import { useToast } from '../../context/ToastContext';
import { useTheme } from '../../theme/ThemeContext';
import Avatar from '../ui/Avatar';
import Button from '../ui/Button';
import SearchField, { SearchMiss } from '../ui/SearchField';
import SegmentedControl from '../ui/SegmentedControl';
import SwipeSegments from '../ui/SwipeSegments';
import LoadError from '../ui/LoadError';
import SkeletonCard from '../ui/Skeleton';

// Helpers who offered on a request and are still waiting for an answer. An
// OPEN request's applications are all pending: the moment one is accepted the
// request leaves OPEN (NeedService.acceptHelper), so no status filter here.
const offersOn = (need) => (need.status === 'OPEN' ? (need.applications ?? []).length : 0);

// Memoized with primitive pending props, so one card's Accept spinner or a
// list-level render never re-renders every other card (UX-705).
const NeedCard = memo(function NeedCard({
  need,
  onAccept,
  onComplete,
  onRemove,
  acceptingHelperId,
  completing,
  removing,
  divider,
  helperTrust,
}) {
  const { t, type } = useTheme();
  const router = useRouter();
  // One fold per card: the title opens everything beneath it.
  const [open, setOpen] = useState(false);
  const applicants = need.applications ?? [];
  const offers = offersOn(need);
  // Once the request leaves OPEN, the person who took it must stay visible
  // (owner report 2026-08-17: "helper found" never said WHO). The backend
  // marks them ACCEPTED in the applications list.
  const acceptedHelper =
    need.status !== 'OPEN' ? applicants.find((a) => a.status === 'ACCEPTED') : null;
  const meta = [catLabel(need.category), need.urgency === 'URGENT' ? 'Urgent' : 'Normal',
    need.createdAt ? `posted ${timeAgo(need.createdAt)}` : null,
    need.status === 'CANCELLED' ? 'Cancelled' : null].filter(Boolean).join(' · ');
  // The folded In Progress row says WHO and where trust stands, without a
  // touch: that pair is the whole point of the segment.
  const helperLine =
    need.status === 'ASSIGNED' && acceptedHelper
      ? [acceptedHelper.helperName, helperTrust?.word].filter(Boolean).join(' · ')
      : null;
  // A request a family member wrote on the elder's behalf says so on the
  // elder's own screen, folded or open, so a request they do not remember
  // writing never looks like it appeared out of nowhere (website
  // ElderDashboard parity; owner call 2026-08-28: "if the help is posted by
  // family it should show it to the elder"). The backend files the request
  // under the elder and only names the writer (NeedResponse.actedByName).
  const askedBy = need.actedByName ? `Asked by ${need.actedByName}, for you` : null;

  return (
    // A plain row, hairline-separated, the same line the My Helpers rows draw
    // (owner call 2026-08-26: "it should not show like a tab, it should show
    // like normal lines, like in My Helpers"). This retires the 2026-07-26
    // bordered card: with the cards folded to a title each, a box per title
    // read as a row of tabs.
    <View style={divider ? { borderTopWidth: 1, borderTopColor: t.hairline } : null}>
      {/* The title is the whole card until touched. The meta rides the spoken
          label so folding never hides status from a screen reader (HCI 1). */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${need.title}. ${askedBy ? `${askedBy}. ` : ''}${helperLine ? `${helperLine}. ` : ''}${offers > 0 ? `${applicantsLabel(offers)}. ` : ''}${meta}`}
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen((v) => !v)}
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          minHeight: 60,
          opacity: pressed ? 0.7 : 1,
        })}
      >
        {/* No status pill: the segment above already names the status of
            every card under it (owner report 2026-08-22). The one status a
            segment does not carry — a cancelled request in Completed — rides
            the meta line inside. */}
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: type.body, fontWeight: '600', lineHeight: 22, color: t.ink }}>
            {need.title}
          </Text>
          {askedBy ? (
            // Gold, the trust colour, as the website and the family's own
            // view (FamilyNeedsForParent) set this same line.
            <Text style={{ fontSize: type.caption, fontWeight: '600', color: t.trustGold, marginTop: 2 }}>
              {askedBy}
            </Text>
          ) : null}
          {helperLine ? (
            <Text style={{ fontSize: type.caption, color: t.inkSlate, marginTop: 2 }}>{helperLine}</Text>
          ) : null}
        </View>
        {offers > 0 ? (
          // Helpers waiting on this request, worn on the folded title the way
          // an unread chat row wears its count — the fold must not hide that
          // someone is waiting (HCI 1). badgeFill, like every count badge in
          // the app; spoken through the label above.
          <View
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            style={{
              minWidth: 22,
              height: 22,
              borderRadius: 11,
              paddingHorizontal: 6,
              backgroundColor: t.badgeFill,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ fontSize: 12, fontWeight: '700', color: t.badgeText, fontVariant: ['tabular-nums'] }}>
              {offers}
            </Text>
          </View>
        ) : null}
        <ChevronRight
          size={18}
          color={t.inkFaint2}
          strokeWidth={1.8}
          style={{ transform: [{ rotate: open ? '90deg' : '0deg' }] }}
        />
      </Pressable>

      {open ? (
        <View style={{ paddingBottom: 12 }}>
          <Text style={{ fontSize: type.meta, color: t.inkSlate }}>{meta}</Text>

          {/* WHO is helping — tap opens their profile (message from there). */}
          {acceptedHelper ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`View ${acceptedHelper.helperName}'s profile`}
              onPress={() => router.push(`/user/${acceptedHelper.helperId}`)}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                gap: 10,
                minHeight: 44,
                marginTop: 10,
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <Avatar name={acceptedHelper.helperName} uri={acceptedHelper.helperPhotoUrl} size={36} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: type.meta, fontWeight: '600', color: t.ink }}>
                  {acceptedHelper.helperName}
                </Text>
                <Text style={{ fontSize: type.caption, color: t.inkSlate, marginTop: 1 }}>
                  {need.status !== 'ASSIGNED'
                    ? 'Helped you with this.'
                    : helperTrust
                      ? `${helperTrust.word} · Stage ${helperTrust.stageNo} of 7, ${helperTrust.stageName}. Tap to see their profile.`
                      : 'Is helping you with this. Tap to see their profile.'}
                </Text>
              </View>
              <ChevronRight size={16} color={t.inkFaint2} strokeWidth={2} />
            </Pressable>
          ) : null}

          {/* Every helper who offered, straight away — no View to press. */}
          {need.status === 'OPEN' && applicants.length > 0 ? (
            <Text style={{ fontSize: type.meta, fontWeight: '600', color: t.blueDeep, marginTop: 12 }}>
              {applicantsLabel(applicants.length)}
            </Text>
          ) : null}
          {need.status === 'OPEN'
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
                      // A helper who wrote no message leaves this row at the 40pt
                      // avatar, and hitSlop was carrying the last 4 (DEEP-08 again,
                      // one line below). The slop stays as a native-only bonus.
                      minHeight: 44,
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
                    loading={acceptingHelperId === app.helperId}
                    onPress={() => onAccept(need, app)}
                  />
                </View>
              ))
            : null}

          {/* Card actions sit on one right-aligned row: a full-width red Remove
              under every request shouted louder than the request itself. A
              request with zero applicants still has to be deletable (HCI rule 3),
              so Remove rides here, not on an applicant row. */}
          {need.status === 'ASSIGNED' || need.status === 'OPEN' ? (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'flex-end',
                gap: 8,
                marginTop: 10,
              }}
            >
              {need.status === 'ASSIGNED' ? (
                <Button
                  title="Mark completed"
                  variant="secondary"
                  size="small"
                  loading={completing}
                  onPress={() => onComplete(need)}
                />
              ) : null}
              {need.status === 'OPEN' ? (
                <Button
                  title="Remove"
                  variant="text"
                  size="small"
                  loading={removing}
                  onPress={() => onRemove(need)}
                />
              ) : null}
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );
});

const keyId = (need) => need.id;

export default function PostedHelpList({ initialSegment = 'open' }) {
  const { t, type } = useTheme();
  const { showToast } = useToast();
  const confirm = useConfirm();
  const queryClient = useQueryClient();
  const router = useRouter();
  const [seg, setSeg] = useState(initialSegment);
  // The search box above the list (owner call 2026-08-28, WhatsApp): narrows the
  // open segment by a request's title or the name of anyone who offered.
  const [query, setQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  // The ask lives HERE and not on the form (owner decision 2026-08-22).
  // app/(tabs)/action.jsx pushes to this screen the moment a request posts, so
  // this is the first thing an elder sees afterwards, with their own request in
  // front of them. Nothing interrupts them while they are writing.
  //
  // Without a position their request carries the town centre they typed at
  // signup, so a helper on their street reads the same distance as one across
  // town. Add Friends used to be the only screen that ever asked, and an elder
  // who never opened it was never asked at all.
  const {
    status: locStatus,
    busy: locBusy,
    hasPosition,
    enable: enableLocation,
    dismissed: locDismissed,
    dismiss: hideLocationCard,
  } = useDevicePosition();
  // `locStatus` stays null until the first read lands, so the card waits rather
  // than flashing the wrong words. Mounting cannot prompt: the iOS dialog is
  // spent only by a tap on the card itself.
  const shouldAskForLocation = !!locStatus && !hasPosition && !locDismissed;

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['needs-mine'],
    queryFn: async () => (await api.get('/needs/mine')).data,
  });
  const needs = data?.content ?? [];
  // The friendships behind In Progress requests — where trust stands with
  // each helper. Same key as the tab shell and My Helpers, so one fetch.
  const { data: connections } = useQuery({
    queryKey: ['connections'],
    queryFn: async () => (await api.get('/connections')).data,
  });

  // Opening this list no longer clears the tab's badge: the badge counts
  // helpers still waiting for an answer (src/lib/offersWaiting.js), and only
  // accepting or removing the request changes that (owner call 2026-08-28).

  // Coming back to this screen re-checks for new applicants (UX-710, closing
  // the react-review finding: tab screens stay mounted, so without this only
  // a pull-to-refresh or a mutation ever refetched). The first focus is the
  // mount — the query's own fetch already covers it.
  const firstFocus = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (firstFocus.current) {
        firstFocus.current = false;
        return;
      }
      refetch();
    }, [refetch])
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
      // Accepting also opens the connection that carries the chat (server:
      // NeedService.acceptHelper), which is why the web dashboard reloads both
      // lists — `Promise.all([loadNeeds(), loadConnections()])`. Without this the
      // toast promises messaging while Messages, the friends hub and the tab
      // badge still show the list from before the tap: tab screens stay mounted,
      // so nothing remounts to clear it.
      queryClient.invalidateQueries({ queryKey: ['connections'] });
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
  // the FULL message so the elder reads it all before deciding. Stable
  // references (confirm and mutate never change) keep the memoized cards
  // from re-rendering when the list does.
  const { mutate: acceptMutate } = accept;
  const { mutate: completeMutate } = complete;
  const { mutate: removeMutate } = remove;
  const confirmAccept = useCallback(
    async (need, app) => {
      const ok = await confirm({
        title: 'Accept this helper?',
        message:
          `${app.helperName} will be your helper for "${need.title}".` +
          (app.message ? `\n\nTheir message:\n“${app.message}”` : ''),
        cancelLabel: 'Not now',
        confirmLabel: 'Accept',
      });
      if (ok) acceptMutate({ needId: need.id, helperId: app.helperId });
    },
    [confirm, acceptMutate]
  );
  const confirmComplete = useCallback(
    async (need) => {
      const ok = await confirm({
        title: 'Mark as completed?',
        message: `"${need.title}" will move to your finished requests.`,
        cancelLabel: 'Not yet',
        // A verb, not an adjective (rulebook alert-button audit).
        confirmLabel: 'Mark completed',
      });
      if (ok) completeMutate(need.id);
    },
    [confirm, completeMutate]
  );
  const confirmRemove = useCallback(
    async (need) => {
      const ok = await confirm({
        title: 'Remove this request?',
        message: `"${need.title}" will be taken down. This cannot be undone.`,
        cancelLabel: 'Keep it',
        confirmLabel: 'Remove',
        destructive: true,
      });
      if (ok) removeMutate(need.id);
    },
    [confirm, removeMutate]
  );

  const looking = needs.filter((n) => n.status === 'OPEN');
  const inProgress = needs.filter((n) => n.status === 'ASSIGNED');
  const finished = needs.filter((n) => n.status === 'COMPLETED' || n.status === 'CANCELLED');
  // Offers waiting for an answer are no longer counted on the Waiting chip
  // (owner report 2026-08-28: "3 and 1, two numbers in the Waiting"). One
  // number per chip is the app-wide grammar — Messages chips wear a badge
  // only, My Jobs a count only — and this was the sole chip wearing both.
  // Offers still show twice on this screen: the Posted Help tab badge
  // (src/lib/offersWaiting.js) and the badge on each request's folded title.
  const inSegment = seg === 'open' ? looking : seg === 'progress' ? inProgress : finished;
  const shown = filterByQuery(inSegment, query, (n) => [
    n.title,
    ...(n.applications ?? []).map((a) => a.helperName),
  ]);
  const settled = !isLoading && !isError;

  const renderNeed = useCallback(
    ({ item: need, index }) => (
      <NeedCard
        need={need}
        divider={index > 0}
        helperTrust={
          need.status === 'ASSIGNED'
            ? trustStandingFor(
                (need.applications ?? []).find((a) => a.status === 'ACCEPTED')?.helperId,
                connections
              )
            : null
        }
        onAccept={confirmAccept}
        onComplete={confirmComplete}
        onRemove={confirmRemove}
        acceptingHelperId={
          accept.isPending && accept.variables?.needId === need.id
            ? accept.variables.helperId
            : null
        }
        completing={complete.isPending && complete.variables === need.id}
        removing={remove.isPending && remove.variables === need.id}
      />
    ),
    [
      connections,
      confirmAccept,
      confirmComplete,
      confirmRemove,
      accept.isPending,
      accept.variables,
      complete.isPending,
      complete.variables,
      remove.isPending,
      remove.variables,
    ]
  );

  return (
    // Swiping the list left/right steps the segments, iOS-style.
    <SwipeSegments keys={['open', 'progress', 'done']} value={seg} onChange={setSeg} style={{ flex: 1 }}>
    <FlatList
      // No scroll indicator riding the right edge while the list moves (owner
      // call 2026-08-28: "remove the bar in right when it comes while scrolling").
      showsVerticalScrollIndicator={false}
      data={settled ? shown : []}
      keyExtractor={keyId}
      renderItem={renderNeed}
      // ~150pt cards: eight covers the tallest phone before the first scroll.
      initialNumToRender={8}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      contentContainerStyle={{ paddingBottom: 120 }} // clears the Ask-AI FAB band on the posted-help tab
      ListHeaderComponent={
        <>
          {shouldAskForLocation ? (
            <View style={{ marginTop: 14 }}>
              {/* secondary: the locked rule is one filled sky-blue button per
                  screen (HCI 8), and this list already scrolls under the
                  filled Ask-AI action. Dismissible, because handing over a
                  position must never be the price of reading your own
                  requests (HCI 3). */}
              <LocationPrimer
                status={locStatus}
                busy={locBusy}
                context="post"
                actionVariant="secondary"
                onEnable={enableLocation}
                onDismiss={hideLocationCard}
              />
            </View>
          ) : null}
        {needs.length > 0 ? <SearchField value={query} onChangeText={setQuery} style={{ marginTop: 14 }} /> : null}
        <SegmentedControl
          segments={[
            // 'Waiting', not 'Looking for Help': three segments share one
            // phone width, and the long label truncated to dots on device
            // (owner report 2026-08-17). The row pills keep the full phrase.
            // Counts are back (owner call 2026-08-26: "show the number at the
            // top in the heading, how many it has"), reversing 2026-08-22's
            // "remove the numbers in the top". The offers badge that rode
            // Waiting beside its count (2026-08-26) is gone: two numbers on one
            // chip read as an error (owner report 2026-08-28).
            { key: 'open', label: 'Waiting', count: looking.length },
            { key: 'progress', label: 'In Progress', count: inProgress.length },
            { key: 'done', label: 'Completed', count: finished.length },
          ]}
          value={seg}
          onChange={setSeg}
          // Rows carry no top margin of their own (they are lines, not cards),
          // so the control keeps 8pt of air below itself when there is a list.
          style={{
            marginTop: needs.length > 0 ? 10 : shouldAskForLocation ? 0 : 14,
            marginBottom: settled && shown.length > 0 ? 8 : 0,
          }}
        />
        </>
      }
      ListEmptyComponent={
        isLoading ? (
          <SkeletonCard />
        ) : isError ? (
          <LoadError what="your requests" onRetry={refetch} style={{ marginTop: 14 }} />
        ) : query.trim() && inSegment.length > 0 ? (
          // A search that finds nothing says so, and never borrows the
          // segment's own "nothing here yet" starter.
          <SearchMiss query={query} />
        ) : (
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
                title={centerActionFor('ELDER').label}
                variant="secondary"
                onPress={() => router.push('/(tabs)/action')}
                style={{ marginTop: 16 }}
              />
            ) : null}
          </View>
        )
      }
    />
    </SwipeSegments>
  );
}
