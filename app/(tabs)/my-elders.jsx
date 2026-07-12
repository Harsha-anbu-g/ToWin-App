// My Elders (4a) — the helper's second tab: each elder as a card with
// contact actions (tonal Message · hairline View Profile · hairline End)
// and the shared 7-node trust ladder, plus the mutual-consent state line.
// Data: ACTIVE connections merged with /trust/my-score for stage/points.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Phone } from 'lucide-react-native';
import { useState } from 'react';
import { Alert, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import api from '../../src/api/client';
import MenuSheet from '../../src/components/home/MenuSheet';
import TrustLadder from '../../src/components/trust/TrustLadder';
import Avatar from '../../src/components/ui/Avatar';
import Button from '../../src/components/ui/Button';
import NavRow from '../../src/components/ui/NavRow';
import Screen from '../../src/components/ui/Screen';
import SegmentedControl from '../../src/components/ui/SegmentedControl';
import SkeletonCard from '../../src/components/ui/Skeleton';
import { useToast } from '../../src/context/ToastContext';
import { useTheme } from '../../src/theme/ThemeContext';

// Backend trust-level enum, in ladder order (index = stage climbed).
const LEVEL_ORDER = [
  'JUST_CONNECTED',
  'CHATTING',
  'FRIENDLY',
  'PHONE_READY',
  'MET_IN_PERSON',
  'HELPING_HAND',
  'FULLY_TRUSTED',
];
const SHORT_STAGES = ['Connected', 'Messaging', 'Phone', 'Video', 'Socials', 'Met in person', 'Trusted'];

function ActionChip({ label, onPress, tonal = false, destructive = false }) {
  const { t, radius, type } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={{ top: 6, bottom: 6 }}
      style={({ pressed }) => ({
        height: 36,
        paddingHorizontal: 14,
        borderRadius: radius.pill,
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: tonal ? t.blueSoft : destructive ? t.redLine : t.border,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <Text
        numberOfLines={1}
        style={{
          fontSize: type.meta,
          fontWeight: '600',
          color: tonal ? t.blueDeep : destructive ? t.redDeep : t.ink,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function ElderCard({ conn, scoreCard, onEnd, onConfirm }) {
  const { t, radius, type, fontFamily } = useTheme();
  const router = useRouter();
  const stageIndex = scoreCard?.stageIndex ?? Math.max(0, LEVEL_ORDER.indexOf(conn.currentTrustLevel));
  const atTop = stageIndex >= 6;
  const waiting = conn.confirmedByMe && !conn.confirmedByOther;
  const next = SHORT_STAGES[Math.min(stageIndex + 1, 6)];

  return (
    <View style={{ backgroundColor: t.canvas, borderWidth: 1, borderColor: t.border, borderRadius: radius.card, padding: 16, marginTop: 14 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 11 }}>
        <Avatar name={conn.otherUserName} uri={conn.otherUserPhotoUrl} size={44} />
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: fontFamily.display, fontSize: 19, color: t.ink }}>
            {conn.otherUserName}
          </Text>
          {conn.otherUserAge ? (
            <Text style={{ fontSize: type.caption, color: t.inkSlate, marginTop: 1 }}>
              Age {conn.otherUserAge}
            </Text>
          ) : null}
        </View>
        {scoreCard ? (
          <Text style={{ fontSize: type.body, fontWeight: '600', color: t.trustGold, fontVariant: ['tabular-nums'] }}>
            {scoreCard.total}
            <Text style={{ fontWeight: '400', fontSize: type.caption }}>/{scoreCard.totalMax}</Text>
          </Text>
        ) : null}
      </View>

      {conn.otherUserPhone ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 10 }}>
          <Phone size={14} color={t.blueDeep} strokeWidth={1.8} />
          <Text style={{ fontSize: type.meta, color: t.blueDeep, fontVariant: ['tabular-nums'] }}>
            {conn.otherUserPhone}
          </Text>
        </View>
      ) : null}

      {/* Actions: tonal Message · hairline View Profile · hairline End */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14 }}>
        <ActionChip label="Message" tonal onPress={() => router.push(`/chat/${conn.id}`)} />
        <ActionChip label="View Profile" onPress={() => router.push(`/user/${conn.otherUserId}`)} />
        <View style={{ flex: 1 }} />
        <ActionChip label="End" destructive onPress={() => onEnd(conn)} />
      </View>

      <TrustLadder stageIndex={stageIndex} style={{ marginTop: 16 }} />
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
        <Text style={{ fontSize: 11, color: t.inkSlate }}>Connected</Text>
        {!atTop ? (
          <Text style={{ fontSize: 11, fontWeight: '600', color: t.blueDeep }}>Next: {next}</Text>
        ) : null}
        <Text style={{ fontSize: 11, color: t.trustGold }}>Trusted</Text>
      </View>

      {atTop ? (
        <View style={{ backgroundColor: t.greenTint, borderRadius: radius.input, padding: 12, marginTop: 14 }}>
          <Text style={{ fontSize: type.meta, fontWeight: '600', color: t.greenDeep }}>
            Fully trusted — the ladder is complete.
          </Text>
        </View>
      ) : waiting ? (
        <Text style={{ fontSize: type.meta, color: t.inkSlate, lineHeight: 19, marginTop: 14 }}>
          Waiting for {conn.otherUserName} to confirm the next step — they'll get a tap on their side.
        </Text>
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Take the next step"
          onPress={() => onConfirm(conn)}
          style={({ pressed }) => ({
            height: 38,
            borderRadius: radius.pill,
            backgroundColor: 'transparent',
            borderWidth: 1,
            borderColor: t.blueSoft,
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: 14,
            opacity: pressed ? 0.7 : 1,
          })}
        >
          <Text style={{ fontSize: type.meta, fontWeight: '600', color: t.blueDeep }}>Take the next step</Text>
        </Pressable>
      )}
    </View>
  );
}

export default function MyElders() {
  const { t, spacing, type, fontFamily } = useTheme();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const router = useRouter();
  const [seg, setSeg] = useState('building');
  const [refreshing, setRefreshing] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const { data: connections, isLoading } = useQuery({
    queryKey: ['connections'],
    queryFn: async () => (await api.get('/connections')).data,
  });
  const { data: breakdown } = useQuery({
    queryKey: ['trust-my-score'],
    queryFn: async () => (await api.get('/trust/my-score')).data,
  });

  const scoreOf = (connId) => (breakdown?.customers ?? []).find((c) => c.connectionId === connId);
  const active = (connections ?? []).filter((c) => c.status === 'ACTIVE');
  const stageOf = (c) => scoreOf(c.id)?.stageIndex ?? Math.max(0, LEVEL_ORDER.indexOf(c.currentTrustLevel));
  const trusted = active.filter((c) => stageOf(c) >= 6);
  const building = active.filter((c) => stageOf(c) < 6);
  const shown = seg === 'trusted' ? trusted : building;

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['connections'] });
    queryClient.invalidateQueries({ queryKey: ['trust-my-score'] });
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  const confirm = useMutation({
    mutationFn: (connectionId) => api.post(`/trust/${connectionId}/confirm`),
    onSuccess: (_r, connectionId) => {
      const c = active.find((x) => x.id === connectionId);
      showToast(
        c && !c.confirmedByOther
          ? `Step confirmed — waiting for ${c.otherUserName} to agree too.`
          : 'You both agreed — one step up the ladder!',
        'success'
      );
      refresh();
    },
    onError: (err) =>
      showToast(err?.response?.data?.message || 'Could not confirm right now. Please try again.', 'error'),
  });

  const end = useMutation({
    mutationFn: (connectionId) => api.delete(`/connections/${connectionId}`),
    onSuccess: () => {
      showToast('Connection ended.', 'info');
      refresh();
    },
    onError: () => showToast('Could not end it right now. Please try again.', 'error'),
  });

  const confirmStep = (conn) =>
    Alert.alert(
      'Take the next step?',
      `Trust grows only when BOTH of you agree. Confirm your side of the next step with ${conn.otherUserName}?`,
      [
        { text: 'Not yet', style: 'cancel' },
        { text: 'Confirm my side', onPress: () => confirm.mutate(conn.id) },
      ]
    );

  const confirmEnd = (conn) =>
    Alert.alert(
      'End this connection?',
      `You and ${conn.otherUserName} will no longer be connected. This cannot be undone.`,
      [
        { text: 'Keep it', style: 'cancel' },
        { text: 'End', style: 'destructive', onPress: () => end.mutate(conn.id) },
      ]
    );

  return (
    <Screen scroll={false} contentStyle={{ padding: 0 }}>
      <NavRow
        trustScore={breakdown ? Math.round(breakdown.totalScore) : undefined}
        onMenu={() => setMenuOpen(true)}
        onAddFriends={() => router.push('/friends')}
      />
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={t.blue} />}
        contentContainerStyle={{ paddingHorizontal: spacing[4], paddingTop: spacing[2], paddingBottom: spacing[12] }}
      >
        <Text
          accessibilityRole="header"
          style={{ fontFamily: fontFamily.display, fontSize: 26, color: t.ink, letterSpacing: -0.5 }}
        >
          My Elders
        </Text>
        <Text style={{ fontSize: type.meta, color: t.inkSlate, marginTop: 3 }}>
          <Text style={{ color: t.trustGold, fontWeight: '600' }}>Trust</Text> grows step by step, like roots.
        </Text>

        <SegmentedControl
          segments={[
            { key: 'trusted', label: 'Trusted Elders', count: trusted.length },
            { key: 'building', label: 'Building Trust', count: building.length },
          ]}
          value={seg}
          onChange={setSeg}
          style={{ marginTop: 14 }}
        />

        {isLoading ? (
          <SkeletonCard lines={4} />
        ) : shown.length === 0 ? (
          <View style={{ backgroundColor: t.canvas, borderWidth: 1, borderColor: t.border, borderRadius: 16, padding: 16, marginTop: 14 }}>
            <Text style={{ fontSize: type.body, color: t.inkSlate, lineHeight: 22 }}>
              {seg === 'trusted'
                ? 'No fully trusted elders yet — every ladder ends here.'
                : 'No connections yet. Find an elder nearby and say hello.'}
            </Text>
            <Button title="Find elders" variant="secondary" onPress={() => router.push('/friends')} style={{ marginTop: 14 }} />
          </View>
        ) : (
          shown.map((conn) => (
            <ElderCard
              key={conn.id}
              conn={conn}
              scoreCard={scoreOf(conn.id)}
              onEnd={confirmEnd}
              onConfirm={confirmStep}
            />
          ))
        )}
      </ScrollView>
      <MenuSheet visible={menuOpen} onClose={() => setMenuOpen(false)} />
    </Screen>
  );
}
