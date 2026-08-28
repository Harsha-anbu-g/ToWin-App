// Owner call 2026-08-28: "keep a search tab in messages, posted help, and
// also in my helpers like whatsapp". One kit control (SearchField) above each
// list, one matcher (src/lib/searchFilter.js) behind all of them, and a
// search that finds nothing says so instead of borrowing the list's own
// "nobody here yet" doors.
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { ThemeProvider } from '../src/theme/ThemeContext';
import { ToastProvider } from '../src/context/ToastContext';
import { ConfirmProvider } from '../src/context/ConfirmContext';
import { filterByQuery, matchesQuery } from '../src/lib/searchFilter';

const mockPush = jest.fn();
let mockRole = 'ELDER';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn(), back: jest.fn(), canGoBack: () => true }),
  useLocalSearchParams: () => ({}),
  useFocusEffect: () => {},
  Redirect: () => null,
  Link: ({ children }) => children,
}));

jest.mock('../src/api/client', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(async () => ({ data: {} })),
    put: jest.fn(),
    delete: jest.fn(async () => ({ data: {} })),
  },
  friendlyWriteError: (_e, fallback) => fallback,
  friendlyAuthError: (_e, fallback) => fallback,
  setTokenGetter: jest.fn(),
  setOnSessionExpired: jest.fn(),
}));

jest.mock('../src/context/AuthContext', () => ({
  __esModule: true,
  AuthProvider: ({ children }) => children,
  useAuth: () => ({
    user: { role: mockRole, userId: 'me', emailVerified: true },
    booted: true,
    logout: jest.fn(),
  }),
}));

jest.mock('../src/lib/useReducedMotion', () => ({ useReducedMotion: () => true }));

import api from '../src/api/client';
import Messages from '../app/(tabs)/messages';
import PostedHelpList from '../src/components/needs/PostedHelpList';
import MyHelpersPanel from '../src/components/trust/MyHelpersPanel';
import MyEldersPanel from '../src/components/trust/MyEldersPanel';

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

const conn = (over) => ({
  id: 'c1',
  otherUserId: 'u1',
  otherUserName: 'Priya Sharma',
  otherUserRole: 'HELPER',
  status: 'ACTIVE',
  type: 'SOCIAL',
  createdAt: '2026-08-12T09:00:00',
  confirmedByMe: false,
  confirmedByOther: false,
  sharedWithFamily: false,
  ...over,
});

const twoPeople = () => [conn(), conn({ id: 'c2', otherUserId: 'u2', otherUserName: 'Tom Walker' })];

beforeEach(() => {
  mockRole = 'ELDER';
  jest.clearAllMocks();
});

describe('the matcher', () => {
  test('ignores case, accents and stray spaces', () => {
    expect(matchesQuery('  PRIYA ', ['Priya Sharma'])).toBe(true);
    expect(matchesQuery('jose', ['José'])).toBe(true);
    expect(matchesQuery('walk', ['Priya Sharma', 'Tom Walker'])).toBe(true);
    expect(matchesQuery('zzz', ['Priya Sharma'])).toBe(false);
  });

  test('a blank query keeps every row, in order', () => {
    const rows = [{ n: 'b' }, { n: 'a' }];
    expect(filterByQuery(rows, '   ', (r) => [r.n])).toBe(rows);
    expect(filterByQuery(rows, 'a', (r) => [r.n])).toEqual([{ n: 'a' }]);
  });
});

describe('Messages', () => {
  const inbox = () =>
    api.get.mockImplementation(async (url) => {
      if (url === '/connections') return { data: twoPeople() };
      return { data: [] };
    });

  test('typing a name narrows the chats; a miss says so', async () => {
    inbox();
    const r = await wrap(<Messages />);
    await r.findByText('Priya Sharma');
    r.getByText('Tom Walker');

    await fireEvent.changeText(r.getByLabelText('Search'), 'tom');
    await waitFor(() => expect(r.queryByText('Priya Sharma')).toBeNull());
    r.getByText('Tom Walker');

    await fireEvent.changeText(r.getByLabelText('Search'), 'zzz');
    await waitFor(() => expect(r.getByText('No matches for “zzz”.')).toBeTruthy());
    // The miss never turns into the empty inbox's doors.
    expect(r.queryByRole('button', { name: 'Find friends' })).toBeNull();
  });

  test('no search box when there is nobody to search', async () => {
    api.get.mockResolvedValue({ data: [] });
    const r = await wrap(<Messages />);
    await r.findByText('No conversations yet');
    expect(r.queryByLabelText('Search')).toBeNull();
  });
});

describe('Posted Help', () => {
  test('finds a request by its title or by who offered', async () => {
    api.get.mockResolvedValue({
      data: {
        content: [
          { id: 'n1', title: 'Need a ride to the clinic', status: 'OPEN', category: 'TRANSPORTATION', urgency: 'NORMAL', applications: [{ helperId: 'h1', helperName: 'Daniel' }] },
          { id: 'n2', title: 'Weekly grocery run', status: 'OPEN', category: 'GROCERIES', urgency: 'NORMAL', applications: [] },
        ],
      },
    });
    const r = await wrap(<PostedHelpList />);
    await r.findByText('Need a ride to the clinic');

    await fireEvent.changeText(r.getByLabelText('Search'), 'grocery');
    await waitFor(() => expect(r.queryByText('Need a ride to the clinic')).toBeNull());
    r.getByText('Weekly grocery run');

    await fireEvent.changeText(r.getByLabelText('Search'), 'daniel');
    await waitFor(() => expect(r.getByText('Need a ride to the clinic')).toBeTruthy());
    expect(r.queryByText('Weekly grocery run')).toBeNull();

    await fireEvent.changeText(r.getByLabelText('Search'), 'zzz');
    await waitFor(() => expect(r.getByText('No matches for “zzz”.')).toBeTruthy());
    expect(r.queryByText(/Nothing here yet/)).toBeNull();
  });
});

describe('the hub', () => {
  test('My Helpers narrows by name and a miss keeps the doors away', async () => {
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
      if (url === '/connections') return { data: twoPeople() };
      if (url === '/needs/mine') return { data: { content: [] } };
      return { data: [] };
    });
    const r = await wrap(<MyHelpersPanel />);
    await r.findByText('Priya Sharma');

    await fireEvent.changeText(r.getByLabelText('Search'), 'walker');
    await waitFor(() => expect(r.queryByText('Priya Sharma')).toBeNull());
    r.getByText('Tom Walker');

    await fireEvent.changeText(r.getByLabelText('Search'), 'zzz');
    await waitFor(() => expect(r.getByText('No matches for “zzz”.')).toBeTruthy());
    expect(r.queryByRole('button', { name: 'Find friends' })).toBeNull();
  });

  test('My Elders narrows by name too', async () => {
    mockRole = 'HELPER';
    api.get.mockImplementation(async (url) => {
      if (url === '/connections')
        return { data: [conn({ otherUserName: 'Margaret', otherUserRole: 'ELDER' }), conn({ id: 'c2', otherUserId: 'e2', otherUserName: 'George', otherUserRole: 'ELDER' })] };
      if (url === '/trust/my-score') return { data: { totalScore: 5, customers: [] } };
      if (url === '/family/behind-me') return { data: { entries: [] } };
      return { data: [] };
    });
    const r = await wrap(<MyEldersPanel />);
    await r.findByText('Margaret');

    await fireEvent.changeText(r.getByLabelText('Search'), 'geo');
    await waitFor(() => expect(r.queryByText('Margaret')).toBeNull());
    r.getByText('George');
  });
});
