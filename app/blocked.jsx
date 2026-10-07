// Blocked people — view and undo blocks (UGC 1.2; on the server since HARD-106). Reached from
// Profile → Blocked people. Unblocking only removes the hiding; it never
// re-creates a friendship that was ended when the block was made.
//
// Rulebook pass 2026-07-27: loading/error branches (a failed read must never
// claim the safety blocks are gone), and a verb-labelled confirm on unblock —
// one silent tap was letting a blocked harasser reappear instantly.
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Text, View } from 'react-native';
import ActionChip from '../src/components/ui/ActionChip';
import Avatar from '../src/components/ui/Avatar';
import Card from '../src/components/ui/Card';
import LoadError from '../src/components/ui/LoadError';
import Screen from '../src/components/ui/Screen';
import SkeletonCard from '../src/components/ui/Skeleton';
import { useAuth } from '../src/context/AuthContext';
import { useConfirm } from '../src/context/ConfirmContext';
import { useToast } from '../src/context/ToastContext';
import { getBlocked, unblockUser } from '../src/lib/blockList';
import { useTheme } from '../src/theme/ThemeContext';
import { tr } from '../src/i18n';

export default function BlockedPeople() {
  const { t, spacing, text } = useTheme();
  // The list is this account's, never the phone's — see src/lib/blockList.js.
  const { user } = useAuth();
  const { showToast } = useToast();
  const confirm = useConfirm();
  const queryClient = useQueryClient();

  const { data: blocked, isLoading, isError, refetch } = useQuery({
    queryKey: ['block-list', user?.userId],
    queryFn: () => getBlocked(user?.userId),
  });
  const list = blocked ?? [];

  const doUnblock = async (person) => {
    try {
      await unblockUser(user?.userId, person.id);
      queryClient.invalidateQueries({ queryKey: ['block-list'] });
      showToast(person.name ? tr('{value} can appear again.', { value: person.name }) : tr('They can appear again.'), 'info');
    } catch {
      // The server did not agree, so the block stands: say so, never pretend.
      showToast(tr('Could not unblock right now. Please try again.'), 'error');
    }
  };

  // Unblocking someone blocked for a reason is consequential — confirm with
  // verbs, never Yes/No (rulebook).
  const confirmUnblock = async (person) => {
    const ok = await confirm({
      title: tr('Unblock {value}?', { value: person.name || tr('this person') }),
      message: tr('Their profile, requests, and messages can appear for you again.'),
      cancelLabel: tr('Keep blocked'),
      confirmLabel: tr('Unblock'),
    });
    if (ok) doUnblock(person);
  };

  return (
    <Screen back title={tr('Blocked people')} onRefresh={refetch}>
      {isLoading ? (
        <SkeletonCard lines={2} />
      ) : isError ? (
        // Never claim the block list is empty when it merely failed to load.
        <LoadError what={tr('your blocked list')} onRetry={refetch} />
      ) : list.length === 0 ? (
        <Card>
          <Text style={{ fontSize: text.base, lineHeight: 27, color: t.inkSlate }}>
            {tr('You haven\'t blocked anyone. If someone ever makes you uncomfortable, open their profile and choose "Block this person". Their requests and messages will disappear for you.')}
          </Text>
        </Card>
      ) : (
        <Card contentStyle={{ paddingVertical: 8 }}>
          {list.map((person, i) => (
            <View
              key={person.id}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing[3],
                paddingVertical: spacing[3],
                borderTopWidth: i === 0 ? 0 : 1,
                borderTopColor: t.hairline,
              }}
            >
              <Avatar name={person.name} size={44} />
              <Text style={{ flex: 1, fontSize: text.base, color: t.ink }}>
                {person.name || tr('Someone')}
              </Text>
              <ActionChip
                label={tr('Unblock')}
                onPress={() => confirmUnblock(person)}
              />
            </View>
          ))}
        </Card>
      )}
    </Screen>
  );
}
