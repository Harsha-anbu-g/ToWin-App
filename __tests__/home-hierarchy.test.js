// UX-711 — Home hierarchy, locked by tests: the person's name on every hub
// card is a serif Newsreader 400 title (web ElderDashboard parity: the app
// used sans 600 on HelperCard and PausedCard while ElderCard was already
// serif); the home CONTENT contributes zero default-variant (filled primary)
// Buttons because the tab shell's center FAB is the screen's one filled
// primary; the family surface swaps its two primaries so only one is ever on
// screen; and no home surface carries a shadow or elevation style prop.
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render } from '@testing-library/react-native';
import fs from 'fs';
import path from 'path';
import { ThemeProvider } from '../src/theme/ThemeContext';
import { ToastProvider } from '../src/context/ToastContext';
import { ConfirmProvider } from '../src/context/ConfirmContext';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: () => true }),
  useFocusEffect: (effect) => require('react').useEffect(effect, [effect]),
  Redirect: () => null,
}));

jest.mock('../src/api/client', () => ({
  __esModule: true,
  default: {
    post: jest.fn(async () => ({ data: {} })),
    get: jest.fn(async () => ({ data: {} })),
    delete: jest.fn(async () => ({ data: {} })),
  },
  setTokenGetter: jest.fn(),
  setOnSessionExpired: jest.fn(),
  friendlyWriteError: (err, fallback) => fallback,
}));

// The trust panels read the block list, which is scoped to the signed-in
// account (src/lib/blockList.js), so they need an account in context.
jest.mock('../src/context/AuthContext', () => ({
  useAuth: () => ({ user: { role: 'ELDER', userId: 'me', emailVerified: true }, booted: true }),
}));

// Reduce motion pins FamilyShareToggle's knob to setValue (the app
// convention) so HelperCard renders without pending Animated timers.
jest.mock('../src/lib/useReducedMotion', () => ({ useReducedMotion: () => true }));

import api from '../src/api/client';
import FamilyHomePanel from '../src/components/family/FamilyHomePanel';
import MyHelpersPanel from '../src/components/trust/MyHelpersPanel';
import PausedCard from '../src/components/trust/PausedCard';

const flatten = (style) =>
  (Array.isArray(style) ? style : [style])
    .flat(Infinity)
    .filter(Boolean)
    .reduce((acc, s) => ({ ...acc, ...s }), {});

const wrap = (ui) =>
  render(
    <ThemeProvider>
      {/* gcTime: Infinity — the default 5-min gc timer is scheduled at
          unmount and keeps the Jest worker alive until force-exit. */}
      <QueryClientProvider
        client={
          new QueryClient({
            defaultOptions: {
              queries: { retry: false, gcTime: Infinity },
              mutations: { retry: false, gcTime: Infinity },
            },
          })
        }
      >
        <ToastProvider>
          <ConfirmProvider>{ui}</ConfirmProvider>
        </ToastProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );

afterEach(() => jest.clearAllMocks());

// ---------------------------------------------------------------- render pins

const helperCardFixtures = () =>
  api.get.mockImplementation(async (url) => {
    if (url === '/trust/my-score')
      return {
        data: {
          totalScore: 8,
          customers: [
            { connectionId: 'c1', customerName: 'Meera Iyer', stageIndex: 2, total: 8, totalMax: 15 },
          ],
        },
      };
    if (url === '/connections')
      return {
        data: [
          {
            id: 'c1',
            otherUserId: 'u9',
            otherUserName: 'Meera Iyer',
            status: 'ACTIVE',
            type: 'HELPER',
            confirmedByMe: false,
            confirmedByOther: false,
            sharedWithFamily: false,
          },
        ],
      };
    return { data: {} };
  });

test('HelperCard: the helper name is a serif Newsreader 400 title, not sans 600 (web hub-card parity)', async () => {
  helperCardFixtures();
  const { findByText } = await wrap(<MyHelpersPanel />);
  const name = await findByText('Meera Iyer');
  const style = flatten(name.props.style);
  expect(style.fontFamily).toBe('Newsreader_400Regular');
  expect(style.fontWeight).toBeUndefined();
});

