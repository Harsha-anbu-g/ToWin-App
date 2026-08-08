// The web-accessible account deletion page (audit finding B7).
//
// Google Play requires a public URL where someone can ask for deletion without
// installing anything, on top of the in-app flow. Three things about that page
// can break silently, so all three are pinned here:
//
//  1. The in-app labels it quotes are copied by hand from app/(tabs)/profile.jsx.
//     Rename a button there and this page starts telling people to tap something
//     that does not exist. That guard now renders the screen and lives in
//     __tests__/profile-label-drift.test.js.
//  2. The address. legalContactEmail() reads EXPO_PUBLIC_LEGAL_CONTACT_EMAIL,
//     which eas.json sets for the store builds but the Vercel web project does
//     NOT. This page IS the Vercel web build, so an unset variable would render
//     "no address set yet" on the one surface Play points at.
//  3. Words a stranger reads: no em dashes, no beta or prototype wording.
import { fireEvent, render } from '@testing-library/react-native';
import { Linking, Platform } from 'react-native';
import { ThemeProvider } from '../src/theme/ThemeContext';
import { ToastProvider } from '../src/context/ToastContext';
import {
  DELETE_ACCOUNT_PAGE,
  DELETION_CONTACT_FALLBACK,
  DELETION_PAGE_PATH,
  DELETION_PAGE_URL,
  deletionContactEmail,
  deletionMailto,
} from '../src/data/deleteAccountPage';
import { DELETION_PAGE_URL_APEX } from '../src/data/legalContent';
import DeleteAccount from '../app/delete-account';

const fs = require('fs');
const path = require('path');

// Cold-loaded from a Play Console link, so there is no history to go back to.
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: () => false }),
}));

/** Every word the page renders, as one string. */
const renderedCopy = () =>
  [
    DELETE_ACCOUNT_PAGE.title,
    DELETE_ACCOUNT_PAGE.intro,
    ...DELETE_ACCOUNT_PAGE.sections.flatMap((s) => [s.h, s.p]),
    DELETE_ACCOUNT_PAGE.actionLabel,
    DELETE_ACCOUNT_PAGE.mailSubject,
    DELETE_ACCOUNT_PAGE.mailBody,
    // The two sentences the press can produce. They are words a stranger reads
    // like any other, so they are swept for em dashes with everything else.
    DELETE_ACCOUNT_PAGE.started(DELETION_CONTACT_FALLBACK),
    DELETE_ACCOUNT_PAGE.noMailApp(DELETION_CONTACT_FALLBACK),
  ].join('\n');

const section = (heading) => DELETE_ACCOUNT_PAGE.sections.find((s) => s.h === heading);

// The drift guard used to live here and read app/(tabs)/profile.jsx off disk as
// a string. Audit finding V3 proved by mutation that a whole-file substring
// check does not bite: a stale copy of "Delete my account" sits in a code
// comment, so renaming every button a person can see left it green. It now
// renders the screen instead, in __tests__/profile-label-drift.test.js.

