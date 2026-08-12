// The words on the public "Get help" page.
//
// App Store Review needs a Support URL that actually provides support, and it
// has to answer without a login: a reviewer following it must land on help,
// not on the sign-in screen. Guideline 1.2 asks the same thing again for an
// app where people talk to each other, so the address earns its keep twice.
//
// It lives here, in the phone web export, for the same two reasons the
// deletion page does (see deleteAccountPage.js): the website in ToWin/ is
// read-only reference so no route can be added there, and towinly.com/app/:path*
// is a Vercel rewrite to this project for every user agent, so the website's
// phone redirect can never fire on it.
//
// Public on purpose: a top-level route with no auth guard, like terms.jsx,
// privacy.jsx and delete-account.jsx. Somebody locked out of their account is
// exactly the person who needs this page most.
//
// Nothing here overclaims. We do not promise a reply time we have never
// measured, we do not claim a phone line that does not exist, and we do not
// describe safety machinery the code does not have.
import { DELETION_PAGE_URL, legalContactEmail } from './legalContent';

/**
 * The address typed into App Store Connect (Support URL) and Play Console.
 *
 * Three things have to agree for it to resolve: app.json's experiments.baseUrl
 * ("/app"), this route's filename, and the website's /app/:path* rewrite.
 * __tests__/support-page.test.js pins all three.
 */
export const SUPPORT_PAGE_PATH = '/support';
export const SUPPORT_PAGE_URL = 'https://www.towinly.com/app/support';

/** The configured address if a deploy sets one, otherwise the real mailbox. */
export function supportContactEmail() {
  return legalContactEmail();
}

/** Opens the person's mail app with the subject already filled in. */
export function supportMailto(email) {
  return `mailto:${email}?subject=${encodeURIComponent('I need help with Towinly')}`;
}

export const SUPPORT_PAGE = {
  // One heading, rendered by <Screen title>, kept short because the header row
  // shares its width with the back control.
  title: 'Get help',

  intro:
    'Towinly connects older people with younger helpers for company and everyday help. ' +
    'If something is not working, or you are unsure about someone you have met here, ' +
    'write to us. A person reads every message.',

  sections: [
    {
      h: 'Ask us anything',
      p:
        'Write to us about anything at all: a button that does nothing, a word you do not ' +
        'understand, a person who worries you, or a question about how Towinly works. ' +
        'There is no wrong question. Tell us what you were doing and what happened, and ' +
        'we will take it from there.',
    },
    {
      h: 'How long it takes',
      p:
        'Towinly is small and new, so replies come from a person rather than a call centre. ' +
        'We answer as quickly as we can. If your message is about someone putting you or ' +
        'your family at risk, say so at the top and we will look at it first.',
    },
    {
      h: 'If you feel unsafe',
      p:
        'You can block a person from their profile at any time, and you do not have to ' +
        'explain why. Blocking is silent: they are not told. If you are in immediate ' +
        'danger, call your local emergency number first. Then write to us so we can act ' +
        'on the account.',
    },
    {
      h: 'Learning your way around',
      p:
        'The Guide inside the app walks through every screen in plain words: check-ins, ' +
        'the trust score, the trust ladder, messages, and what your family can and cannot ' +
        'see. Open the menu and choose Guide. You can read it as many times as you like.',
    },
    {
      h: 'Helping an older parent',
      p:
        'Families can join a parent circle and see what that parent chooses to share. ' +
        'The elder is always in charge: every sharing setting and every power starts off, ' +
        'and only the elder can turn it on. If you are setting Towinly up for a parent and ' +
        'get stuck, write to us and say so.',
    },
    {
      h: 'Closing your account',
      p:
        'You can delete your account from inside the app, under Profile. If you cannot get ' +
        'in, you can ask us on the web instead, without installing anything.',
    },
  ],

  actionLabel: 'Write to us',

  // What the press did, said on the page and not only in a toast: a mail app
  // opens over this page and a toast is long gone by the time the person comes
  // back (HCI 1, same reasoning as the deletion page).
  started: (email) => `We have started a message to ${email}. Tell us what happened and send it.`,
  startedOnWeb: (email) =>
    `If a mail app opened, tell us what happened and send it. If nothing opened, write to ${email} yourself.`,
  noMailApp: (email) => `No mail app opened. Write to ${email} and tell us what happened.`,

  deletionLinkLabel: 'Delete your account on the web',
  deletionUrl: DELETION_PAGE_URL,
};
