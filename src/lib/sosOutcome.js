// What to tell someone after they press SOS, built from the plain facts the
// server returns: how many emergency contacts were texted, out of how many, and
// whether family can see the alert. These sentences never claim more than that.
// A text counts once it was sent; nobody here knows whether it was read.
// Same sentences and rules as the website (frontend/src/lib/sosOutcome.js).
//
// Everything here fails closed. An answer that cannot be read is never reported
// as sent, and the instruction to pick up the phone is never replaced by words
// from somewhere else.
import { tr } from '../i18n';

// Long enough to read three short sentences twice. The default toast is gone
// in four seconds, which is no time at all for the one message that matters.
export const SOS_NOTICE_MS = 15000;

// The server's sentence for a second press is two short lines. Anything far
// longer than that is not that sentence.
const MAX_SERVER_WORDS = 200;

const CALL_YOUR_CONTACTS = () => tr('Failed to send SOS. Please call your contacts directly.');
const NOBODY_ON_FILE = () =>
  tr('You have no emergency contacts yet, so no one was alerted. Please call your local emergency number.');

// A count is a whole number, zero or more, exactly as our server writes it.
const count = (value) => (Number.isInteger(value) && value >= 0 ? value : null);

// The facts as our server states them, or null for any answer that is not one
// of ours. A wifi sign-in page answers 200 with a page of HTML (the case
// app/emergency-contacts.jsx already guards its list against); an older server
// answered with nothing at all. Neither is an SOS that is known to have gone out.
function readFacts(data) {
  if (!data || typeof data !== 'object') return null;
  const sent = count(data.contactsTexted);
  const total = count(data.contactsTotal);
  if (sent === null || total === null) return null;
  return { sent, total, family: data.familyAlerted === true };
}

const reachedNoOne = (total) => (total === 0 ? NOBODY_ON_FILE() : CALL_YOUR_CONTACTS());

/**
 * The sentence for an SOS the server accepted.
 * @param {{contactsTexted: number, contactsTotal: number, familyAlerted: boolean} | undefined} outcome
 *   what sendSos() resolved with
 * @returns {{ok: boolean, text: string}} ok only when every emergency contact was texted
 */
export function sosSentMessage(outcome) {
  const facts = readFacts(outcome);
  if (!facts) return { ok: false, text: CALL_YOUR_CONTACTS() };
  const { sent, total, family } = facts;
  if (total > 0 && sent >= total) return { ok: true, text: tr('SOS sent to all emergency contacts.') };
  if (sent > 0) {
    return {
      ok: false,
      text: tr('SOS sent to {sent} of your {total} emergency contacts. Call them to be sure.', { sent, total }),
    };
  }
  if (family) {
    return {
      ok: false,
      text: tr('Your family will see your alert in Towinly. No text message was sent. If it is urgent, call them now.'),
    };
  }
  return { ok: false, text: reachedNoOne(total) };
}

/**
 * The sentence for an SOS that reached no one, was refused, or never arrived.
 * @param error the rejected axios error
 * @returns {string}
 */
export function sosFailedMessage(error) {
  const response = error?.response;
  const facts = readFacts(response?.data);
  if (facts) return reachedNoOne(facts.total);
  // A second press within a minute (429) is answered in the server's own words,
  // which say the first alert went out. No other answer gets to replace ours.
  const words = response?.data?.message;
  if (response?.status === 429 && typeof words === 'string' && words.trim()) {
    return words.trim().slice(0, MAX_SERVER_WORDS);
  }
  return CALL_YOUR_CONTACTS();
}
