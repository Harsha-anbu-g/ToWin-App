// One parent, in full (FAM-506) — ported from web FamilyParent.jsx. The
// family home page got too crowded once a parent had help requests,
// friendships, trust ladders and guardian actions all stacked in a single
// card (web user call 2026-07-20), so the list stayed there and the depth
// moved here.
//
// That depth then became one long scroll of equally loud cards. It is three
// tabs now, one job each (web user call 2026-07-26): the friendships they
// share, how they are today, and what this family member is allowed to do.
// Friendships is the landing tab — the trust ladder is what family should
// see on arrival — and the check-in chip sits in the header so the "are they
// alright?" answer never hides behind a tab.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Check, Clock, MessageCircle, UserRound } from '../../../src/components/icons';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import api from '../../../src/api/client';
import FamilyHelperConnect from '../../../src/components/family/FamilyHelperConnect';
import { ParentStatusLine } from '../../../src/components/family/FamilyJourney';
import FamilyNeedsForParent from '../../../src/components/family/FamilyNeedsForParent';
import FamilyPowerAsks from '../../../src/components/family/FamilyPowerAsks';
import FamilyReviewForParent from '../../../src/components/family/FamilyReviewForParent';
import FamilyTrustAdvance from '../../../src/components/family/FamilyTrustAdvance';
import TrustLadder from '../../../src/components/trust/TrustLadder';
import Avatar from '../../../src/components/ui/Avatar';
import Button from '../../../src/components/ui/Button';
import LoadError from '../../../src/components/ui/LoadError';
import Screen from '../../../src/components/ui/Screen';
import SegmentedControl from '../../../src/components/ui/SegmentedControl';
import SwipeSegments from '../../../src/components/ui/SwipeSegments';
import SkeletonCard from '../../../src/components/ui/Skeleton';
import TrustBadge from '../../../src/components/ui/TrustBadge';
import { useToast } from '../../../src/context/ToastContext';
import { SHARING_GIVES } from '../../../src/lib/sharingGives';
import { SHORT_STAGES, TRUSTED_STAGE, stageIndexOf } from '../../../src/lib/trustStages';
import { useTheme } from '../../../src/theme/ThemeContext';

/** The "are they alright?" answer, in the header where it never hides behind a tab. */
function CheckInChip({ checkedIn }) {
  const { t, type, radius } = useTheme();
  const Icon = checkedIn ? Check : Clock;
  const color = checkedIn ? t.greenDeep : t.ink3;
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        borderWidth: 1,
        borderColor: checkedIn ? t.greenLine : t.border,
        backgroundColor: checkedIn ? 'transparent' : t.surfaceFill,
        borderRadius: radius.pill,
        paddingVertical: 4,
        paddingHorizontal: 12,
        alignSelf: 'flex-start',
      }}
    >
      <Icon size={13} color={color} strokeWidth={2.4} />
      <Text style={{ fontSize: type.meta, fontWeight: '600', color }}>
        {checkedIn ? 'Checked in today' : 'No check-in yet today'}
      </Text>
    </View>
  );
}

