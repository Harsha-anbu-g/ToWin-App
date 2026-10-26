// One reunion's page, by seat and step: the elder at "Who plans" sees the
// people allowed; the organiser at "Finding" gets the list tools and never
// the elder's approve button; the elder's approve button appears only once
// someone is coming, and says why until then (HCI rules 5 and 6).
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react-native';
import { ThemeProvider } from '../src/theme/ThemeContext';
import { ToastProvider } from '../src/context/ToastContext';
import { ConfirmProvider } from '../src/context/ConfirmContext';
import api from '../src/api/client';
import ReunionPage from '../app/reunion/[reunionId]';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: () => true }),
  useLocalSearchParams: () => ({ reunionId: 'r1' }),
  useFocusEffect: (effect) => require('react').useEffect(effect, [effect]),
  Redirect: () => null,
}));

jest.mock('../src/api/client', () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn(), put: jest.fn(), patch: jest.fn(), delete: jest.fn() },
  friendlyWriteError: (_e, fallback) => fallback,
  setTokenGetter: jest.fn(),
  setOnSessionExpired: jest.fn(),
}));

jest.mock('../src/context/AuthContext', () => ({
  __esModule: true,
  AuthProvider: ({ children }) => children,
  useAuth: () => ({ user: { userId: 'e1', role: 'ELDER' }, booted: true }),
}));

const base = {
  id: 'r1',
  elderId: 'e1',
  elderName: 'Margaret',
  institution: 'B.Sc. batch, Presidency College',
  years: '1968 to 1971',
  city: 'Madras',
  guests: [],
  guestCount: 0,
  comingCount: 0,
  arrivedCount: 0,
  homeCount: 0,
};

const serve = (reunion, organisers = []) => {
  api.get.mockImplementation(async (url) =>
    url.endsWith('/organisers') ? { data: organisers } : { data: reunion }
  );
};

const wrap = () =>
  render(
    <ThemeProvider>
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <ToastProvider>
          <ConfirmProvider>
            <ReunionPage />
          </ConfirmProvider>
        </ToastProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );

beforeEach(() => jest.clearAllMocks());

test('the elder at Who plans sees the people allowed and why', async () => {
  serve({ ...base, step: 'ORGANISER', myRole: 'ELDER' }, [
    { userId: 'h1', name: 'Priya', kind: 'HELPER' },
    { userId: 'f1', name: 'Sarah', kind: 'FAMILY', relationship: 'Daughter' },
  ]);
  const screen = await wrap();

  expect(await screen.findByText('Step 2 of 7 · Who plans')).toBeTruthy();
  expect(await screen.findByText('Priya')).toBeTruthy();
  expect(screen.getByText('Helper you fully trust')).toBeTruthy();
  expect(screen.getByText('Sarah')).toBeTruthy();
  expect(screen.getByText('Daughter')).toBeTruthy();
  expect(screen.queryByText('Approve the guest list')).toBeNull();
});

test('the organiser at Finding gets the list tools and never the approve button', async () => {
  serve({
    ...base,
    step: 'FINDING',
    myRole: 'ORGANISER',
    organiserId: 'h1',
    organiserName: 'Priya',
    guests: [{ id: 'g1', name: 'Kumar', state: 'REMEMBERED' }],
    guestCount: 1,
  });
  const screen = await wrap();

  expect(await screen.findByText('Kumar')).toBeTruthy();
  expect(screen.getByText('For Margaret')).toBeTruthy();
  expect(screen.getByText('Add to the list')).toBeTruthy();
  expect(screen.getByText('Found')).toBeTruthy(); // the one next step for a remembered guest
  expect(screen.getByText('Step down from planning')).toBeTruthy();
  expect(screen.queryByText('Approve the guest list')).toBeNull();
  expect(screen.queryByText('Stop this reunion')).toBeNull();
});

test('the elder at Finding sees approve only once someone is coming, with the reason until then', async () => {
  serve({
    ...base,
    step: 'FINDING',
    myRole: 'ELDER',
    organiserName: 'Priya',
    guests: [{ id: 'g1', name: 'Kumar', state: 'REACHED' }],
    guestCount: 1,
    comingCount: 0,
  });
  const screen = await wrap();

  expect(await screen.findByText('Approve the guest list')).toBeTruthy();
  expect(screen.getByText('At least one guest needs to be coming before the plan.')).toBeTruthy();
  expect(screen.getByText('Priya is planning it')).toBeTruthy();
  expect(screen.queryByText('Add to the list')).toBeNull();
  expect(screen.getByText('Stop this reunion')).toBeTruthy();
});

test('the elder at Finding with someone coming can approve', async () => {
  serve({
    ...base,
    step: 'FINDING',
    myRole: 'ELDER',
    guests: [{ id: 'g1', name: 'Kumar', state: 'COMING' }],
    guestCount: 1,
    comingCount: 1,
  });
  const screen = await wrap();

  const approve = await screen.findByText('Approve the guest list');
  expect(approve).toBeTruthy();
  expect(screen.queryByText('At least one guest needs to be coming before the plan.')).toBeNull();
});

test('done reads as a story: who came, everyone home', async () => {
  serve({
    ...base,
    step: 'DONE',
    myRole: 'ELDER',
    thankYou: 'Thank you all for coming',
    arrivedCount: 4,
    homeCount: 4,
    guests: [],
  });
  const screen = await wrap();

  expect(await screen.findByText('4 came, and every one of them got home.')).toBeTruthy();
  expect(screen.getByText('Keep the story in your box')).toBeTruthy();
  expect(screen.queryByText('Stop this reunion')).toBeNull();
});
