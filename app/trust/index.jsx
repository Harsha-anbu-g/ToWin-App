// Trust Score (3k) — informational breakdown: summary card (serif 42 score,
// tier chip, next-tier line, avatar stack) and per-helper point cards with a
// two-tone bar + three meters (stages /7 dots, review /5 stars, profile /3).
// Elders trade the third profile point for the flat family point (7+5+2+1,
// FAM-405) — FamilyCard + a per-customer Family row render from the data.
// Climbing the ladder lives on the Dashboard (3d); this screen explains.
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Star } from 'lucide-react-native';
import { Text, View } from 'react-native';
import api from '../../src/api/client';
import Avatar from '../../src/components/ui/Avatar';
import Button from '../../src/components/ui/Button';
import Card from '../../src/components/ui/Card';
import LoadError from '../../src/components/ui/LoadError';
import Screen from '../../src/components/ui/Screen';
import SkeletonCard from '../../src/components/ui/Skeleton';
import { useAuth } from '../../src/context/AuthContext';
import { useTheme } from '../../src/theme/ThemeContext';

// Redesign stage vocabulary (mirrors the trust ladder / SHORT_STAGES) — the
// backend's pre-redesign labels ("Verified") must not leak into the UI.
const STAGE_LABELS = ['Connected', 'Messaging', 'Phone', 'Video', 'Socials', 'Met in person', 'Trusted'];

// Tier ladder (web parity): name + points needed to enter it.
const TIERS = [
  ['New Member', 0],
  ['Getting Started', 1],
  ['Reliable', 15],
  ['Highly Trusted', 45],
  ['Community Champion', 90],
];

function nextTier(score) {
  for (const [name, min] of TIERS) {
    if (score < min) return { name, missing: min - score };
  }
  return null; // already at the top
}

function Dots({ earned, max, size = 9, color }) {
  const { t } = useTheme();
  // Default stays action-family blue (the meter rows); the FamilyCard passes
  // the trust token — trust semantics never wear action colors (FAM-405).
  const fill = color ?? t.blueDeep;
  return (
    <View style={{ flexDirection: 'row', gap: 4 }}>
      {Array.from({ length: max }).map((_, i) => (
        <View
          key={i}
          style={{
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: i < earned ? fill : t.dotIdle,
          }}
        />
      ))}
    </View>
  );
}

function Meter({ label, right, children }) {
  const { t, type } = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 10,
      }}
    >
      <Text style={{ fontSize: type.meta, color: t.inkSlate }}>{label}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        {children}
        <Text
          style={{
            fontSize: type.caption,
            color: t.inkSlate,
            fontVariant: ['tabular-nums'],
            width: 34,
            textAlign: 'right',
          }}
        >
          {right}
        </Text>
      </View>
    </View>
  );
}

// Family connected (FAM-405, 2026-07-19): one flat point once any family
// member is linked. Elders only — the backend sends `family` for role ELDER
// alone, so the data's presence is the render condition (no role check).
// Dots are data-driven (earned of max, really 0|1 of 1) — the web tests'
// {2, 5} mock is stale; never hardcode five dots.
function FamilyCard({ family }) {
  const { t, spacing, type } = useTheme();
  if (!family) return null;
  const { earned, max } = family;
  return (
    <Card style={{ marginTop: spacing[3] }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: type.body, fontWeight: '600', color: t.trustGold }}>
            Family connected
          </Text>
          <Text style={{ fontSize: type.meta, color: t.inkSlate, lineHeight: 19, marginTop: 3 }}>
            One point for having your family connected, however many family members you add.
          </Text>
        </View>
        <Dots earned={earned} max={max} color={t.trustGold} />
        <Text
          accessibilityLabel={`+${earned} of ${max}`}
          style={{
            fontSize: type.meta,
            fontWeight: '600',
            color: earned > 0 ? t.trustGold : t.inkFaint2,
            fontVariant: ['tabular-nums'],
          }}
        >
          +{earned}
          <Text style={{ fontWeight: '400', color: t.inkFaint2 }}> of {max}</Text>
        </Text>
      </View>
    </Card>
  );
}

