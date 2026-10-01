// The elder's moves on one family member: open the private chat, make them the
// main contact, remove them. They lived under each My Family row; owner call
// 2026-09-25 moved them to the member's own page. Copy, toasts and query
// refreshes are the screen's, unchanged.
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { makePrimaryFamilyContact, openFamilyChat, removeFamilyLink } from '../api/family';
import { useConfirm } from '../context/ConfirmContext';
import { useToast } from '../context/ToastContext';

/**
 * Family-member actions for an elder.
 * @returns {{
 *   openChat: (link: {otherUserId: string}) => void,
 *   makePrimary: (linkId: string) => void,
 *   confirmRemove: (link: {id: string, otherUserName: string}, onDone?: () => void) => Promise<void>,
 *   chatOpening: boolean, promoting: boolean, removing: boolean,
 * }}
 */
export default function useFamilyMemberActions() {
  const { showToast } = useToast();
  const confirm = useConfirm();
  const queryClient = useQueryClient();
  const router = useRouter();

  // Revoking an ACTIVE link may drop the family trust point — refetch score.
  const remove = useMutation({
    mutationFn: (id) => removeFamilyLink(id),
    onSuccess: () => {
      showToast('Removed from your family.', 'success');
      queryClient.invalidateQueries({ queryKey: ['family-links'] });
      queryClient.invalidateQueries({ queryKey: ['trust-my-score'] });
    },
    onError: (err) =>
      showToast(err?.response?.data?.message || 'Could not remove them. Please try again.', 'error'),
  });

  const makePrimary = useMutation({
    mutationFn: (id) => makePrimaryFamilyContact(id),
    onSuccess: () => {
      showToast('Main contact updated.', 'success');
      queryClient.invalidateQueries({ queryKey: ['family-links'] });
    },
    onError: (err) =>
      showToast(
        err?.response?.data?.message || 'Could not change your main contact. Please try again.',
        'error'
      ),
  });

  // Open (or reopen) the private chat with a family member (FAM-510). The
  // family link is the only permission; the server checks it and returns the
  // conversation to open.
  const chat = useMutation({
    mutationFn: (l) => openFamilyChat(l.otherUserId),
    onSuccess: (chatConnectionId) => {
      queryClient.invalidateQueries({ queryKey: ['connections'] });
      router.push(`/chat/${chatConnectionId}`);
    },
    onError: (err) =>
      showToast(err?.response?.data?.message || 'Could not open the chat. Please try again.', 'error'),
  });

  // The shared confirm dialog with the web's exact danger message — removing
  // must spell out what the person loses (HCI 5). `onDone` runs once removed.
  const confirmRemove = async (link, onDone) => {
    const ok = await confirm({
      title: `Remove ${link.otherUserName} from your family?`,
      message:
        "They will no longer see that you're safe or any friendship you shared. If they're your last family member here, your family trust point goes too. You can add them again later. They would need to accept again.",
      cancelLabel: 'Keep',
      confirmLabel: 'Remove from family',
      destructive: true,
    });
    if (ok) remove.mutate(link.id, { onSuccess: onDone });
  };

  return {
    openChat: (link) => chat.mutate(link),
    makePrimary: (linkId) => makePrimary.mutate(linkId),
    confirmRemove,
    chatOpening: chat.isPending,
    promoting: makePrimary.isPending,
    removing: remove.isPending,
  };
}
