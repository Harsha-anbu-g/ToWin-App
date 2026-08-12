// Deep audit 2026-08-11, group "passon-family": four findings about the two
// screens an elder opens to look at her own life — what she passes on, and
// what her family may see.
//
// Three of the four are the same defect wearing different clothes: a dropped
// fetch folds into an empty array and the page then states the empty as fact.
// "There is nobody to write to." "You need three family members." "You have no
// friendships yet." None of those are true, and each one is a sentence about
// her own relationships. The fourth is the family alert feed rendering a
// year of history at once inside the Home tab's plain ScrollView.
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render } from '@testing-library/react-native';
import { ThemeProvider } from '../src/theme/ThemeContext';
import { ToastProvider } from '../src/context/ToastContext';
import { ConfirmProvider } from '../src/context/ConfirmContext';

// The open tab lives in the route params on the pass-on page, and pressing a
// segment only calls setParams — so each test pins the tab it is about.
let mockParams = {};
jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    setParams: jest.fn(),
    canGoBack: () => true,
  }),
  useLocalSearchParams: () => mockParams,
  useFocusEffect: () => {},
  Redirect: () => null,
}));

jest.mock('../src/api/client', () => ({
  __esModule: true,
  default: {
    get: jest.fn(async () => ({ data: {} })),
    post: jest.fn(async () => ({ data: {} })),
    put: jest.fn(async () => ({ data: {} })),
    delete: jest.fn(async () => ({ data: {} })),
  },
  friendlyWriteError: (_err, fallback) => fallback,
  setTokenGetter: jest.fn(),
  setOnSessionExpired: jest.fn(),
}));

jest.mock('../src/context/AuthContext', () => ({
  __esModule: true,
  AuthProvider: ({ children }) => children,
  useAuth: () => ({ user: { role: 'ELDER', userId: 'eld-1', emailVerified: true }, booted: true }),
}));

import api from '../src/api/client';
import PassOn from '../app/pass-on/index';
import MyFamilyScreen from '../app/family/index';
import MyBoxesCard from '../src/components/passon/MyBoxesCard';
import FamilyAlertsFeed from '../src/components/family/FamilyAlertsFeed';

// gcTime: Infinity — the default gc timer is scheduled at unmount and keeps
// the Jest worker alive until force-exit (the house pattern).
const newClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity },
      mutations: { retry: false, gcTime: Infinity },
    },
  });

const wrapWith = (client, ui) =>
  render(
    <ThemeProvider>
      <QueryClientProvider client={client}>
        <ToastProvider>
          <ConfirmProvider>{ui}</ConfirmProvider>
        </ToastProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );

const wrap = (ui) => wrapWith(newClient(), ui);

const loadErrorFor = (what) =>
  `We couldn't load ${what} right now. Please check your connection and try again.`;

const dropped = () => Promise.reject(new Error('Network request failed'));

beforeEach(() => {
  mockParams = {};
});
afterEach(() => jest.clearAllMocks());

// ── DEEP-13: the pass-on page must not read a dropped fetch as "nobody". ──
describe('DEEP-13 pass-on: a dropped fetch never speaks as an empty list', () => {
  const SETUP_READY = {
    armed: false,
    emailConfirmed: true,
    hasPassword: true,
    notAWillAck: 'This is not a will.',
    keyTruthAck: 'A key is not the words.',
  };

  // /passon/mine and /passon/setup answer; the three lists this page borrows
  // from other features are the ones that drop.
  const stubPassOn = ({ links, connections, keyholders, setup = SETUP_READY }) =>
    api.get.mockImplementation(async (url) => {
      if (url === '/passon/mine') return { data: { stories: [], letters: [] } };
      if (url === '/passon/setup') return { data: setup };
      if (url === '/passon/sealed') return { data: [] };
      if (url === '/family/links') return links === 'drop' ? dropped() : { data: links };
      if (url === '/connections') return connections === 'drop' ? dropped() : { data: connections };
      if (url === '/passon/keyholders')
        return keyholders === 'drop' ? dropped() : { data: keyholders };
      return { data: {} };
    });

  test('letters: with the people lists dropped, the writer is not offered as "nobody to write to"', async () => {
    stubPassOn({ links: 'drop', connections: 'drop', keyholders: [] });
    mockParams = { tab: 'letters' };
    const r = await wrap(<PassOn />);

    await r.findByText(loadErrorFor('the people you can write to'));
    // Opening the writer here would hand her a picker holding nobody and a
    // Save she can never pass, so the way in waits for the retry.
    expect(r.queryByRole('button', { name: 'Write a letter' })).toBeNull();
  });

  test('sealed setup: with the family list dropped, she is not told she has too few family', async () => {
    stubPassOn({ links: 'drop', connections: [], keyholders: [] });
    mockParams = { tab: 'sealed' };
    const r = await wrap(<PassOn />);

    await fireEvent.press(await r.findByRole('button', { name: 'Set this up' }));

    r.getByText(loadErrorFor('your family list'));
    expect(r.queryByText('You need at least three people on your family list first.')).toBeNull();
  });

  test('keyholders: with the list dropped, the card does not show an armed box as held by nobody', async () => {
    stubPassOn({
      links: [],
      connections: [],
      keyholders: 'drop',
      setup: { armed: true, canStillUndo: false, approvalsNeeded: 2, keyholderTarget: 3 },
    });
    mockParams = { tab: 'sealed' };
    const r = await wrap(<PassOn />);

    await r.findByText(loadErrorFor('your keyholders'));
    expect(r.queryByText('Who can open it one day')).toBeNull();
  });
});

