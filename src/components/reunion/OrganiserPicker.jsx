// Step 2, who plans: the people the server allows, each with the reason they
// are allowed (full trust, or family). One tap, one confirm, chosen.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pressable, Text, View } from 'react-native';
import { chooseReunionOrganiser, listReunionOrganisers } from '../../api/reunions';
import { friendlyWriteError } from '../../api/client';
import { useConfirm } from '../../context/ConfirmContext';
import { useToast } from '../../context/ToastContext';
import { useTheme } from '../../theme/ThemeContext';
import Avatar from '../ui/Avatar';
import Card from '../ui/Card';
import LoadError from '../ui/LoadError';
import SkeletonCard from '../ui/Skeleton';
import { tr } from '../../i18n';

const whyAllowed = (c) =>
  c.kind === 'FAMILY' ? c.relationship || tr('Family') : tr('Helper you fully trust');

export default function OrganiserPicker({ reunionId }) {
  const { t, type, spacing } = useTheme();
  const { showToast } = useToast();
  const confirm = useConfirm();
  const queryClient = useQueryClient();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['reunion-organisers', reunionId],
    queryFn: () => listReunionOrganisers(reunionId),
  });
  const candidates = Array.isArray(data) ? data : [];

  const choose = useMutation({
    mutationFn: (organiserId) => chooseReunionOrganiser({ reunionId, organiserId }),
    onSuccess: (fresh) => {
      queryClient.setQueryData(['reunion', reunionId], fresh);
      queryClient.invalidateQueries({ queryKey: ['reunions'] });
      showToast(tr('{name} will plan it. They have been told.', { name: fresh?.organiserName ?? '' }), 'success');
    },
    onError: (err) => showToast(friendlyWriteError(err, tr('Could not choose them right now. Please try again.')), 'error'),
  });

  const pick = async (c) => {
    const ok = await confirm({
      title: tr('Ask {name} to plan it?', { name: c.name }),
      message: tr('They will find the people and plan the day. You approve each step.'),
      cancelLabel: tr('Not now'),
      confirmLabel: tr('Yes, ask {name}', { name: c.name }),
    });
    if (ok) choose.mutate(c.userId);
  };

  if (isLoading) return <SkeletonCard lines={3} />;
  if (isError) return <LoadError what={tr('who can plan it')} onRetry={refetch} />;

  return (
    <Card contentStyle={{ paddingVertical: spacing[2] }}>
      {candidates.length === 0 ? (
        <Text style={{ fontSize: type.body, color: t.inkSlate, lineHeight: 24, paddingVertical: spacing[2] }}>
          {tr('Nobody to choose yet. A helper you fully trust, or a family member, can plan it.')}
        </Text>
      ) : (
        candidates.map((c, i) => (
          <Pressable
            key={c.userId}
            accessibilityRole="button"
            accessibilityLabel={tr('Ask {name} to plan it. {why}', { name: c.name, why: whyAllowed(c) })}
            disabled={choose.isPending}
            onPress={() => pick(c)}
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing[3],
              minHeight: 64,
              paddingVertical: spacing[2],
              borderTopWidth: i === 0 ? 0 : 1,
              borderTopColor: t.hairline,
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <Avatar name={c.name} uri={c.photoUrl} size={44} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: type.body, fontWeight: '600', color: t.ink }}>{c.name}</Text>
              <Text style={{ fontSize: type.caption, color: t.inkSlate, marginTop: 2 }}>{whyAllowed(c)}</Text>
            </View>
            <Text style={{ fontSize: type.meta, fontWeight: '600', color: t.blueDeep }}>{tr('Ask')}</Text>
          </Pressable>
        ))
      )}
    </Card>
  );
}
