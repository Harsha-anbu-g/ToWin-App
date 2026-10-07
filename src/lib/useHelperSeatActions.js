// The elder's moves on a helper's trust ladder: Start the next step, Take a
// break, Resume. Shared by the My Helpers list (Resume on a paused card) and
// the helper's own page (owner call 2026-09-25: a name opens a page, not a
// dropdown). Wording, toasts and query refreshes are the panel's, unchanged.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { friendlyWriteError } from '../api/client';
import { listMyConnections } from '../api/connections';
import { confirmTrustStep, pauseTrustSteps, resumeTrustSteps } from '../api/trust';
import { useAuth } from '../context/AuthContext';
import { useConfirm } from '../context/ConfirmContext';
import { useToast } from '../context/ToastContext';
import { markSeen } from './seenIds';
import { seenKey } from './storageKeys';
import { TRUST_STEPS_CATEGORY, stepNewsToken } from './trustStepBadges';
import { tr } from '../i18n';

/**
 * Trust-step actions for an elder looking at their helpers.
 * @returns {{
 *   startStep: (card: {connectionId: string, customerName: string}) => Promise<void>,
 *   takeBreak: (card: {connectionId: string, customerName: string}, onDone?: () => void) => Promise<void>,
 *   resume: import('@tanstack/react-query').UseMutationResult,
 * }}
 */
export default function useHelperSeatActions() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const askConfirm = useConfirm();
  const queryClient = useQueryClient();
  const { data: connections } = useQuery({
    queryKey: ['connections'],
    queryFn: listMyConnections,
  });
  const connOf = (id) => (connections ?? []).find((c) => c.id === id);
  const stepSeenKey = seenKey(user?.userId, TRUST_STEPS_CATEGORY);

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['trust-my-score'] });
    queryClient.invalidateQueries({ queryKey: ['connections'] });
  };

  const confirm = useMutation({
    mutationFn: confirmTrustStep,
    onSuccess: (_r, connectionId) => {
      const c = connOf(connectionId);
      showToast(
        c && !c.confirmedByOther
          ? tr('Step confirmed. Waiting for {otherUserName} to agree too.', { otherUserName: c.otherUserName })
          : tr('You both agreed. One step up the ladder!'),
        'success'
      );
      // Starting the next step is the elder's move: the news badge for this
      // ladder is done with (trustStepBadges.js, isStepNewsPending).
      if (c) markSeen(stepSeenKey, [stepNewsToken(c)]);
      refresh();
    },
    onError: (err) =>
      showToast(friendlyWriteError(err, tr('Could not confirm right now. Please try again.')), 'error'),
  });

  const resume = useMutation({
    mutationFn: resumeTrustSteps,
    onSuccess: () => {
      showToast(tr('Welcome back. Trust steps and messages are on again.'), 'success');
      refresh();
    },
    onError: (err) =>
      showToast(friendlyWriteError(err, tr('Could not resume right now. Please try again.')), 'error'),
  });

  // Pausing is reversible on the same connection id, so the way back rides in
  // the toast (rulebook: undo over confirmation).
  const pause = useMutation({
    mutationFn: pauseTrustSteps,
    onSuccess: (_r, connectionId) => {
      showToast(tr('Paused. You can resume any time.'), 'info', {
        actionLabel: tr('Undo'),
        onAction: () => resume.mutate(connectionId),
      });
      refresh();
    },
    onError: (err) =>
      showToast(friendlyWriteError(err, tr('Could not pause right now. Please try again.')), 'error'),
  });

  /** Asks, then starts the next trust step (only the elder can begin one). */
  const startStep = async (card) => {
    const ok = await askConfirm({
      title: tr('Start the next step?'),
      message: tr('Trust grows only when BOTH of you agree. {customerName} will get a tap to accept.', { customerName: card.customerName }),
      cancelLabel: tr('Not yet'),
      confirmLabel: tr('Start'),
    });
    if (ok) confirm.mutate(card.connectionId);
  };

  /** Asks first (a mis-tap silences a friendship), then pauses; `onDone` runs once paused. */
  const takeBreak = async (card, onDone) => {
    const ok = await askConfirm({
      title: tr('Take a break?'),
      message: tr('Trust steps and messages with {customerName} pause until either of you resumes. Nothing is lost.', { customerName: card.customerName }),
      cancelLabel: tr('Not now'),
      confirmLabel: tr('Take a break'),
    });
    if (ok) pause.mutate(card.connectionId, { onSuccess: onDone });
  };

  return { startStep, takeBreak, resume };
}
