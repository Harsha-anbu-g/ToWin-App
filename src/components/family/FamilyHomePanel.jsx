// Family Home (FAM-402) — the FAMILY user's home tab content: linked parents,
// incoming/outgoing requests, the add-parent form, and the alert feed. Copy is
// 1:1 with web FamilyHome.jsx; layout is rows-not-boxes per the mobile design
// law. Only family-side links render (!iAmElder — a BOTH user's own elder-side
// links must never appear here, web-tested rule).
//
// Skeleton: the elder's My Helpers hub (owner call 2026-08-28, "keep elder as
// base and do the same for family and helper"): the same 22pt heading, the
// search field above the list, two segments the list swipes between, and the
// add-a-person action in the nav row's left slot (home.jsx → NavRow
// onAddParent), where the elder's Friends button sits, so the heading stands
// alone the way "My Helpers" does. Parents · Requests is this seat's pair:
// linked parents are the everyday list; requests are the links still waiting
// on somebody's yes, and the chip wears how many are waiting on YOURS.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';
import api from '../../api/client';
import { useToast } from '../../context/ToastContext';
import { filterByQuery } from '../../lib/searchFilter';
import { useTheme } from '../../theme/ThemeContext';
import ActionChip from '../ui/ActionChip';
import Button from '../ui/Button';
import LoadError from '../ui/LoadError';
import SearchField, { SearchMiss } from '../ui/SearchField';
import SegmentedControl from '../ui/SegmentedControl';
import SkeletonCard from '../ui/Skeleton';
import SwipeSegments from '../ui/SwipeSegments';
import KeyholderAsk from '../passon/KeyholderAsk';
import AddParentForm from './AddParentForm';
import FamilyAlertsFeed from './FamilyAlertsFeed';
import { ParentStatusLine } from './FamilyJourney';
// Rows moved to FamilyRows (FAM-403) — the elder's My Family screen shares them.
import { LinkRow, SectionHeading } from './FamilyRows';

