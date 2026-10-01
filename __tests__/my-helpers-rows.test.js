// My Helpers rows (owner call 2026-08-26): each helper is a name-only row,
// "like whatsapp". Touching the name opens the helper's own page (owner call
// 2026-09-25, not a dropdown) where the trust ladder and the family section
// live together; touching the photo opens the profile, the way a WhatsApp row
// splits photo from name.
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
import HelperSeatDetail from '../src/components/trust/HelperSeatDetail';
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

beforeEach(() => {
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
    if (url === '/needs/mine')
      return {
        data: {
          content: [
            { id: 'n1', title: 'Weekly grocery run', status: 'ASSIGNED', applications: [{ helperId: 'u1', status: 'ACCEPTED' }] },
          ],
        },
      };
    return { data: {} };
  });
});
afterEach(() => jest.clearAllMocks());

test('a row shows the name alone', async () => {
  const r = await wrap(<MyHelpersPanel />);

  await r.findByText('Priya Sharma');
  r.getByText('Tom Walker');
  // Nothing from the page: no ladder, no stage line, no family switch, no step.
  expect(r.queryByLabelText(/Trust ladder/)).toBeNull();
  expect(r.queryByText(/Stage 3 of 7/)).toBeNull();
  expect(r.queryByRole('switch')).toBeNull();
  expect(r.queryByText('Start the next step')).toBeNull();
  // The stage still reaches a screen reader through the row's own label, and
  // the row no longer claims to expand: it goes to a page.
  const row = r.getByRole('button', { name: 'Priya Sharma. Stage 3 of 7, Phone' });
  expect(row.props.accessibilityState?.expanded).toBeUndefined();
});

test('touching the name opens the helper\'s own page, and nothing unfolds in the list', async () => {
  const r = await wrap(<MyHelpersPanel />);

  await fireEvent.press(await r.findByText('Priya Sharma'));

  expect(mockPush).toHaveBeenCalledWith('/connection/c1');
  expect(r.queryByLabelText(/Trust ladder/)).toBeNull();
  expect(r.queryByText('Start the next step')).toBeNull();
});

test('the helper\'s page shows the ladder and the family section together', async () => {
  const r = await wrap(<HelperSeatDetail connectionId="c1" />);

  await r.findByLabelText('Trust ladder: Stage 3 of 7');
  r.getByText('Stage 3 of 7 · Phone');
  // The family section is on the same page — no second arrow to find (owner
  // call 2026-08-26: "no double clicking").
  expect(r.queryByLabelText(/Family options/)).toBeNull();
  r.getByRole('switch', { name: 'Let my family see this friendship', checked: true });
  r.getByLabelText('Open the family group');
  r.getByText('Start the next step');
  r.getByLabelText('Message');
  // Only this helper, named in the header.
  expect(r.getAllByLabelText(/Trust ladder/)).toHaveLength(1);
  r.getByText('Priya Sharma');
});

test('touching the photo opens the profile, not the page', async () => {
  const r = await wrap(<MyHelpersPanel />);

  await fireEvent.press(await r.findByLabelText("View Tom Walker's profile"));

  expect(mockPush).toHaveBeenCalledWith('/user/u2');
  expect(mockPush).not.toHaveBeenCalledWith('/connection/c2');
});

test('the page says why the ladder exists and when it started', async () => {
  const since = (iso) => new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

  // Priya was accepted on a posted request: the request is the reason.
  const priya = await wrap(<HelperSeatDetail connectionId="c1" />);
  await priya.findByText(`Helping with “Weekly grocery run” · since ${since('2026-08-25T13:01:16')}`);
  await priya.unmount();

  // Tom is a plain friendship.
  const tom = await wrap(<HelperSeatDetail connectionId="c2" />);
  await tom.findByText(`Friends · since ${since('2026-08-12T09:00:00')}`);
});

test('a friendship that is gone says so instead of an empty page', async () => {
  const r = await wrap(<HelperSeatDetail connectionId="nope" />);

  await r.findByText('This friendship is not here any more.');
});
