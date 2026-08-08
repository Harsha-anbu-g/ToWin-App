// "Send me a copy of my data", made real.
//
// GET /account/export returns everything Towinly holds about a person IN THE
// RESPONSE BODY (ToWin/backend AccountService.exportUserData). Nothing anywhere
// sends it on by email. profile.jsx used to await that call, discard the body
// and toast "check your email", so a person asked for her information and
// nothing ever arrived (audit finding V2). This module is the answer: it turns
// the body into something she can read and hands it to her.
//
// Plain text, for the same reason the Pass On sheet is plain text: it opens on
// any machine, in any year, with nothing installed, and it has to outlive this
// app. The person reading it is an elder, not a developer, so the headings are
// the words she would use and the fields are spelled out rather than left in
// the shapes a database uses.
//
// Nothing is filtered. The sections below are named where a name is known, and
// anything the server sends that this file has never heard of is still written
// out under the server's own name for it. A hand-written whitelist would
// quietly lose whatever the backend adds next, which is the same bug again.
import { Platform, Share } from 'react-native';
import { onDayInFull } from './passOnLocks';

/** Windows Notepad still shows a bare \n as one long line. This one wraps. */
const NEWLINE = '\r\n';

export const MY_DATA = {
  fileName: 'Towinly - my information.txt',

  title: 'Your Towinly information',

  lead:
    'This is everything Towinly holds about you on the day it was made. Keep it somewhere '
    + 'safe. Towinly does not keep a copy of this file for you.',

  /** A section the server sent with nothing in it. Said out loud, never left blank. */
  nothingHere: 'Nothing here.',

  /** A field the server sent with no value. Shown, never hidden. */
  noValue: '(nothing)',

  /**
   * The one sentence that stops this file being a false promise.
   *
   * The export emits sealed items as metadata only, on purpose: the endpoint is
   * authenticated by the token alone and never asks for the password, so if it
   * carried readable contents then whoever took over a mailbox would be one
   * download away from an elder's bank details. That is a good decision, and it
   * means the file genuinely cannot contain what she most wants to keep. She is
   * told so, in the place she would look for it.
   */
  sealedBoxNote:
    'What is inside these is not in this file. Towinly locks your Sealed box with your '
    + 'password and cannot read it, so it cannot copy it out for you. To keep what is inside, '
    + 'open your Sealed box and save each thing yourself.',

  /** What actually happened, on each of the three paths that can happen. */
  saved: 'Saved. Your copy of your information is in your downloads.',
  shared: 'Your copy is ready. Choose where to keep it.',
  failed: 'We could not make your copy. Please try again.',
};

/** Her file, named so she can find it again in a year. */
export function myDataFileName() {
  return MY_DATA.fileName;
}

/**
 * Everything the server sent, as text she can read.
 *
 * @param {object} body the /account/export response body
 * @param {{madeOn?: string}} [options] the day on the file, for a stable test
 * @returns {string}
 */
export function myDataAsText(body, { madeOn } = {}) {
  // An empty body means the call failed quietly or the caller threw the answer
  // away. Handing over a blank file would repeat the exact defect this fixes.
  if (!body || typeof body !== 'object' || Object.keys(body).length === 0) {
    throw new Error('Nothing to copy: /account/export returned no data.');
  }

  const day = onDayInFull(madeOn || new Date().toISOString());
  const lines = [MY_DATA.title, `Made on ${day}.`, '', MY_DATA.lead];

  Object.entries(body).forEach(([key, value]) => {
    lines.push('', HEADINGS[key] || key);
    sectionLines(value).forEach((line) => lines.push(line));
    if (key === 'sealedBoxItems') lines.push(MY_DATA.sealedBoxNote);
  });

  lines.push('');
  return lines.join(NEWLINE);
}

/**
 * Hands her the copy. The web build downloads it; on a phone it goes out
 * through the system share sheet, so she chooses the drawer (Files, mail,
 * AirDrop). Exactly what app/pass-on/sheet.jsx does with her Pass On sheet,
 * because there is one right answer to "give this person a file" per platform.
 *
 * @returns {Promise<'saved'|'shared'|'dismissed'>} what actually happened, so
 *   the caller can say it rather than guess.
 */
export async function saveMyDataCopy(body, { madeOn } = {}) {
  const text = myDataAsText(body, { madeOn });

  if (Platform.OS === 'web') {
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = myDataFileName();
    link.click();
    URL.revokeObjectURL(url);
    return 'saved';
  }

  const shared = await Share.share(
    { message: text, title: myDataFileName() },
    { subject: myDataFileName() }
  );
  // She closed the share sheet without keeping it anywhere. That is a change of
  // mind, not a save, and telling her it worked would be the old lie in a
  // smaller font.
  return shared?.action === Share.dismissedAction ? 'dismissed' : 'shared';
}

/**
 * The server's key names, in her words. Anything absent from this map is still
 * written out under the server's own name rather than dropped.
 */
const HEADINGS = {
  account: 'Your account',
  elderProfile: 'Your profile',
  helperProfile: 'Your helper profile',
  needsPosted: 'The help you asked for',
  reviewsGiven: 'Reviews you wrote',
  reviewsReceived: 'Reviews people wrote about you',
  emergencyContacts: 'Your emergency contacts',
  connections: 'Your connections',
  familyLinks: 'Your family',
  familyAlerts: 'What your family was told',
  delegatedPowers: 'What your family can do for you',
  powerRequests: 'What your family asked to do',
  passOnItems: 'Your stories and letters',
  sealedBoxItems: 'What is in your Sealed box',
  sealedBoxKeyholders: 'Your Keyholders',
  sealedBoxSettings: 'Your Sealed box settings',
  sealedBoxOpens: 'Who opened your Sealed box',
};

/** One section: a list of things, a single thing, or a plain value. */
function sectionLines(value) {
  if (Array.isArray(value)) {
    if (value.length === 0) return [MY_DATA.nothingHere];
    return value.flatMap(entryLines);
  }
  if (value && typeof value === 'object') return fieldLines(value, '- ', '  ');
  return [`- ${fieldValue(value)}`];
}

/** One thing in a list: its first field carries the bullet, the rest line up under it. */
function entryLines(entry) {
  if (entry && typeof entry === 'object') return fieldLines(entry, '- ', '  ');
  return [`- ${fieldValue(entry)}`];
}

function fieldLines(object, firstPrefix, restPrefix) {
  return Object.entries(object).map(
    ([key, value], i) =>
      `${i === 0 ? firstPrefix : restPrefix}${fieldLabel(key)}: ${fieldValue(value)}`
  );
}

/** "dateOfBirth" reads as "Date of birth" to somebody who has never seen code. */
function fieldLabel(key) {
  const spaced = key.replace(/([a-z0-9])([A-Z])/g, '$1 $2').toLowerCase();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

/** Missing is said out loud. Nothing is silently skipped. */
function fieldValue(value) {
  if (value === null || value === undefined || value === '') return MY_DATA.noValue;
  if (Array.isArray(value)) {
    return value.length === 0 ? MY_DATA.noValue : value.map(fieldValue).join(', ');
  }
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}
