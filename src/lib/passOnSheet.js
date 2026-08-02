// The elder's saved one-page copy, as one structure that both the screen and
// the file are drawn from (web passOnSheet.js parity).
//
// One description of the content, two renderings derived from it — two written
// separately would eventually disagree, and the disagreement would be
// invisible until a family found the file short of something she was shown.
//
// There is nothing secret in this file, enforced by what it is given: the
// server builds the sheet on the list that unwraps sealed-item names and never
// their contents. `itemLines` takes the label and the chip and drops
// everything else on the object.
//
// Digital only. There is no print path anywhere in this feature.
import { SEALED_KINDS, SETUP, SHEET, keyholderLine, onDayInFull } from './passOnLocks';

/** Windows Notepad still shows a bare \n as one long line. This is a keepsake; it wraps. */
const NEWLINE = '\r\n';

/** Anything a file system would read as a path, or refuse outright. */
const NOT_IN_A_FILE_NAME = /[\\/:*?"<>|]/g;

/**
 * Builds the saved copy from what the server sent (the /passon/sheet payload).
 * @returns {{title: string, madeOn: string, sections: object[], closing: string}}
 */
export function buildSheet({
  ownerName,
  preparedAt,
  items = [],
  keyholders = [],
  approvalsNeeded,
  keyholderTarget,
  releaseContactEmail,
}) {
  const name = ownerName || '';

  return {
    title: SHEET.title(name),
    madeOn: SHEET.madeOn(onDayInFull(preparedAt)),
    sections: [
      {
        heading: SHEET.inTheBox.heading,
        blurb: SHEET.inTheBox.blurb,
        lines: itemLines(items),
        empty: SHEET.inTheBox.empty,
      },
      {
        heading: SHEET.whoCanOpen.heading,
        // Left out entirely until she has chosen — an invented threshold on a
        // page about her death is the one thing this must never contain.
        blurb:
          approvalsNeeded && keyholderTarget
            ? SETUP.settled.threshold(approvalsNeeded, keyholderTarget)
            : null,
        lines: keyholderLines(keyholders),
        empty: SHEET.whoCanOpen.empty,
      },
      {
        heading: SHEET.howToAsk.heading,
        // The address is the server's, or there is none and the page says so.
        // Nothing here may substitute a placeholder.
        blurb: SHEET.howToAsk.writeTo(releaseContactEmail),
        listLead: SHEET.howToAsk.askedFor,
        lines: SHEET.howToAsk.steps(name),
        note: SHEET.howToAsk.thenWhat,
      },
    ],
    closing: SHEET.closing,
  };
}

/**
 * The same copy as plain text, which is what she keeps. Plain text on purpose:
 * it opens on any machine, in any year, with nothing installed, and it has to
 * outlive this app.
 */
export function sheetAsText(sheet) {
  const lines = [sheet.title, sheet.madeOn];

  sheet.sections.forEach((section) => {
    lines.push('', section.heading);
    if (section.blurb) lines.push(section.blurb);
    if (section.lines.length === 0 && section.empty) {
      lines.push(section.empty);
      return;
    }
    if (section.listLead) lines.push(section.listLead);
    section.lines.forEach((line) => lines.push(`- ${line}`));
    if (section.note) lines.push(section.note);
  });

  lines.push('', sheet.closing, '');
  return lines.join(NEWLINE);
}

/** Her name is in the file name — it is what somebody looking for it would search for. */
export function sheetFileName(ownerName) {
  const safe = (ownerName || '').replace(NOT_IN_A_FILE_NAME, '').trim();
  return `Towinly - what ${safe} passes on.txt`;
}

/** "Where the money is — Money". The name she gave it, then its chip, nothing else. */
function itemLines(items) {
  return (items || []).map((item) =>
    SHEET.inTheBox.line(item.label, SEALED_KINDS[item.kindHint] || SEALED_KINDS.OTHER)
  );
}

/**
 * The people who can ask, in their real state. A key she took back herself is
 * dropped, exactly as on her own screen; every other ending stays, because her
 * family need to see that the number has moved.
 */
function keyholderLines(keyholders) {
  return (keyholders || []).filter((person) => person.status !== 'REMOVED').map(keyholderLine);
}
