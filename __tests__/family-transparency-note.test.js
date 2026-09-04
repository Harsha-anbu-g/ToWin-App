// Step 4 transparency, elder seat (web ElderDashboard 2026-07): nothing about
// you happens out of your sight — under each helper card the elder sees which
// of her family members is talking with that helper, or can reach them through
// her shared trust. Wording is the website's, verbatim: "Your daughter Anna
// can message Priya through your shared trust." / "Your son Ravi and Priya
// are talking." The endpoint is optional context: when it fails, the cards
// render as if there were nothing to tell.
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render } from '@testing-library/react-native';
import { ThemeProvider } from '../src/theme/ThemeContext';
import { ToastProvider } from '../src/context/ToastContext';
import { ConfirmProvider } from '../src/context/ConfirmContext';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn(), back: jest.fn(), canGoBack: () => true }),
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

jest.mock('../src/context/AuthContext', () => ({
  useAuth: () => ({ user: { role: 'ELDER', userId: 'me', emailVerified: true }, booted: true }),
}));

jest.mock('../src/lib/useReducedMotion', () => ({ useReducedMotion: () => true }));

import api from '../src/api/client';
import MyHelpersPanel from '../src/components/trust/MyHelpersPanel';

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

// Two helpers on the score card; the transparency rows name only Priya (u1).
const mockApis = (transparency) => {
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
          { id: 'c1', otherUserId: 'u1', otherUserName: 'Priya Sharma', status: 'ACTIVE', type: 'SOCIAL', createdAt: '2026-08-25T13:01:16', confirmedByMe: false, confirmedByOther: false, sharedWithFamily: true },
          { id: 'c2', otherUserId: 'u2', otherUserName: 'Tom Walker', status: 'ACTIVE', type: 'SOCIAL', createdAt: '2026-08-12T09:00:00', confirmedByMe: false, confirmedByOther: false, sharedWithFamily: false },
        ],
      };
    if (url === '/family/transparency') {
      if (transparency instanceof Error) throw transparency;
      return { data: { connections: transparency } };
    }
    return { data: {} };
  });
};

afterEach(() => jest.clearAllMocks());

test('an open helper card names the family member talking with that helper, in the website words', async () => {
  mockApis([
    { familyMemberName: 'Ravi', relationship: 'Son', helperUserId: 'u1', helperName: 'Priya Sharma', inherited: false },
  ]);
  const r = await wrap(<MyHelpersPanel />);

  await fireEvent.press(await r.findByText('Priya Sharma'));

  await r.findByText('Your son Ravi and Priya Sharma are talking.');
});

test('an inherited standing reads as shared trust, not a chat', async () => {
  mockApis([
    { familyMemberName: 'Anna', relationship: 'Daughter', helperUserId: 'u1', helperName: 'Priya Sharma', inherited: true },
  ]);
  const r = await wrap(<MyHelpersPanel />);

  await fireEvent.press(await r.findByText('Priya Sharma'));

  await r.findByText('Your daughter Anna can message Priya Sharma through your shared trust.');
});

test('a missing relationship falls back to "family member"', async () => {
  mockApis([
    { familyMemberName: 'Anna', relationship: null, helperUserId: 'u1', helperName: 'Priya Sharma', inherited: false },
  ]);
  const r = await wrap(<MyHelpersPanel />);

  await fireEvent.press(await r.findByText('Priya Sharma'));

  await r.findByText('Your family member Anna and Priya Sharma are talking.');
});

test('the note stays on its own helper card and off the folded row', async () => {
  mockApis([
    { familyMemberName: 'Ravi', relationship: 'Son', helperUserId: 'u1', helperName: 'Priya Sharma', inherited: false },
  ]);
  const r = await wrap(<MyHelpersPanel />);

  // Folded rows carry the name alone — no note yet.
  await r.findByText('Priya Sharma');
  expect(r.queryByText(/are talking\./)).toBeNull();

  // Tom's card opens without Priya's note.
  await fireEvent.press(r.getByText('Tom Walker'));
  expect(r.queryByText(/are talking\./)).toBeNull();

  await fireEvent.press(r.getByText('Priya Sharma'));
  await r.findByText('Your son Ravi and Priya Sharma are talking.');
});

test('a failed transparency call stays quiet — the card still works', async () => {
  mockApis(new Error('network down'));
  const r = await wrap(<MyHelpersPanel />);

  await fireEvent.press(await r.findByText('Priya Sharma'));

  await r.findByText('Stage 3 of 7 · Phone');
  expect(r.queryByText(/are talking\.|shared trust\./)).toBeNull();
});
