// Get help page: the Support URL App Store Connect will hold, and the promise
// that a signed-out reviewer actually gets help at it.
//
// Apple rejects a submission with no Support URL, and guideline 1.5 wants the
// address to provide real support rather than bounce to marketing. The URL
// resolves only if three things agree: app.json's experiments.baseUrl, this
// route's filename, and the website's /app/:path* rewrite. All three are
// pinned here, the same way delete-account-page.test.js pins the deletion URL.
import fs from 'fs';
import path from 'path';
import { render, waitFor } from '@testing-library/react-native';
import Support from '../app/support';
import {
  SUPPORT_PAGE,
  SUPPORT_PAGE_PATH,
  SUPPORT_PAGE_URL,
  supportMailto,
} from '../src/data/supportPage';
import { ThemeProvider } from '../src/theme/ThemeContext';
import { ToastProvider } from '../src/context/ToastContext';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: () => true }),
}));

const wrap = () =>
  render(
    <ThemeProvider>
      <ToastProvider>
        <Support />
      </ToastProvider>
    </ThemeProvider>
  );

describe('the page a reviewer lands on', () => {
  test('it renders with no session, because a locked-out person has none', async () => {
    // Arrange / Act - no AuthContext provider is mounted at all here. A page
    // that needed one would throw, which is exactly the failure a reviewer
    // following the Support URL would hit.
    const r = await wrap();

    // Assert
    await waitFor(() => expect(r.getByText(SUPPORT_PAGE.title)).toBeTruthy());
  });

  test('it names a way to reach a person', async () => {
    // Arrange
    const r = await wrap();

    // Act / Assert - the address is on the page as selectable text, not only
    // behind a button, for a browser that opens no mail app.
    await waitFor(() => expect(r.getByText(/help@towinly\.com/)).toBeTruthy());
    expect(r.getByText(SUPPORT_PAGE.actionLabel)).toBeTruthy();
  });

  test('every section says something', async () => {
    // Arrange
    const r = await wrap();

    // Act / Assert - an empty heading would read as support that is not there.
    await waitFor(() => expect(r.getByText(SUPPORT_PAGE.sections[0].h)).toBeTruthy());
    SUPPORT_PAGE.sections.forEach((s) => {
      expect(s.p.length).toBeGreaterThan(60);
      expect(r.getByText(s.h)).toBeTruthy();
    });
  });
});

describe('the words on it', () => {
  const everyString = [
    SUPPORT_PAGE.title,
    SUPPORT_PAGE.intro,
    SUPPORT_PAGE.actionLabel,
    SUPPORT_PAGE.deletionLinkLabel,
    ...SUPPORT_PAGE.sections.flatMap((s) => [s.h, s.p]),
    SUPPORT_PAGE.started('a@b.com'),
    SUPPORT_PAGE.startedOnWeb('a@b.com'),
    SUPPORT_PAGE.noMailApp('a@b.com'),
  ];

  test('no em dashes, anywhere a stranger reads', () => {
    everyString.forEach((s) => expect(s).not.toContain('—'));
  });

  // Every instruction on this page was walked against the screen it names
  // (HARD-112). The one that sent people to a menu was the reason: MenuSheet
  // is not mounted by any file in app/, so "open the menu" pointed at nothing.
  test('it sends people to controls that exist', () => {
    const joined = everyString.join(' ');

    // The Guide is a row in the always-visible card on the Profile tab
    // (app/(tabs)/profile.jsx, Row label="Guide" -> /guide).
    expect(joined).toContain('Profile');
    expect(joined).toContain('Guide');
    expect(joined.toLowerCase()).not.toContain('the menu');

    // Deleting quotes the two rows a person taps, the same words the deletion
    // page quotes and profile-label-drift.test.js proves are rendered.
    expect(joined).toContain('Account and data');
    expect(joined).toContain('Delete my account');
  });

  test('it names no part of the product that does not exist', () => {
    const joined = everyString.join(' ').toLowerCase();

    // "parent circle" was on this page and nowhere else in the app: grep the
    // tree and it appears in no screen, no label and no test. The seat is
    // called My Family, and a family member asks with "Add your parent".
    expect(joined).not.toContain('parent circle');
    expect(joined).not.toContain('circle');
  });

  test('it promises no reply time we have never measured', () => {
    // "within 24 hours" and friends are the classic support-page lie. We are
    // one person reading a mailbox, and the copy says so instead.
    const joined = everyString.join(' ').toLowerCase();
    expect(joined).not.toMatch(/within \d+ (hour|day|business)/);
    expect(joined).not.toContain('24/7');
    expect(joined).not.toContain('call us');
  });
});

describe('the URL a store console will hold', () => {
  const appJson = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'app.json'), 'utf8'));

  test('the route file exists at the path the URL claims', () => {
    // expo-router maps app/support.jsx to /support.
    const routeFile = path.join(__dirname, '..', 'app', `${SUPPORT_PAGE_PATH.slice(1)}.jsx`);
    expect(fs.existsSync(routeFile)).toBe(true);
  });

  test('the URL is the baseUrl the export is actually built with', () => {
    const { baseUrl } = appJson.expo.experiments;
    expect(baseUrl).toBe('/app');
    expect(SUPPORT_PAGE_URL).toBe(`https://www.towinly.com${baseUrl}${SUPPORT_PAGE_PATH}`);
  });

  test('it sits under /app, which no phone redirect rule touches', () => {
    expect(SUPPORT_PAGE_URL.startsWith('https://www.towinly.com/app/')).toBe(true);
  });

  test('the mail link carries a subject so a reply thread starts named', () => {
    const link = supportMailto('help@towinly.com');
    expect(link.startsWith('mailto:help@towinly.com?')).toBe(true);
    expect(decodeURIComponent(link)).toContain('Towinly');
  });
});
