// One deployment must not give a reviewer two different answers.
//
// Audit finding V5: EXPO_PUBLIC_LEGAL_CONTACT_EMAIL is set by eas.json for the
// two store profiles and NOT by the Vercel web project. Only the deletion page
// carried a fallback, so on the same web bundle /app/delete-account named an
// address while /app/privacy and /app/terms said Towinly had not set one. A Play
// reviewer opens the deletion page first and the policy second.
//
// Audit finding V4: the two URLs Play Console holds named two different
// mailboxes, one of them the founder's personal Gmail.
//
// Audit finding V7: the deletion page has to be reachable FROM the privacy
// policy, not only from the Data safety form.
//
// The structural tests below are the ones that matter in a year: they fail when
// a FOURTH legal page is added without coming through the shared resolver, which
// is exactly how the three drifted apart in the first place.
import { fireEvent, render } from '@testing-library/react-native';
import { Linking, StyleSheet } from 'react-native';
import { ThemeProvider } from '../src/theme/ThemeContext';
import { DELETION_PAGE_URL, PRIVACY_CONTENT } from '../src/data/legalContent';
import Privacy from '../app/privacy';

const fs = require('fs');
const path = require('path');

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: () => false }),
}));

const ROOT = path.join(__dirname, '..');
const THE_ADDRESS = 'help@towinly.com';
const NO_ADDRESS = 'has not set an address';

/**
 * Run `fn` against the legal modules as a chosen deployment would load them.
 *
 * The variable has to stay set for the whole callback, not just the require:
 * the deletion page resolves its address when the sentence is built, so
 * restoring the environment first would silently test the default every time.
 */
const withLegal = (configured, fn) => {
  const before = process.env.EXPO_PUBLIC_LEGAL_CONTACT_EMAIL;
  try {
    let out;
    jest.isolateModules(() => {
      if (configured === undefined) delete process.env.EXPO_PUBLIC_LEGAL_CONTACT_EMAIL;
      else process.env.EXPO_PUBLIC_LEGAL_CONTACT_EMAIL = configured;
      out = fn({
        legal: require('../src/data/legalContent'),
        deletion: require('../src/data/deleteAccountPage'),
      });
    });
    return out;
  } finally {
    if (before === undefined) delete process.env.EXPO_PUBLIC_LEGAL_CONTACT_EMAIL;
    else process.env.EXPO_PUBLIC_LEGAL_CONTACT_EMAIL = before;
  }
};

/**
 * Every legal surface this repo owns, and the words it puts in front of a
 * person. Keyed by the route file, because the structural test below compares
 * these keys against what is actually on disk.
 */
const surfaceCopy = ({ legal, deletion }) => ({
  'app/terms.jsx': legal.TERMS_CONTENT.map((s) => `${s.h}\n${s.p}`).join('\n'),
  'app/privacy.jsx': legal.PRIVACY_CONTENT.map((s) => `${s.h}\n${s.p}`).join('\n'),
  // The signup sheet renders both documents over the consent checkbox.
  'app/(auth)/register.jsx': [...legal.TERMS_CONTENT, ...legal.PRIVACY_CONTENT]
    .map((s) => s.p)
    .join('\n'),
  'app/delete-account.jsx': [
    deletion.DELETE_ACCOUNT_PAGE.intro,
    ...deletion.DELETE_ACCOUNT_PAGE.sections.map((s) => s.p),
    deletion.DELETE_ACCOUNT_PAGE.started(deletion.deletionContactEmail()),
    deletion.DELETE_ACCOUNT_PAGE.noMailApp(deletion.deletionContactEmail()),
  ].join('\n'),
});

const copyFor = (configured) => withLegal(configured, surfaceCopy);

const walk = (dir, out = []) => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.(js|jsx)$/.test(e.name)) out.push(path.relative(ROOT, p));
  }
  return out;
};

const ROUTES = Object.keys(copyFor(undefined));

