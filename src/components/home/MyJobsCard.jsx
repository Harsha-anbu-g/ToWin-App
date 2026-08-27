// My offers & jobs — the helper's applications (GET /needs/applications:
// NeedResponse[] carrying myApplicationStatus), laid out exactly like the
// elder's Posted Help (owner call 2026-08-26: "do the same for the helper").
// Three segments with their counts — Waiting / In Progress / Completed — and
// one hairline row per request, title alone until touched. One touch opens
// everything: the meta line, the elder with where trust stands, their words,
// and Message. In Progress rows carry "<elder> · Building trust" while folded.
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import api from '../../api/client';
import { ChevronRight } from '../icons';
import { timeAgo } from '../../lib/copy';
import { catLabel } from '../../lib/needs';
import { trustStandingFor } from '../../lib/trustStanding';
import { useTheme } from '../../theme/ThemeContext';
import ActionChip from '../ui/ActionChip';
import Avatar from '../ui/Avatar';
import LoadError from '../ui/LoadError';
import SegmentedControl from '../ui/SegmentedControl';
import SkeletonCard from '../ui/Skeleton';
import SwipeSegments from '../ui/SwipeSegments';

// Which segment an offer belongs under. A declined offer, or a request the
// elder took down, is over — it lives with the finished ones.
const segmentOf = (need) => {
  if (need.myApplicationStatus === 'PENDING' && need.status === 'OPEN') return 'open';
  if (need.myApplicationStatus === 'ACCEPTED' && need.status === 'ASSIGNED') return 'progress';
  return 'done';
};

const EMPTY = {
  open: 'No offers waiting. Offer to help with a request and it will show up here.',
  progress: 'Nothing in progress. When an elder says yes to your offer, it moves here.',
  done: 'No finished jobs yet.',
};

function JobRow({ need, standing, divider }) {
  const { t, type } = useTheme();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const meta = [
    catLabel(need.category),
    need.urgency === 'URGENT' ? 'Urgent' : 'Normal',
    need.createdAt ? `posted ${timeAgo(need.createdAt)}` : null,
    need.status === 'CANCELLED' ? 'Taken down' : null,
  ]
    .filter(Boolean)
    .join(' · ');
  // The folded row says WHO and where trust stands once the job is mine;
  // a declined offer says so plainly rather than hiding under "Completed".
  const subtitle =
    need.myApplicationStatus === 'DECLINED'
      ? 'Not this time'
      : need.myApplicationStatus === 'ACCEPTED' && need.elderName
        ? [need.elderName, standing?.word].filter(Boolean).join(' · ')
        : null;

  return (
    <View style={divider ? { borderTopWidth: 1, borderTopColor: t.hairline } : null}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${need.title}. ${subtitle ? `${subtitle}. ` : ''}${meta}`}
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen((v) => !v)}
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          minHeight: 60,
          opacity: pressed ? 0.7 : 1,
        })}
      >
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: type.body, fontWeight: '600', lineHeight: 22, color: t.ink }}>
            {need.title}
          </Text>
          {subtitle ? (
            <Text style={{ fontSize: type.caption, color: t.inkSlate, marginTop: 2 }}>{subtitle}</Text>
          ) : null}
        </View>
        <ChevronRight
          size={18}
          color={t.inkFaint2}
          strokeWidth={1.8}
          style={{ transform: [{ rotate: open ? '90deg' : '0deg' }] }}
        />
      </Pressable>

      {open ? (
        <View style={{ paddingBottom: 12 }}>
          <Text style={{ fontSize: type.meta, color: t.inkSlate }}>{meta}</Text>

          {/* The elder — tap opens their profile; the stage rides the caption. */}
          {need.elderName ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`View ${need.elderName}'s profile`}
              onPress={() => router.push(`/user/${need.elderId}`)}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                gap: 10,
                minHeight: 44,
                marginTop: 10,
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <Avatar name={need.elderName} size={36} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: type.meta, fontWeight: '600', color: t.ink }}>{need.elderName}</Text>
                <Text style={{ fontSize: type.caption, color: t.inkSlate, marginTop: 1 }}>
                  {standing
                    ? `${standing.word} · Stage ${standing.stageNo} of 7, ${standing.stageName}. Tap to see their profile.`
                    : 'Tap to see their profile.'}
                </Text>
              </View>
              <ChevronRight size={16} color={t.inkFaint2} strokeWidth={2} />
            </Pressable>
          ) : null}

          {need.description ? (
            <Text style={{ fontSize: type.meta, color: t.inkSlate, lineHeight: 20, marginTop: 10 }}>
              {need.description}
            </Text>
          ) : null}

          {/* The chat lives on the friendship the accept created. */}
          {standing?.connectionId && need.myApplicationStatus === 'ACCEPTED' ? (
            <ActionChip
              label="Message"
              tonal
              onPress={() => router.push(`/chat/${standing.connectionId}`)}
              style={{ marginTop: 10, alignSelf: 'flex-start' }}
            />
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

export default function MyJobsCard() {
  const { t, type } = useTheme();
  const [seg, setSeg] = useState('open');

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['needs-applications'],
    queryFn: async () => (await api.get('/needs/applications')).data,
  });
  const jobs = Array.isArray(data) ? data : data?.content ?? [];
  // The friendships behind my accepted offers — where trust stands with each
  // elder. Same key as the tab shell and My Elders, so one fetch.
  const { data: connections } = useQuery({
    queryKey: ['connections'],
    queryFn: async () => (await api.get('/connections')).data,
  });

  const waiting = jobs.filter((n) => segmentOf(n) === 'open');
  const inProgress = jobs.filter((n) => segmentOf(n) === 'progress');
  const finished = jobs.filter((n) => segmentOf(n) === 'done');
  const shown = seg === 'open' ? waiting : seg === 'progress' ? inProgress : finished;

  return (
    <View>
      <SegmentedControl
        segments={[
          { key: 'open', label: 'Waiting', count: waiting.length },
          { key: 'progress', label: 'In Progress', count: inProgress.length },
          { key: 'done', label: 'Completed', count: finished.length },
        ]}
        value={seg}
        onChange={setSeg}
        style={{ marginBottom: 8 }}
      />
      {/* Swiping the list left/right steps the segments, iOS-style. */}
      <SwipeSegments keys={['open', 'progress', 'done']} value={seg} onChange={setSeg}>
        {isLoading ? (
          <SkeletonCard />
        ) : isError ? (
          <LoadError bare what="your jobs" onRetry={refetch} style={{ marginTop: 14 }} />
        ) : shown.length === 0 ? (
          <Text style={{ paddingVertical: 24, fontSize: type.body, lineHeight: 22, color: t.inkSlate }}>
            {EMPTY[seg]}
          </Text>
        ) : (
          shown.map((need, i) => (
            <JobRow
              key={need.id}
              need={need}
              divider={i > 0}
              standing={trustStandingFor(need.elderId, connections, { trustedWord: 'Trusted elder' })}
            />
          ))
        )}
      </SwipeSegments>
    </View>
  );
}
