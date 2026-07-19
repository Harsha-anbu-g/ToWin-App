// My Family (FAM-403) — the elder's management screen for their family circle,
// reached from MenuSheet "My Family" and Profile Edit "Manage My Family".
// Copy is 1:1 with web MyFamily.jsx; only elder-seat links render (iAmElder —
// a BOTH user's own family-side links live on Family Home instead). The seat
// cap is 5 counting OPEN REQUESTS, the web rule — never just active links.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Redirect } from 'expo-router';
import { useState } from 'react';
import { Alert, Text, View } from 'react-native';
import api from '../../src/api/client';
import AddParentForm from '../../src/components/family/AddParentForm';
import { LinkRow, SectionHeading } from '../../src/components/family/FamilyRows';
import ActionChip from '../../src/components/ui/ActionChip';
import Button from '../../src/components/ui/Button';
import LoadError from '../../src/components/ui/LoadError';
import Screen from '../../src/components/ui/Screen';
import SkeletonCard from '../../src/components/ui/Skeleton';
import { useAuth } from '../../src/context/AuthContext';
import { useToast } from '../../src/context/ToastContext';
import { useTheme } from '../../src/theme/ThemeContext';

const FAMILY_MAX = 5;

// The four promises — exact web bullets. Shown before anything else so the
// consent story is read before the first name is typed (HCI 10).
const PROMISES = [
  "Your family can see you're safe.",
  'They only see the friendships you choose to share.',
  'They can never post or act for you.',
  'You can remove anyone at any time.',
];

