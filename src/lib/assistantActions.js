// The actions Ask AI may propose (AI steps 7 and 8). The model never writes:
// the backend hands the app {name, arguments}, the person confirms with the
// native dialog, and the app's own named API function does the work (Rule 6).
// Anything not listed here is ignored, however the model phrases it.
import { tr } from '../i18n';
import { checkInToday } from '../api/streaks';
import { postHelpRequest } from '../api/needs';

// Literal tr() calls, so the i18n coverage test can see every word.
const CATEGORY_WORDS = {
  TRANSPORTATION: () => tr('Transport'),
  CLEANING: () => tr('Cleaning'),
  COMPANIONSHIP: () => tr('Company'),
  ERRANDS: () => tr('Errands'),
  OTHER: () => tr('Other'),
};

const ACTIONS = {
  checkInToday: {
    title: () => tr('Check in today?'),
    message: () => tr('The helper suggests marking you as here today. Your family will see it.'),
    confirmLabel: () => tr('Yes, check in'),
    run: () => checkInToday(),
    done: () => tr('Done. You are checked in for today.'),
    failed: () => tr('Could not check in. Please use the check-in screen.'),
  },
  postHelpRequest: {
    title: () => tr('Post this request?'),
    message: (a) =>
      [
        a.title,
        a.description,
        (CATEGORY_WORDS[a.category] ?? CATEGORY_WORDS.OTHER)() + (a.urgency === 'URGENT' ? ' · ' + tr('Urgent') : ''),
      ]
        .filter(Boolean)
        .join('\n'),
    confirmLabel: () => tr('Yes, post it'),
    run: (a) =>
      postHelpRequest({
        title: a.title,
        description: a.description ?? null,
        category: a.category ?? 'OTHER',
        urgency: a.urgency ?? 'NORMAL',
      }),
    done: () => tr('Done. Your request is posted. Helpers nearby can see it now.'),
    failed: () => tr('Could not post the request. Please use Post Request.'),
  },
};

/**
 * Offer one proposed action: confirm natively, then call the app's own function.
 * @param {{name: string, arguments?: object}|null} action what the helper proposed
 * @param {{confirm: Function}} deps the native confirm from ConfirmContext
 * @returns {Promise<string|null>} the sentence to show, or null when ignored or declined
 */
export async function runAssistantAction(action, { confirm }) {
  const entry = action && ACTIONS[action.name];
  if (!entry) return null;
  const args = action.arguments ?? {};
  const ok = await confirm({
    title: entry.title(args),
    message: entry.message(args),
    cancelLabel: tr('Not now'),
    confirmLabel: entry.confirmLabel(args),
  });
  if (!ok) return null;
  try {
    await entry.run(args);
    return entry.done();
  } catch {
    return entry.failed();
  }
}
