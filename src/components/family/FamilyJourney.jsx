// Family journey (MOB-A) — what a family member sees about one linked parent:
// today's check-in, how many help requests are open, and the helper
// friendships the parent chose to share. Ported from web FamilyHome.jsx
// (US-001..US-004, commits 0aa41e1..780a3fb).
//
// Mobile deviates from the web layout in one deliberate way: the website nests
// a bordered card per helper inside the parent's card. Rows-not-boxes is the
// mobile law, so helpers are hairline-separated rows under a heading. Nothing
// about the information or its gating changes — only the container.
//
// Seeing is not a power. Everything here is read-only; acting on any of it
// belongs to guardian mode and is gated separately.
import { useRouter } from 'expo-router';
import { Check, Clock, UserRound } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';
import { SHORT_STAGES, stageIndexOf } from '../../lib/trustStages';
import { useTheme } from '../../theme/ThemeContext';
import TrustLadder from '../trust/TrustLadder';
import Avatar from '../ui/Avatar';

// Today's check-in, as a chip. Green = achieved (the parent is accounted for);
// neutral grey = simply not yet, which must never read as alarming — "no
// check-in yet today" at 9am is normal, and colouring it red would teach
// families to panic (HCI 2: honest words, honest colour).
function CheckInChip({ checkedInToday }) {
  const { t, spacing, radius, type } = useTheme();
  const Icon = checkedInToday ? Check : Clock;
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing[2],
        backgroundColor: checkedInToday ? t.greenTint : t.chipNeutral,
        borderWidth: 1,
        borderColor: checkedInToday ? t.greenLine : t.greyLine,
        borderRadius: radius.pill,
        paddingVertical: 5,
        paddingHorizontal: 12,
      }}
    >
      <Icon
        size={14}
        color={checkedInToday ? t.greenDeep : t.greyText}
        strokeWidth={checkedInToday ? 2.5 : 2}
      />
      <Text
        style={{
          fontSize: type.meta,
          fontWeight: '600',
          color: checkedInToday ? t.greenDeep : t.greyText,
        }}
      >
        {checkedInToday ? 'Checked in today' : 'No check-in yet today'}
      </Text>
    </View>
  );
}

// The status line under a parent's name: check-in chip plus, when there are
// any, how many help requests are open.
export function ParentStatusLine({ journey }) {
  const { t, spacing, type } = useTheme();
  if (!journey) return null;
  const open = journey.openNeedsCount ?? 0;
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: spacing[3],
        marginTop: spacing[3],
      }}
    >
      <CheckInChip checkedInToday={!!journey.checkedInToday} />
      {open > 0 ? (
        <Text style={{ fontSize: type.meta, color: t.inkSlate }}>
          {open} help request{open === 1 ? '' : 's'} open
        </Text>
      ) : null}
    </View>
  );
}

// One shared friendship: who the helper is, how far the parent has walked with
// them, and a way through to the helper's full profile. The ladder is the same
// component the elder and helper see — read-only here because family watch
// this journey, they do not move it.
function SharedHelperRow({ helper, first }) {
  const { t, spacing, type } = useTheme();
  const router = useRouter();
  const stage = stageIndexOf(helper);
  const openProfile = () => router.push(`/user/${helper.helperUserId}`);

  return (
    <View
      style={{
        paddingVertical: spacing[4],
        borderTopWidth: first ? 0 : 1,
        borderTopColor: t.hairline,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[3] }}>
        <Avatar name={helper.helperName} uri={helper.helperPhotoUrl} size={44} />
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: type.body, fontWeight: '600', color: t.ink }}>
            {helper.helperName}
          </Text>
          <Text style={{ fontSize: type.meta, color: t.inkSlate, marginTop: 2 }}>
            Stage {Math.min(stage + 1, 7)} of 7 · {helper.stageLabel || SHORT_STAGES[stage]}
          </Text>
        </View>
      </View>

      <TrustLadder stageIndex={stage} style={{ marginTop: spacing[4] }} />

      {helper.readyToMeet ? (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing[2],
            marginTop: spacing[3],
          }}
        >
          <UserRound size={15} color={t.blueDeep} strokeWidth={2} />
          <Text style={{ fontSize: type.meta, fontWeight: '600', color: t.blueDeep, flex: 1 }}>
            They&rsquo;re getting ready to meet in person
          </Text>
        </View>
      ) : null}

      {/* The one tappable thing on this row. Blue = you can act here. */}
      <Pressable
        onPress={openProfile}
        accessibilityRole="button"
        accessibilityLabel={`See ${helper.helperName}'s full profile`}
        style={{ minHeight: 44, justifyContent: 'center', marginTop: spacing[2] }}
      >
        <Text style={{ fontSize: type.meta, fontWeight: '600', color: t.blueDeep }}>
          See their full profile →
        </Text>
      </Pressable>
    </View>
  );
}

// The parent's open help requests, read-only. Guardian mode (MOB-C3) adds the
// ask-for-them and close-for-them actions on top of this same list.
export function ParentOpenNeeds({ journey }) {
  const { t, spacing, type, fontFamily } = useTheme();
  const needs = journey?.openNeeds ?? [];
  if (needs.length === 0) return null;

  return (
    <View style={{ marginTop: spacing[5] }}>
      <Text
        accessibilityRole="header"
        style={{ fontFamily: fontFamily.display, fontSize: 20, color: t.ink }}
      >
        Their open help requests
      </Text>
      {needs.map((n, i) => (
        <View
          key={n.id}
          style={{
            paddingVertical: spacing[3],
            borderTopWidth: i === 0 ? 0 : 1,
            borderTopColor: t.hairline,
          }}
        >
          <Text style={{ fontSize: type.body, fontWeight: '600', color: t.ink }}>{n.title}</Text>
          {n.description ? (
            <Text
              numberOfLines={2}
              style={{ fontSize: type.meta, color: t.inkSlate, lineHeight: 20, marginTop: 2 }}
            >
              {n.description}
            </Text>
          ) : null}
        </View>
      ))}
    </View>
  );
}

// The friendships this parent chose to share, with the empty state that
// explains whose choice that is — a family member seeing nothing here has not
// hit a bug, and should not go asking us why the app is broken (HCI 9).
export function SharedHelpers({ journey }) {
  const { t, spacing, type, fontFamily } = useTheme();
  if (!journey) return null;
  const helpers = journey.sharedHelpers ?? [];

  return (
    <View style={{ marginTop: spacing[5] }}>
      <Text
        accessibilityRole="header"
        style={{ fontFamily: fontFamily.display, fontSize: 20, color: t.ink }}
      >
        Friendships shared with you
      </Text>
      {helpers.length === 0 ? (
        <Text
          style={{ fontSize: type.body, color: t.inkSlate, lineHeight: 22, marginTop: spacing[2] }}
        >
          No friendships shared with you yet. Your parent chooses what to share.
        </Text>
      ) : (
        helpers.map((h, i) => <SharedHelperRow key={h.connectionId} helper={h} first={i === 0} />)
      )}
    </View>
  );
}
