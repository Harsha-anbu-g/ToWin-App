// Reunion: an elder meets old classmates or colleagues again. This page lists
// the reunions the signed-in person is part of (as the elder who wished, or
// as the organiser) and, for an elder, takes a new wish. The seven steps live
// on each reunion's own page.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Text, View } from 'react-native';
import { listMyReunions, postReunionWish } from '../../src/api/reunions';
import ReunionRow from '../../src/components/reunion/ReunionRow';
import ReunionWishForm from '../../src/components/reunion/ReunionWishForm';
import Card from '../../src/components/ui/Card';
import FirstTimeCard from '../../src/components/ui/FirstTimeCard';
import LoadError from '../../src/components/ui/LoadError';
import Screen from '../../src/components/ui/Screen';
import SkeletonCard from '../../src/components/ui/Skeleton';
import { useAuth } from '../../src/context/AuthContext';
import { useToast } from '../../src/context/ToastContext';
import { writeErrorLine } from '../../src/lib/writeErrorLine';
import { useTheme } from '../../src/theme/ThemeContext';
import { tr } from '../../src/i18n';

export default function ReunionIndex() {
  const { t, text, type, fontFamily, spacing } = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const isElder = user?.role === 'ELDER' || user?.role === 'BOTH';

  const { data, isLoading, isError, refetch } = useQuery({ queryKey: ['reunions'], queryFn: listMyReunions });
  const list = Array.isArray(data) ? data : [];

  const wish = useMutation({
    mutationFn: postReunionWish,
    onSuccess: (fresh) => {
      queryClient.invalidateQueries({ queryKey: ['reunions'] });
      if (fresh?.id) {
        queryClient.setQueryData(['reunion', fresh.id], fresh);
        router.push(`/reunion/${fresh.id}`);
      }
    },
    onError: (err) => showToast(writeErrorLine(err, tr('Could not save the wish right now. Please try again.')), 'error'),
  });

  return (
    <Screen back title={tr('Reunion')} onRefresh={refetch} keyboard>
      <FirstTimeCard
        flag="first-time-reunion"
        title={tr('Meet them again')}
        body={
          isElder
            ? tr('Say who you want to see again. A helper you fully trust, or your family, finds them and plans the day. You approve each step. Every guest is seen home.')
            : tr('An elder who fully trusts you, or your parent, can ask you to plan their reunion. You find the people and plan the day. They approve each step.')
        }
        style={{ marginBottom: spacing[4] }}
      />

      {isLoading ? (
        <SkeletonCard lines={3} />
      ) : isError ? (
        <LoadError what={tr('your reunions')} onRetry={refetch} />
      ) : list.length > 0 ? (
        <Card contentStyle={{ paddingVertical: 2 }}>
          {list.map((r, i) => (
            <ReunionRow key={r.id} reunion={r} divider={i < list.length - 1} onPress={() => router.push(`/reunion/${r.id}`)} />
          ))}
        </Card>
      ) : !isElder ? (
        <Card>
          <Text style={{ fontSize: type.body, color: t.inkSlate, lineHeight: 24 }}>
            {tr('When someone asks you to plan their reunion, it shows here.')}
          </Text>
        </Card>
      ) : null}

      {isElder ? (
        <View style={{ marginTop: list.length > 0 ? spacing[6] : 0 }}>
          <Text style={{ fontFamily: fontFamily.display, fontSize: text.lg, color: t.ink, marginBottom: spacing[3] }}>
            {tr('A new wish')}
          </Text>
          <ReunionWishForm onSubmit={(fields) => wish.mutate(fields)} submitting={wish.isPending} />
        </View>
      ) : null}
    </Screen>
  );
}