export default function FamilyParentScreen() {
  const { elderId } = useLocalSearchParams();
  const { t, spacing, radius, type, fontFamily } = useTheme();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const router = useRouter();
  const [tab, setTab] = useState('friendships');

  const { data: family, isLoading: linksLoading, isError: linksFailed, refetch: refetchLinks } = useQuery({
    queryKey: ['family-links'],
    queryFn: async () => (await api.get('/family/links')).data,
  });
  const { data: journeyData, isError: journeyFailed, refetch: refetchJourney } = useQuery({
    queryKey: ['family-journey'],
    queryFn: async () => (await api.get('/family/journey')).data,
  });
  // Standings kept separate: an outage here must not take down the page —
  // FamilyHelperConnect goes quiet instead of claiming a removal (HCI 9).
  const { data: standingsData, isSuccess: standingsLoaded } = useQuery({
    queryKey: ['family-standings'],
    queryFn: async () => (await api.get('/family/standings')).data,
  });

  // Returns the settle so pull-to-refresh (UX-704) can hold its spinner until
  // the reload lands; the mutations that call it fire-and-forget as before.
  const reload = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ['family-links'] }),
      queryClient.invalidateQueries({ queryKey: ['family-journey'] }),
      queryClient.invalidateQueries({ queryKey: ['family-standings'] }),
    ]);

  // Only the family side of the link — this page never renders my own elder seat.
  const link = (family?.activeLinks || []).find((l) => !l.iAmElder && l.elderId === elderId);
  const j = (journeyData?.elders || []).find((e) => e.elderId === elderId);
  const standings = standingsData?.standings || [];
  const powers = link?.delegatedPowers || [];
  const sharedHelpers = j?.sharedHelpers || [];
  const elderName = j?.elderName || link?.otherUserName || 'your parent';

  // Open (or reopen) the private chat with the parent. The link is the only
  // permission; the server checks it and hands back the conversation to open.
  const messageParent = useMutation({
    mutationFn: () => api.post(`/family/chat/${elderId}`),
    onSuccess: (r) => {
      queryClient.invalidateQueries({ queryKey: ['connections'] });
      router.push(`/chat/${r.data}`);
    },
    onError: (err) =>
      showToast(err?.response?.data?.message || 'Could not open the chat. Please try again.', 'error'),
  });

  const loaded = !linksLoading && family !== undefined;

  if (loaded && !link) {
    return (
      <Screen back>
        <View
          style={{
            backgroundColor: t.canvas,
            borderWidth: 1,
            borderColor: t.border,
            borderRadius: radius.card,
            padding: spacing[6],
            alignItems: 'center',
            marginTop: spacing[4],
          }}
        >
          <Text style={{ fontSize: type.body, fontWeight: '600', color: t.ink }}>
            This parent is no longer linked to you
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
            This link may have been removed.
          </Text>
          {/* The empty state carries its own action (rulebook). */}
          <Button
            title="Back to My Parents"
            variant="secondary"
            onPress={() => router.replace('/(tabs)/home')}
            style={{ marginTop: spacing[4], alignSelf: 'stretch' }}
          />
        </View>
      </Screen>
    );
  }

  return (
    // keyboard: the needs form and the review form live down this page, and
    // the keyboard must never cover the field being typed into (UX-702).
    <Screen back keyboard onRefresh={reload}>
      {linksFailed && !family ? (
        // A dropped links fetch used to hold the skeleton forever (UX-706).
        // It must also never wear "this parent is no longer linked to you".
        <LoadError
          what="your parent's page"
          onRetry={refetchLinks}
          style={{ marginTop: spacing[4] }}
        />
      ) : !loaded ? (
        <View style={{ marginTop: spacing[4] }}>
          <SkeletonCard lines={4} />
        </View>
      ) : (
        <>
          {/* Header — who this parent is, how they are right now, and the
              one blue action. */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[3] }}>
            <Avatar name={elderName} size={52} />
            <View style={{ flex: 1 }}>
              <Text
                accessibilityRole="header"
                style={{ fontFamily: fontFamily.display, fontSize: 26, color: t.ink, letterSpacing: -0.5 }}
              >
                {elderName}
              </Text>
              <Text style={{ fontSize: type.meta, color: t.inkSlate, marginTop: 2 }}>
                {link?.relationship
                  ? `You're ${elderName}'s ${link.relationship.toLowerCase()}`
                  : 'Your family member'}
              </Text>
            </View>
          </View>
          {j ? (
            <View style={{ marginTop: spacing[3] }}>
              <CheckInChip checkedIn={j.checkedInToday} />
            </View>
          ) : null}
          <Button
            title={messageParent.isPending ? 'Opening…' : `Message ${elderName}`}
            onPress={() => messageParent.mutate()}
            disabled={messageParent.isPending}
            style={{ marginTop: spacing[4] }}
          />

          {/* Three jobs, three tabs. Only the "today" tab carries a count —
              an open help request is the one thing that may want acting on. */}
          <SegmentedControl
            segments={[
              { key: 'friendships', label: 'Friendships' },
              {
                key: 'today',
                label: 'Today',
                count: (j?.openNeedsCount ?? j?.openNeeds?.length) || undefined,
              },
              { key: 'powers', label: 'What I can do' },
            ]}
            value={tab}
            onChange={setTab}
            style={{ marginTop: spacing[4] }}
          />

          {/* Swiping the content left/right steps the segments, iOS-style. */}
          <SwipeSegments keys={['friendships', 'today', 'powers']} value={tab} onChange={setTab}>
          {tab === 'friendships' ? (
            <>
              <Text
                accessibilityRole="header"
                style={{ fontFamily: fontFamily.display, fontSize: 20, color: t.ink, marginTop: spacing[5] }}
              >
                Friendships shared with you
              </Text>
              <Text style={{ fontSize: type.body, color: t.inkSlate, lineHeight: 22, marginTop: spacing[2] }}>
                {elderName} chooses which friendships you see here.
              </Text>

              {/* What sharing gives you is explained once — in the empty
                  state, and on the What I can do tab — never as a standing
                  preamble above the cards (web parity). */}
              {sharedHelpers.length === 0 ? (
                <>
                  <Text
                    style={{ fontSize: type.body, color: t.inkSlate, lineHeight: 22, marginTop: spacing[3] }}
                  >
                    No friendships shared with you yet. When {elderName} shares one, you can:
                  </Text>
                  <View style={{ marginTop: spacing[2] }}>
                    {SHARING_GIVES.map((g) => (
                      <View
                        key={g.key}
                        style={{ flexDirection: 'row', gap: spacing[2], marginTop: spacing[1] }}
                      >
                        <Text style={{ fontSize: type.body, color: t.inkSlate, lineHeight: 22 }}>•</Text>
                        <Text style={{ flex: 1, fontSize: type.body, color: t.inkSlate, lineHeight: 22 }}>
                          {g.family(elderName)}
                        </Text>
                      </View>
                    ))}
                  </View>
                </>
              ) : null}

              {sharedHelpers.map((h) => {
            const stage = stageIndexOf(h);
            // The doing is folded in beside the seeing. Each control only
            // shows when the parent granted that power AND the ladder is at
            // the point it applies — the same gate each component holds on
            // its own, so the "in their name" note never sits above an empty
            // space.
            const canAdvance = powers.includes('ADVANCE_TRUST') && stage < TRUSTED_STAGE;
            const canReview =
              powers.includes('LEAVE_REVIEWS') && stage >= TRUSTED_STAGE && !!h.helperUserId;
            const canAct = canAdvance || canReview;
            const standing = standings.find((s) => s.standingConnectionId === h.connectionId);
            return (
              <View
                key={h.connectionId}
                style={{
                  backgroundColor: t.canvas,
                  borderWidth: 1,
                  borderColor: h.readyToMeet ? t.blueSoft : t.border,
                  borderRadius: radius.card,
                  padding: spacing[5],
                  marginTop: spacing[4],
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[3] }}>
                  <Avatar name={h.helperName} uri={h.helperPhotoUrl} size={44} />
                  <View style={{ flex: 1 }}>
                    <View
                      style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: spacing[2] }}
                    >
                      <Text style={{ fontSize: type.body, fontWeight: '600', color: t.ink }}>
                        {h.helperName}
                      </Text>
                      {h.trustScore != null ? <TrustBadge score={h.trustScore} /> : null}
                    </View>
                    <Text style={{ fontSize: type.meta, color: t.inkSlate, marginTop: 2 }}>
                      Stage {Math.min(stage + 1, 7)} of 7 · {h.stageLabel || SHORT_STAGES[stage]}
                    </Text>
                  </View>
                </View>

                <TrustLadder stageIndex={stage} style={{ marginTop: spacing[4] }} />

                {h.readyToMeet ? (
                  <View
                    style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2], marginTop: spacing[3] }}
                  >
                    <UserRound size={15} color={t.blueDeep} strokeWidth={2} />
                    <Text style={{ fontSize: type.meta, fontWeight: '600', color: t.blueDeep, flex: 1 }}>
                      {h.helperName} is getting ready to meet in person
                    </Text>
                  </View>
                ) : null}

                {/* The one profile link on the card. Blue = you can act here. */}
                <Pressable
                  onPress={() => router.push(`/user/${h.helperUserId}`)}
                  accessibilityRole="button"
                  accessibilityLabel={`See ${h.helperName}'s full profile`}
                  style={({ pressed }) => ({
                    minHeight: 44,
                    justifyContent: 'center',
                    marginTop: spacing[3],
                    opacity: pressed ? 0.6 : 1,
                  })}
                >
                  <Text style={{ fontSize: type.meta, fontWeight: '600', color: t.blueDeep }}>
                    See their full profile →
                  </Text>
                </Pressable>

                <FamilyHelperConnect
                  helper={h}
                  standing={standing}
                  standingsLoaded={standingsLoaded}
                  elderName={elderName}
                  onChanged={reload}
                />

                {/* The shared updates thread on this friendship (FAM-511). */}
                <Pressable
                  onPress={() => router.push(`/chat/${h.connectionId}?channel=family`)}
                  accessibilityRole="button"
                  accessibilityLabel={`Open the updates thread with ${elderName} and ${h.helperName}`}
                  style={({ pressed }) => ({
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: spacing[2],
                    minHeight: 44,
                    marginTop: spacing[3],
                    opacity: pressed ? 0.6 : 1,
                  })}
                >
                  <MessageCircle size={15} color={t.blueDeep} strokeWidth={2} />
                  <Text style={{ fontSize: type.meta, fontWeight: '600', color: t.blueDeep }}>
                    Open the small updates thread
                  </Text>
                </Pressable>

                {/* Act for me — only what the parent has actually trusted you
                    with, in their name, right beside the friendship it acts on. */}
                {canAct ? (
                  <View
                    style={{
                      marginTop: spacing[4],
                      borderTopWidth: 1,
                      borderTopColor: t.border,
                      paddingTop: spacing[3],
                    }}
                  >
                    <Text
                      style={{ fontSize: type.meta, fontWeight: '600', color: t.trustGold, lineHeight: 20 }}
                    >
                      Anything you do here is in {elderName}&apos;s name
                    </Text>
                    {canAdvance ? (
                      <FamilyTrustAdvance helper={h} elderName={elderName} onChanged={reload} />
                    ) : null}
                    {canReview ? (
                      <FamilyReviewForParent helper={h} elderId={j.elderId} elderName={elderName} />
                    ) : null}
                  </View>
                ) : null}
              </View>
            );
          })}
            </>
          ) : null}

          {tab === 'today' ? (
            <>
              {/* A journey failure must not silently erase this tab
                  (rulebook: no silent partial failure). */}
              {journeyFailed ? (
                <LoadError
                  what={`how ${elderName} is doing`}
                  onRetry={refetchJourney}
                  style={{ marginTop: spacing[4] }}
                />
              ) : null}

              {j ? (
                <View style={{ marginTop: spacing[5] }}>
                  <Text
                    accessibilityRole="header"
                    style={{ fontFamily: fontFamily.display, fontSize: 20, color: t.ink }}
                  >
                    How {elderName} is today
                  </Text>
                  <ParentStatusLine journey={j} />

                  {/* Seeing their open requests was never a power; acting on
                      them is. The list reads only unless the parent granted
                      MANAGE_HELP_REQUESTS, and the server re-checks that
                      grant before any change goes through. */}
                  <FamilyNeedsForParent
                    elderId={j.elderId}
                    elderName={elderName}
                    openNeeds={j.openNeeds}
                    canManage={powers.includes('MANAGE_HELP_REQUESTS')}
                    onChanged={reload}
                  />
                </View>
              ) : null}
            </>
          ) : null}

          {tab === 'powers' ? (
            <>
              {/* Same words the parent reads beside the switch (sharingGives),
                  so what was promised there is what appears here. */}
              <Text
                style={{ fontSize: type.body, color: t.inkSlate, lineHeight: 22, marginTop: spacing[5] }}
              >
                On a friendship {elderName} shares, you can:
              </Text>
              <View style={{ marginTop: spacing[2] }}>
                {SHARING_GIVES.map((g) => (
                  <View
                    key={g.key}
                    style={{ flexDirection: 'row', gap: spacing[2], marginTop: spacing[1] }}
                  >
                    <Text style={{ fontSize: type.body, color: t.inkSlate, lineHeight: 22 }}>•</Text>
                    <Text style={{ flex: 1, fontSize: type.body, color: t.inkSlate, lineHeight: 22 }}>
                      {g.family(elderName)}
                    </Text>
                  </View>
                ))}
              </View>

              {/* What I can do — consent flow. Asking never grants anything. */}
              <FamilyPowerAsks link={link} elderName={elderName} onChanged={reload} />
            </>
          ) : null}
          </SwipeSegments>
        </>
      )}
    </Screen>
  );
}
