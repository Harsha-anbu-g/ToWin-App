// One helper, on their own page (elder's seat). This is what used to unfold
// under the name on My Helpers; owner call 2026-09-25: a name opens a page,
// like WhatsApp, not a dropdown. The stage rides the top, then the 7-node
// ladder, the mutual-consent "Start the next step", the family section and the
// quiet "Take a break". Everything reads from the caches Home already filled.
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Pressable, Text, View } from 'react-native';
import { listMyConnections } from '../../api/connections';
import { getFamilyTransparency } from '../../api/family';
import { listMyHelpRequests } from '../../api/needs';
import { getMyTrustScore } from '../../api/trust';
import { useAuth } from '../../context/AuthContext';
import { markSeen, useUnseenTokens } from '../../lib/seenIds';
import { seenKey } from '../../lib/storageKeys';
import { trustOriginLine } from '../../lib/trustOrigin';
import { TRUST_STEPS_CATEGORY, isStepNewsPending, stepNewsToken, stepNewsTokens } from '../../lib/trustStepBadges';
import { SHORT_STAGES } from '../../lib/trustStages';
import useHelperSeatActions from '../../lib/useHelperSeatActions';
import { useTheme } from '../../theme/ThemeContext';
import FamilyShareToggle from '../family/FamilyShareToggle';
import ActionChip from '../ui/ActionChip';
import Avatar from '../ui/Avatar';
import Button from '../ui/Button';
import LoadError from '../ui/LoadError';
import Screen from '../ui/Screen';
import SkeletonCard from '../ui/Skeleton';
import TrustLadder from './TrustLadder';

const sameId = (a, b) => String(a) === String(b);

