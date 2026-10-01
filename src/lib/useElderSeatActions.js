// The helper's moves on an elder's trust ladder: Accept the next step, Take a
// break, End, Resume. Shared by the My Elders list (Resume on a paused card)
// and the elder's own page (owner call 2026-09-25: a name opens a page, not a
// dropdown). Wording, toasts and query refreshes are the panel's, unchanged.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { friendlyWriteError } from '../api/client';
import { endConnection, listMyConnections } from '../api/connections';
import { confirmTrustStep, pauseTrustSteps, resumeTrustSteps } from '../api/trust';
import { useConfirm } from '../context/ConfirmContext';
import { useToast } from '../context/ToastContext';

/**
 * Trust-step actions for a helper looking at their elders.
 * @returns {{
 *   acceptStep: (conn: {id: string, otherUserName: string}) => Promise<void>,
 *   takeBreak: (conn: {id: string}, onDone?: () => void) => Promise<void>,
 *   endConnection: (conn: {id: string, otherUserName: string}, onDone?: () => void) => Promise<void>,
 *   resume: import('@tanstack/react-query').UseMutationResult,
 * }}
 */
export default function useElderSeatActions() {
  const { showToast } = useToast();
  const askConfirm = useConfirm();
  const queryClient = useQueryClient();
  const { data: connections } = useQuery({
    queryKey: ['connections'],
    queryFn: listMyConnections,
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['connections'] });
    queryClient.invalidateQueries({ queryKey: ['trust-my-score'] });
  };

  const confirm = useMutation({
    mutationFn: (connectionId) => confirmTrustStep(connectionId),
    onSuccess: (_r, connectionId) => {
      const c = (connections ?? []).find((x) => x.id === connectionId);
      showToast(
        c && !c.confirmedByOther
          ? `Step confirmed. Waiting for ${c.otherUserName} to agree too.`
          : 'You both agreed. One step up the ladder!',
        'success'
      );
      refresh();
    },
    onError: (err) =>
      showToast(friendlyWriteError(err, 'Could not confirm right now. Please try again.'), 'error'),
  });

  const end = useMutation({
    mutationFn: (connectionId) => endConnection(connectionId),
    onSuccess: () => {
      showToast('Connection ended.', 'info');
      refresh();
    },
    onError: (err) =>
      showToast(friendlyWriteError(err, 'Could not end it right now. Please try again.'), 'error'),
  });

  const resume = useMutation({
    mutationFn: (connectionId) => resumeTrustSteps(connectionId),
    onSuccess: () => {
      showToast('Welcome back. Trust steps and messages are on again.', 'success');
      refresh();
    },
    onError: (err) =>
      showToast(friendlyWriteError(err, 'Could not resume right now. Please try again.'), 'error'),
  });

  // Pausing is reversible on the same connection id, so the way back rides in
  // the toast (rulebook: undo over confirmation).
  const pause = useMutation({
    mutationFn: (connectionId) => pauseTrustSteps(connectionId),
    onSuccess: (_r, connectionId) => {
      showToast('Paused. You can resume any time.', 'info', {
        actionLabel: 'Undo',
        onAction: () => resume.mutate(connectionId),
      });
      refresh();
    },
    onError: (err) =>
      showToast(friendlyWriteError(err, 'Could not pause right now. Please try again.'), 'error'),
  });

  /** Asks, then accepts the step the elder started. */
  const acceptStep = async (conn) => {
    const ok = await askConfirm({
      title: 'Accept the next step?',
      message: `${conn.otherUserName} has asked to move one step up. Accepting climbs the ladder for both of you.`,
      cancelLabel: 'Not yet',
      confirmLabel: 'Accept',
    });
    if (ok) confirm.mutate(conn.id);
  };

  /** Asks first (a mis-tap silences a friendship), then pauses; `onDone` runs once paused. */
  const takeBreak = async (conn, onDone) => {
    const ok = await askConfirm({
      title: 'Take a break?',
      message: 'Trust steps and messages with this elder pause until either of you resumes. Nothing is lost.',
      cancelLabel: 'Not now',
      confirmLabel: 'Take a break',
    });
    if (ok) pause.mutate(conn.id, { onSuccess: onDone });
  };

  /** Asks, then ends the connection for good; `onDone` runs once it is gone. */
  const endConn = async (conn, onDone) => {
    const ok = await askConfirm({
      title: 'End this connection?',
      message: `You and ${conn.otherUserName} will no longer be connected. This cannot be undone.`,
      cancelLabel: 'Keep it',
      confirmLabel: 'End',
      destructive: true,
    });
    if (ok) end.mutate(conn.id, { onSuccess: onDone });
  };

  return { acceptStep, takeBreak, endConnection: endConn, resume };
}
