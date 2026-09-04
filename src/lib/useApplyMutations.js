// Offer-help mutations shared by the browse list. Apply is one tap (not
// destructive — no confirm, HCI rule 7); withdraw confirms at the call site.
// Extracted from the retired OpenRequestsCard home-feed card (pre-redesign).
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { friendlyWriteError } from '../api/client';
import { applyToHelpRequest, withdrawApplication } from '../api/needs';
import { useToast } from '../context/ToastContext';

export function useApplyMutations() {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['needs-open'] });
    queryClient.invalidateQueries({ queryKey: ['needs-applications'] });
  };

  const apply = useMutation({
    mutationFn: (needId) => applyToHelpRequest(needId),
    onSuccess: () => {
      showToast('Offer sent. The elder will see it right away.', 'success');
      refresh();
    },
    onError: (err) =>
      showToast(
        friendlyWriteError(err, err?.response?.data?.message || 'Could not send your offer. Please try again.'),
        'error'
      ),
  });

  const withdraw = useMutation({
    mutationFn: (needId) => withdrawApplication(needId),
    onSuccess: () => {
      showToast('Offer withdrawn.', 'success');
      refresh();
    },
    onError: (err) =>
      showToast(friendlyWriteError(err, 'Could not withdraw right now. Please try again.'), 'error'),
  });

  return { apply, withdraw };
}
