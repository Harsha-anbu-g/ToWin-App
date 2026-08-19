// My Family (FAM-403; FAM-504/505 web parity 2026-07-26) — the elder's
// management screen for their family circle, reached from Profile "My
// Family" (the Menu drawer retired 2026-08-19) and Profile Edit "Manage My
// Family". Copy is 1:1 with web
// MyFamily.jsx; only elder-seat links render (iAmElder — a BOTH user's own
// family-side links live on Family Home instead). The seat cap is 5 counting
// OPEN REQUESTS, the web rule — never just active links.
//
// The whole page is three plain areas now — Controls, My family, How it
// works — instead of one long scroll (web user call 2026-07-21). Lands on
// Controls by default (web user call 2026-07-26). Controls keeps its own
// Sharing / Act for me split: the two things family can be given — seeing,
// and doing — side by side so it never looks like only one exists.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Redirect, useRouter } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';
import api from '../../src/api/client';
import AddParentForm from '../../src/components/family/AddParentForm';
import DelegatedPowerToggle from '../../src/components/family/DelegatedPowerToggle';
import { LinkRow, SectionHeading } from '../../src/components/family/FamilyRows';
import FamilyShareToggle from '../../src/components/family/FamilyShareToggle';
import ActionChip from '../../src/components/ui/ActionChip';
import Button from '../../src/components/ui/Button';
import LoadError from '../../src/components/ui/LoadError';
import Screen from '../../src/components/ui/Screen';
import SegmentedControl from '../../src/components/ui/SegmentedControl';
import SkeletonCard from '../../src/components/ui/Skeleton';
import { useAuth } from '../../src/context/AuthContext';
import { useConfirm } from '../../src/context/ConfirmContext';
import { useToast } from '../../src/context/ToastContext';
import { POWERS } from '../../src/lib/familyPowers';
import { SHARING_GIVES } from '../../src/lib/sharingGives';
import { useTheme } from '../../src/theme/ThemeContext';

const FAMILY_MAX = 5;