describe('the contact address: one deployment, one answer', () => {
  test.each(ROUTES)('%s names a real address when the deploy variable is unset', (route) => {
    // Arrange - exactly the Vercel web project's situation: no variable set.
    const copy = copyFor(undefined)[route];

    // Assert
    expect(copy).toContain(THE_ADDRESS);
    expect(copy).not.toContain(NO_ADDRESS);
  });

  test('a configured deploy address wins on every surface at once', () => {
    // Arrange
    const copy = copyFor('support@example.com');

    // Assert - one variable moves all of them, or none of them.
    for (const [route, words] of Object.entries(copy)) {
      expect(`${route}: ${words}`).toContain('support@example.com');
      expect(words).not.toContain(THE_ADDRESS);
    }
  });

  test('no personal mailbox on any legal surface', () => {
    // Arrange / Act - audit finding V4. The founder's Gmail is the address on
    // the website's own policy, which is a read-only file here and an owner
    // action; nothing this repo renders as legal copy may carry it.
    const copy = copyFor(undefined);

    // Assert
    for (const words of Object.values(copy)) {
      expect(words).not.toMatch(/@gmail\.com/i);
    }
  });

  test('the fallback is the same mailbox eas.json ships to the store builds', () => {
    // Arrange - parity with eas.json is the stated reason the constant is
    // allowed to exist, so it is read from eas.json rather than retyped.
    const eas = JSON.parse(fs.readFileSync(path.join(ROOT, 'eas.json'), 'utf8'));
    const shipped = Object.values(eas.build)
      .map((p) => p.env && p.env.EXPO_PUBLIC_LEGAL_CONTACT_EMAIL)
      .filter(Boolean);
    const fallback = withLegal(undefined, ({ legal }) => legal.LEGAL_CONTACT_FALLBACK);

    // Assert
    expect(shipped.length).toBeGreaterThan(0);
    for (const address of shipped) expect(address).toBe(fallback);
  });
});

describe('the contact address: a fourth page cannot quietly miss it', () => {
  test('only legalContent.js reads the deploy variable', () => {
    // Arrange - the three pages drifted because each resolved the address for
    // itself. A new surface that rolls its own read fails here.
    const readers = [...walk(path.join(ROOT, 'app')), ...walk(path.join(ROOT, 'src'))].filter(
      (f) => fs.readFileSync(path.join(ROOT, f), 'utf8').includes('EXPO_PUBLIC_LEGAL_CONTACT_EMAIL')
    );

    // Assert
    expect(readers).toEqual(['src/data/legalContent.js']);
  });

  test('every route that renders legal copy is checked above', () => {
    // Arrange - any file under app/ that imports the legal data is a legal
    // surface, whether or not somebody remembered to add it to this test.
    const legalRoutes = walk(path.join(ROOT, 'app')).filter((f) =>
      /from '[^']*data\/(legalContent|deleteAccountPage)'/.test(
        fs.readFileSync(path.join(ROOT, f), 'utf8')
      )
    );

    // Assert - add the new page to surfaceCopy() rather than loosening this.
    expect(legalRoutes.sort()).toEqual([...ROUTES].sort());
  });
});

describe('the privacy policy points at the deletion page', () => {
  test('the policy carries the published URL, and only one section does', () => {
    // Arrange / Act - audit finding V7.
    const linked = PRIVACY_CONTENT.filter((s) => s.link);

    // Assert
    expect(linked).toHaveLength(1);
    expect(linked[0].link.url).toBe(DELETION_PAGE_URL);
    expect(DELETION_PAGE_URL).toBe('https://towinly.com/app/delete-account');
  });

  test('the deletion page and the policy quote one URL, not two', () => {
    // Arrange / Act - deleteAccountPage.js re-exports it, so there is one literal.
    const both = withLegal(undefined, ({ legal, deletion }) => [
      legal.DELETION_PAGE_URL,
      deletion.DELETION_PAGE_URL,
    ]);

    // Assert
    expect(both[0]).toBe(both[1]);
  });

  test('it renders as a control a person can press, not a printed address', async () => {
    // Arrange - somebody who has already removed the app cannot tap a sentence.
    const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
    const { label } = PRIVACY_CONTENT.find((s) => s.link).link;
    const { getByRole } = await render(
      <ThemeProvider>
        <Privacy />
      </ThemeProvider>
    );

    // Act
    const link = getByRole('link', { name: label });
    await fireEvent.press(link);

    // Assert - a link role, a 44pt target, and it actually opens the URL.
    expect(StyleSheet.flatten(link.props.style).minHeight).toBeGreaterThanOrEqual(44);
    expect(openURL).toHaveBeenCalledWith(DELETION_PAGE_URL);
    openURL.mockRestore();
  });
});
