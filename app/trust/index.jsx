// Trust Score (3k) — informational breakdown: summary card (serif 42 score,
// tier chip, next-tier line, avatar stack) and per-helper point cards with a
// two-tone bar + three meters (stages /7 dots, review /5 stars, profile /3).
// Climbing the ladder lives on the Dashboard (3d); this screen explains.
import { useQuery } from '@tanstack/react-query';
import { Star } from 'lucide-react-native';
import { Text, View } from 'react-native';
import api from '../../src/api/client';
import Avatar from '../../src/components/ui/Avatar';
import Card from '../../src/components/ui/Card';
import LoadError from '../../src/components/ui/LoadError';
import Screen from '../../src/components/ui/Screen';
import SkeletonCard from '../../src/components/ui/Skeleton';
import { useTheme } from '../../src/theme/ThemeContext';

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

function Dots({ earned, max, size = 9 }) {
  const { t } = useTheme();
  return (
    <View style={{ flexDirection: 'row', gap: 4 }}>
      {Array.from({ length: max }).map((_, i) => (
        <View
          key={i}
          style={{
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: i < earned ? t.blueDeep : t.dotIdle,
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

function HelperPointsCard({ card }) {
  const { t, radius, type } = useTheme();
  const pct = card.totalMax > 0 ? card.total / card.totalMax : 0;
  return (
    <Card style={{ marginTop: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 11 }}>
        <Avatar name={card.customerName} uri={card.customerPhotoUrl} size={40} />
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: type.body, fontWeight: '600', color: t.ink }}>{card.customerName}</Text>
          <Text style={{ fontSize: type.caption, color: t.inkSlate, marginTop: 1 }}>{card.currentStageLabel}</Text>
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
    </Card>
  );
}

export default function TrustScreen() {
  const { t, spacing, radius, type, fontFamily } = useTheme();

  const { data: breakdown, isLoading, isError, refetch } = useQuery({
    queryKey: ['trust-my-score'],
    queryFn: async () => (await api.get('/trust/my-score')).data,
  });

  const score = breakdown ? Math.round(breakdown.totalScore) : 0;
  const customers = breakdown?.customers ?? [];
  const next = nextTier(score);

  return (
    <Screen back>
      <Text
        accessibilityRole="header"
        style={{ fontFamily: fontFamily.display, fontSize: 26, color: t.ink, letterSpacing: -0.5 }}
      >
        Your <Text style={{ color: t.trustGold }}>Trust</Text> Score
      </Text>
      <Text style={{ fontSize: type.meta, color: t.inkSlate, lineHeight: 19, marginTop: 4 }}>
        Each person you help can earn you up to 15 points: 7 for growing trust together, 5 from
        their review, and 3 for your profile.
      </Text>

      {isLoading ? (
        <SkeletonCard lines={3} />
      ) : isError ? (
        <LoadError what="your trust score" onRetry={refetch} style={{ marginTop: spacing[4] }} />
      ) : (
        <>
          {/* Summary card */}
          <Card style={{ marginTop: spacing[4] }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Text
                style={{
                  fontFamily: fontFamily.display,
                  fontSize: 42,
                  lineHeight: 46,
                  color: t.ink,
                  fontVariant: ['tabular-nums'],
                }}
              >
                {score}
              </Text>
              {breakdown?.tier ? (
                <View
                  style={{
                    // Trust semantics wear the trust color, never action-blue
                    // (HCI rule 4 — same rule TrustBadge documents).
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
            </View>
            {next ? (
              <Text style={{ fontSize: type.meta, color: t.inkSlate, marginTop: 8 }}>
                {next.missing} more point{next.missing === 1 ? '' : 's'} to {next.name}.
              </Text>
            ) : (
              <Text style={{ fontSize: type.meta, color: t.trustGold, marginTop: 8 }}>
                Community Champion — the top of the ladder.
              </Text>
            )}
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
                Your helpers
              </Text>
              {customers.map((card) => (
                <HelperPointsCard key={card.connectionId} card={card} />
              ))}
            </>
          ) : (
            <Card style={{ marginTop: spacing[4] }}>
              <Text style={{ fontSize: type.body, lineHeight: 22, color: t.inkSlate }}>
                Trust starts with a friend. Add someone, and your points appear here.
              </Text>
            </Card>
          )}

        </>
      )}
    </Screen>
  );
}