function HelperPointsCard({ card }) {
  const { t, radius, type } = useTheme();
  const pct = card.totalMax > 0 ? card.total / card.totalMax : 0;
  return (
    <Card style={{ marginTop: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 11 }}>
        <Avatar name={card.customerName} uri={card.customerPhotoUrl} size={40} />
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: type.body, fontWeight: '600', color: t.ink }}>{card.customerName}</Text>
          <Text style={{ fontSize: type.caption, color: t.inkSlate, marginTop: 1 }}>{STAGE_LABELS[Math.min(card.stageIndex, 6)]}</Text>
        </View>
        <Text style={{ fontSize: type.body, fontWeight: '600', color: t.trustGold, fontVariant: ['tabular-nums'] }}>
          {card.total} <Text style={{ fontWeight: '400', fontSize: type.caption }}>/ {card.totalMax} points</Text>
        </Text>
      </View>

      {/* Two-tone bar: earned deep blue over the light sky track */}
      <View style={{ height: 8, backgroundColor: t.blueSoft, borderRadius: radius.pill, overflow: 'hidden', marginTop: 12 }}>
        <View style={{ width: `${pct * 100}%`, height: '100%', backgroundColor: t.blueDeep, borderRadius: radius.pill }} />
      </View>

      <Meter label="Trust stages" right={`${card.rooting}/${card.rootingMax}`}>
        <Dots earned={card.rooting} max={card.rootingMax} />
      </Meter>
      <Meter label="Their review" right={`${card.review}/${card.reviewMax}`}>
        <View style={{ flexDirection: 'row', gap: 3 }}>
          {Array.from({ length: card.reviewMax }).map((_, i) => (
            <Star
              key={i}
              size={11}
              color={i < card.review ? t.blueDeep : t.dotIdle}
              fill={i < card.review ? t.blueDeep : t.dotIdle}
            />
          ))}
        </View>
      </Meter>
      <Meter label="Your profile" right={`${card.profile}/${card.profileMax}`}>
        <Dots earned={card.profile} max={card.profileMax} />
      </Meter>
      {/* Elders' per-customer 15 is 7+5+2+1 — familyMax is 0 for everyone
          else, so the row hides itself (web parity: sky dots like the rest). */}
      {card.familyMax > 0 ? (
        <Meter label="Family" right={`${card.family}/${card.familyMax}`}>
          <Dots earned={card.family} max={card.familyMax} />
        </Meter>
      ) : null}
    </Card>
  );
}

