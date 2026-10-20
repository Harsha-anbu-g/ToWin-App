// The actions Ask AI may propose (AI steps 7 and 8). The model never writes:
// the backend hands the app {name, arguments}, the person confirms with the
// native dialog, and the app's own named API function does the work (Rule 6).
// Anything not listed here is ignored, however the model phrases it.
import { tr } from '../i18n';
import { checkInToday } from '../api/streaks';
import { postHelpRequest } from '../api/needs';
import { objectionableError } from './contentFilter';

// The allowlist is an array, never an object lookup: a category named like an
// inherited property ("constructor") must not pass. Literal tr() calls, so the
// i18n coverage test can see every word.
const CATEGORIES = ['TRANSPORTATION', 'CLEANING', 'COMPANIONSHIP', 'ERRANDS', 'OTHER'];
const categoryWord = (category) => {
  switch (category) {
    case 'TRANSPORTATION':
      return tr('Transport');
    case 'CLEANING':
      return tr('Cleaning');
    case 'COMPANIONSHIP':
      return tr('Company');
    case 'ERRANDS':
      return tr('Errands');
    default:
      return tr('Other');
  }
};

// One cap for what is shown AND what is sent, so nothing the person could not
// read is ever posted. Short and single-line, so model text cannot restate what
// Yes does. Longer requests belong on the Post Request screen.
const TITLE_MAX = 80;
const DESCRIPTION_MAX = 200;

const oneLine = (value, max) => String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, max);

/** One normalized request, used for both the dialog and the call, so they can never differ. */
function shapeRequest(a) {
  const description = oneLine(a.description, DESCRIPTION_MAX);
  return {
    title: oneLine(a.title, TITLE_MAX),
    description: description || null,
    category: CATEGORIES.includes(a.category) ? a.category : 'OTHER',
    urgency: a.urgency === 'URGENT' ? 'URGENT' : 'NORMAL',
  };
}

/** Thrown by an action that refuses to act; carries its own sentence. */
class Refused extends Error {
  constructor(sentence) {
    super('refused');
    this.sentence = sentence;
  }
}

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
    // A fixed app-authored line first; the model's words are shown as data after it.
    message: (a) => {
      const r = shapeRequest(a);
      return [
        tr('The helper wants to post this request for you:'),
        r.title,
        r.description,
        categoryWord(r.category) + (r.urgency === 'URGENT' ? ' · ' + tr('Urgent') : ''),
      ]
        .filter(Boolean)
        .join('\n');
    },
    confirmLabel: () => tr('Yes, post it'),
    // The same gate the Post Request screen runs before a human post. Checked
    // before the dialog (validate) and again before the call (run).
    validate: (a) => {
      const r = shapeRequest(a);
      if (!r.title || objectionableError(r.title) || (r.description && objectionableError(r.description))) {
        return tr("That wording can't be posted. Please use Post Request.");
      }
      return null;
    },
    run: async (a) => {
      const r = shapeRequest(a);
      const refusal = ACTIONS.postHelpRequest.validate(a);
      if (refusal) throw new Refused(refusal);
      return postHelpRequest(r);
    },
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
  // Refuse before the person is even asked: nothing objectionable is rendered.
  const refusal = entry.validate ? entry.validate(args) : null;
  if (refusal) return refusal;
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
  } catch (e) {
    return e instanceof Refused ? e.sentence : entry.failed();
  }
}
