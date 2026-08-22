// The words on the Terms of Service and the Privacy Policy, in one place.
//
// Port of ToWin/frontend/src/lib/legalCopy.js (rewrite of 2026-08-02, "for a
// product that holds last words"). The standalone pages and the signup modal
// all render from this module, so the document somebody ticked a box against
// at signup and the document they look up two years later cannot drift apart.
//
// **This is a draft, and it says so on the page.** Written from what the
// software actually does; a lawyer has not been through it. Two rules held
// throughout: no country, court or statute is named anywhere, and nothing
// overclaims — every promise below is one the running system keeps.
//
// Trust-stage names read from src/lib/trustStages.js (HARD-110) so the promise
// made here and the rung shown on the card are the same word.
import { FULL_STAGES, PHONE_STAGE } from '../lib/trustStages';

/** The draft notice, visible at the top of both pages and the signup modal. */
export const DRAFT = {
  eyebrow: 'Draft: a lawyer has not checked this yet',
  body:
    'We wrote this ourselves, in plain words, from what Towinly actually does. A lawyer has '
    + 'not been through it yet. Where something is still to be decided, this page says so '
    + 'rather than guessing. When a lawyer has checked it, this notice will come off.',
  // Bumped 2026-08-16: the policy gained the Expo push processor language,
  // and a policy that changed must say so on its face.
  asOf: 'Draft of 16 August 2026',
};

/**
 * Where a person writes to Towinly.
 *
 * This used to be deployment configuration only (EXPO_PUBLIC_LEGAL_CONTACT_EMAIL,
 * which eas.json sets for both store profiles) with no fallback, on the reasoning
 * that an invented mailbox loses somebody's request in silence. The Vercel web
 * project does not set that variable, so on ONE deployment three legal pages gave
 * two different answers: /app/delete-account named an address while /app/privacy
 * and /app/terms said there was none. That was audit finding V5.
 *
 * The fallback below is not invented. It is the same mailbox eas.json already
 * ships, so the original reasoning is satisfied and every surface now resolves the
 * same way. __tests__/legal-contact-parity.test.js reads eas.json and fails if the
 * two ever disagree, and fails if a legal screen reads the variable for itself
 * instead of coming through here.
 */
export const LEGAL_CONTACT_FALLBACK = 'help@towinly.com';

export const LEGAL_CONTACT = {
  noAddressYet:
    'Towinly has not set an address to write to yet. We would rather tell you that than send '
    + 'you to a mailbox that cannot answer.',
};

/**
 * The public account-deletion page. Play Console holds this URL in the Data
 * safety form, and the privacy policy has to link to it (audit finding V7).
 *
 * It lives here rather than in deleteAccountPage.js because the privacy policy
 * quotes it, and deleteAccountPage.js already imports from this module: putting
 * it the other way round would make the two files import each other.
 */
export const DELETION_PAGE_URL = 'https://www.towinly.com/app/delete-account';

/**
 * The apex form. It works, and it is the address the brand uses everywhere else,
 * but it answers 308 and hands the browser to the www host above. Observed:
 *
 *   $ curl -sI https://towinly.com/app/delete-account
 *   HTTP/2 308   location: https://www.towinly.com/app/delete-account
 *
 * A store console gets the address that does not move. One hop fewer, and it
 * cannot be broken by a redirect rule changing on the website side. Kept here so
 * the choice is written down rather than remembered, and so a test can pin it.
 */
export const DELETION_PAGE_URL_APEX = 'https://towinly.com/app/delete-account';

/**
 * The address every legal surface writes to. A deploy that configures one wins;
 * otherwise the real mailbox above. Blank and whitespace both count as unset.
 */
export function legalContactEmail() {
  const configured = (process.env.EXPO_PUBLIC_LEGAL_CONTACT_EMAIL || '').trim();
  return configured || LEGAL_CONTACT_FALLBACK;
}

const contactSection = (h, p, email) =>
  email ? { h, p: `${p} ${email}.`, email } : { h, p };

/** The sentence every "keep your own copy" line is a version of. Said three times on purpose. */
const KEEP_YOUR_OWN_COPY =
  'Please do not let Towinly be the only place the things that matter to you are written down.';