export default function FamilyHomePanel({ addingParent, onAddingParentChange }) {
  const { t, spacing, radius, type, fontFamily } = useTheme();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const router = useRouter();
  // The add-parent form: opened from Home's nav row when the panel is
  // controlled, or from the empty state's own button; self-owned when the
  // panel renders alone.
  const [localAdding, setLocalAdding] = useState(false);
  const adding = addingParent ?? localAdding;
  const setAdding = onAddingParentChange ?? setLocalAdding;
  const [seg, setSeg] = useState('parents');
  const [query, setQuery] = useState('');

  const { data: family, isLoading, isError, refetch } = useQuery({
    queryKey: ['family-links'],
    queryFn: async () => (await api.get('/family/links')).data,
  });

  // The parent's journey: check-in, open requests, and the friendships they
  // chose to share. Kept as its own query so a journey outage still leaves the
  // links list — and the accept/cancel actions — working (HCI 9).
  const { data: journeyData } = useQuery({
    queryKey: ['family-journey'],
    queryFn: async () => (await api.get('/family/journey')).data,
  });
  const journeyFor = (elderId) =>
    (journeyData?.elders ?? []).find((e) => e.elderId === elderId);

  // This panel is the FAMILY seat: only links where I'm the family side.
  const familySide = (list) => (list ?? []).filter((l) => !l.iAmElder);
  const elders = familySide(family?.activeLinks);
  const incoming = familySide(family?.incomingRequests);
  const outgoing = familySide(family?.outgoingRequests);

  // The search narrows by name, the way My Helpers does; a miss says so and
  // never borrows the empty state below.
  const byName = (l) => [l.otherUserName];
  const shownParents = filterByQuery(elders, query, byName);
  const shownIncoming = filterByQuery(incoming, query, byName);
  const shownOutgoing = filterByQuery(outgoing, query, byName);
  const anyone = elders.length + incoming.length + outgoing.length > 0;
  const nothingShown =
    seg === 'parents' ? shownParents.length === 0 : shownIncoming.length + shownOutgoing.length === 0;

  // Accepting flips the link ACTIVE and moves the ELDER's trust score, so
  // trust-my-score refetches too; alerts start flowing once a link is ACTIVE.
  const respond = useMutation({
    mutationFn: ({ id, accept }) => api.post(`/family/requests/${id}/respond`, { accept }),
    onSuccess: (_r, { accept }) => {
      showToast(accept ? "You're now linked as their family." : 'Request declined.', 'success');
      queryClient.invalidateQueries({ queryKey: ['family-links'] });
      queryClient.invalidateQueries({ queryKey: ['family-alerts'] });
      queryClient.invalidateQueries({ queryKey: ['trust-my-score'] });
    },
    onError: (err) =>
      showToast(err?.response?.data?.message || 'Something went wrong. Please try again.', 'error'),
  });

  const cancel = useMutation({
    mutationFn: (id) => api.delete(`/family/links/${id}`),
    onSuccess: () => {
      showToast('Request cancelled.', 'success');
      queryClient.invalidateQueries({ queryKey: ['family-links'] });
      queryClient.invalidateQueries({ queryKey: ['trust-my-score'] });
    },
    onError: (err) =>
      showToast(
        err?.response?.data?.message || 'Could not cancel the request. Please try again.',
        'error'
      ),
  });

  const respondingTo = respond.isPending ? respond.variables?.id : null;
  const cancelling = cancel.isPending ? cancel.variables : null;

  return (
    <View>
      {/* The page title is just the list header (web decision 2026-07-18: no
          hero card), at the elder hub's size. */}
      <Text
        accessibilityRole="header"
        style={{ fontFamily: fontFamily.display, fontSize: 22, color: t.ink, letterSpacing: -0.5 }}
      >
        My Parents
      </Text>

      {adding ? <AddParentForm onClose={() => setAdding(false)} /> : null}

      {/* Someone has asked me to hold a key to their Sealed box. Sits with
          the other "they are asking you something" cards, above the parent
          list, and renders nothing at all when nobody has asked. */}
      <KeyholderAsk />

      {anyone ? <SearchField value={query} onChangeText={setQuery} style={{ marginTop: 12 }} /> : null}
      <SegmentedControl
        segments={[
          { key: 'parents', label: 'Parents' },
          // People waiting on my yes ride the chip as a badge, no count: the
          // Messages-chip grammar, one number per chip (owner 2026-08-28).
          { key: 'requests', label: 'Requests', badge: incoming.length, badgeNoun: 'waiting' },
        ]}
        value={seg}
        onChange={setSeg}
        style={{ marginTop: 12 }}
      />

      {/* Swiping the list left/right steps the segments, iOS-style. */}
      <SwipeSegments keys={['parents', 'requests']} value={seg} onChange={setSeg}>
        {isLoading ? (
          <View style={{ marginTop: spacing[5] }}>
            <SkeletonCard lines={3} />
          </View>
        ) : isError ? (
          <LoadError what="your family" onRetry={refetch} style={{ marginTop: spacing[5] }} />
        ) : query.trim() && nothingShown ? (
          <SearchMiss query={query} />
        ) : seg === 'parents' ? (
          elders.length === 0 ? (
            <View
              style={{
                backgroundColor: t.canvas,
                borderWidth: 1,
                borderColor: t.border,
                borderRadius: radius.card,
                padding: spacing[6],
                alignItems: 'center',
                marginTop: spacing[5],
              }}
            >
              <Text style={{ fontSize: type.body, fontWeight: '600', color: t.ink }}>
                No parent linked yet
              </Text>
              <Text
                style={{
                  fontSize: type.body,
                  color: t.inkSlate,
                  lineHeight: 22,
                  marginTop: spacing[2],
                  textAlign: 'center',
                }}
              >
                They must accept before you're linked.
              </Text>
              {/* The empty state carries its own starter action — never
                  "the control is above" (rulebook). Quiet: the form's Send
                  request is the surface's one filled primary. */}
              {!adding ? (
                <Button
                  title="Add your parent"
                  variant="secondary"
                  onPress={() => setAdding(true)}
                  style={{ marginTop: spacing[4], alignSelf: 'stretch' }}
                />
              ) : null}
            </View>
          ) : (
            <View style={{ marginTop: spacing[2] }}>
              {shownParents.map((l, i) => (
                <LinkRow
                  key={l.id}
                  name={l.otherUserName}
                  line={
                    l.relationship
                      ? `You're their ${l.relationship.toLowerCase()}`
                      : 'Your family member'
                  }
                  first={i === 0}
                  collapsible
                  badge={
                    // A label, not a button — a soft neutral wash so it can't
                    // be mistaken for something tappable (the fill carries no
                    // hue since the 2026-07-26 green-background removal).
                    <View
                      style={{
                        backgroundColor: t.greenTint,
                        borderWidth: 1,
                        borderColor: t.greenLine,
                        borderRadius: radius.pill,
                        paddingVertical: 6,
                        paddingHorizontal: 14,
                      }}
                    >
                      <Text style={{ fontSize: type.meta, fontWeight: '600', color: t.greenDeep }}>
                        Linked
                      </Text>
                    </View>
                  }
                >
                  {/* The row keeps the at-a-glance status; everything deeper —
                      shared friendships, guardian actions, open requests —
                      moved to the per-parent screen (FAM-506, web user call
                      2026-07-20: the home list got too crowded). */}
                  <ParentStatusLine journey={journeyFor(l.elderId)} />
                  <ActionChip
                    label={`See ${l.otherUserName}`}
                    tonal
                    onPress={() => router.push(`/family/parent/${l.elderId}`)}
                    style={{ marginTop: spacing[3], alignSelf: 'flex-start' }}
                  />
                </LinkRow>
              ))}
            </View>
          )
        ) : incoming.length + outgoing.length === 0 ? (
          <Text style={{ fontSize: type.body, color: t.inkSlate, lineHeight: 24, paddingVertical: spacing[4] }}>
            No requests right now. When you add a parent, or a parent adds you, it waits here until
            someone says yes.
          </Text>
        ) : (
          <>
            {shownIncoming.length > 0 ? (
              <View>
                <SectionHeading>They added you as family</SectionHeading>
                {shownIncoming.map((r, i) => (
                  <LinkRow
                    key={r.id}
                    name={r.otherUserName}
                    line={`wants you as their family here${r.relationship ? ` (as their ${r.relationship.toLowerCase()})` : ''}. It's your choice.`}
                    first={i === 0}
                  >
                    <View style={{ flexDirection: 'row', gap: spacing[3], marginTop: spacing[3] }}>
                      <ActionChip
                        label={respondingTo === r.id ? 'Accepting…' : 'Accept'}
                        tonal
                        disabled={respondingTo === r.id}
                        onPress={() => respond.mutate({ id: r.id, accept: true })}
                        style={{ flex: 1 }}
                      />
                      <ActionChip
                        label="Not now"
                        disabled={respondingTo === r.id}
                        onPress={() => respond.mutate({ id: r.id, accept: false })}
                        style={{ flex: 1 }}
                      />
                    </View>
                  </LinkRow>
                ))}
              </View>
            ) : null}

            {shownOutgoing.length > 0 ? (
              <View>
                <SectionHeading>Requests you sent</SectionHeading>
                {shownOutgoing.map((r, i) => (
                  <LinkRow
                    key={r.id}
                    name={r.otherUserName}
                    line={`Waiting for ${r.otherUserName} to accept. Only they can say yes. You can cancel any time.`}
                    first={i === 0}
                  >
                    <ActionChip
                      label="Cancel request"
                      disabled={cancelling === r.id}
                      onPress={() => cancel.mutate(r.id)}
                      style={{ marginTop: spacing[3] }}
                    />
                  </LinkRow>
                ))}
              </View>
            ) : null}
          </>
        )}
      </SwipeSegments>

      <FamilyAlertsFeed />
    </View>
  );
}
