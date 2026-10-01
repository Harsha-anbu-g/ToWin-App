// One elder, on their own page (helper's seat). This is what used to unfold
// under the name on My Elders; owner call 2026-09-25: a name opens a page,
// like WhatsApp, not a dropdown. Stage and why the ladder exists, the 7-node
// ladder, the mutual-consent step, the family behind it, and the quiet
// "Take a break" / "End". Everything reads from the caches Home already filled.
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { listMyConnections } from '../../api/connections';
import { getFamilyBehindMe } from '../../api/family';
import { listMyApplications } from '../../api/needs';
import { getMyTrustScore } from '../../api/trust';
import { trustOriginLine } from '../../lib/trustOrigin';
import { isStepAwaitingMe } from '../../lib/trustStepBadges';
import { LEVEL_INDEX, SHORT_STAGES } from '../../lib/trustStages';
import useElderSeatActions from '../../lib/useElderSeatActions';
import { useTheme } from '../../theme/ThemeContext';
import ActionChip from '../ui/ActionChip';
import Avatar from '../ui/Avatar';
import Button from '../ui/Button';
import LoadError from '../ui/LoadError';
import Screen from '../ui/Screen';
import SkeletonCard from '../ui/Skeleton';
import { Phone } from '../icons';
import TrustLadder from './TrustLadder';

const sameId = (a, b) => String(a) === String(b);