export default function MyFamilyScreen() {
  const { t, spacing, radius, type, fontFamily } = useTheme();
  const { user, booted } = useAuth();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [showAddForm, setShowAddForm] = useState(false);

  const { data: family, isLoading, isError, refetch } = useQuery({
    queryKey: ['family-links'],
    queryFn: async () => (await api.get('/family/links')).data,
  });

  // This screen is the ELDER seat: only links where I'm the elder side.
  const elderSide = (list) => (list ?? []).filter((l) => l.iAmElder);
  const members = elderSide(family?.activeLinks);
  const incoming = elderSide(family?.incomingRequests);
  const outgoing = elderSide(family?.outgoingRequests);
  const seatCount = members.length + incoming.length + outgoing.length;
  const canAdd = seatCount < FAMILY_MAX;

  // Accepting turns the link ACTIVE and moves MY trust score (the elder's
  // flat +1 family point), so trust-my-score refetches alongside the links.
  const respond = useMutation({
    mutationFn: ({ id, accept }) => api.post(`/family/requests/${id}/respond`, { accept }),
    onSuccess: (_r, { accept }) => {
      showToast(accept ? 'They are now part of your family here.' : 'Request declined.', 'success');
      queryClient.invalidateQueries({ queryKey: ['family-links'] });
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
    },
    onError: (err) =>
      showToast(
        err?.response?.data?.message || 'Could not cancel the request. Please try again.',
        'error'
      ),
  });

  // Revoking an ACTIVE link may drop the family trust point — refetch score.
  const remove = useMutation({
    mutationFn: (id) => api.delete(`/family/links/${id}`),
    onSuccess: () => {
      showToast('Removed from your family.', 'success');
      queryClient.invalidateQueries({ queryKey: ['family-links'] });
      queryClient.invalidateQueries({ queryKey: ['trust-my-score'] });
    },
    onError: (err) =>
      showToast(err?.response?.data?.message || 'Could not remove them. Please try again.', 'error'),
  });

  const makePrimary = useMutation({
    mutationFn: (id) => api.post(`/family/links/${id}/primary`),
    onSuccess: () => {
      showToast('Main contact updated.', 'success');
      queryClient.invalidateQueries({ queryKey: ['family-links'] });
    },
    onError: (err) =>
      showToast(
        err?.response?.data?.message || 'Could not change your main contact. Please try again.',
        'error'
      ),
  });

  // Native confirm (the emergency-contacts pattern) with the web's exact
  // danger message — removing must spell out what the person loses (HCI 5).
  const confirmRemove = (link) =>
    Alert.alert(
      `Remove ${link.otherUserName} from your family?`,
      "They will no longer see that you're safe or any friendship you shared. If they're your last family member here, your family trust point goes too. You can add them again later — they would need to accept again.",
      [
        { text: 'Keep', style: 'cancel' },
        { text: 'Remove from family', style: 'destructive', onPress: () => remove.mutate(link.id) },
      ]
    );

  const respondingTo = respond.isPending ? respond.variables?.id : null;
  const cancelling = cancel.isPending ? cancel.variables : null;
  const removing = remove.isPending ? remove.variables : null;
  const promoting = makePrimary.isPending ? makePrimary.variables : null;

  // Elder-seat guard (web ElderOnly parity, FAM-407 2026-07-19): entry points
  // are elder-gated, but deep links and imperative pushes reach the route for
  // anyone — HELPER/FAMILY must bounce to Home, not see the elder management
  // surface. After all hooks so the rules of hooks hold on every render.
  const isElderSeat = user?.role === 'ELDER' || user?.role === 'BOTH';
  if (booted && !isElderSeat) return <Redirect href="/(tabs)/home" />;

  return (
    // `keyboard` because AddParentForm opens mid-page, below the promises
    // card — without it the keyboard covers the identifier field on small
    // phones (same reason as the FAMILY home branch, FAM-407 2026-07-19).
    <Screen back keyboard>
      {/* Promises card FIRST — what family can and can never do, plus the
          gold +1 line (trust semantics carry the trust token, never blue). */}
      <View
        style={{
          backgroundColor: t.canvas,
          borderWidth: 1,
          borderColor: t.border,
          borderRadius: radius.card,
          padding: spacing[6],
        }}
      >
        <Text
          accessibilityRole="header"
          style={{ fontFamily: fontFamily.display, fontSize: 20, color: t.ink }}
        >
          How family works here
        </Text>
        {PROMISES.map((p) => (
          <View key={p} style={{ flexDirection: 'row', gap: spacing[2], marginTop: spacing[2] }}>
            <Text style={{ fontSize: type.body, color: t.inkSlate, lineHeight: 22 }}>•</Text>
            <Text style={{ flex: 1, fontSize: type.body, color: t.inkSlate, lineHeight: 22 }}>
              {p}
            </Text>
          </View>
        ))}
        <Text
          style={{
            fontSize: type.body,
            fontWeight: '600',
            color: t.trustGold,
            lineHeight: 22,
            marginTop: spacing[3],
          }}
        >
          Family connected gives you +1 trust point — one point total, however many family members
          you add (up to 5 people).
        </Text>
      </View>

      {/* Header row — serif title with the live seat counter. The "+ Add"
          pill hides while the form is open so "Send request" can be the
          screen's one filled primary; at the cap it yields to the notice. */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: spacing[3],
          marginTop: spacing[6],
        }}
      >
        <Text
          accessibilityRole="header"
          style={{ fontFamily: fontFamily.display, fontSize: 26, color: t.ink, letterSpacing: -0.5 }}
        >
          My Family
          {family ? (
            <Text style={{ fontSize: type.body, color: t.inkSlate, fontVariant: ['tabular-nums'] }}>
              {` (${seatCount}/${FAMILY_MAX})`}
            </Text>
          ) : null}
        </Text>
        {family && canAdd && !showAddForm ? (
          <Button
            title="+ Add a family member"
            onPress={() => setShowAddForm(true)}
            style={{ minHeight: 44, paddingHorizontal: 16 }}
          />
        ) : null}
      </View>

      {family && !canAdd ? (
        <Text style={{ fontSize: type.body, color: t.inkSlate, lineHeight: 22, marginTop: spacing[3] }}>
          You've reached the limit of 5 family members, counting open requests. Remove someone or
          cancel a request to add another person.
        </Text>
      ) : null}

      {showAddForm ? <AddParentForm side="family" onClose={() => setShowAddForm(false)} /> : null}

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
              <SectionHeading>They want to join your family</SectionHeading>
              {incoming.map((r, i) => (
                <LinkRow
                  key={r.id}
                  name={r.otherUserName}
                  line={`${r.relationship ? `${r.relationship} · ` : ''}wants to join as your family. It's your choice.`}
                  first={i === 0}
                >
                  <View style={{ flexDirection: 'row', gap: spacing[3], marginTop: spacing[3] }}>
                    <ActionChip
                      label="Accept"
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
                  line={`${r.relationship ? `${r.relationship} · ` : ''}Waiting for ${r.otherUserName} to accept — only they can say yes. You can cancel any time.`}
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

          {members.length === 0 ? (
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
                No family linked yet
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
                Add up to 5 people. Each one must accept before they're linked to you.
              </Text>
            </View>
          ) : (
            <View style={{ marginTop: spacing[2] }}>
              {members.map((l, i) => (
                <LinkRow
                  key={l.id}
                  name={l.otherUserName}
                  line={l.relationship || 'Family member'}
                  first={i === 0}
                  badge={
                    l.isPrimary ? (
                      // A label, not a button — the trust token marks the one
                      // main contact (trust semantics, never action blue).
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
                        <Text style={{ fontSize: type.meta, fontWeight: '600', color: t.trustGold }}>
                          Main contact
                        </Text>
                      </View>
                    ) : null
                  }
                >
                  <View style={{ flexDirection: 'row', gap: spacing[3], marginTop: spacing[3] }}>
                    {!l.isPrimary ? (
                      <ActionChip
                        label="Make main contact"
                        disabled={promoting === l.id}
                        onPress={() => makePrimary.mutate(l.id)}
                        style={{ flex: 1 }}
                      />
                    ) : null}
                    <ActionChip
                      label="Remove"
                      destructive
                      disabled={removing === l.id}
                      onPress={() => confirmRemove(l)}
                      style={{ flex: 1 }}
                    />
                  </View>
                </LinkRow>
              ))}
            </View>
          )}
        </>
      )}
    </Screen>
  );
}