// ── DEEP-14: Family Controls must not deny her friendships exist. ─────────
describe('DEEP-14 family controls: a dropped /connections is not "no friendships"', () => {
  const member = {
    id: 'm1',
    otherUserId: 'f1',
    otherUserName: 'sarah',
    relationship: 'Daughter',
    status: 'ACTIVE',
    iAmElder: true,
    isPrimary: true,
  };
  const LINKS = { activeLinks: [member], incomingRequests: [], outgoingRequests: [] };

  const stubFamily = () =>
    api.get.mockImplementation(async (url) => {
      if (url === '/family/links') return { data: LINKS };
      if (url === '/connections') return dropped();
      return { data: {} };
    });

  test('Sharing: the failure is said plainly instead of "You have no friendships yet"', async () => {
    stubFamily();
    const r = await wrap(<MyFamilyScreen />);

    await r.findByText(loadErrorFor('your friendships'));
    expect(
      r.queryByText(
        'You have no friendships yet. Once you do, you choose here which ones your family can see.'
      )
    ).toBeNull();
  });

  test('Act for me: the same failure does not become "Share a friendship first"', async () => {
    stubFamily();
    const r = await wrap(<MyFamilyScreen />);
    await r.findByText(loadErrorFor('your friendships'));

    await fireEvent.press(r.getByText('Act for me'));

    r.getByText(loadErrorFor('your friendships'));
    expect(r.queryByText('Share a friendship first')).toBeNull();
  });
});

// ── DEEP-10: the home card must not hold last hour's counts all session. ──
describe('DEEP-10 My boxes card: the counts follow the page they summarise', () => {
  test('a reload of the pass-on data moves the count on the card', async () => {
    let stories = [{ id: 's1', title: 'The bakery' }];
    api.get.mockImplementation(async (url) => {
      if (url === '/passon/mine') return { data: { stories, letters: [] } };
      if (url === '/passon/setup') return { data: { armed: false } };
      return { data: {} };
    });

    const client = newClient();
    const r = await wrapWith(client, <MyBoxesCard />);
    await r.findByText('1 story');

    // Exactly what the pass-on page's reload() invalidates after she saves.
    stories = [...stories, { id: 's2', title: 'The move' }];
    await act(async () => {
      await Promise.all(
        ['passon-mine', 'passon-setup', 'passon-keyholders', 'passon-sealed'].map((key) =>
          client.invalidateQueries({ queryKey: [key] })
        )
      );
    });

    await r.findByText('2 stories');
  });
});

// ── DEEP-39: the alert feed is a window, not the whole archive. ───────────
describe('DEEP-39 family alerts: a long history renders a capped window', () => {
  const history = (n) =>
    Array.from({ length: n }, (_, i) => ({
      id: `al${i}`,
      elderId: 'e1',
      elderName: 'Margaret Reyes',
      type: 'INACTIVITY',
      body: `Has not been active on Towinly, notice ${i}.`,
      createdAt: '2026-08-01T12:00:00',
    }));

  const stubAlerts = (alerts) =>
    api.get.mockImplementation(async (url) =>
      url === '/family/alerts' ? { data: { alerts } } : { data: {} }
    );

  test('only the newest alerts mount, with a way to see the older ones', async () => {
    stubAlerts(history(25));
    const r = await wrap(<FamilyAlertsFeed />);

    await r.findByText('Has not been active on Towinly, notice 0.');
    r.getByText('Has not been active on Towinly, notice 19.');
    expect(r.queryByText('Has not been active on Towinly, notice 20.')).toBeNull();

    await fireEvent.press(r.getByRole('button', { name: 'Show 5 older alerts' }));
    r.getByText('Has not been active on Towinly, notice 24.');
  });

  test('the plain-words explanation is still printed once, not once per row', async () => {
    stubAlerts(history(25));
    const r = await wrap(<FamilyAlertsFeed />);

    await r.findByText('Has not been active on Towinly, notice 0.');
    expect(
      r.getAllByText('They have not checked in for a while. A friendly call could help.')
    ).toHaveLength(1);
  });
});
