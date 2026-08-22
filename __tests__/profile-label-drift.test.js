// The public deletion page quotes four labels from the profile screen by hand.
// Rename one there and the page starts telling a stranger to tap a button that
// does not exist, on the URL Play Console points at.
//
// The old guard read app/(tabs)/profile.jsx off disk and asserted the label was
// somewhere in the file. Audit finding V3 proved by mutation that it does not
// bite on the most important one: a stale copy of "Delete my account" sits in a
// code comment, so renaming every button a person can see left the guard green.
// "Account and data" had the same hole from the other side, held alive by an
// accessibilityLabel while the visible text drifted.
//
// So this file does not read the source. It renders the screen, opens the
// folded account card, walks both delete confirmations, and asserts each label
// against what a person actually sees. A comment cannot satisfy any of it.
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render } from '@testing-library/react-native';
import { AuthProvider } from '../src/context/AuthContext';
import { ConfirmProvider } from '../src/context/ConfirmContext';
import { ToastProvider } from '../src/context/ToastContext';
import { ThemeProvider } from '../src/theme/ThemeContext';
import { DELETE_ACCOUNT_PAGE, deletionContactEmail } from '../src/data/deleteAccountPage';
import { SUPPORT_PAGE } from '../src/data/supportPage';
import api from '../src/api/client';
import ProfileScreen from '../app/(tabs)/profile';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: () => true }),
  useFocusEffect: (effect) => require('react').useEffect(effect, [effect]),
  Redirect: () => null,
}));

jest.mock('../src/api/client', () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn(async () => ({ data: {} })), delete: jest.fn() },
  setTokenGetter: jest.fn(),
  setOnSessionExpired: jest.fn(),
}));

const FEEDS = {
  '/profile/me': { name: 'Margaret', city: 'Montreal' },
  '/trust/my-score': { total: 15 },
  '/connections': [],
  '/streaks/me': {},
  '/reviews/mine': [],
};

/**
 * Every word the get-help page renders, as one string. That page is the Support
 * URL App Store Connect holds, and it quotes app labels by hand exactly the way
 * the deletion page does, so it gets the same guard (HARD-112).
 */
const supportCopy = () =>
  [
    SUPPORT_PAGE.title,
    SUPPORT_PAGE.intro,
    ...SUPPORT_PAGE.sections.flatMap((s) => [s.h, s.p]),
    SUPPORT_PAGE.actionLabel,
    SUPPORT_PAGE.deletionLinkLabel,
  ].join('\n');

/** Every word the deletion page renders, as one string. */
const pageCopy = () =>
  [
    DELETE_ACCOUNT_PAGE.title,
    DELETE_ACCOUNT_PAGE.intro,
    ...DELETE_ACCOUNT_PAGE.sections.flatMap((s) => [s.h, s.p]),
    DELETE_ACCOUNT_PAGE.actionLabel,
    DELETE_ACCOUNT_PAGE.started(deletionContactEmail()),
    DELETE_ACCOUNT_PAGE.noMailApp(deletionContactEmail()),
  ].join('\n');

const wrap = (ui) =>
  render(
    <ThemeProvider>
      {/* gcTime: Infinity, matching the other profile suites. The default gc
          timer is scheduled at unmount and holds the Jest worker open. */}
      <QueryClientProvider
        client={new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } })}
      >
        <AuthProvider>
          <ToastProvider>
            <ConfirmProvider>{ui}</ConfirmProvider>
          </ToastProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );

/**
 * Render the profile screen and drive it as far as the second confirmation, so
 * every quoted label has been on screen by the time the assertions run.
 *
 * One render for the whole file on purpose: an earlier suite that rendered per
 * test took the run from 17s to 130s and timed out four unrelated files.
 */
const openTheDeletePath = async () => {
  api.get.mockImplementation(async (url) => ({ data: FEEDS[url] ?? {} }));
  const screen = await wrap(<ProfileScreen />);

  // The account card is folded away, so "Delete my account" is never sitting in
  // the open where a mis-tap can reach it.
  await act(async () => {
    fireEvent.press(screen.getByLabelText('Account and data'));
  });
  return screen;
};

describe('the labels the deletion page quotes are the labels the app renders', () => {
  // ONE render, and therefore ONE test that uses it.
  //
  // This file used to render the screen once and share it across five tests
  // through a memoising beforeEach. Sharing a render across tests shares its
  // failures too: when the render ran slow, the first test spent the budget and
  // the other four reported "Screen is no longer attached", which is a fact
  // about the shared render and says nothing about any label. That is a suite
  // that lies about what broke, so the four labels are asserted in one test
  // over the single render instead (HARD-115).
  //
  // Rendering per test is not the alternative: a sibling suite that did took
  // the run from 17s to 130s and timed out four unrelated files.
  const collectRenderedLabels = async () => {
    const screen = await openTheDeletePath();
    const found = {
      // The get-help page tells a stranger to open Profile and tap Guide. That
      // row sits in the always-visible card, so it is read before the account
      // card is opened.
      Guide: [screen.getByText('Guide')],
      // Both halves of "Account and data": the visible row AND the label a
      // screen reader hears. Renaming either one alone used to pass.
      'Account and data': [
        screen.getByText('Account and data'),
        screen.getByLabelText('Account and data'),
      ],
      'Send me a copy of my data': [screen.getByText('Send me a copy of my data')],
      'Delete my account': [screen.getByText('Delete my account')],
    };

    // Walk both gates. The second confirmation only exists once the first is
    // answered, and "Delete forever" is the label that actually removes an
    // account, so the page must never quote a stale version of it.
    await act(async () => {
      fireEvent.press(screen.getByText('Delete my account'));
    });
    screen.getByText('Delete your account?');
    // Two controls now carry this label: the row on the screen and the confirm
    // button in the sheet over it. The sheet mounts last, so it is the later one.
    await act(async () => {
      fireEvent.press(screen.getAllByLabelText('Delete my account').at(-1));
    });
    screen.getByText('Are you absolutely sure?');
    found['Delete forever'] = [screen.getByLabelText('Delete forever')];
    return found;
  };

  const QUOTED_BY_DELETION_PAGE = [
    'Account and data',
    'Send me a copy of my data',
    'Delete my account',
    'Delete forever',
  ];
  // The get-help page names fewer controls, and every one of them has to be
  // real: its previous instruction sent people to a menu no screen mounts.
  const QUOTED_BY_SUPPORT_PAGE = ['Guide', 'Account and data', 'Delete my account'];

  test('every label these two pages quote is one the app puts on screen', async () => {
    // Arrange / Act - one render, driven to the second confirmation. Both
    // assertions share it, because a second test would mean a second render.
    const seen = await collectRenderedLabels();

    // Assert - rendered, not merely present somewhere in the source file.
    for (const label of QUOTED_BY_DELETION_PAGE) {
      for (const node of seen[label]) expect(node).toBeTruthy();
      expect(pageCopy()).toContain(label);
    }
    for (const label of QUOTED_BY_SUPPORT_PAGE) {
      for (const node of seen[label]) expect(node).toBeTruthy();
      expect(supportCopy()).toContain(label);
    }
  });

  test('the second gate is named on the page, so nobody stops at the first', () => {
    // Arrange / Act
    const { p } = DELETE_ACCOUNT_PAGE.sections.find((s) => s.h === 'If you have the Towinly app');

    // Assert
    expect(p).toContain('Delete forever');
  });
});