export default function TrustScreen() {
  const { t, spacing, radius, type, fontFamily } = useTheme();
  const { user } = useAuth();
  const router = useRouter();
  // One screen, two perspectives: the score cards are simply the other party
  // of each connection, so every line of copy must match who is looking.
  const helping = user?.role === 'HELPER' || user?.role === 'BOTH';
  // FAMILY (FAM-407 2026-07-19): their points come from their profile ONLY —
  // no helpers, no reviews, and no add-friends surface anywhere in their app,
  // so the elder copy and its "add someone" call would be a dead end (HCI 2/7).
  const isFamily = user?.role === 'FAMILY';

  const { data: breakdown, isLoading, isError, refetch } = useQuery({
    queryKey: ['trust-my-score'],
    queryFn: async () => (await api.get('/trust/my-score')).data,
  });

  const score = breakdown ? Math.round(breakdown.totalScore) : 0;
  const customers = breakdown?.customers ?? [];
  const next = nextTier(score);

  return (
    <Screen back onRefresh={refetch}>
      <Text
        accessibilityRole="header"
        style={{ fontFamily: fontFamily.display, fontSize: 26, color: t.ink, letterSpacing: -0.5 }}
      >
        Your <Text style={{ color: t.trustGold }}>Trust</Text> Score
      </Text>
      <Text style={{ fontSize: type.meta, color: t.inkSlate, lineHeight: 19, marginTop: 4 }}>
        {isFamily
          ? // Honest, profile-only framing — never the elder scoring rules.
            'Your score comes from your profile. Fill it in to earn your first points.'
          : helping
          ? 'Each person you help can earn you up to 15 points: 7 for growing trust together, 5 from their review, and 3 for your profile.'
          : // Elder split (FAM-405): elders score 7+5+2+1 — the family point
            // replaces the third profile point, so the total stays 15.
            'Each helper you grow trust with can earn you up to 15 points: 7 for growing trust together, 5 from their review, 2 for your profile, and 1 for family connected.'}
      </Text>

      {isLoading ? (
        <SkeletonCard lines={3} />
      ) : isError ? (
        <LoadError what="your trust score" onRetry={refetch} style={{ marginTop: spacing[4] }} />
      ) : (
        <>
          {/* Summary card — the trust seal (web e9d647c 2026-07-26): the
              running total framed as a raised plaque, not a bare hero
              number. It's a seal, not a ring or a bar — the score keeps
              growing, so nothing here implies a max. Mobile wears the trust
              accent in the settled deep-green family (design call
              2026-07-12), hairline border, no drop shadow. */}
          <Card style={{ marginTop: spacing[4] }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[4] }}>
              <View
                style={{
                  width: 96,
                  height: 96,
                  borderRadius: radius.card,
                  backgroundColor: t.greenTint,
                  borderWidth: 1,
                  borderColor: t.greenLine,
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Text
                  style={{
                    fontFamily: fontFamily.display,
                    fontSize: 40,
                    lineHeight: 44,
                    color: t.ink,
                    fontVariant: ['tabular-nums'],
                  }}
                >
                  {score}
                </Text>
                <Text
                  style={{
                    fontSize: type.caption,
                    fontWeight: '600',
                    color: t.trustGold,
                    letterSpacing: 0.3,
                    marginTop: 2,
                  }}
                >
                  points
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                {breakdown?.tier ? (
                  <View
                    style={{
                      // Trust semantics wear the trust color, never action-blue
                      // (HCI rule 4 — same rule TrustBadge documents).
                      alignSelf: 'flex-start',
                      backgroundColor: t.surfaceFill,
                      borderWidth: 1,
                      borderColor: t.border,
                      borderRadius: radius.pill,
                      paddingVertical: 4,
                      paddingHorizontal: 12,
                    }}
                  >
                    <Text style={{ fontSize: type.meta, fontWeight: '600', color: t.trustGold }}>
                      {breakdown.tier}
                    </Text>
                  </View>
                ) : null}
                {/* The headline names the goal, not the number again — the
                    seal already shows the total. */}
                <Text
                  style={{
                    fontFamily: fontFamily.display,
                    fontSize: 19,
                    color: t.ink,
                    lineHeight: 25,
                    marginTop: spacing[2],
                  }}
                >
                  {next
                    ? `${next.missing} point${next.missing === 1 ? '' : 's'} to ${next.name}`
                    : "You've reached the top tier"}
                </Text>
              </View>
            </View>
            {customers.length > 0 ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 }}>
                <View style={{ flexDirection: 'row' }}>
                  {customers.slice(0, 3).map((c, i) => (
                    <View key={c.connectionId} style={{ marginLeft: i === 0 ? 0 : -8 }}>
                      <Avatar name={c.customerName} uri={c.customerPhotoUrl} size={26} />
                    </View>
                  ))}
                </View>
                <Text style={{ fontSize: type.caption, color: t.inkSlate }}>
                  {customers.length} {customers.length === 1 ? 'person' : 'people'} helped you reach this
                </Text>
              </View>
            ) : null}
          </Card>

          <FamilyCard family={breakdown?.family} />

          {/* Per-helper point meters */}
          {customers.length > 0 ? (
            <>
              <Text
                accessibilityRole="header"
                style={{
                  fontFamily: fontFamily.display,
                  fontSize: 20,
                  color: t.ink,
                  marginTop: spacing[5],
                }}
              >
                {helping ? 'The people you help' : 'Your helpers'}
              </Text>
              {customers.map((card) => (
                <HelperPointsCard key={card.connectionId} card={card} />
              ))}
            </>
          ) : (
            <Card style={{ marginTop: spacing[4] }}>
              <Text style={{ fontSize: type.body, lineHeight: 22, color: t.inkSlate }}>
                {isFamily
                  ? // No "add someone" for FAMILY — the role has no way to do
                    // it, and their score never grows from connections.
                    'Your trust score grows from your profile. Trust between your parent and their helpers grows on their side.'
                  : 'Trust starts with a friend. Add someone, and your points appear here.'}
              </Text>
              {/* The empty state carries its own starter action (rulebook) */}
              {!isFamily ? (
                <Button
                  title="Find friends"
                  variant="secondary"
                  onPress={() => router.push('/friends')}
                  style={{ marginTop: spacing[4] }}
                />
              ) : null}
            </Card>
          )}

        </>
      )}
    </Screen>
  );
}
