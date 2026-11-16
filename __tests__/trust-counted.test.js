// Trust Score page, "points arrive when a help is finished" (trust tiers
// step 1). The server sends `counted` on each friendship card of
// GET /trust/my-score: false until the elder has ended a help between the two,
// and then every point on that card is 0 while `stageIndex` still shows the
// live step. These tests lock what the page does with it: one plain line in
// place of the empty meters, a one-time note, and an honest "helped you reach
// this" count. An older server sends no `counted` at all, and the page must
// then look exactly as it did before.
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
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
  },
  setTokenGetter: jest.fn(),
  setOnSessionExpired: jest.fn(),
}));

// One in-memory store, so the test can see the "shown once" flag being kept.
const mockStore = new Map();
jest.mock('../src/lib/storage', () => ({
  getItemAsync: jest.fn(async (k) => (mockStore.has(k) ? mockStore.get(k) : null)),
  setItemAsync: jest.fn(async (k, v) => {
    mockStore.set(k, v);
  }),
  deleteItemAsync: jest.fn(async (k) => {
    mockStore.delete(k);
  }),
}));

let mockRole = 'HELPER';
jest.mock('../src/context/AuthContext', () => ({
  __esModule: true,
  AuthProvider: ({ children }) => children,
  useAuth: () => ({ user: { role: mockRole, userId: 'u1', emailVerified: true }, booted: true }),
}));

import api from '../src/api/client';
import { KEYS, APP_WRITTEN_KEYS } from '../src/lib/storageKeys';
import TrustScreen from '../app/trust/index';

const wrap = (ui) =>
  render(
    <ThemeProvider>
      <QueryClientProvider
        client={new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } })}
      >
        <ToastProvider>
          <ConfirmProvider>{ui}</ConfirmProvider>
        </ToastProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );

const LINE = 'Counts after a help is finished';
const NOTE_TITLE = 'Points count after a help is finished';

// A friendship with a finished help: the points are real.
const counted = {
  connectionId: 'c1', customerName: 'Margaret', customerPhotoUrl: null, stageIndex: 3, counted: true,
  total: 7, totalMax: 15, rooting: 4, rootingMax: 7, review: 0, reviewMax: 5,
  profile: 3, profileMax: 3, family: 0, familyMax: 0,
};
// A friendship with no finished help yet: the server sends zeros and the live step.
const waiting = {
  connectionId: 'c2', customerName: 'David', customerPhotoUrl: null, stageIndex: 3, counted: false,
  total: 0, totalMax: 15, rooting: 0, rootingMax: 7, review: 0, reviewMax: 5,
  profile: 0, profileMax: 3, family: 0, familyMax: 0,
};

const stubScore = (breakdown) =>
  api.get.mockImplementation(async (url) => {
    if (url === '/trust/my-score') return { data: breakdown };
    return { data: {} };
  });

beforeEach(() => {
  mockRole = 'HELPER';
  mockStore.clear();
});
afterEach(() => jest.clearAllMocks());

test('a friendship with no finished help shows one line, not empty meters', async () => {
  stubScore({ totalScore: 3, tier: 'Getting Started', customers: [waiting] });
  const r = await wrap(<TrustScreen />);

  await r.findByText('David');
  r.getByText(LINE);
  // The live step still shows, so the person sees where the two of them are.
  r.getByText('Video');
  // No row of zeros: the bar, the three meters and "0 / 15 points" are gone.
  expect(r.queryByText('Trust stages')).toBeNull();
  expect(r.queryByText('Their review')).toBeNull();
  expect(r.queryByText(/\/ 15 points/)).toBeNull();
});

test('a friendship with a finished help keeps its meters and has no waiting line', async () => {
  stubScore({ totalScore: 7, tier: 'Getting Started', customers: [counted] });
  const r = await wrap(<TrustScreen />);

  await r.findByText('Margaret');
  r.getByText('Trust stages');
  r.getByText('Their review');
  expect(r.queryByText(LINE)).toBeNull();
});

test('"helped you reach this" counts only the friendships that add points', async () => {
  stubScore({ totalScore: 7, tier: 'Getting Started', customers: [counted, waiting] });
  const r = await wrap(<TrustScreen />);

  await r.findByText('David');
  r.getByText('1 person helped you reach this');
  expect(r.queryByText(/2 people/)).toBeNull();
});