export default function ElderSeatDetail({ connectionId }) {
  const { t, type, fontFamily } = useTheme();
  const router = useRouter();
  const { acceptStep, takeBreak, endConnection } = useElderSeatActions();

  const {
    data: connections,
    isLoading,
    isError,
    refetch: refetchConnections,
  } = useQuery({ queryKey: ['connections'], queryFn: listMyConnections });
  const { data: breakdown, refetch: refetchScore } = useQuery({
    queryKey: ['trust-my-score'],
    queryFn: getMyTrustScore,
  });
  const { data: applicationsData } = useQuery({
    queryKey: ['needs-applications'],
    queryFn: listMyApplications,
  });
  const myOffers = Array.isArray(applicationsData) ? applicationsData : applicationsData?.content ?? [];
  // Errors fold to empty: a helper with no family-backed friendships must never
  // see this fail loudly (FAM-512).
  const { data: behindData } = useQuery({
    queryKey: ['family-behind'],
    queryFn: async () => {
      try {
        return await getFamilyBehindMe();
      } catch {
        return { entries: [] };
      }
    },
  });

  const conn = (connections ?? []).find((c) => sameId(c.id, connectionId) && c.status === 'ACTIVE');
  const refresh = () => Promise.all([refetchConnections(), refetchScore()]);

  if (!conn) {
    return (
      <Screen back title="Elder" onRefresh={refresh}>
        {isLoading ? (
          <SkeletonCard lines={4} />
        ) : isError ? (
          <LoadError what="this elder" onRetry={refetchConnections} />
        ) : (
          <Text style={{ fontSize: type.body, color: t.inkSlate, lineHeight: 22 }}>
            This connection is not here any more.
          </Text>
        )}
      </Screen>
    );
  }

  const scoreCard = (breakdown?.customers ?? []).find((c) => sameId(c.connectionId, conn.id));
  const familyBehind = (behindData?.entries ?? []).filter((f) => sameId(f.connectionId, conn.id));
  const famConnFor = (familyUserId) =>
    (connections ?? []).find((c) => c.type === 'FAMILY' && c.status === 'ACTIVE' && c.otherUserId === familyUserId);
  const originLine = trustOriginLine(conn, myOffers, { seat: 'helper' });

  const stageIndex = scoreCard?.stageIndex ?? LEVEL_INDEX[conn.currentTrustLevel] ?? 0;
  const atTop = stageIndex >= 6;
  const stageNo = Math.min(stageIndex + 1, 7);
  const stageName = SHORT_STAGES[Math.min(stageIndex, 6)];
  const next = SHORT_STAGES[Math.min(stageIndex + 1, 6)];
  const waiting = conn.confirmedByMe && !conn.confirmedByOther;
  // The elder started the next step and it is waiting on me (owner call
  // 2026-08-28): counted on the My Elders tab until I accept.
  const waitingOnMe = isStepAwaitingMe(conn);
  const hasFamily = familyBehind.length > 0 || conn.sharedWithFamily;
  const goBack = () => router.back();

  return (
    <Screen back title={conn.otherUserName} onRefresh={refresh}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`View ${conn.otherUserName}'s profile`}
        onPress={() => router.push(`/user/${conn.otherUserId}`)}
        hitSlop={6}
        style={({ pressed }) => ({ alignSelf: 'center', marginBottom: 16, opacity: pressed ? 0.6 : 1 })}
      >
        <Avatar name={conn.otherUserName} uri={conn.otherUserPhotoUrl} size={72} />
      </Pressable>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: type.caption, color: t.inkSlate }}>
            Stage {stageNo} of 7 · {stageName}
          </Text>
          {/* Why this ladder exists and when it started (owner call
              2026-08-26): a friendship, or one of their requests I was
              accepted on, by name. */}
          {originLine ? (
            <Text style={{ fontSize: type.caption, color: t.inkSlate, marginTop: 2 }}>{originLine}</Text>
          ) : null}
          {conn.otherUserAge ? (
            <Text style={{ fontSize: type.caption, color: t.inkSlate, marginTop: 2 }}>
              Age {conn.otherUserAge}
            </Text>
          ) : null}
        </View>
        <ActionChip label="Message" tonal onPress={() => router.push(`/chat/${conn.id}`)} />
        {scoreCard ? (
          <Text style={{ fontSize: type.body, fontWeight: '600', color: t.trustGold, fontVariant: ['tabular-nums'] }}>
            {scoreCard.total}
            <Text style={{ fontWeight: '400', fontSize: type.caption, fontVariant: ['tabular-nums'] }}>/{scoreCard.totalMax}</Text>
          </Text>
        ) : null}
      </View>

      {conn.otherUserPhone ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 }}>
          <Phone size={14} color={t.blueDeep} strokeWidth={1.8} />
          <Text style={{ fontSize: type.meta, color: t.blueDeep, fontVariant: ['tabular-nums'] }}>
            {conn.otherUserPhone}
          </Text>
        </View>
      ) : null}

      <TrustLadder stageIndex={stageIndex} style={{ marginTop: 12 }} />
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
        <Text style={{ fontSize: type.meta, color: t.inkSlate }}>Connected</Text>
        {!atTop ? (
          <Text style={{ fontSize: type.meta, fontWeight: '600', color: t.blueDeep }}>Next: {next}</Text>
        ) : null}
        <Text style={{ fontSize: type.meta, color: t.trustGold }}>Trusted</Text>
      </View>

      {/* Backend rule (website ea03935): the elder starts each step — the
          helper only ever ACCEPTS, and never sees a dead start button. */}
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
      ) : waitingOnMe ? (
        <Button
          title="Accept the next step"
          variant="primary"
          size="small"
          onPress={() => acceptStep(conn)}
          style={{ marginTop: 12 }}
        />
      ) : waiting ? (
        <Text style={{ fontSize: type.meta, color: t.inkSlate, lineHeight: 18, marginTop: 12 }}>
          Waiting for {conn.otherUserName} to accept the next step. They'll get a tap on their side.
        </Text>
      ) : (
        <Text style={{ fontSize: type.meta, color: t.inkSlate, lineHeight: 18, marginTop: 12 }}>
          {conn.otherUserName} starts each trust step. You'll get a tap here to accept.
        </Text>
      )}

      {/* The family standing behind this friendship (FAM-512) — same
          server-side derivation as their side, so this names exactly the
          people who can already see it and message this helper. */}
      {familyBehind.length > 0 ? (
        <View style={{ borderTopWidth: 1, borderTopColor: t.hairline, marginTop: 12, paddingTop: 10 }}>
          <Text style={{ fontSize: type.meta, fontWeight: '600', color: t.ink, marginBottom: 8 }}>
            {conn.otherUserName ? `${conn.otherUserName}'s family` : 'Their family'}
          </Text>
          {familyBehind.map((f) => {
            // The family coordination connection (auto-materialized while the
            // elder shares this friendship) carries the chat.
            const famConn = famConnFor(f.familyUserId);
            return (
              <View
                key={f.familyUserId}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 }}
              >
                <Avatar name={f.familyName} uri={f.familyPhotoUrl} size={36} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: type.meta, fontWeight: '600', color: t.ink }}>
                    {f.familyName}
                    {f.relationship ? (
                      <Text style={{ fontWeight: '400', color: t.inkSlate }}>
                        {`, ${conn.otherUserName ? `${conn.otherUserName}'s` : 'their'} ${f.relationship.toLowerCase()}`}
                      </Text>
                    ) : null}
                  </Text>
                  <Text style={{ fontSize: type.meta, color: t.inkSlate, lineHeight: 18, marginTop: 2 }}>
                    {famConn
                      ? 'You can message each other while this friendship stays shared.'
                      : 'Can see how this friendship is going and may message you.'}
                  </Text>
                </View>
                {famConn ? (
                  <ActionChip label="Message" tonal onPress={() => router.push(`/chat/${famConn.id}`)} />
                ) : null}
              </View>
            );
          })}
        </View>
      ) : null}

      {/* Updates for the family — only while the elder shares this friendship
          (FAM-511 entry point, helper side). */}
      {conn.sharedWithFamily ? (
        <ActionChip
          label="Open the family group"
          onPress={() => router.push(`/chat/${conn.id}?channel=family`)}
          style={{ marginTop: hasFamily ? 8 : 12, alignSelf: 'flex-start' }}
        />
      ) : null}

      {/* Pause and End share the right corner (HCI rule 3) — quiet, never
          crowding the CTA. Once either is done the person lands back on Home. */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
        <Button
          title="Take a break"
          variant="text"
          onPress={() => takeBreak(conn, goBack)}
          accessibilityHint="Pauses trust steps and messages with this person until either of you resumes"
          style={{ paddingHorizontal: 0 }}
        />
        <ActionChip
          label="End"
          destructive
          onPress={() => {
            endConnection(conn, goBack);
          }}
        />
      </View>
    </Screen>
  );
}
