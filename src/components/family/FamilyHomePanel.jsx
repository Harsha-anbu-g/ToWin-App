// Family Home (FAM-402) — the FAMILY user's home tab content: linked parents,
// incoming/outgoing requests, the collapsed add-parent form, and the alert
// feed. Copy is 1:1 with web FamilyHome.jsx; layout is rows-not-boxes per the
// mobile design law. Only family-side links render (!iAmElder — a BOTH user's
// own elder-side links must never appear here, web-tested rule).
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';
import api from '../../api/client';
import { useToast } from '../../context/ToastContext';
import { useTheme } from '../../theme/ThemeContext';
import ActionChip from '../ui/ActionChip';
import Button from '../ui/Button';
import LoadError from '../ui/LoadError';
import SkeletonCard from '../ui/Skeleton';
import KeyholderAsk from '../passon/KeyholderAsk';
import AddParentForm from './AddParentForm';
import FamilyAlertsFeed from './FamilyAlertsFeed';
import { ParentStatusLine } from './FamilyJourney';
// Rows moved to FamilyRows (FAM-403) — the elder's My Family screen shares them.
import { LinkRow, SectionHeading } from './FamilyRows';

export default function FamilyHomePanel() {
  const { t, spacing, radius, type, fontFamily } = useTheme();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const router = useRouter();
  const [showAddForm, setShowAddForm] = useState(false);

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
      {/* Header row — the page title is just the list header (web decision
          2026-07-18: no hero card). The pill hides while the form is open so
          "Send request" can be the screen's one filled primary. */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: spacing[3],
        }}
      >
        <View style={{ flexShrink: 1 }}>
          <Text
            accessibilityRole="header"
            style={{ fontFamily: fontFamily.display, fontSize: 26, color: t.ink, letterSpacing: -0.5 }}
          >
            My Parents
          </Text>
          {/* Same title + one-line subtitle rhythm the elder and helper panels
              open with, so all three seats read as one app. */}
          <Text style={{ fontSize: type.meta, color: t.inkSlate, marginTop: 4 }}>
            The people you're watching over.
          </Text>
        </View>
        {!showAddForm ? (
          <Button
            title="+ Add your parent"
            onPress={() => setShowAddForm(true)}
            style={{ minHeight: 44, paddingHorizontal: 16 }}
          />
        ) : null}
      </View>

      {showAddForm ? <AddParentForm onClose={() => setShowAddForm(false)} /> : null}

      {/* Someone has asked me to hold a key to their Sealed box. Sits with
          the other "they are asking you something" cards, above the parent
          list, and renders nothing at all when nobody has asked. */}
      <KeyholderAsk />

      {isLoading ? (
        <View style={{ marginTop: spacing[5] }}>
          <SkeletonCard lines={3} />
        </View>
      ) : isError ? (
        <LoadError what="your family" onRetry={refetch} style={{ marginTop: spacing[5] }} />
      ) : (
        <>
          {incoming.length > 0 ? (
            <View>
              <SectionHeading>They added you as family</SectionHeading>
              {incoming.map((r, i) => (
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

          {outgoing.length > 0 ? (
            <View>
              <SectionHeading>Requests you sent</SectionHeading>
              {outgoing.map((r, i) => (
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

          {elders.length === 0 ? (
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
                  "the control is above" (rulebook). */}
              {!showAddForm ? (
                <Button
                  title="Add your parent"
                  variant="secondary"
                  onPress={() => setShowAddForm(true)}
                  style={{ marginTop: spacing[4], alignSelf: 'stretch' }}
                />
              ) : null}
            </View>
          ) : (
            <View style={{ marginTop: spacing[2] }}>
              {elders.map((l, i) => (
                <LinkRow
                  key={l.id}
                  name={l.otherUserName}
                  line={
                    l.relationship
                      ? `You're their ${l.relationship.toLowerCase()}`
                      : 'Your family member'
                  }
                  first={i === 0}
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
          )}
        </>
      )}

      <FamilyAlertsFeed />
    </View>
  );
}
