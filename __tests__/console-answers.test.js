/**
 * Guards the console answers sheet, and especially the App Review notes block
 * inside it.
 *
 * That block is the one piece of store metadata that describes the running app
 * to a human who will then try to disprove it. Everything it claims is
 * checkable inside the build in under a minute, so a claim that drifts away
 * from the code is worse than no claim: an overstated moderation control or a
 * dead demo credential is a rejection, and a rejection lands after the 99 USD
 * is already spent.
 *
 * Four kinds of drift are caught here:
 *
 *  1. Length. App Store Connect truncates or refuses past 4000 characters, and
 *     nothing warns you until you are pasting.
 *  2. Credentials. The elder and helper logins live in DemoCard.jsx. If either
 *     changes, the notes silently send a reviewer to a login wall.
 *  3. Trust ladder vocabulary. The seven step names and the count come from
 *     src/lib/trustStages.js. The notes recite them to Apple verbatim.
 *  4. The content filter claim. objectionableError does NOT run on chat
 *     messages. An earlier draft of these notes told Apple it did. That exact
 *     sentence is what this file exists to keep out.
 */
const fs = require('fs');
const path = require('path');

const { SHORT_STAGES, STAGE_COUNT } = require('../src/lib/trustStages');

const DOC = path.join(__dirname, '..', 'docs', 'store', 'console-answers.md');
const DEMO_CARD = path.join(__dirname, '..', 'src', 'components', 'auth', 'DemoCard.jsx');
const CHAT_SCREEN = path.join(__dirname, '..', 'app', 'chat', '[connectionId].jsx');
const APP_JSON = path.join(__dirname, '..', 'app.json');

/** App Store Connect's App Review Notes field. */
const NOTES_LIMIT = 4000;

const EM_DASH = '—';
const EN_DASH = '–';

const doc = fs.readFileSync(DOC, 'utf8');
const demoCard = fs.readFileSync(DEMO_CARD, 'utf8');
const chatScreen = fs.readFileSync(CHAT_SCREEN, 'utf8');
const appJson = JSON.parse(fs.readFileSync(APP_JSON, 'utf8'));

/**
 * The reviewer-notes block, without its delimiters.
 *
 * Throws rather than returning null: a missing block means the paste-ready
 * text is gone, and every assertion below would otherwise pass vacuously on an
 * empty string.
 */
function reviewNotes() {
  const match = doc.match(/<!-- review-notes-v1:start -->\n([\s\S]*?)\n<!-- review-notes-v1:end -->/);
  if (!match) {
    throw new Error(
      `No review-notes-v1 block found in ${path.basename(DOC)}. ` +
        'The paste-ready reviewer notes must stay between those two comments.'
    );
  }
  return match[1];
}

/** The credential pairs DemoCard.jsx actually posts to /auth/login. */
function demoCredentialsInCode() {
  const block = demoCard.match(/const DEMO = \{([\s\S]*?)\};/);
  if (!block) throw new Error('Could not find the DEMO map in DemoCard.jsx.');
  const pairs = [...block[1].matchAll(/identifier: '([^']+)', password: '([^']+)'/g)];
  if (pairs.length === 0) throw new Error('The DEMO map in DemoCard.jsx parsed to zero credentials.');
  return pairs.map(([, identifier, password]) => ({ identifier, password }));
}

describe('console answers sheet', () => {
  const notes = reviewNotes();

  test('carries no em dash or en dash anywhere', () => {
    expect(doc).not.toContain(EM_DASH);
    expect(doc).not.toContain(EN_DASH);
  });

  test('states its own reviewer-notes character count, and states it correctly', () => {
    expect(doc).toContain(`The block below is ${notes.length},`);
  });

  test('keeps the reviewer notes inside the 4000 character field', () => {
    expect(notes.length).toBeLessThanOrEqual(NOTES_LIMIT);
  });

  test('quotes the identity that is frozen in app.json', () => {
    expect(doc).toContain(appJson.expo.ios.bundleIdentifier);
    expect(doc).toContain(appJson.expo.android.package);
    expect(doc).toContain(`version ${appJson.expo.version}`);
  });
});

describe('reviewer notes match the running app', () => {
  const notes = reviewNotes();

  test('quotes every demo credential exactly as DemoCard.jsx posts it', () => {
    for (const { identifier, password } of demoCredentialsInCode()) {
      expect(notes).toContain(`"${identifier}" / "${password}"`);
    }
  });

  test('recites the seven trust steps in the order trustStages.js defines them', () => {
    expect(notes).toContain(SHORT_STAGES.join(', '));
    expect(SHORT_STAGES).toHaveLength(STAGE_COUNT);
    expect(notes).toContain('the same seven steps');
  });

  test('states the real 7 + 5 + 3 = 15 score and never a rounder invention', () => {
    expect(notes).toContain('adds to 15 per person helped');
    expect(notes).toContain('7 for growing trust together, 5 from their review, and 3 for a filled-in profile');
  });

  test('tells the reviewer where to start', () => {
    expect(notes).toContain('START HERE');
  });

  test('explains why the app asks for photos', () => {
    expect(notes).toContain('WHY THE APP ASKS FOR PHOTOS');
    expect(notes).toContain('both optional');
  });
});

describe('the content filter claim stays true', () => {
  const notes = reviewNotes();

  test('is a fact that the chat composer does not run the write-time filter', () => {
    // If this ever fails, the app got safer and the notes may be widened to
    // match. Widen them deliberately; do not delete this test.
    expect(chatScreen).not.toContain('objectionableError');
  });

  test('never tells Apple the filter covers messages', () => {
    expect(notes).not.toMatch(/filter on posts and messages/i);
    expect(notes).not.toMatch(/content filter[^.]*\bmessages\b/i);
  });

  test('names the three surfaces the filter does cover, and says what covers messages', () => {
    expect(notes).toContain('word filter on bios, help requests and Pass On entries');
    expect(notes).toContain('Private messages rely on report and block');
  });
});
