// News about your family (FAM-402) — the in-app alert feed, newest first
// from the backend, full history, no read state (web parity). Copy is 1:1
// with web FamilyHome.jsx; the pill colors deviate deliberately (spec
// 2026-07-19): blue is actions-only on mobile and saffron is retired, so
// SOS→red (semantic), FIRST_MEET→trust green (a trust milestone),
// INACTIVITY→neutral slate, unknown→grey.
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { listFamilyAlerts } from '../../api/family';
import { friendlyDate } from '../../lib/copy';
import { useTheme } from '../../theme/ThemeContext';
import Button from '../ui/Button';
import LoadError from '../ui/LoadError';
import SkeletonCard from '../ui/Skeleton';

// The feed sits inside the Home tab's plain ScrollView, so every row it
// renders is mounted and laid out at once. The backend returns the whole
// history and never trims it — a year of quiet spells is hundreds of rows on
// the handed-down phones family members use. Show the newest, offer the rest.
const NEWEST_SHOWN = 20;

// Plain-words framing for each alert type — the body carries the details,
// this line explains what kind of news it is (web ALERT_KINDS).
const alertKindsFor = (t) => ({
  SOS: {
    label: 'Urgent help',
    explain: 'They pressed their SOS button and asked for urgent help. A call right now matters.',
    color: t.redDeep,
    line: t.redLine,
    wash: t.redTint,
  },
  INACTIVITY: {
    label: 'Quiet lately',
    explain: 'They have not checked in for a while. A friendly call could help.',
    color: t.inkSlate,
    line: t.greyLine,
    wash: t.chipNeutral,
  },
  FIRST_MEET: {
    label: 'First meeting',
    explain:
      "They're meeting a friend in person for the first time. A friendship they chose to share with you.",
    color: t.trustGold,
    line: t.greenLine,
    wash: t.greenTint,
  },
});

function AlertRow({ alert, kind, first, showExplain, t, spacing, radius, type }) {
  return (
    <View
      style={{
        paddingVertical: spacing[4],
        borderTopWidth: first ? 0 : 1,
        borderTopColor: t.hairline,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[3], flexWrap: 'wrap' }}>
        <View
          style={{
            backgroundColor: kind.wash,
            borderWidth: 1,
            borderColor: kind.line,
            borderRadius: radius.pill,
            paddingVertical: 4,
            paddingHorizontal: 12,
          }}
        >
          <Text style={{ fontSize: type.meta, fontWeight: '700', color: kind.color }}>
            {kind.label}
          </Text>
        </View>
        {alert.createdAt ? (
          <Text style={{ fontSize: type.meta, color: t.inkSlate, fontVariant: ['tabular-nums'] }}>
            {friendlyDate(alert.createdAt)}
          </Text>
        ) : null}
      </View>
      {/* Name the parent (FAM-407 2026-07-19): backend bodies carry no
          subject ("Pressed the SOS button…") and a family member can link
          several parents — elderName exists in the payload for exactly this. */}
      {alert.elderName ? (
        <Text style={{ fontSize: type.body, fontWeight: '600', color: t.ink, lineHeight: 22, marginTop: spacing[2] }}>
          {alert.elderName}
        </Text>
      ) : null}
      <Text
        style={{
          fontSize: type.body,
          fontWeight: alert.elderName ? '400' : '600',
          color: t.ink,
          lineHeight: 22,
          marginTop: alert.elderName ? 2 : spacing[2],
        }}
      >
        {alert.body}
      </Text>
      {showExplain && kind.explain ? (
        // Once per kind — three "Quiet lately" alerts must not print the same
        // explanation three times (rulebook: glanceable rows).
        <Text style={{ fontSize: type.body, color: t.inkSlate, lineHeight: 22, marginTop: 4 }}>
          {kind.explain}
        </Text>
      ) : null}
    </View>
  );
}

export default function FamilyAlertsFeed() {
  const { t, spacing, radius, type, fontFamily } = useTheme();

  const { data: alerts, isLoading, isError, refetch } = useQuery({
    queryKey: ['family-alerts'],
    queryFn: listFamilyAlerts,
    // Alerts are in-app ONLY ("nothing is sent by text or email"), so this
    // feed is the sole SOS channel — it must not wait for a pull-to-refresh
    // while the app sits open. 30s is the unread-count convention
    // (app/(tabs)/_layout.jsx). FAM-407 2026-07-19.
    refetchInterval: 30_000,
  });

  const [showingAll, setShowingAll] = useState(false);

  const kinds = alertKindsFor(t);
  const fallbackKind = { label: 'Update', explain: '', color: t.greyText, line: t.greyLine, wash: t.chipNeutral };

  const all = alerts ?? [];
  const shown = showingAll ? all : all.slice(0, NEWEST_SHOWN);
  const older = all.length - shown.length;

  // Which rows carry the plain-words explanation: the first of each kind,
  // marked in one pass. A findIndex inside the row made this O(n squared).
  const kindsSeen = new Set();
  const rows = shown.map((alert) => {
    const firstOfKind = !kindsSeen.has(alert.type);
    kindsSeen.add(alert.type);
    return { alert, firstOfKind };
  });

  return (
    <View style={{ marginTop: spacing[6] }}>
      <Text
        accessibilityRole="header"
        style={{ fontFamily: fontFamily.display, fontSize: 20, color: t.ink }}
      >
        News about your family
      </Text>
      <Text style={{ fontSize: type.body, color: t.inkSlate, lineHeight: 22, marginTop: 4 }}>
        Alerts appear here when something needs your attention. Nothing is sent by text or email.
      </Text>

      {isLoading ? (
        <View style={{ marginTop: spacing[4] }}>
          <SkeletonCard lines={2} />
        </View>
      ) : isError ? (
        <LoadError what="your family news" onRetry={refetch} style={{ marginTop: spacing[4] }} />
      ) : all.length === 0 ? (
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
            No alerts right now
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
            That's good news. You'll see it here if your parent asks for help, goes quiet for a
            while, or shares a first meeting with a friend.
          </Text>
        </View>
      ) : (
        <View style={{ marginTop: spacing[2] }}>
          {rows.map(({ alert, firstOfKind }, i) => (
            <AlertRow
              key={alert.id}
              alert={alert}
              kind={kinds[alert.type] ?? fallbackKind}
              first={i === 0}
              showExplain={firstOfKind}
              t={t}
              spacing={spacing}
              radius={radius}
              type={type}
            />
          ))}
          {older > 0 ? (
            <Button
              title={`Show ${older} older ${older === 1 ? 'alert' : 'alerts'}`}
              variant="secondary"
              onPress={() => setShowingAll(true)}
              style={{ alignSelf: 'flex-start', marginTop: spacing[4] }}
            />
          ) : null}
        </View>
      )}
    </View>
  );
}