/** @returns {{h: string, p: string, email?: string}[]} */
export function termsSections(email) {
  return [
    { h: 'What Towinly is',
      p: 'Towinly is a place where older people and helpers find each other for company, '
        + 'errands and everyday support. It also lets you write down stories, letters and '
        + 'private notes to be passed on to people you choose. By making an account, you agree '
        + 'to what is on this page.' },

    // Says the same honest thing without the words beta / prototype / trial / work in
    // progress: Apple guideline 2.2 reads those as "this belongs on TestFlight", and a
    // person ticks the agreement box directly under this paragraph.
    { h: 'Towinly keeps changing',
      p: 'Towinly is worked on all the time. Screens will move, things will change, and now '
        + 'and then something will break. ' + KEEP_YOUR_OWN_COPY },

    { h: 'Who can use Towinly',
      p: 'You must be 18 or over. The elder side of Towinly is meant for people aged 55 and '
        + 'over. Tell us the truth about who you are when you join, and keep it up to date. An '
        + 'account built on false information can be closed at any time.' },

    { h: 'Your account',
      p: 'Keep your password to yourself. Anything done from your account is treated as done '
        + 'by you. Tell us straight away if you think somebody else has got in. Your Sealed box '
        + 'is kept shut by that same password, so it matters more here than on most websites.' },

    { h: 'How you treat people',
      p: 'Treat every elder, helper and family member with respect. Harassment, threats, lies, '
        + 'discrimination, selling things, pretending to be somebody else, or anything that puts '
        + 'another person at risk will get an account closed. Reviews must be honest and about '
        + 'meetings that really happened.' },

    { h: 'Meeting in person',
      p: 'Towinly introduces people. It is not part of whatever you then agree between '
        + 'yourselves, and nobody from Towinly is there when you meet. Meet in a public place '
        + 'when you can, tell somebody where you are going, and call your local emergency '
        + 'number if you ever feel unsafe.' },

    { h: 'What you write to pass on',
      p: 'Your stories, your letters and your Sealed box are yours. You choose who can see each '
        + 'one, and you can change your mind at any time while you are alive. We do not read '
        + 'what you write as a matter of course. What we can and cannot see is set out on the '
        + 'Privacy page, in full, including the part most services leave out.' },

    { h: 'Nothing you write here is a will',
      p: 'A will decides who gets your money, your home and your things. Nothing you write on '
        + 'Towinly changes that. No letter, note or story here can decide who inherits '
        + 'anything, and none of it replaces a will. If you have a will, please tell whoever '
        + 'helped you make it that these pages exist. Whether somebody settling an estate has a '
        + 'claim to what is in a Sealed box is a question for a lawyer, and it is one of the '
        + 'things ours still has to answer.' },

    { h: 'After you are gone',
      p: 'Nothing on Towinly opens by itself. There is no timer, no countdown, and no button '
        + 'anywhere that releases what you wrote. If you have set up a Sealed box you will have '
        + 'chosen a few people you trust, your Keyholders, and how many of them must agree. '
        + 'After you die, one of them writes to us. Then a person here, not a computer, reads a '
        + 'death certificate with their own eyes, asks each of your Keyholders separately and in '
        + 'writing, and waits thirty days, trying to reach you the whole time. If the number you '
        + 'chose does not agree, nothing opens. If anybody reaches you in those thirty days, it '
        + 'all stops. Only after all of that does a person here hand what is in your Sealed box '
        + 'to the Keyholders who agreed, and open any letter you marked to be read after you are '
        + 'gone. A letter opens for the one person you addressed it to and for nobody else. We '
        + 'can also say no, at any step: somebody being upset is not proof that they are '
        + 'entitled to your things.' },

    { h: 'What cannot be got back',
      p: 'What you put in your Sealed box is scrambled before it is saved. If the key that '
        + 'unscrambles it is ever lost, what is inside is gone. Not hidden, gone, for '
        + 'everybody, including us. There is no spare copy and no way to work it out again. '
        + KEEP_YOUR_OWN_COPY },

    { h: 'What we are not responsible for',
      p: 'Towinly is provided as it is. We do not check that what members tell each other is '
        + 'true, and we are not part of what members arrange between themselves. To the fullest '
        + 'extent the law allows, we are not responsible for what comes out of those dealings. '
        + 'How far that goes, and what it cannot cover, is one of the things our lawyer still '
        + 'has to settle. When they have, this section will say so exactly.' },

    { h: 'If Towinly has to close',
      p: 'Towinly is a small project. If it ever has to close, we will try to give you notice '
        + 'and a way to take your things with you, but we cannot promise how much warning there '
        + 'would be. That is the plainest reason to keep your own copy of anything that matters: '
        + 'a letter you would want read, a note about where the papers are kept, the address a '
        + 'family would need to write to. Keep it outside this app as well as in it.' },

    { h: 'The law that applies',
      p: 'Which country’s law covers these terms, and where a disagreement would be settled, is '
        + 'not decided yet. Our lawyer will settle it and this page will say so plainly. Until '
        + 'then, nothing here takes away any right the law where you live already gives you.' },

    { h: 'Changes to these terms',
      p: 'We may change these terms. If a change matters, we will tell you. Carrying on using '
        + 'Towinly after a change takes effect means you accept it.' },

    contactSection(
      'Questions',
      email ? 'Anything on this page can go to' : LEGAL_CONTACT.noAddressYet,
      email,
    ),
  ];
}

