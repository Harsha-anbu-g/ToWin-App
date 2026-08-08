// The words on the public "delete your account" page (audit finding B7).
//
// Google Play needs a web address where somebody can ask for deletion without
// installing anything, alongside the in-app flow. That address is
// https://towinly.com/app/delete-account, which is this route in the phone web
// export. See docs/audit/2026-08-07-presubmission-audit.md for why the page
// lives here rather than on the website.
//
// Two rules carried over from legalContent.js: nothing here overclaims, and
// every in-app label quoted below is the exact string app/(tabs)/profile.jsx
// renders. __tests__/delete-account-page.test.js reads that screen off disk and
// fails if either drifts.
import { legalContactEmail } from './legalContent';

/**
 * Where a deletion request goes when the deploy sets no address.
 *
 * legalContent.js deliberately refuses to hardcode a mailbox, because an
 * invented address loses somebody's request in silence. That reasoning does not
 * reach this page. This mailbox is real, it is already the value eas.json ships
 * to both store profiles, and this page IS the Vercel web build, where
 * EXPO_PUBLIC_LEGAL_CONTACT_EMAIL is not set. Without the fallback, the one URL
 * Play Console points at would render "no address set yet".
 */
export const DELETION_CONTACT_FALLBACK = 'help@towinly.com';

/**
 * The address typed into Play Console: Data safety, Data deletion.
 *
 * Three things have to agree for it to resolve, and a test pins all three:
 * app.json's experiments.baseUrl ("/app"), this route's filename, and the
 * website's /app/:path* rewrite. Change any one of them and the URL sitting in
 * a store console quietly stops working.
 */
export const DELETION_PAGE_PATH = '/delete-account';
export const DELETION_PAGE_URL = 'https://towinly.com/app/delete-account';

/** The configured address if a deploy sets one, otherwise the real mailbox. */
export function deletionContactEmail() {
  return legalContactEmail() || DELETION_CONTACT_FALLBACK;
}

export const DELETE_ACCOUNT_PAGE = {
  // The page's one heading, rendered by <Screen title>. Kept short because the
  // header row shares 320pt with the back control; the intro below names the
  // product for somebody arriving cold from a Play Console link.
  title: 'Delete your account',

  intro:
    'You can ask us to delete your Towinly account at any time, and you do not have to give a '
    + 'reason. There are two ways to ask, and this page says exactly what goes and what stays.',

  actionLabel: 'Write to us and ask',

  /**
   * What the page says after the button is pressed.
   *
   * Pressing it used to change nothing on screen (audit finding V11): the mail
   * app opens over the page, or it does not open at all, and either way the
   * person is left wondering whether Towinly heard her. Both endings now say so
   * where she is looking, and both name the address so she can finish by hand.
   */
  started: (email) =>
    `We have started a message to ${email}. Send it, and a person here will write back within `
    + 'seven days.',

  noMailApp: (email) =>
    `This browser could not open a mail app. Write to ${email} yourself, from the email address `
    + 'you joined with, and a person here will write back within seven days.',

  mailSubject: 'Please delete my Towinly account',

  mailBody:
    'I would like my Towinly account deleted.\n\n'
    + 'The email address I joined with:\n\n'
    + 'The name on my Towinly profile:\n\n'
    + 'I would also like a copy of my information first: yes / no\n',

  sections: [
    { h: 'If you have the Towinly app',
      p: 'Open your profile, tap "Account and data", then "Delete my account". Towinly asks you '
        + 'twice. The second question is "Delete forever", and nothing is removed until you '
        + 'answer that one.' },

    // Names how long a reply takes and what to do if it does not come (V11).
    // Seven days is not a guess at how fast we are: it is the outside edge, and
    // it gives a person who hears nothing a next step instead of a silence.
    { h: 'If you do not have the app',
      p: 'Write to us and ask. Send it from the email address you joined with, so we can find '
        + 'your account and be sure it is you. If you cannot write from that address, tell us '
        + 'the name on your profile and we will write back to check. A person here reads every '
        + 'one of these and does the deletion by hand. We write back within seven days. If you '
        + 'have not heard from us by then, write again and say it is your second time asking.' },

    // The in-app copy really does arrive now: profile.jsx hands the person the
    // response body of GET /account/export as a file (src/lib/myDataCopy.js).
    // Before that, this section pointed at a button that toasted "check your
    // email" and sent nothing (V2), which made this the most dangerous
    // paragraph on the page.
    { h: 'Take a copy first if you want one',
      p: 'Deleting cannot be undone, and Towinly keeps nothing back for you afterwards. If you '
        + 'want your own copy of what you wrote, ask for it before you delete. In the app, open '
        + 'your profile, tap "Account and data", then "Send me a copy of my data", and your copy '
        + 'is made there and then for you to keep. By writing to us, say so in the same message '
        + 'and we will send your copy before anything is deleted.' },

    // The Sealed box contradiction, said plainly instead of implied away (V6).
    // AccountService.addPassOnSections emits sealed items as metadata only, on
    // purpose: the export is authenticated by the token alone and never asks
    // for the password, so contents in it would hand an elder's bank details to
    // whoever took over her mailbox. Good decision, and it means the one thing
    // she most wants to keep is the one thing the copy cannot carry.
    { h: 'What your copy cannot include',
      p: 'Your copy lists what is in your Sealed box: what sort of thing each one is, how big it '
        + 'is and when you put it there. It does not contain what is inside them. Towinly locks '
        + 'your Sealed box with your password and cannot read it, so it cannot copy it out for '
        + 'you. If you want to keep any of it, open your Sealed box and save each thing yourself '
        + 'before you delete anything.' },

    { h: 'What deleting removes',
      p: 'Your profile and your photo. Your messages. Your reviews. Your help requests. Your '
        + 'stories and your letters. Everything in your Sealed box. Your Keyholders are not '
        + 'told, and there is nothing left to be passed on afterwards, so please be sure.' },

    // Play's data-deletion requirement asks the page to say how long. The first
    // half is checkable: deleteOwnAccount calls purgeUserData in one
    // transaction on the request, with no grace period and no soft-delete flag.
    // The backup number is genuinely undecided and is not invented here (V10).
    { h: 'How soon it happens',
      p: 'When you delete your account in the app, all of that goes at that moment. There is no '
        + 'waiting period, nothing is held back in case you change your mind, and there is no '
        + 'way for us to bring it back afterwards. Backups are the one exception: we have not '
        + 'fixed how long a copy can sit in one of those, and we will write the number here when '
        + 'we have.' },

    // Completed against the real purge (V13). purgeUserData deletes pass-on
    // items by owner id only, so an item another member owns survives, whether
    // it merely mentions this person or was addressed to them by name.
    { h: 'What stays',
      p: 'If another member wrote a story of their own that mentions you, those are their words '
        + 'and they stay. A letter another member wrote and addressed to you stays too, for the '
        + 'same reason: it belongs to the person who wrote it, and deleting your account does '
        + 'not delete theirs.' },
  ],
};

/** A prefilled message, so the request can be started from this page alone. */
export function deletionMailto(email) {
  const query = [
    `subject=${encodeURIComponent(DELETE_ACCOUNT_PAGE.mailSubject)}`,
    `body=${encodeURIComponent(DELETE_ACCOUNT_PAGE.mailBody)}`,
  ].join('&');
  return `mailto:${email}?${query}`;
}