describe('delete-account page: the route for someone with no app', () => {
  const REAL_ENV = process.env.EXPO_PUBLIC_LEGAL_CONTACT_EMAIL;

  afterEach(() => {
    if (REAL_ENV === undefined) delete process.env.EXPO_PUBLIC_LEGAL_CONTACT_EMAIL;
    else process.env.EXPO_PUBLIC_LEGAL_CONTACT_EMAIL = REAL_ENV;
  });

  test('still gives a real address when the deploy variable is unset', () => {
    // Arrange - exactly the Vercel web project's situation today.
    delete process.env.EXPO_PUBLIC_LEGAL_CONTACT_EMAIL;

    // Act
    const address = deletionContactEmail();

    // Assert
    expect(address).toBe(DELETION_CONTACT_FALLBACK);
    expect(address).toBe('help@towinly.com');
  });

  test('prefers the configured address when a deploy sets one', () => {
    // Arrange
    process.env.EXPO_PUBLIC_LEGAL_CONTACT_EMAIL = 'support@example.com';

    // Act / Assert
    expect(deletionContactEmail()).toBe('support@example.com');
  });

  test('ignores a blank variable rather than rendering an empty address', () => {
    // Arrange
    process.env.EXPO_PUBLIC_LEGAL_CONTACT_EMAIL = '   ';

    // Act / Assert
    expect(deletionContactEmail()).toBe(DELETION_CONTACT_FALLBACK);
  });

  test('the mail link carries a subject and a body, so the request is startable', () => {
    // Arrange / Act
    const link = deletionMailto('help@towinly.com');

    // Assert
    expect(link.startsWith('mailto:help@towinly.com?')).toBe(true);
    expect(decodeURIComponent(link)).toContain(DELETE_ACCOUNT_PAGE.mailSubject);
    expect(decodeURIComponent(link)).toContain('email address I joined with');
  });
});

describe('delete-account page: the URL a store console will hold', () => {
  const appJson = JSON.parse(
    fs.readFileSync(path.join(__dirname, '..', 'app.json'), 'utf8')
  );

  test('the route file exists at the path the URL claims', () => {
    // Arrange / Act - expo-router maps app/delete-account.jsx to /delete-account.
    const routeFile = path.join(__dirname, '..', 'app', `${DELETION_PAGE_PATH.slice(1)}.jsx`);

    // Assert
    expect(fs.existsSync(routeFile)).toBe(true);
  });

  test('the URL is the baseUrl the export is actually built with', () => {
    // Arrange - the /app prefix is not decoration: it is experiments.baseUrl,
    // and towinly.com rewrites /app/:path* into this project.
    const { baseUrl } = appJson.expo.experiments;

    // Act / Assert
    expect(baseUrl).toBe('/app');
    expect(DELETION_PAGE_URL).toBe(`https://www.towinly.com${baseUrl}${DELETION_PAGE_PATH}`);
  });

  test('the URL sits under /app, which no phone redirect rule touches', () => {
    // The website hands phones to the app for a fixed allowlist of paths
    // (ToWin/frontend/src/components/phoneAppRouting.js and the matching
    // vercel.json redirects). Every one of those sources is a website path.
    // /app/:path* is a REWRITE, not a redirect, so the website bundle that
    // mounts <PhoneAppRedirect /> never loads on this URL.
    expect(DELETION_PAGE_URL.startsWith('https://www.towinly.com/app/')).toBe(true);
  });

  test('it is the host that answers, not the one that redirects', () => {
    // The apex works and it is the address the brand uses everywhere else, but
    // it answers 308 and hands the browser to www:
    //
    //   $ curl -sI https://towinly.com/app/delete-account
    //   HTTP/2 308   location: https://www.towinly.com/app/delete-account
    //
    // A store console gets the address that does not move. One hop fewer, and
    // it cannot be broken by a redirect rule changing on the website side.
    expect(DELETION_PAGE_URL).toBe(DELETION_PAGE_URL_APEX.replace('//towinly', '//www.towinly'));
    expect(DELETION_PAGE_URL.startsWith('https://www.')).toBe(true);
  });
});

