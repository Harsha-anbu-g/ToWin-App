// "From Margaret" — one elder's writing, as one visitor may read it.
//
// The page decides nothing. It renders `items` exactly as the server handed
// them over — every row went through PassOnVisibilityService there. No
// client-side filtering on purpose: a second authority on who may read what
// would drift from the first.
//
// Nothing from the Sealed box can appear here, and not because this page
// filters it out: sealed items live in a different table this endpoint never
// reads, and the screen has no branch that renders anything but `items`.
//
// Signed-in, any role (web PrivateRoute parity) — the whole point is that her
// family and her helpers can read it, and none of them are elders.
import { useQuery } from '@tanstack/react-query';
import { Redirect, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';
import api from '../../src/api/client';
import PassOnReadCard from '../../src/components/passon/PassOnReadCard';
import LoadError from '../../src/components/ui/LoadError';
import Screen from '../../src/components/ui/Screen';
import SkeletonCard from '../../src/components/ui/Skeleton';
import { useAuth } from '../../src/context/AuthContext';
import { FROM_PAGE, REPORT_STORY } from '../../src/lib/passOnLocks';
import { useTheme } from '../../src/theme/ThemeContext';

export default function PassOnFrom() {
  const { t, text, radius, spacing } = useTheme();
  const { user, booted } = useAuth();
  const { ownerId } = useLocalSearchParams();

  // One report at a time, held by item id. Two open forms on one page is how
  // somebody ends up filing a complaint against the wrong story.
  const [reportingId, setReportingId] = useState(null);
  const [sentIds, setSentIds] = useState([]);
  const [sending, setSending] = useState(false);
  const [reportError, setReportError] = useState('');

  const {
    data: page,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['passon-from', ownerId],
    queryFn: async () => (await api.get(`/passon/from/${ownerId}`)).data,
    enabled: !!user && !!ownerId,
  });

  if (booted && !user) return <Redirect href="/(auth)/login" />;

  async function sendReport({ reason, description }) {
    const itemId = reportingId;
    setSending(true);
    setReportError('');
    try {
      await api.post('/reports', {
        reportedUserId: ownerId,
        // Names the story, not only the person. Without it an admin is told
        // somebody wrote something upsetting somewhere — not actionable.
        contentType: 'PASSON_ITEM',
        contentId: itemId,
        reason,
        description,
      });
      setReportingId(null);
      setSentIds((ids) => [...ids, itemId]);
    } catch (err) {
      setReportError(err?.response?.data?.message || REPORT_STORY.failed);
    } finally {
      setSending(false);
    }
  }

  const name = page?.ownerName || '';
  const items = page?.items || [];

  return (
    // keyboard: the report-a-story form opens inline on a card, and the
    // keyboard must never cover the field being typed into (UX-702).
    <Screen back keyboard title={name ? FROM_PAGE.title(name) : ' '} contentStyle={{ gap: spacing[4] }}>
      {isError ? (
        <LoadError what="this page" onRetry={refetch} />
      ) : isLoading ? (
        <SkeletonCard lines={3} />
      ) : (
        <>
          <Text style={{ fontSize: text.sm, color: t.ink3, lineHeight: 24 }}>
            {FROM_PAGE.lead(name)}
          </Text>

          {items.length === 0 ? (
            <View
              style={{
                backgroundColor: t.canvas,
                borderWidth: 1,
                borderColor: t.hairline2,
                borderRadius: radius.xl,
                paddingVertical: spacing[6],
                paddingHorizontal: spacing[5],
              }}
            >
              <Text style={{ fontSize: text.sm, color: t.inkSlate, lineHeight: 24 }}>
                {FROM_PAGE.empty(name)}
              </Text>
            </View>
          ) : (
            items.map((item) => (
              <PassOnReadCard
                key={item.id}
                item={item}
                reportOpen={reportingId === item.id}
                reportSent={sentIds.includes(item.id)}
                reportError={reportingId === item.id ? reportError : ''}
                sending={sending}
                onOpenReport={(it) => {
                  setReportingId(it.id);
                  setReportError('');
                }}
                onCancelReport={() => {
                  setReportingId(null);
                  setReportError('');
                }}
                onSendReport={sendReport}
              />
            ))
          )}
        </>
      )}
    </Screen>
  );
}