/**
 * The Privacy Policy. The security paragraph is kept word for word — it was
 * corrected once already for promising encryption at rest the database does
 * not have, and a test holds the honest wording in place.
 *
 * @returns {{h: string, p: string, email?: string}[]}
 */
export function privacySections(email) {
  return [
    { h: 'What we collect',
      p: 'What you type when you join: a username, your email address, your date of birth, and '
        + 'whether you are here as an elder, a helper, or for a family member. What you add '
        + 'later: your name, a photo, a short bio, a phone number and roughly where you live. '
        + 'What you make on Towinly: help requests, messages, reviews, stories, letters and '
        + 'anything you put in your Sealed box. And a little about the device you use, to keep '
        + 'the service safe.' },

    { h: 'Where it is kept',
      p: 'Your information is kept on servers in the United States. Photos and identity '
        + 'documents are kept in Amazon S3, also in the United States.' },

    // Rewritten 2026-08-19, when the app gained real device location. Widened
    // 2026-08-22 (LOC-207), when the ask reached four screens instead of one.
    // Every sentence below has to stay true of the code: the card is the only
    // thing that may ask, on Add Friends, Posted Help, Offer Help and Edit
    // Profile (src/components/location/LocationPrimer, wired through
    // src/lib/useDevicePosition), foreground only (app.json blocks the
    // background variants), and the fix is snapped to a 0.02 degree cell before
    // it can reach the network (src/lib/coarseLocation). If any of those change,
    // this changes with them.
    { h: 'Where you live',
      p: 'Towinly asks your phone where it is so we can show how far away people are, and show '
        + 'only the people and the help requests within the distance you choose. We ask on the '
        + 'screens where it makes a difference: finding friends, after you post a request for '
        + 'help, browsing requests to help with, and editing your profile. We explain why '
        + 'before your phone asks. You can say no and the app carries on working, you just '
        + 'will not see how far away somebody is.' },

    { h: 'What we keep, and what we do not',
      p: 'We round your position to an area of about two kilometres across before it leaves '
        + 'your phone, and only that rounded position is saved. We never keep your address or '
        + 'your street. We only ever look while Towinly is open on your screen, never in the '
        + 'background and never while the app is closed. Other members see the name of your '
        + 'town and how far away you are, never a position on a map.' },

    { h: 'Turning it off',
      p: 'You can turn location off at any time in your phone settings, under Towinly. You can '
        + 'also just type the name of your town in Edit Profile instead, and we will look that '
        + 'up for a rough position without using your phone at all. Leave both blank and your '
        + 'account carries on working. Once you have said yes, we read your phone again when '
        + 'the saved position is more than a day old, and whenever you tap Update my location '
        + 'in Edit Profile. Both happen while Towinly is open on your screen.' },

    { h: 'How we use your information',
      p: 'To run Towinly: showing you people nearby, letting you write to each other, working '
        + 'out trust scores, sending an alert to the contacts you nominated, and keeping the '
        + 'community safe. We do not sell your information to anybody.' },

    // Play's User Data policy requires disclosing the types of parties that receive
    // data. The policy used to name only Amazon S3, while four other companies also
    // handle some of it.
    { h: 'Who else touches your information',
      p: 'A few outside companies do jobs for Towinly, and each one sees only what it needs. '
        + 'Amazon keeps your photos and identity documents. Twilio sends the text messages, so '
        + 'it sees the phone number a message is going to. OpenStreetMap turns the name of your '
        + 'town into a rough position, and is told nothing about you. Groq writes the answers '
        + 'from the Towinly helper, and only when you have said yes to that. Railway runs the '
        + 'servers everything sits on. Expo delivers the notification that makes your phone '
        + 'ring, and sees the delivery address your phone made for that purpose and the few '
        + 'words on the ping itself, such as a name. It never sees what a message says. '
        + 'None of them are allowed to sell your information or use '
        + 'it for their own purposes.' },

    { h: 'Who can see what',
      p: 'Other members can see your name, your role, your city, your bio, your interests and '
        + 'your trust score. Your email address and phone number are shown to a connection only '
        + `once your trust journey together reaches the ${FULL_STAGES[PHONE_STAGE]} stage. Admins here can look `
        + 'at account information when they are investigating a safety report.' },

    { h: 'Messages',
      p: 'Messages between members are kept so you can read your history. Admins may read a '
        + 'message that has been reported for safety. We do not use what you write to sell you '
        + 'anything.' },

    { h: 'Your stories, your letters and your Sealed box',
      p: 'You choose who can see each story. A letter goes to one person and to nobody else. '
        + 'What you put in your Sealed box is for you alone. Even the name you give a thing in '
        + 'it is scrambled, so nobody here can see a list of your labels, and your Keyholders '
        + 'never see one either.' },

    { h: 'How the Sealed box is kept',
      p: 'What you put in the Sealed box is scrambled before it is saved, and the key that '
        + 'unscrambles it is not kept beside it. If somebody stole our records, they could not '
        + 'read a word of what you wrote. If somebody broke into the company itself, they '
        + 'could, because we hold both the records and the key. We are not going to tell you '
        + 'otherwise. We hold both on purpose, so that you can never be shut out of your own '
        + 'box: forget your password, reset it the way you always do, and your box is still '
        + 'there. The price of that is the sentence above. If anybody here were asked "could '
        + 'you just look?", the honest answer is yes, and we will not. Every time your box is '
        + 'opened we write down when, and you can see that list.' },

    { h: 'If the key is ever lost',
      p: 'Then everything in every Sealed box is gone. Not locked away somewhere. Gone. Nobody '
        + 'can get it back, including us, and there is no second copy anywhere. ' + KEEP_YOUR_OWN_COPY },

    { h: 'After somebody dies',
      p: 'Nothing about you is handed to anybody because a date has passed. There is no timer '
        + 'and no automatic step. If a family member writes to say you have died, a person here '
        + 'reads a death certificate with their own eyes and writes down what they saw, asks '
        + 'each of the Keyholders you chose separately and in writing, and then waits thirty '
        + 'days while still trying to reach you. Only if the number of Keyholders you set agree, '
        + 'and nobody reaches you, does a person here hand over what is in your Sealed box, to '
        + 'those Keyholders and to nobody else. Any letter you marked to be read after you are '
        + 'gone opens for the one person you addressed it to. While all this is going on we do '
        + 'not confirm to anybody that you have died, and we never tell your family when you '
        + 'last signed in. If we hear from you at any point, it stops. The whole procedure is '
        + 'written down and carried out by hand, and there is no screen or button anywhere that '
        + 'does any of it.' },

    { h: 'Security',
      p: 'We use industry-standard encryption in transit, so what you send us is protected on '
        + 'its way to Towinly. Once it reaches us, most of your information is stored without a '
        + 'second lock on it. The Sealed box is the exception: whatever you keep there is '
        + 'encrypted while it is stored, and only you can open it. No system is perfectly '
        + 'secure, so please use a strong, unique password and report anything suspicious.' },

    { h: 'How long we keep it',
      p: 'We keep your information while your account is here. How long a copy of it can still '
        + 'sit in one of our backups after that is something we have not written down yet, and '
        + 'we will say it here once we have.' },

    { h: 'Deleting your account',
      p: 'If you ask us to delete your account, we remove your profile and your photo, your '
        + 'messages, your reviews, your help requests, your stories, your letters, and '
        + 'everything in your Sealed box. Your Keyholders are not told, and there is nothing '
        + 'left to be passed on afterwards, so please be sure. One thing does not go with you: '
        + 'if another member wrote a story of their own that mentions you, those are their '
        + 'words and they stay.' },

    // The link is audit finding V7: Play requires the deletion page to be
    // reachable FROM the privacy policy, not only from the Data safety form.
    // It is a real control on all three renderers, because a person who has
    // lost the app cannot tap a sentence.
    { h: 'Asking for a copy of your information',
      p: email
        ? 'You can change or remove most things yourself from your profile page. For a copy of '
          + 'everything we hold about you, or to close your account for good, open your profile, '
          + 'tap "Account and data", then "Send me a copy of my data" or "Delete my account". '
          + 'If you would rather ask a person, write to us at the address at the bottom of this '
          + 'page. If you no longer have the app, you can ask on the web instead.'
        : 'You can change or remove most things yourself from your profile page. For a copy of '
          + 'everything we hold about you, or to close your account for good, open your profile, '
          + 'tap "Account and data", then "Send me a copy of my data" or "Delete my account". '
          + 'Towinly has not set an address to write to yet, so those two buttons are the way to '
          + 'ask. If you no longer have the app, you can ask on the web instead.',
      link: { label: 'Delete your account on the web', url: DELETION_PAGE_URL } },

    { h: 'Children',
      p: 'Towinly is not meant for anybody under 18. If we find out we have collected '
        + 'information from a child, we delete it.' },

    { h: 'If Towinly has to close',
      p: 'If Towinly ever has to close, we will try to give you notice and time to take a copy '
        + 'of your things. We cannot promise how long that notice would be. ' + KEEP_YOUR_OWN_COPY },

    contactSection(
      'Questions',
      email
        ? 'Anything on this page, a copy of your information, or deleting your account, write to us at'
        : LEGAL_CONTACT.noAddressYet,
      email,
    ),
  ];
}

// The three renderers (terms, privacy, the signup modal) read these — built
// once from the configured address so all of them say the same thing.
export const TERMS_CONTENT = termsSections(legalContactEmail());
export const PRIVACY_CONTENT = privacySections(legalContactEmail());
