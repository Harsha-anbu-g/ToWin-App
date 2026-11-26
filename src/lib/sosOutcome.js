// What to tell someone after they press SOS, built from the plain facts the
// server returns: how many emergency contacts were texted, out of how many, and
// whether family can see the alert. These sentences never claim more than that.
// A text counts once it was sent; nobody here knows whether it was read.
// Same sentences as the website (frontend/src/lib/sosOutcome.js).
import { tr } from '../i18n';

// Long enough to read three short sentences twice. The default toast is gone
// in four seconds, which is no time at all for the one message that matters.
export const SOS_NOTICE_MS = 15000;

const CALL_YOUR_CONTACTS = () => tr('Failed to send SOS. Please call your contacts directly.');

// The facts are present only on answers from a server that reports them.
const hasFacts = (data) => !!data && typeof data === 'object' && typeof data.contactsTotal === 'number';

/**
 * The sentence for an SOS the server accepted.
 * @param {{contactsTexted: number, contactsTotal: number, familyAlerted: boolean} | undefined} outcome
 *   what sendSos() resolved with
 * @returns {{ok: boolean, text: string}} ok only when every emergency contact was texted
 */
export function sosSentMessage(outcome) {
  // An older server answers with no body. "Sent" is all it ever said.
  if (!hasFacts(outcome)) return { ok: true, text: tr('SOS sent to all emergency contacts.') };
  const sent = outcome.contactsTexted;
  const total = outcome.contactsTotal;
  if (total > 0 && sent >= total) return { ok: true, text: tr('SOS sent to all emergency contacts.') };
  if (sent > 0) {
    return {
      ok: false,
      text: tr('SOS sent to {sent} of your {total} emergency contacts. Call them to be sure.', { sent, total }),
    };
  }
  if (outcome.familyAlerted) {
    return {
      ok: false,
      text: tr('Your family will see your alert in Towinly. No text message was sent. If it is urgent, call them now.'),
    };
  }
  return { ok: false, text: CALL_YOUR_CONTACTS() };
}

/**
 * The sentence for an SOS that reached no one, was refused, or never arrived.
 * @param error the rejected axios error
 * @returns {string}
 */
export function sosFailedMessage(error) {
  const data = error?.response?.data;
  if (hasFacts(data)) {
    return data.contactsTotal === 0
      ? tr('You have no emergency contacts yet, so no one was alerted. Please call your local emergency number.')
      : CALL_YOUR_CONTACTS();
  }
  // The server's own words when it has some (a second press within a minute).
  return data?.message || CALL_YOUR_CONTACTS();
}