export default function HelperSeatDetail({ connectionId }) {
  const { t, type, fontFamily } = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const { startStep, takeBreak } = useHelperSeatActions();

  const {
    data: breakdown,
    isLoading: scoreLoading,
    isError: scoreFailed,
    refetch: refetchScore,
  } = useQuery({ queryKey: ['trust-my-score'], queryFn: getMyTrustScore });
  const { data: connections, refetch: refetchConnections } = useQuery({
    queryKey: ['connections'],
    queryFn: listMyConnections,
  });
  const { data: needsMine } = useQuery({ queryKey: ['needs-mine'], queryFn: listMyHelpRequests });
  // Optional context: allowed to error, read below folds missing data to empty.
  const { data: familyTransparency } = useQuery({
    queryKey: ['family-transparency'],
    queryFn: getFamilyTransparency,
  });

  const card = (breakdown?.customers ?? []).find((c) => sameId(c.connectionId, connectionId));
  const conn = (connections ?? []).find((c) => sameId(c.id, connectionId));
  const transparency = conn
    ? (familyTransparency ?? []).filter((f) => f.helperUserId === conn.otherUserId)
    : [];

  const stepNews = useUnseenTokens(user?.userId, TRUST_STEPS_CATEGORY, stepNewsTokens(connections), { seed: true });
  const news = isStepNewsPending(conn, stepNews);
  const atTop = (card?.stageIndex ?? 0) >= 6;

  // The badge stays until the elder starts the next step (owner call
  // 2026-08-28); only at the top of the ladder, where nothing is left to
  // start, does opening the page read the news.
  useEffect(() => {
    if (conn && news && atTop) {
      markSeen(seenKey(user?.userId, TRUST_STEPS_CATEGORY), [stepNewsToken(conn)]);
    }
  }, [conn, news, atTop, user?.userId]);

  const refresh = () => Promise.all([refetchScore(), refetchConnections()]);

  if (!card) {
    return (
      <Screen back title="Helper" onRefresh={refresh}>
        {scoreLoading ? (
          <SkeletonCard lines={4} />
        ) : scoreFailed ? (
          <LoadError what="this helper" onRetry={refetchScore} />
        ) : (
          <Text style={{ fontSize: type.body, color: t.inkSlate, lineHeight: 22 }}>
            This friendship is not here any more.
          </Text>
        )}
      </Screen>
    );
  }

  const stageNo = Math.min(card.stageIndex + 1, 7);
  const stageName = SHORT_STAGES[Math.min(card.stageIndex, 6)];
  const next = SHORT_STAGES[Math.min(card.stageIndex + 1, 6)];
  const originLine = conn ? trustOriginLine(conn, needsMine?.content) : null;
  const confirmedByMe = !!conn?.confirmedByMe;
  const confirmedByOther = !!conn?.confirmedByOther;

  return (
    <Screen back title={card.customerName} onRefresh={refresh}>
      {conn ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`View ${card.customerName}'s profile`}
          onPress={() => router.push(`/user/${conn.otherUserId}`)}
          hitSlop={6}
          style={({ pressed }) => ({ alignSelf: 'center', marginBottom: 16, opacity: pressed ? 0.6 : 1 })}
        >
          <Avatar name={card.customerName} uri={card.customerPhotoUrl} size={72} />
        </Pressable>
      ) : null}

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: type.caption, color: t.inkSlate }}>
            Stage {stageNo} of 7 · {stageName}
          </Text>
          {/* Why this ladder exists and when it started (owner call
              2026-08-26): a friendship, or one of my posted requests by name. */}
          {originLine ? (
            <Text style={{ fontSize: type.caption, color: t.inkSlate, marginTop: 2 }}>{originLine}</Text>
          ) : null}
        </View>
        {conn ? <ActionChip label="Message" tonal onPress={() => router.push(`/chat/${card.connectionId}`)} /> : null}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Trust score ${card.total} of ${card.totalMax}. Open your Trust Score page`}
          onPress={() => router.push('/trust')}
          hitSlop={10}
          style={({ pressed }) => ({
            minWidth: 40,
            minHeight: 40,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: pressed ? 0.7 : 1,
          })}
        >
          <Text style={{ fontSize: type.body, fontWeight: '600', color: t.trustGold, fontVariant: ['tabular-nums'] }}>
            {card.total}
            <Text style={{ fontWeight: '400', fontSize: type.caption, fontVariant: ['tabular-nums'] }}>/{card.totalMax}</Text>
          </Text>
        </Pressable>
      </View>

      <TrustLadder stageIndex={card.stageIndex} style={{ marginTop: 12 }} />

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
        <Text style={{ fontSize: type.meta, color: t.inkSlate }}>Connected</Text>
        {!atTop ? (
          <Text style={{ fontSize: type.meta, fontWeight: '600', color: t.blueDeep }}>Next: {next}</Text>
        ) : null}
        <Text style={{ fontSize: type.meta, color: t.trustGold }}>Trusted</Text>
      </View>

      {atTop ? (
        // The product's headline achievement gets a moment, not one meta line
        // (rulebook: peak-end — engineer the peak).
        <View
          style={{
            backgroundColor: t.greenTint,
            borderWidth: 1,
            borderColor: t.greenLine,
            borderRadius: 12,
            padding: 12,
            marginTop: 12,
          }}
        >
          <Text style={{ fontFamily: fontFamily.display, fontSize: type.cardTitle, color: t.greenDeep }}>
            Fully trusted
          </Text>
          <Text style={{ fontSize: type.meta, color: t.greenDeep, lineHeight: 18, marginTop: 2 }}>
            Seven steps, climbed together. The whole ladder is complete.
          </Text>
        </View>
      ) : confirmedByMe && !confirmedByOther ? (
        <Text style={{ fontSize: type.meta, color: t.inkSlate, lineHeight: 18, marginTop: 12 }}>
          You've started the next step. Waiting for {card.customerName} to accept.
        </Text>
      ) : !connections ? (
        // Confirmed flags are unknown until ['connections'] resolves — a
        // premature "Start the next step" would 400 as already-confirmed.
        null
      ) : (
        // Backend rule (TrustService): the elder STARTS every step and the
        // helper only accepts afterwards. Filled blue: the page's one action.
        <Button
          title="Start the next step"
          variant="primary"
          size="small"
          onPress={() => startStep(card)}
          style={{ marginTop: 12 }}
        />
      )}

      {/* Family visibility (FAM-404) + the shared updates thread (FAM-511).
          sharedWithFamily lives on the connection object, so the section
          waits for ['connections']. */}
      {conn ? (
        <>
          <FamilyShareToggle connectionId={conn.id} shared={conn.sharedWithFamily} />
          {/* Step 4 transparency: nothing about you happens out of your sight,
              you always see which of your family connected with this helper.
              Wording is the web ElderDashboard's, verbatim. */}
          {transparency.map((f) => (
            <Text
              key={`${f.helperUserId}:${f.familyMemberName}`}
              style={{ fontSize: type.meta, color: t.inkSlate, lineHeight: 20, marginTop: 10 }}
            >
              {f.inherited
                ? `Your ${(f.relationship || 'family member').toLowerCase()} ${f.familyMemberName} can message ${f.helperName} through your shared trust.`
                : `Your ${(f.relationship || 'family member').toLowerCase()} ${f.familyMemberName} and ${f.helperName} are talking.`}
            </Text>
          ))}
          {conn.sharedWithFamily ? (
            <ActionChip
              label="Open the family group"
              onPress={() => router.push(`/chat/${conn.id}?channel=family`)}
              style={{ marginTop: 8, alignSelf: 'flex-start' }}
            />
          ) : null}
        </>
      ) : null}

      {/* Trust steps can be paused/resumed (HCI rule 3) — quiet, in the right
          corner, never crowding the CTA. Once paused, the person lands back on
          Home where the paused card carries Resume. */}
      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 4 }}>
        <Button
          title="Take a break"
          variant="text"
          onPress={() => takeBreak(card, () => router.back())}
          accessibilityHint="Pauses trust steps and messages with this person until either of you resumes"
          style={{ paddingHorizontal: 0 }}
        />
      </View>
    </Screen>
  );
}