describe('delete-account page: what it promises', () => {
  test('names what deletion removes, matching the privacy policy', () => {
    // Arrange / Act
    const { p } = section('What deleting removes');

    // Assert
    for (const thing of ['profile', 'messages', 'reviews', 'help requests', 'stories', 'letters']) {
      expect(p).toContain(thing);
    }
    expect(p).toContain('Sealed box');
    expect(p).toContain('Keyholders');
  });

  test('names what is kept, so deletion is not oversold', () => {
    // Arrange / Act
    const { p } = section('What stays');

    // Assert - another member's own words, both ways they can survive.
    // purgeUserData deletes pass-on items by owner id only, so an item another
    // member owns lives on whether it merely mentions this person (a story) or
    // was written to them by name (a letter). Naming only the first was audit
    // finding V13: the second is the one a bereaved reader actually cares about.
    expect(p).toContain('their words and they stay');
    expect(p).toContain('addressed to you stays too');
  });

  test('answers how soon, and does not invent the number it does not have', () => {
    // Arrange / Act - Play's data-deletion requirement asks the page to say how
    // long (audit finding V10). Half of that is checkable and is stated as fact;
    // the backup window is an open owner decision and is said to be open rather
    // than filled with a plausible number.
    const { p } = section('How soon it happens');

    // Assert
    expect(p).toContain('at that moment');
    expect(p).toContain('no waiting period');
    expect(p).toMatch(/backups/i);
    expect(p).toMatch(/have not fixed how long/);
    // No invented retention period anywhere on the page.
    expect(renderedCopy()).not.toMatch(/\b\d+\s*(days?|months?|years?)\b.*backup/i);
    expect(p).not.toMatch(/\b\d+\s*(days?|months?|years?)\b/);
  });

  test('tells people to take a copy before they delete, and the copy is now real', () => {
    // Arrange / Act
    const { p } = section('Take a copy first if you want one');

    // Assert - the old wording sent people to a button that toasted "check your
    // email" and sent nothing (audit finding V2). It must never say that again.
    expect(p).toContain('cannot be undone');
    expect(p).toContain('Send me a copy of my data');
    expect(p).toContain('made there and then');
    expect(renderedCopy()).not.toMatch(/check your email/i);
  });

  test('says plainly that the copy cannot carry the Sealed box', () => {
    // Arrange / Act - the page used to imply the opposite while the very next
    // section said the Sealed box is deleted forever (audit finding V6).
    const { p } = section('What your copy cannot include');

    // Assert - matches AccountService.addPassOnSections: metadata leaves, and
    // nothing readable does, because the export never asks for the password.
    expect(p).toContain('does not contain what is inside them');
    expect(p).toContain('password');
    expect(p).toContain('save each thing yourself');
  });

  test('the write-in path says how long a reply takes and what to do without one', () => {
    // Arrange / Act - audit finding V11: a promise that a human does this by
    // hand, with no timeframe, and no recovery if the reply never comes.
    const { p } = section('If you do not have the app');

    // Assert
    expect(p).toContain('within seven days');
    expect(p).toContain('write again');
  });
});

describe('delete-account page: words a stranger reads', () => {
  test('no em dashes anywhere in the rendered copy', () => {
    // Arrange / Act / Assert - CLAUDE.md rule 5, the hardest one.
    expect(renderedCopy()).not.toMatch(/—/);
  });

  test('no beta or prototype wording', () => {
    // Arrange / Act / Assert - Apple guideline 2.2 reads those as TestFlight.
    expect(renderedCopy()).not.toMatch(/\b(beta|prototype|work in progress|trial)\b/i);
  });
});

