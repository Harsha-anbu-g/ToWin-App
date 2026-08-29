// The two abuse controls, in one place, so every screen that offers them says
// the same words and runs the same writes.
//
// Apple guideline 1.2 wants the abuse path to sit with the content, so this is
// used from the profile screen AND from inside a chat thread. Two screens
// carrying two copies of these sentences is how one rule ends up explained two
// ways, and the block flow in particular is easy to get subtly wrong: it has a
// half-done state that must never be reported as success.
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';
import { ActionSheetIOS, Platform } from 'react-native';
import { friendlyWriteError } from '../api/client';
import { reportUser } from '../api/safety';
import { useConfirm } from '../context/ConfirmContext';
import { useToast } from '../context/ToastContext';
import { blockUser, unblockUser } from './blockList';

/** The reasons offered for a report. More than three, so never an Alert. */
export const REPORT_REASONS = ['Unsafe behavior', 'Harassment', 'Scam or fraud', 'Something else'];

/** The heading over the reasons, on the sheet and in the in-screen list alike. */
export const REPORT_TITLE = 'What went wrong?';

/** The two entries in the safety menu, worded as the profile screen words them. */
export const REPORT_ACTION = 'Report this person';
export const BLOCK_ACTION = 'Block this person';
export const NEVER_MIND = 'Never mind';

// The two outcomes of a block, named once. The success sentence must never be
// shown unless the server-side half really ran.
export const BLOCK_DONE = "Blocked. You won't see this person anymore.";
export const BLOCK_HALF_DONE =
  'Blocked. We could not end the friendship yet, so it may still show in Messages until you try again.';

/**
 * Report and block, wired for one person on one screen.
 *
 * @param {object} args
 * @param {string} args.personId who the actions are about
 * @param {string} args.personName their name, for the dialogs
 * @param {string} args.signedInUserId whose block list to write to
 * @param {boolean} args.connectionActive true when a live friendship has to end with the block
 * @param {function} args.endConnection awaited when connectionActive; must reject on failure
 * @param {function} [args.onBlocked] called after a block finishes, for a screen that must leave
 * @returns {object} the state and handlers a screen needs to draw the two controls
 */
export default function useSafetyActions({
  personId,
  personName,
  signedInUserId,
  connectionActive = false,
  endConnection,
  onBlocked,
}) {
  const { showToast } = useToast();
  const confirm = useConfirm();
  const queryClient = useQueryClient();
  const [reportOpen, setReportOpen] = useState(false);
  const [reportingReason, setReportingReason] = useState(null);
  const [blocking, setBlocking] = useState(false);

  const who = personName ?? 'this person';

  const sendReport = useCallback(
    async (reason) => {
      setReportingReason(reason);
      try {
        await reportUser(personId, reason);
        setReportOpen(false);
        showToast('Report sent. Thank you for keeping Towinly safe.', 'success');
      } catch (err) {
        // friendlyWriteError, not a bare sentence: the profile screen has
        // always used it here, and it is what turns a blocked or offline
        // server answer into words the person can act on.
        showToast(friendlyWriteError(err, 'Could not send the report. Please try again.'), 'error');
      } finally {
        setReportingReason(null);
      }
    },
    [personId, showToast]
  );

  // The block itself lives on the server (HARD-106): messages, requests and
  // offers across it are refused there, on every device. Ending the connection
  // is the visible half, so the row leaves Messages. Its failure is said out
  // loud with a retry rather than covered by a success sentence.
  const endConnectionForBlock = useCallback(
    async function run() {
      try {
        await endConnection();
        showToast(BLOCK_DONE, 'info');
      } catch {
        showToast(BLOCK_HALF_DONE, 'error', { actionLabel: 'Try again', onAction: run });
      }
    },
    [endConnection, showToast]
  );

  const doBlock = useCallback(async () => {
    setBlocking(true);
    try {
      await blockUser(signedInUserId, { id: personId, name: personName ?? '' });
      queryClient.invalidateQueries({ queryKey: ['block-list'] });
      if (connectionActive) await endConnectionForBlock();
      else showToast(BLOCK_DONE, 'info');
      onBlocked?.();
    } catch {
      // The device list itself would not save, so nothing was blocked at all.
      showToast('Could not block right now. Please try again.', 'error');
    } finally {
      setBlocking(false);
    }
  }, [
    connectionActive,
    endConnectionForBlock,
    onBlocked,
    personId,
    personName,
    queryClient,
    showToast,
    signedInUserId,
  ]);

  // iOS gets the system action sheet for this pick-one list (owner call
  // 2026-08-17: Apple design wherever possible). Android and web open the
  // in-screen list instead: they have no native sheet, and the rulebook
  // prefers in-place over a stacked Alert there.
  const pickReportReason = useCallback(() => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          title: REPORT_TITLE,
          options: [...REPORT_REASONS, NEVER_MIND],
          cancelButtonIndex: REPORT_REASONS.length,
        },
        (i) => {
          if (i < REPORT_REASONS.length) sendReport(REPORT_REASONS[i]);
        }
      );
      return;
    }
    setReportOpen((v) => !v);
  }, [sendReport]);

  const confirmBlock = useCallback(async () => {
    const ok = await confirm({
      title: `Block ${who}?`,
      message:
        "You won't see their help requests or messages anymore, and any friendship ends. " +
        'It follows you to every phone you sign in on. ' +
        'You can change your mind later in Profile → Blocked people.',
      confirmLabel: 'Block',
      destructive: true,
    });
    if (ok) doBlock();
  }, [confirm, doBlock, who]);

  const unblock = useCallback(async () => {
    try {
      await unblockUser(signedInUserId, personId);
      queryClient.invalidateQueries({ queryKey: ['block-list'] });
      showToast('Unblocked.', 'info');
    } catch {
      // The server did not agree, so nothing changed: say so, never pretend.
      showToast('Could not unblock right now. Please try again.', 'error');
    }
  }, [personId, queryClient, showToast, signedInUserId]);

  return {
    reportOpen,
    pickReportReason,
    closeReport: useCallback(() => setReportOpen(false), []),
    sendReport,
    reportingReason,
    reporting: reportingReason !== null,
    confirmBlock,
    blocking,
    unblock,
  };
}