test('PausedCard: the paused person keeps the same serif name treatment', async () => {
  const { getByText } = await render(
    <ThemeProvider>
      <PausedCard conn={{ otherUserName: 'Ravi Menon' }} onResume={() => {}} resuming={false} />
    </ThemeProvider>
  );
  const name = getByText('Ravi Menon');
  const style = flatten(name.props.style);
  expect(style.fontFamily).toBe('Newsreader_400Regular');
  expect(style.fontWeight).toBeUndefined();
});

test('Family home: opening the add form swaps the one filled primary, never doubles it', async () => {
  api.get.mockImplementation(async (url) => {
    if (url === '/family/links')
      return { data: { activeLinks: [], incomingRequests: [], outgoingRequests: [] } };
    if (url === '/family/alerts') return { data: { alerts: [] } };
    return { data: {} };
  });
  const r = await wrap(<FamilyHomePanel />);
  await r.findByRole('button', { name: '+ Add your parent' });
  await fireEvent.press(r.getByRole('button', { name: '+ Add your parent' }));
  // The header pill hides so "Send request" is the screen's ONE filled primary.
  expect(r.queryByRole('button', { name: '+ Add your parent' })).toBeNull();
  r.getByRole('button', { name: 'Send request' });
});

// --------------------------------------------------------------- source scans

const read = (rel) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');

// Every file rendered on the elder/helper Home surface. The tab shell's
// center FAB (app/(tabs)/_layout.jsx) is the screen's one filled primary, so
// the content below it must never add a default-variant Button.
const ELDER_HELPER_HOME_CLOSURE = [
  'app/(tabs)/home.jsx',
  'src/components/home/GreetingHeader.jsx',
  'src/components/home/MenuSheet.jsx',
  'src/components/trust/MyHelpersPanel.jsx',
  'src/components/trust/MyEldersPanel.jsx',
  'src/components/trust/PausedCard.jsx',
  'src/components/trust/TrustLadder.jsx',
  'src/components/passon/MyBoxesCard.jsx',
  'src/components/ui/NavRow.jsx',
  'src/components/family/FamilyShareToggle.jsx',
];

// The FAMILY home surface has no center FAB, so its one filled primary lives
// in the content — "+ Add your parent", swapped for "Send request" while the
// form is open (mutual exclusion pinned by render above).
const FAMILY_HOME_SURFACE = [
  'src/components/family/FamilyHomePanel.jsx',
  'src/components/family/AddParentForm.jsx',
  'src/components/family/FamilyAlertsFeed.jsx',
  'src/components/family/FamilyRows.jsx',
  'src/components/passon/KeyholderAsk.jsx',
];

// A <Button without variant= renders the filled sky primary.
const defaultVariantButtons = (source) => {
  const chunks = [];
  let idx = source.indexOf('<Button');
  while (idx !== -1) {
    const end = source.indexOf('/>', idx);
    chunks.push(source.slice(idx, end === -1 ? source.length : end));
    idx = source.indexOf('<Button', idx + 1);
  }
  return chunks.filter((c) => !c.includes('variant='));
};

test('elder/helper home content contributes zero filled primaries: the shell FAB is the one', () => {
  const offenders = ELDER_HELPER_HOME_CLOSURE.flatMap((f) =>
    defaultVariantButtons(read(f)).map((c) => `${f}: ${c.slice(0, 60)}`)
  );
  expect(offenders).toEqual([]);
});

test('family home surface holds exactly one filled primary per state', () => {
  // Header pill while browsing; the form swaps it for its submit.
  expect(defaultVariantButtons(read('src/components/family/FamilyHomePanel.jsx'))).toHaveLength(1);
  expect(defaultVariantButtons(read('src/components/family/AddParentForm.jsx'))).toHaveLength(1);
  // Everything else on the family surface stays quiet.
  const rest = FAMILY_HOME_SURFACE.slice(2);
  const offenders = rest.flatMap((f) => defaultVariantButtons(read(f)).map(() => f));
  expect(offenders).toEqual([]);
});

test('no shadow or elevation style props on any home surface (hairlines only)', () => {
  const SHADOW_PROP = /\b(shadowColor|shadowOffset|shadowOpacity|shadowRadius|elevation)\s*:/;
  const offenders = [...ELDER_HELPER_HOME_CLOSURE, ...FAMILY_HOME_SURFACE].filter((f) =>
    SHADOW_PROP.test(read(f))
  );
  expect(offenders).toEqual([]);
});