test('nobody is said to have helped while no friendship counts yet', async () => {
  stubScore({ totalScore: 3, tier: 'Getting Started', customers: [waiting] });
  const r = await wrap(<TrustScreen />);

  await r.findByText('David');
  expect(r.queryByText(/helped you reach this/)).toBeNull();
});

test('the note about the rule shows once, and "Got it" puts it away for good', async () => {
  stubScore({ totalScore: 7, tier: 'Getting Started', customers: [counted, waiting] });
  const first = await wrap(<TrustScreen />);

  await first.findByText(NOTE_TITLE);
  first.getByText(
    'A friendship adds to your score once a help between you two is finished. If your score went down, this is why.'
  );
  await fireEvent.press(first.getByText('Got it'));
  await waitFor(() => expect(first.queryByText(NOTE_TITLE)).toBeNull());
  expect(mockStore.get(KEYS.trustRuleExplained)).toBe('1');
  await first.unmount();

  const second = await wrap(<TrustScreen />);
  await second.findByText('David');
  expect(second.queryByText(NOTE_TITLE)).toBeNull();
});

test('the note flag is a registered app key', () => {
  expect(KEYS.trustRuleExplained).toMatch(/^towin/);
  expect(APP_WRITTEN_KEYS).toContain(KEYS.trustRuleExplained);
});

test('an older server (no `counted`) changes nothing: meters stay, no line, no note', async () => {
  const { counted: _dropped, ...oldCard } = counted;
  stubScore({ totalScore: 7, tier: 'Getting Started', customers: [oldCard] });
  const r = await wrap(<TrustScreen />);

  await r.findByText('Margaret');
  r.getByText('Trust stages');
  r.getByText('1 person helped you reach this');
  expect(r.queryByText(LINE)).toBeNull();
  expect(r.queryByText(NOTE_TITLE)).toBeNull();
});

test('with no friends yet, the page says points come after a finished help', async () => {
  stubScore({ totalScore: 3, tier: 'Getting Started', customers: [] });
  const r = await wrap(<TrustScreen />);

  await r.findByText('Trust starts with a friend. Add someone, finish a help together, and your points appear here.');
  expect(r.queryByText(NOTE_TITLE)).toBeNull();
});

// The same note sits on Home, where a lower score is first seen (owner call
// 2026-11-15). One flag for both places: "Got it" on either puts both away.
describe('TrustRuleNote', () => {
  const TrustRuleNote = require('../src/components/trust/TrustRuleNote').default;
  const wrapNote = (ui) => render(<ThemeProvider>{ui}</ThemeProvider>);

  test('shows when the server sends `counted`, with a way to the score page', async () => {
    const onSeeScore = jest.fn();
    const r = await wrapNote(<TrustRuleNote customers={[waiting]} onSeeScore={onSeeScore} />);

    await r.findByText(NOTE_TITLE);
    await fireEvent.press(r.getByText('See your score'));
    expect(onSeeScore).toHaveBeenCalledTimes(1);
  });

  test('stays away for an older server, for no friends, and after "Got it"', async () => {
    const { counted: _dropped, ...oldCard } = counted;
    const old = await wrapNote(<TrustRuleNote customers={[oldCard]} />);
    expect(old.queryByText(NOTE_TITLE)).toBeNull();
    await old.unmount();

    const none = await wrapNote(<TrustRuleNote customers={undefined} />);
    expect(none.queryByText(NOTE_TITLE)).toBeNull();
    await none.unmount();

    mockStore.set(KEYS.trustRuleExplained, '1');
    const seen = await wrapNote(<TrustRuleNote customers={[waiting]} />);
    await waitFor(() => expect(seen.queryByText(NOTE_TITLE)).toBeNull());
  });

  test('Home mounts the note from the score it already loads', () => {
    const home = require('fs').readFileSync(require('path').join(__dirname, '../app/(tabs)/home.jsx'), 'utf8');
    expect(home).toMatch(/<TrustRuleNote\s+customers=\{trust\?\.customers\}/);
  });
});
