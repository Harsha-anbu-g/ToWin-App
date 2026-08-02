// Blocked people — view and undo device-side blocks (UGC 1.2). Reached from
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
import { useConfirm } from '../src/context/ConfirmContext';
import { useToast } from '../src/context/ToastContext';
import { getBlocked, unblockUser } from '../src/lib/blockList';
import { useTheme } from '../src/theme/ThemeContext';

export default function BlockedPeople() {
  const { t, spacing, text } = useTheme();
  const { showToast } = useToast();
  const confirm = useConfirm();
  const queryClient = useQueryClient();

  const { data: blocked, isLoading, isError, refetch } = useQuery({
    queryKey: ['block-list'],
    queryFn: getBlocked,
  });
  const list = blocked ?? [];

  const doUnblock = async (person) => {
    await unblockUser(person.id);
    queryClient.invalidateQueries({ queryKey: ['block-list'] });
    showToast(`${person.name || 'They'} can appear again.`, 'info');
  };

  // Unblocking someone blocked for a reason is consequential — confirm with
  // verbs, never Yes/No (rulebook).
  const confirmUnblock = async (person) => {
    const ok = await confirm({
      title: `Unblock ${person.name || 'this person'}?`,
      message: 'Their profile, requests, and messages can appear for you again.',
      cancelLabel: 'Keep blocked',
      confirmLabel: 'Unblock',
    });
    if (ok) doUnblock(person);
  };

  return (
    <Screen back title="Blocked people">
      {isLoading ? (
        <SkeletonCard lines={2} />
      ) : isError ? (
        // Never claim the block list is empty when it merely failed to load.
        <LoadError what="your blocked list" onRetry={refetch} />
      ) : list.length === 0 ? (
        <Card>
          <Text style={{ fontSize: text.base, lineHeight: 27, color: t.inkSlate }}>
            You haven't blocked anyone. If someone ever makes you uncomfortable, open their
            profile and choose "Block this person" — their requests and messages will
            disappear for you.
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
                {person.name || 'Someone'}
              </Text>
              <ActionChip
                label="Unblock"
                onPress={() => confirmUnblock(person)}
              />
            </View>
          ))}
        </Card>
      )}
    </Screen>
  );
}
