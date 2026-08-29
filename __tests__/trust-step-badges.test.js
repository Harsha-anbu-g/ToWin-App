// Trust-step badges, both seats (owner calls 2026-08-28):
// - helper: "when the elder pushes the ladder the helper should get a
//   notification in the My Elders tab badge so they can accept, and also the
//   badge in the elder's name" — an action badge that looking cannot clear;
// - elder: "same in elders: when the helper accepts, a badge in My Helpers
//   and near the helper's name", "until I accept, the badge should be there"
//   — news, seeded quiet on first run, kept until the elder starts the next
//   step (at the top of the ladder, until the row is opened);
// - both step buttons are filled blue ("accept the next step should be in
//   blue background"; "start the next step also in blue in elders log in").
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { ConfirmProvider } from '../src/context/ConfirmContext';
import { ToastProvider } from '../src/context/ToastContext';
import { ThemeProvider } from '../src/theme/ThemeContext';

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
  friendlyWriteError: (_e, fallback) => fallback,
}));

let mockRole = 'ELDER';
jest.mock('../src/context/AuthContext', () => ({
  __esModule: true,
  AuthProvider: ({ children }) => children,
  useAuth: () => ({ user: { role: mockRole, userId: 'me', emailVerified: true }, booted: true }),
}));

jest.mock('../src/lib/blockList', () => ({
  getBlocked: jest.fn(async () => []),
  filterBlocked: (list) => list,
}));

jest.mock('../src/lib/useReducedMotion', () => ({ useReducedMotion: () => true }));

jest.mock('../src/lib/storage', () => {
  const backing = new Map();
  return {
    __esModule: true,
    getItemAsync: jest.fn(async (k) => backing.get(k) ?? null),
    setItemAsync: jest.fn(async (k, v) => {
      backing.set(k, v);
    }),
    deleteItemAsync: jest.fn(async (k) => {
      backing.delete(k);
    }),
    _backing: backing,
  };
});

import api from '../src/api/client';
import MyEldersPanel from '../src/components/trust/MyEldersPanel';
import MyHelpersPanel from '../src/components/trust/MyHelpersPanel';
import { _resetSeenForTests, loadSeen, seedNewIds, unseenCount, unseenTokens } from '../src/lib/seenIds';
import { seenKey } from '../src/lib/storageKeys';
import {
  TRUST_STEPS_CATEGORY,
  isLadderComplete,
  isStepAwaitingMe,
  isStepNewsPending,
  peopleWithNews,
  stepNewsToken,
  stepNewsTokens,
  stepsAwaitingMe,
} from '../src/lib/trustStepBadges';
import { light } from '../src/theme/tokens';

const fs = require('fs');
const path = require('path');

const Store = jest.requireMock('../src/lib/storage');
const read = (rel) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');
const flatten = (style) => StyleSheet.flatten(style) ?? {};
// The badge hides from assistive tech on purpose (the row's label speaks the
// news), and RNTL 14 skips hidden elements unless asked.
const HIDDEN = { includeHiddenElements: true };