// The four promises — exact web bullets. The How-it-works tab keeps the
// consent story one tap away from every control (HCI 10).
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
  const confirm = useConfirm();
  const queryClient = useQueryClient();
  const router = useRouter();
  const [showAddForm, setShowAddForm] = useState(false);
  const [tab, setTab] = useState('controls');
  const [controlsTab, setControlsTab] = useState('watching');

  const { data: family, isLoading, isError, refetch } = useQuery({
    queryKey: ['family-links'],
    queryFn: async () => (await api.get('/family/links')).data,
  });

  // My own friendships — each one carries its own Sharing switch. FAMILY-type
  // connections are the family chats themselves (e.g. with a daughter), not
  // friendships to share, so they get no switch here (web rule).
  const {
    data: allConnections,
    isError: connectionsFailed,
    refetch: refetchConnections,
  } = useQuery({
    queryKey: ['connections'],
    queryFn: async () => (await api.get('/connections')).data,
  });
  const connections = (Array.isArray(allConnections) ? allConnections : []).filter(
    (c) => c.status === 'ACTIVE' && c.type !== 'FAMILY'
  );
  // Failed AND nothing to show. Saying "you have no friendships yet" to an
  // elder who has several is a false statement about her own relationships,
  // and it makes every sharing switch vanish as if she had lost them.
  const friendshipsUnknown = connectionsFailed && connections.length === 0;

  // Pull-to-refresh (UX-704): reload exactly what this screen shows.
  const reload = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ['family-links'] }),
      queryClient.invalidateQueries({ queryKey: ['connections'] }),
    ]);

  // This screen is the ELDER seat: only links where I'm the elder side.
  const elderSide = (list) => (list ?? []).filter((l) => l.iAmElder);
  const members = elderSide(family?.activeLinks);
  const incoming = elderSide(family?.incomingRequests);
  const outgoing = elderSide(family?.outgoingRequests);
  const seatCount = members.length + incoming.length + outgoing.length;
  const canAdd = seatCount < FAMILY_MAX;

  // Consent flow (FAM-505): open asks from family members, flattened across
  // active links. Each one becomes an approval card on the My family tab.
  const powerAsks = members.flatMap((l) =>
    (l.pendingPowerRequests || []).map((r) => ({ ...r, link: l }))
  );

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

  // Consent flow: the elder answers an ask. A yes is the same decision as
  // flipping the Controls switch, so the card explains it in the same words.
  const respondToAsk = useMutation({
    mutationFn: ({ id, accept }) => api.post(`/family/power-requests/${id}/respond`, { accept }),
    onSuccess: (_r, { accept }) => {
      showToast(accept ? 'Done. They can do this for you now.' : 'Okay. Nothing changes.', 'success');
      queryClient.invalidateQueries({ queryKey: ['family-links'] });
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

  // Open (or reopen) the private chat with a family member (FAM-510). The
  // family link is the only permission; the server checks it and returns the
  // conversation to open.
  const openChat = useMutation({
    mutationFn: (l) => api.post(`/family/chat/${l.otherUserId}`),
    onSuccess: (r) => {
      queryClient.invalidateQueries({ queryKey: ['connections'] });
      router.push(`/chat/${r.data}`);
    },
    onError: (err) =>
      showToast(err?.response?.data?.message || 'Could not open the chat. Please try again.', 'error'),
  });

  // The shared confirm dialog with the web's exact danger message — removing
  // must spell out what the person loses (HCI 5).
  const confirmRemove = async (link) => {
    const ok = await confirm({
      title: `Remove ${link.otherUserName} from your family?`,
      message:
        "They will no longer see that you're safe or any friendship you shared. If they're your last family member here, your family trust point goes too. You can add them again later. They would need to accept again.",
      cancelLabel: 'Keep',
      confirmLabel: 'Remove from family',
      destructive: true,
    });
    if (ok) remove.mutate(link.id);
  };

  const respondingTo = respond.isPending ? respond.variables?.id : null;
  const answeringAsk = respondToAsk.isPending ? respondToAsk.variables?.id : null;
  const cancelling = cancel.isPending ? cancel.variables : null;
  const removing = remove.isPending ? remove.variables : null;
  const promoting = makePrimary.isPending ? makePrimary.variables : null;
  const chatOpening = openChat.isPending ? openChat.variables?.id : null;

  // Elder-seat guard (web ElderOnly parity, FAM-407 2026-07-19): entry points
  // are elder-gated, but deep links and imperative pushes reach the route for
  // anyone — HELPER/FAMILY must bounce to Home, not see the elder management
  // surface. After all hooks so the rules of hooks hold on every render.
  const isElderSeat = user?.role === 'ELDER' || user?.role === 'BOTH';
  if (booted && !isElderSeat) return <Redirect href="/(tabs)/home" />;

  const card = {
    backgroundColor: t.canvas,
    borderWidth: 1,
    borderColor: t.border,
    borderRadius: radius.card,
    padding: spacing[6],
  };

  const sharedCount = connections.filter((c) => c.sharedWithFamily).length;
  const actingCount = members.filter((l) => (l.delegatedPowers || []).length > 0).length;

  return (
    // `keyboard` because AddParentForm opens mid-page — without it the
    // keyboard covers the identifier field on small phones (FAM-407).
    <Screen back keyboard onRefresh={reload}>
      {/* Serif title with the live seat counter, then the three areas. */}
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

      <SegmentedControl
        segments={[
          { key: 'controls', label: 'Controls' },
          {
            key: 'members',
            label: 'My family',
            // Things waiting on the elder's answer — asks and join requests.
            count: powerAsks.length + incoming.length || null,
          },
          { key: 'how', label: 'How it works' },
        ]}
        value={tab}
        onChange={setTab}
        style={{ marginTop: spacing[4] }}
      />

      {isLoading ? (
        <View style={{ marginTop: spacing[5] }}>
          <SkeletonCard lines={3} />
        </View>
      ) : isError ? (
        <LoadError what="your family" onRetry={refetch} style={{ marginTop: spacing[5] }} />
      ) : null}

      {/* ── How it works: the promises card, verbatim. ─────────────────── */}
      {tab === 'how' ? (
        <View style={{ ...card, marginTop: spacing[5] }}>
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
            Family connected gives you +1 trust point. One point total, however many family
            members you add (up to 5 people).
          </Text>
        </View>
      ) : null}

      {/* ── My family: asks first, then people and requests. ───────────── */}
      {tab === 'members' && family ? (
        <>
          {/* Consent flow (FAM-505): a family member asked for a power. The
              card explains a yes in the same words the Controls switch uses,
              so saying yes here and flipping the switch there are visibly
              the same decision. */}
          {powerAsks.length > 0 ? (
            <View>
              <SectionHeading>They're asking you</SectionHeading>
              {powerAsks.map((a, i) => {
                const p = POWERS.find((x) => x.key === a.power);
                const name = a.link.otherUserName;
                return (
                  <LinkRow
                    key={a.id}
                    name={`${name} asks: ${p ? p.title.toLowerCase() : 'a new power'}`}
                    line={`${p ? `If you say yes: ${p.on(name)} ` : ''}It's your choice, and you can turn it off again any time.`}
                    first={i === 0}
                  >
                    <View style={{ flexDirection: 'row', gap: spacing[3], marginTop: spacing[3] }}>
                      <ActionChip
                        label="Yes"
                        tonal
                        disabled={answeringAsk === a.id}
                        onPress={() => respondToAsk.mutate({ id: a.id, accept: true })}
                        style={{ flex: 1 }}
                      />
                      <ActionChip
                        label="Not now"
                        disabled={answeringAsk === a.id}
                        onPress={() => respondToAsk.mutate({ id: a.id, accept: false })}
                        style={{ flex: 1 }}
                      />
                    </View>
                  </LinkRow>
                );
              })}
            </View>
          ) : null}

          {/* Header row — "+ Add" hides while the form is open so "Send
              request" can be the screen's one filled primary; at the cap it
              yields to the notice. */}
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
              // 20 serif like every peer section — a section heading must
              // never outrank the page title (rulebook hierarchy).
              style={{ fontFamily: fontFamily.display, fontSize: 20, color: t.ink }}
            >
              People in your family
            </Text>
            {canAdd && !showAddForm ? (
              <Button
                title="+ Add a family member"
                onPress={() => setShowAddForm(true)}
                style={{ minHeight: 44, paddingHorizontal: 16 }}
              />
            ) : null}
          </View>

          {!canAdd ? (
            <Text
              style={{ fontSize: type.body, color: t.inkSlate, lineHeight: 22, marginTop: spacing[3] }}
            >
              You've reached the limit of 5 family members, counting open requests. Remove someone
              or cancel a request to add another person.
            </Text>
          ) : null}

          {showAddForm ? <AddParentForm side="family" onClose={() => setShowAddForm(false)} /> : null}

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
                  line={`${r.relationship ? `${r.relationship} · ` : ''}Waiting for ${r.otherUserName} to accept. Only they can say yes. You can cancel any time.`}
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
            <View style={{ ...card, alignItems: 'center', marginTop: spacing[5] }}>
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
                    {/* Private family chat (FAM-510): the link is the permission. */}
                    <ActionChip
                      label={chatOpening === l.id ? 'Opening…' : 'Message'}
                      tonal
                      disabled={chatOpening === l.id}
                      onPress={() => openChat.mutate(l)}
                      style={{ flex: 1 }}
                    />
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
      ) : null}

      {/* ── Controls: what family may see and do (FAM-504). ────────────── */}
      {tab === 'controls' && family ? (
        members.length === 0 ? (
          <View style={{ ...card, alignItems: 'center', marginTop: spacing[5] }}>
            <Text style={{ fontSize: type.body, fontWeight: '600', color: t.ink }}>
              Add a family member first
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
              Once someone is in your family, you choose here what they can see and what they can
              do for you. Everything starts off.
            </Text>
          </View>
        ) : (
          <View style={{ marginTop: spacing[5] }}>
            <Text style={{ fontSize: type.body, color: t.inkSlate, lineHeight: 22, marginBottom: spacing[4] }}>
              Sharing is what your family can see. Act for me is what they can do. Both start off,
              and only you can change them.
            </Text>

            <SegmentedControl
              segments={[
                { key: 'watching', label: 'Sharing', count: sharedCount || null },
                { key: 'acting', label: 'Act for me', count: actingCount || null },
              ]}
              value={controlsTab}
              onChange={setControlsTab}
            />

            {controlsTab === 'watching' ? (
              friendshipsUnknown ? (
                <LoadError
                  what="your friendships"
                  onRetry={refetchConnections}
                  style={{ marginTop: spacing[4] }}
                />
              ) : connections.length === 0 ? (
                <View style={{ ...card, alignItems: 'center', marginTop: spacing[4] }}>
                  <Text
                    style={{ fontSize: type.body, color: t.inkSlate, lineHeight: 22, textAlign: 'center' }}
                  >
                    You have no friendships yet. Once you do, you choose here which ones your
                    family can see.
                  </Text>
                </View>
              ) : (
                <View style={{ ...card, marginTop: spacing[4] }}>
                  <Text style={{ fontSize: type.body, color: t.inkSlate, lineHeight: 22, marginBottom: spacing[2] }}>
                    Everyone in your family gets the friendships you turn on here. On a shared
                    friendship they can:
                  </Text>
                  {SHARING_GIVES.map((g) => (
                    <View key={g.key} style={{ flexDirection: 'row', gap: spacing[2], marginTop: spacing[1] }}>
                      <Text style={{ fontSize: type.body, color: t.inkSlate, lineHeight: 22 }}>•</Text>
                      <Text style={{ flex: 1, fontSize: type.body, color: t.inkSlate, lineHeight: 22 }}>
                        {g.elder()}
                      </Text>
                    </View>
                  ))}
                  <Text style={{ fontSize: type.body, color: t.inkSlate, lineHeight: 22, marginTop: spacing[3] }}>
                    Turn a friendship off any time. Your family loses all of this straight away.
                  </Text>
                  {connections.map((c) => (
                    <View key={c.id} style={{ marginTop: spacing[4] }}>
                      <Text style={{ fontSize: type.body, fontWeight: '600', color: t.ink }}>
                        {c.otherUserName}
                      </Text>
                      <FamilyShareToggle connectionId={c.id} shared={c.sharedWithFamily} />
                    </View>
                  ))}
                </View>
              )
            ) : null}

            {controlsTab === 'acting' ? (
              // Acting inherits watching: a family member can only act on a
              // friendship you let them watch. With nothing shared there is
              // nothing to act on, so the switches wait rather than promise
              // a power that would reach nothing. With the list unread we
              // cannot know what she shares, so we say that instead.
              friendshipsUnknown ? (
                <LoadError
                  what="your friendships"
                  onRetry={refetchConnections}
                  style={{ marginTop: spacing[4] }}
                />
              ) : !connections.some((c) => c.sharedWithFamily) ? (
                <View style={{ ...card, alignItems: 'center', marginTop: spacing[4] }}>
                  <Text style={{ fontSize: type.body, fontWeight: '600', color: t.ink }}>
                    Share a friendship first
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
                    Your family can only act on a friendship you share with them. Turn on at least
                    one friendship on the Sharing tab, then choose here what they may do for you.
                  </Text>
                </View>
              ) : (
                members.map((l) => (
                  <View key={l.id} style={{ ...card, marginTop: spacing[4] }}>
                    <Text style={{ fontSize: type.body, fontWeight: '600', color: t.ink }}>
                      {l.otherUserName}
                      <Text style={{ fontSize: type.meta, fontWeight: '400', color: t.inkSlate }}>
                        {`  ${l.relationship || 'Family member'}`}
                      </Text>
                    </Text>
                    <DelegatedPowerToggle
                      linkId={l.id}
                      familyName={l.otherUserName}
                      powers={l.delegatedPowers || []}
                      onSaved={(fresh) =>
                        // The response IS the fresh link — patch the cache
                        // immutably so no refetch (or flash) is needed.
                        queryClient.setQueryData(['family-links'], (data) =>
                          data
                            ? {
                                ...data,
                                activeLinks: (data.activeLinks || []).map((x) =>
                                  x.id === fresh?.id ? { ...x, ...fresh } : x
                                ),
                              }
                            : data
                        )
                      }
                    />
                  </View>
                ))
              )
            ) : null}
          </View>
        )
      ) : null}
    </Screen>
  );
}
