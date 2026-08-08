// The web-accessible account deletion page (audit finding B7).
//
// Google Play requires a public URL where someone can ask for deletion without
// installing anything, on top of the in-app flow. Three things about that page
// can break silently, so all three are pinned here:
//
//  1. The in-app labels it quotes are copied by hand from app/(tabs)/profile.jsx.
//     Rename a button there and this page starts telling people to tap something
//     that does not exist. The drift test reads profile.jsx off disk.
//  2. The address. legalContactEmail() reads EXPO_PUBLIC_LEGAL_CONTACT_EMAIL,
//     which eas.json sets for the store builds but the Vercel web project does
//     NOT. This page IS the Vercel web build, so an unset variable would render
//     "no address set yet" on the one surface Play points at.
//  3. Words a stranger reads: no em dashes, no beta or prototype wording.
import { fireEvent, render } from '@testing-library/react-native';
import { Linking } from 'react-native';
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
import DeleteAccount from '../app/delete-account';

const fs = require('fs');
const path = require('path');

// Cold-loaded from a Play Console link, so there is no history to go back to.
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: () => false }),
}));

const PROFILE_SCREEN = path.join(__dirname, '..', 'app', '(tabs)', 'profile.jsx');

/** Every word the page renders, as one string. */
const renderedCopy = () =>
  [
    DELETE_ACCOUNT_PAGE.title,
    DELETE_ACCOUNT_PAGE.intro,
    ...DELETE_ACCOUNT_PAGE.sections.flatMap((s) => [s.h, s.p]),
    DELETE_ACCOUNT_PAGE.actionLabel,
    DELETE_ACCOUNT_PAGE.mailSubject,
    DELETE_ACCOUNT_PAGE.mailBody,
  ].join('\n');

const section = (heading) => DELETE_ACCOUNT_PAGE.sections.find((s) => s.h === heading);

describe('delete-account page: the in-app path it tells people to take', () => {
  // The three labels a person actually taps, from app/(tabs)/profile.jsx.
  const LABELS = ['Account and data', 'Delete my account', 'Send me a copy of my data'];

  test.each(LABELS)('quotes "%s" exactly as the app renders it', (label) => {
    // Arrange
    const profileSource = fs.readFileSync(PROFILE_SCREEN, 'utf8');

    // Act / Assert - the label is on the page AND still in the screen it names.
    // Renaming the button in profile.jsx fails this, which is the whole point.
    expect(renderedCopy()).toContain(label);
    expect(profileSource).toContain(label);
  });

  test('names the second confirm, so nobody stops at the first one', () => {
    // Arrange / Act
    const { p } = section('If you have the Towinly app');

    // Assert - profile.jsx gates deletion behind two sequential confirms.
    expect(p).toContain('Delete forever');
    expect(fs.readFileSync(PROFILE_SCREEN, 'utf8')).toContain('Delete forever');
  });
});

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
    expect(DELETION_PAGE_URL).toBe(`https://towinly.com${baseUrl}${DELETION_PAGE_PATH}`);
  });

  test('the URL sits under /app, which no phone redirect rule touches', () => {
    // The website hands phones to the app for a fixed allowlist of paths
    // (ToWin/frontend/src/components/phoneAppRouting.js and the matching
    // vercel.json redirects). Every one of those sources is a website path.
    // /app/:path* is a REWRITE, not a redirect, so the website bundle that
    // mounts <PhoneAppRedirect /> never loads on this URL.
    expect(DELETION_PAGE_URL.startsWith('https://towinly.com/app/')).toBe(true);
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

    // Assert - another member's own words, and the undecided backup window.
    expect(p).toContain('their words and they stay');
    expect(p).toContain('backups');
  });

  test('tells people to take a copy before they delete', () => {
    // Arrange / Act
    const { p } = section('Take a copy first if you want one');

    // Assert
    expect(p).toContain('cannot be undone');
    expect(p).toContain('Send me a copy of my data');
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

  test('says the address out loud when no mail app answers', async () => {
    // Arrange
    jest.spyOn(Linking, 'openURL').mockRejectedValue(new Error('no handler'));
    const { getByRole, findByText } = await wrap();

    // Act
    await fireEvent.press(getByRole('button', { name: DELETE_ACCOUNT_PAGE.actionLabel }));

    // Assert - the request must not die in silence.
    await findByText(
      `Write to ${deletionContactEmail()} and ask us to delete your account.`
    );
  });
});
