// React review, "link-role": a control announced as a link promises the person
// it will hand them off somewhere. VoiceOver and TalkBack say "link", and a
// screen-reader user reads that as "this leaves what I am looking at" — on the
// phone-web build react-native-web also turns the role into role="link" in the
// DOM, where the same promise is made to every assistive technology.
//
// The app already keeps that promise almost everywhere. Every in-app route
// change is a button (Button, TextLink, ActionChip, NavRow, PersonRow, and the
// seventeen hand-written Pressables that call router.push), and the three
// controls that genuinely leave — Google OAuth, the account-deletion page in
// the privacy policy, and the founder's contact rows — are links. Two controls
// broke the rule and said "link" for a route change that never leaves the app:
//
//   src/components/needs/OfferHelpList.jsx — the elder's name on a request
//   app/game.jsx — "Skip to Home"
//
// The elder-name one has a mirror image inside this repo: on the elder's side,
// PostedHelpList opens a helper's profile with the same router.push and calls
// it a button, and the website this app is ported from renders that exact
// control as a <button> too (ToWin/frontend/src/pages/HelperDashboard.jsx).
// Same gesture, same destination, two different announcements.
//
// Two layers, the convention used by press-feedback.test.js: a render pin on
// the control an elder-facing screen reader actually reaches, and a source
// scan so a NEW mislabelled link cannot ship.
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, waitFor } from '@testing-library/react-native';
import { ThemeProvider } from '../src/theme/ThemeContext';
import { ToastProvider } from '../src/context/ToastContext';
import { ConfirmProvider } from '../src/context/ConfirmContext';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: () => true }),
  useFocusEffect: () => {},
}));

jest.mock('../src/context/AuthContext', () => ({
  useAuth: () => ({ user: { role: 'HELPER', userId: 'me', emailVerified: true }, booted: true }),
}));

jest.mock('../src/api/client', () => ({
  __esModule: true,
  default: {
    get: jest.fn(async () => ({ data: { content: [] } })),
    post: jest.fn(async () => ({ data: {} })),
    delete: jest.fn(async () => ({ data: {} })),
  },
  setTokenGetter: jest.fn(),
  setOnSessionExpired: jest.fn(),
  friendlyWriteError: (_e, fallback) => fallback,
}));

import api from '../src/api/client';
import OfferHelpList from '../src/components/needs/OfferHelpList';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SCAN_DIRS = ['app', 'src'];

const wrap = (ui) =>
  render(
    <ThemeProvider>
      {/* gcTime: Infinity — the default 5-min gc timer is scheduled at unmount
          and keeps the Jest worker alive until force-exit */}
      <QueryClientProvider
        client={new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } })}
      >
        <ToastProvider>
          <ConfirmProvider>{ui}</ConfirmProvider>
        </ToastProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );

afterEach(() => jest.clearAllMocks());

test("the elder's name on a request is announced as a button, not a link", async () => {
  api.get.mockImplementation(async (url) =>
    url === '/needs/open'
      ? {
          data: {
            content: [
              {
                id: 'n1',
                title: 'Ride to the clinic',
                category: 'TRANSPORTATION',
                urgency: 'NORMAL',
                elderId: 'e1',
                elderName: 'Eleanor',
              },
            ],
          },
        }
      : { data: { content: [] } }
  );

  const { getByRole, queryByRole } = await wrap(<OfferHelpList />);

  // It opens /user/e1 inside the app, so it is a button.
  await waitFor(() => getByRole('button', { name: 'Eleanor' }));
  expect(queryByRole('link', { name: 'Eleanor' })).toBeNull();
});

// ---------------------------------------------------------------------------
// The scan. Structural, so it states the rule for every file including ones
// nobody has written yet. Comments are stripped before matching, the same
// guard a11y-roles-and-refresh.test.js uses, so this rule can be explained in
// prose directly above the code it governs without tripping itself.
// ---------------------------------------------------------------------------
function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else if (/\.(jsx?|tsx?)$/.test(entry.name)) files.push(full);
  }
  return files;
}

// The "//" of an https:// address is not a line comment. Requiring the slashes
// to follow something other than a colon keeps a real URL inside the element
// text, which is exactly the evidence this scan reads.
function readCode(file) {
  return fs
    .readFileSync(file, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/(^|[^:])\/\/[^\n]*/gm, '$1');
}

function sourceFiles() {
  return SCAN_DIRS.flatMap((dir) => walk(path.join(ROOT, dir)));
}

// The JSX element that owns an attribute: from the "<" that opens the tag to
// the ">" that closes the opening tag. Enough to see the sibling props.
function elementAround(code, index) {
  const start = code.lastIndexOf('<', index);
  let depth = 0;
  for (let i = start; i < code.length; i += 1) {
    const ch = code[i];
    if (ch === '{') depth += 1;
    else if (ch === '}') depth -= 1;
    else if (ch === '>' && depth === 0) return code.slice(start, i + 1);
  }
  return code.slice(start);
}

// Matches a literal role and a conditional one (CreatorCard picks between
// 'link' and 'text' depending on whether the contact row has an address).
const IS_LINK = /accessibilityRole=(?:"link"|'link'|\{[^}]*['"]link['"][^}]*\})/;

function linkSites() {
  const found = [];
  for (const file of sourceFiles()) {
    const code = readCode(file);
    const re = /accessibilityRole=/g;
    let m;
    while ((m = re.exec(code)) !== null) {
      const element = elementAround(code, m.index);
      if (!IS_LINK.test(element)) continue;
      found.push({
        where: `${path.relative(ROOT, file)}:${code.slice(0, m.index).split('\n').length}`,
        element,
      });
    }
  }
  return found;
}

// Handing the person to an address this app does not own: the browser, the
// mail app, the dialer, the OAuth page on the backend.
const HANDS_OFF = /Linking\.openURL|window\.location|open\(href\)|https?:\/\/|mailto:/;

test('nothing announced as a link merely changes the screen inside the app', () => {
  const sites = linkSites();
  expect(sites.length).toBeGreaterThan(0); // the scan must actually find links

  const offenders = sites
    .filter(({ element }) => !HANDS_OFF.test(element))
    .map(
      ({ where }) =>
        `${where} is role="link" but stays inside the app; a route change is a button`
    );
  expect(offenders).toEqual([]);
});

// The other half of the same rule: fixing this by calling everything a button
// would strip the promise from the controls that do keep it. The list is an
// inventory, so it grows when a real hand-off is added and never when an
// in-app route change is mislabelled.
//
// emergency-contacts.jsx joined it on 2026-08-22 (HARD-112): each contact row
// opens `tel:` through the dialer, the same kind of hand-off as CreatorCard's
// mailto rows. Nothing was relaxed to let it in. It satisfies the rule above on
// its own merits, and the test that forbids in-app links is unchanged.
test('the hand-offs out of the app are still announced as links', () => {
  const files = new Set(linkSites().map(({ where }) => where.split(':')[0]));
  expect([...files].sort()).toEqual([
    'app/emergency-contacts.jsx',
    'src/components/auth/GoogleLoginButton.jsx',
    'src/components/feedback/CreatorCard.jsx',
    'src/components/legal/LegalSections.jsx',
  ]);
});