const wrap = (ui) =>
  render(
    <ThemeProvider>
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

const conn = (over = {}) => ({
  id: 'c1',
  otherUserId: 'u1',
  otherUserName: 'Priya Sharma',
  status: 'ACTIVE',
  type: 'SOCIAL',
  currentTrustLevel: 'PHONE_CALL',
  createdAt: '2026-08-25T13:01:16',
  confirmedByMe: false,
  confirmedByOther: false,
  sharedWithFamily: false,
  ...over,
});

beforeEach(() => {
  _resetSeenForTests();
  Store._backing.clear();
  mockRole = 'ELDER';
});
afterEach(() => jest.clearAllMocks());

describe('the pure rules', () => {
  test('a step the other person started and I have not accepted is waiting on me', () => {
    expect(isStepAwaitingMe(conn({ confirmedByOther: true }))).toBe(true);
    expect(isStepAwaitingMe(conn({ confirmedByOther: true, confirmedByMe: true }))).toBe(false);
    expect(isStepAwaitingMe(conn({ confirmedByMe: true }))).toBe(false);
    // Paused and family links carry no live ladder.
    expect(isStepAwaitingMe(conn({ confirmedByOther: true, status: 'PAUSED' }))).toBe(false);
    expect(isStepAwaitingMe(conn({ confirmedByOther: true, type: 'FAMILY' }))).toBe(false);
    expect(isStepAwaitingMe(undefined)).toBe(false);
    expect(stepsAwaitingMe([conn({ confirmedByOther: true }), conn({ id: 'c2' })]).map((c) => c.id)).toEqual(['c1']);
    expect(stepsAwaitingMe(undefined)).toEqual([]);
  });

  test('the news token is the level, so it changes exactly when the ladder moves', () => {
    expect(stepNewsToken(conn())).toBe('c1:PHONE_CALL');
    expect(stepNewsToken(conn({ currentTrustLevel: 'MEET_PUBLIC' }))).toBe('c1:MEET_PUBLIC');
    expect(stepNewsToken({ id: 'c9' })).toBe('c9:');
    expect(stepNewsTokens([conn(), conn({ id: 'c2', status: 'PAUSED' }), conn({ id: 'c3', type: 'FAMILY' })])).toEqual([
      'c1:PHONE_CALL',
    ]);
    expect(stepNewsTokens('nope')).toEqual([]);
  });

  test('news is pending until the elder starts the next step; at the top, until the row is opened', () => {
    const unseen = ['c1:MEET_PUBLIC', 'c7:TRUSTED'];
    expect(isStepNewsPending(conn({ currentTrustLevel: 'MEET_PUBLIC' }), unseen)).toBe(true);
    // The elder already pressed Start (perhaps on another phone): done with.
    expect(isStepNewsPending(conn({ currentTrustLevel: 'MEET_PUBLIC', confirmedByMe: true }), unseen)).toBe(false);
    // A level the elder has dealt with is not news.
    expect(isStepNewsPending(conn({ currentTrustLevel: 'PHONE_CALL' }), unseen)).toBe(false);
    // At the top nothing can be started, so the token alone decides.
    expect(isStepNewsPending(conn({ id: 'c7', currentTrustLevel: 'TRUSTED', confirmedByMe: true }), unseen)).toBe(true);
    expect(isLadderComplete(conn({ currentTrustLevel: 'TRUSTED' }))).toBe(true);
    expect(isLadderComplete(conn())).toBe(false);
    expect(isStepNewsPending(conn({ currentTrustLevel: 'MEET_PUBLIC', status: 'PAUSED' }), unseen)).toBe(false);
    expect(isStepNewsPending(undefined, unseen)).toBe(false);
  });

  test('the tab counts people, once each, across news and actions', () => {
    expect(peopleWithNews(['c1:ACTIVE', 'c1:MEET_PUBLIC'], ['c1'])).toBe(1);
    expect(peopleWithNews(['c1:ACTIVE'], ['c2', 'c3'])).toBe(3);
    expect(peopleWithNews([], [])).toBe(0);
    expect(peopleWithNews([null, ''], [undefined])).toBe(0);
  });
});

describe('seeding the seen store', () => {
  test('a first run treats the seed as already seen, and persists it', async () => {
    const key = seenKey('me', TRUST_STEPS_CATEGORY);
    await loadSeen(key, ['c1:PHONE_CALL', 'c2:HANDSHAKE']);
    expect(unseenCount(key, ['c1:PHONE_CALL', 'c2:HANDSHAKE'])).toBe(0);
    expect(unseenCount(key, ['c1:MEET_PUBLIC'])).toBe(1);
    expect(JSON.parse(Store._backing.get(key))).toEqual(['c1:PHONE_CALL', 'c2:HANDSHAKE']);
  });

  test('a stored set, even an empty one, is never overwritten by a seed', async () => {
    const key = seenKey('me', TRUST_STEPS_CATEGORY);
    Store._backing.set(key, JSON.stringify([]));
    await loadSeen(key, ['c1:PHONE_CALL']);
    expect(unseenCount(key, ['c1:PHONE_CALL'])).toBe(1);
  });

  test('a ladder new to this phone starts seen; only its next change is news (demo reset, new friendship)', async () => {
    const key = seenKey('me', TRUST_STEPS_CATEGORY);
    // Known: c1 at PHONE_CALL. New to the phone: c9 (a reset recreated it).
    Store._backing.set(key, JSON.stringify(['c1:PHONE_CALL']));
    await seedNewIds(key, ['c1:MEET_PUBLIC', 'c9:FIRST_MEET']);
    // c1 moved: news. c9 is new: quiet, and now known.
    expect(unseenTokens(key, ['c1:MEET_PUBLIC', 'c9:FIRST_MEET'], { knownOnly: true })).toEqual(['c1:MEET_PUBLIC']);
    expect(JSON.parse(Store._backing.get(key))).toEqual(['c1:PHONE_CALL', 'c9:FIRST_MEET']);
    // The read side never reports a new item even before the seed lands.
    expect(unseenTokens(key, ['c1:MEET_PUBLIC', 'c8:HANDSHAKE'], { knownOnly: true })).toEqual(['c1:MEET_PUBLIC']);
    expect(unseenTokens(key, ['c1:MEET_PUBLIC', 'c8:HANDSHAKE'])).toEqual(['c1:MEET_PUBLIC', 'c8:HANDSHAKE']);
    // Later, c9 moves: news.
    await seedNewIds(key, ['c1:MEET_PUBLIC', 'c9:TRUSTED']);
    expect(unseenTokens(key, ['c1:MEET_PUBLIC', 'c9:TRUSTED'], { knownOnly: true })).toEqual(['c1:MEET_PUBLIC', 'c9:TRUSTED']);
  });
});

describe('the elder seat: My Helpers', () => {
  const elderFixtures = (level) =>
    api.get.mockImplementation(async (url) => {
      if (url === '/trust/my-score')
        return {
          data: {
            totalScore: 8,
            customers: [
              { connectionId: 'c1', customerName: 'Priya Sharma', stageIndex: 2, total: 8, totalMax: 15 },
              { connectionId: 'c2', customerName: 'Tom Walker', stageIndex: 1, total: 4, totalMax: 15 },
            ],
          },
        };
      if (url === '/connections')
        return {
          data: [
            conn({ currentTrustLevel: level }),
            conn({ id: 'c2', otherUserId: 'u2', otherUserName: 'Tom Walker', currentTrustLevel: 'HANDSHAKE' }),
          ],
        };
      if (url === '/needs/mine') return { data: { content: [] } };
      return { data: {} };
    });

  test('a ladder that moved wears a 1 on the name through opening the row, until the elder starts the next step', async () => {
    // The elder saw Priya at PHONE_CALL; the helper has since accepted a step.
    Store._backing.set(seenKey('me', TRUST_STEPS_CATEGORY), JSON.stringify(['c1:PHONE_CALL', 'c2:HANDSHAKE']));
    elderFixtures('MEET_PUBLIC');
    const r = await wrap(<MyHelpersPanel />);

    await r.findByText('Priya Sharma');
    await waitFor(() =>
      r.getByRole('button', { name: 'Priya Sharma. Stage 3 of 7, Phone. New: one step up, your move' })
    );
    expect(r.getAllByTestId('row-badge', HIDDEN)).toHaveLength(1);
    // Tom's ladder has not moved: no badge, plain label.
    r.getByRole('button', { name: /^Tom Walker\. Stage 2 of 7, [^.]+$/ });

    // Opening the row is not the elder's move: the badge stays (owner call
    // 2026-08-28, "until I accept, the badge should be there").
    await fireEvent.press(r.getByText('Priya Sharma'));
    expect(r.getAllByTestId('row-badge', HIDDEN)).toHaveLength(1);
    r.getByRole('button', { name: 'Priya Sharma. Stage 3 of 7, Phone. New: one step up, your move', expanded: true });

    // Starting the next step is: the badge goes, and stays gone.
    await fireEvent.press(r.getByRole('button', { name: 'Start the next step' }));
    await fireEvent.press(await r.findByRole('button', { name: 'Start' }));
    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/trust/c1/confirm'));
    await waitFor(() => expect(r.queryByTestId('row-badge', HIDDEN)).toBeNull());
    expect(JSON.parse(Store._backing.get(seenKey('me', TRUST_STEPS_CATEGORY)))).toContain('c1:MEET_PUBLIC');
  });

  test('at the top of the ladder there is nothing to start, so opening the row reads the news', async () => {
    Store._backing.set(seenKey('me', TRUST_STEPS_CATEGORY), JSON.stringify(['c1:FIRST_MEET', 'c2:HANDSHAKE']));
    api.get.mockImplementation(async (url) => {
      if (url === '/trust/my-score')
        return {
          data: {
            totalScore: 15,
            customers: [{ connectionId: 'c1', customerName: 'Priya Sharma', stageIndex: 6, total: 15, totalMax: 15 }],
          },
        };
      if (url === '/connections') return { data: [conn({ currentTrustLevel: 'TRUSTED' })] };
      if (url === '/needs/mine') return { data: { content: [] } };
      return { data: {} };
    });
    const r = await wrap(<MyHelpersPanel />);
    // A finished ladder lives under Trusted Friends.
    await fireEvent.press(await r.findByRole('tab', { name: 'Trusted Friends' }));
    await r.findByText('Priya Sharma');
    await waitFor(() => r.getByRole('button', { name: 'Priya Sharma. Stage 7 of 7, Trusted. New: fully trusted' }));
    expect(r.getAllByTestId('row-badge', HIDDEN)).toHaveLength(1);

    await fireEvent.press(r.getByText('Priya Sharma'));
    await waitFor(() => expect(r.queryByTestId('row-badge', HIDDEN)).toBeNull());
    r.getByRole('button', { name: 'Priya Sharma. Stage 7 of 7, Trusted', expanded: true });
    expect(JSON.parse(Store._backing.get(seenKey('me', TRUST_STEPS_CATEGORY)))).toContain('c1:TRUSTED');
  });

  test('a first run is quiet: the ladders already here are not news', async () => {
    elderFixtures('MEET_PUBLIC');
    const r = await wrap(<MyHelpersPanel />);
    await r.findByText('Priya Sharma');
    await waitFor(() => expect(Store._backing.get(seenKey('me', TRUST_STEPS_CATEGORY))).toBeTruthy());
    expect(r.queryByTestId('row-badge', HIDDEN)).toBeNull();
  });

  test('a ladder the phone has never seen (a reset recreated it) is not news either', async () => {
    // The store knows other ladders, not these ids: a demo reset, or new friends.
    Store._backing.set(seenKey('me', TRUST_STEPS_CATEGORY), JSON.stringify(['old-1:PHONE_CALL']));
    elderFixtures('MEET_PUBLIC');
    const r = await wrap(<MyHelpersPanel />);
    await r.findByText('Priya Sharma');
    await waitFor(() =>
      expect(JSON.parse(Store._backing.get(seenKey('me', TRUST_STEPS_CATEGORY)))).toEqual(
        expect.arrayContaining(['c1:MEET_PUBLIC', 'c2:HANDSHAKE'])
      )
    );
    expect(r.queryByTestId('row-badge', HIDDEN)).toBeNull();
    r.getByRole('button', { name: 'Priya Sharma. Stage 3 of 7, Phone' });
  });

  test('"Start the next step" is the filled blue button', async () => {
    elderFixtures('PHONE_CALL');
    const r = await wrap(<MyHelpersPanel />);
    await fireEvent.press(await r.findByText('Priya Sharma'));
    const button = await r.findByRole('button', { name: 'Start the next step' });
    expect(flatten(button.props.style).backgroundColor).toBe(light.actionFill);
  });
});

describe('the helper seat: My Elders', () => {
  const helperFixtures = (over) =>
    api.get.mockImplementation(async (url) => {
      if (url === '/connections')
        return {
          data: [
            conn({ otherUserId: 'elder-1', otherUserName: 'Margaret', otherUserRole: 'ELDER', ...over }),
            conn({ id: 'c2', otherUserId: 'elder-2', otherUserName: 'George', otherUserRole: 'ELDER' }),
          ],
        };
      if (url === '/trust/my-score') return { data: { totalScore: 5, customers: [] } };
      if (url === '/family/behind-me') return { data: { entries: [] } };
      if (url === '/needs/applications') return { data: [] };
      return { data: {} };
    });

  test('an elder who started a step wears a 1 on the name, and opening the row does not clear it', async () => {
    mockRole = 'HELPER';
    helperFixtures({ confirmedByOther: true });
    const r = await wrap(<MyEldersPanel />);

    await r.findByText('Margaret');
    r.getByRole('button', { name: 'Margaret. Stage 3 of 7, Phone. 1 step waiting for you to accept' });
    expect(r.getAllByTestId('row-badge', HIDDEN)).toHaveLength(1);
    r.getByRole('button', { name: 'George. Stage 3 of 7, Phone' });

    await fireEvent.press(r.getByText('Margaret'));
    // Still waiting: only an accept clears it.
    expect(r.getAllByTestId('row-badge', HIDDEN)).toHaveLength(1);
    const button = r.getByRole('button', { name: 'Accept the next step' });
    expect(flatten(button.props.style).backgroundColor).toBe(light.actionFill);
  });

  test('nothing waiting, nothing worn', async () => {
    mockRole = 'HELPER';
    helperFixtures({});
    const r = await wrap(<MyEldersPanel />);
    await r.findByText('Margaret');
    expect(r.queryByTestId('row-badge', HIDDEN)).toBeNull();
  });
});

describe('the tab shell', () => {
  test('the hub badge counts people with news or a step waiting, by seat', () => {
    const layout = read('app/(tabs)/_layout.jsx');
    expect(layout).toMatch(/isElderSeat \? stepNewsTokens\(conns\) : \[\]/);
    // Only ladders still waiting on the elder's move count (isStepNewsPending), never raw unseen tokens.
    expect(layout).toMatch(/isElderSeat \? conns\.filter\(\(c\) => isStepNewsPending\(c, stepNews\)\)\.map\(\(c\) => c\.id\) : \[\]/);
    expect(layout).toMatch(/isHelperSeat \? stepsAwaitingMe\(conns\)\.map\(\(c\) => c\.id\) : \[\]/);
    expect(layout).toMatch(/const connBadge = peopleWithNews\(newPeople, \[\.\.\.newsPending, \.\.\.awaitingMe\]\)/);
    // The elder's news is seeded, so an existing account never wakes to a number on every friend.
    expect(layout).toMatch(/TRUST_STEPS_CATEGORY,[\s\S]*?\{ seed: true \}/);
  });

  test('the helper hub never marks a waiting step seen: only accepting clears it', () => {
    const panel = read('src/components/trust/MyEldersPanel.jsx');
    expect(panel).not.toMatch(/markSeen\(/);
  });
});