describe('delete-account screen: what a stranger actually sees', () => {
  const wrap = () =>
    render(
      <ThemeProvider>
        <ToastProvider>
          <DeleteAccount />
        </ToastProvider>
      </ThemeProvider>
    );

  afterEach(() => jest.restoreAllMocks());

  test('renders every section without an account, mail client or history', async () => {
    // Arrange / Act - no AuthProvider in the tree: the page must not need one.
    const { getByText } = await wrap();

    // Assert
    getByText(DELETE_ACCOUNT_PAGE.title);
    for (const s of DELETE_ACCOUNT_PAGE.sections) getByText(s.h);
  });

  test('shows the address as text as well as behind the button', async () => {
    // Arrange / Act - a browser with no mail handler does nothing and says
    // nothing, so the address can never be button-only (HCI 9).
    const { getByText } = await wrap();

    // Assert
    getByText(`Or write to ${deletionContactEmail()} yourself.`);
  });

  test('the button opens a prefilled message to the deletion address', async () => {
    // Arrange
    const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
    const { getByRole } = await wrap();

    // Act
    await fireEvent.press(getByRole('button', { name: DELETE_ACCOUNT_PAGE.actionLabel }));

    // Assert
    expect(openURL).toHaveBeenCalledWith(deletionMailto(deletionContactEmail()));
  });

  test('on a phone, says the address out loud when no mail app answers', async () => {
    // Arrange - this is the NATIVE path and it is the only one where the reject
    // is real: iOS and Android genuinely reject openURL with no handler. The web
    // does not, which is why it has its own test below rather than sharing this
    // one and pretending the mock proves something.
    expect(Platform.OS).not.toBe('web');
    jest.spyOn(Linking, 'openURL').mockRejectedValue(new Error('no handler'));
    const { getByRole, findByText } = await wrap();

    // Act
    await fireEvent.press(getByRole('button', { name: DELETE_ACCOUNT_PAGE.actionLabel }));

    // Assert - the request must not die in silence.
    await findByText(
      `Write to ${deletionContactEmail()} and ask us to delete your account.`
    );
  });

  test('on the web, the answer is true whether or not a mail app opened', async () => {
    // Arrange - the old suite pinned "we have started a message" on a resolve
    // and "this browser could not open a mail app" on a reject. On
    // react-native-web openURL RESOLVES either way, so the second branch could
    // never run in the one environment this page ships in, and the first one
    // claimed something nothing had checked. The web now says what is true of
    // both endings, and this test does not depend on a rejection that cannot
    // happen.
    const realOS = Platform.OS;
    Platform.OS = 'web';
    jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);

    try {
      const { getByRole, findByText } = await wrap();

      // Act
      await fireEvent.press(getByRole('button', { name: DELETE_ACCOUNT_PAGE.actionLabel }));

      // Assert
      const said = await findByText(DELETE_ACCOUNT_PAGE.startedOnWeb(deletionContactEmail()));
      expect(said).toBeTruthy();
      expect(DELETE_ACCOUNT_PAGE.startedOnWeb(deletionContactEmail())).toContain('If nothing opened');
      expect(DELETE_ACCOUNT_PAGE.startedOnWeb(deletionContactEmail())).toContain('within seven days');
    } finally {
      Platform.OS = realOS;
    }
  });

  // Audit finding V11. Pressing the button used to change nothing on the page:
  // a mail app opens OVER it, and a toast is gone by the time a person comes
  // back. Both endings now leave an answer behind, on the page, that survives
  // the trip to the mail app and back.
  test('nothing claims to have happened before the button is pressed', async () => {
    const { queryByText } = await wrap();

    expect(queryByText(DELETE_ACCOUNT_PAGE.started(deletionContactEmail()))).toBeNull();
    expect(queryByText(DELETE_ACCOUNT_PAGE.noMailApp(deletionContactEmail()))).toBeNull();
  });

  test('a started message leaves a visible result on the page', async () => {
    // Arrange
    jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
    const { getByRole, findByText } = await wrap();

    // Act
    await fireEvent.press(getByRole('button', { name: DELETE_ACCOUNT_PAGE.actionLabel }));

    // Assert - it names the address and how long a reply takes.
    const result = await findByText(DELETE_ACCOUNT_PAGE.started(deletionContactEmail()));
    expect(result).toBeTruthy();
    expect(DELETE_ACCOUNT_PAGE.started(deletionContactEmail())).toContain('within seven days');
  });

  test('a browser with no mail app leaves a visible result too, not only a toast', async () => {
    // Arrange
    jest.spyOn(Linking, 'openURL').mockRejectedValue(new Error('no handler'));
    const { getByRole, findByText } = await wrap();

    // Act
    await fireEvent.press(getByRole('button', { name: DELETE_ACCOUNT_PAGE.actionLabel }));

    // Assert
    await findByText(DELETE_ACCOUNT_PAGE.noMailApp(deletionContactEmail()));
  });
});
