// Streak warmth (web Streaks parity): the two things the check-in page showed
// on the website but the app dropped — "Best streak: N days" under the week
// strip (web StreakCard.jsx) and the age card, "X days you have lived" plus
// "Y years, M months, D days old", computed from date of birth (web
// Streaks.jsx computeAge). Wording pinned to the website exactly.
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { ThemeProvider } from '../src/theme/ThemeContext';
import { ToastProvider } from '../src/context/ToastContext';
import { ConfirmProvider } from '../src/context/ConfirmContext';

const mockRouter = { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: () => true };
jest.mock('expo-router', () => ({
  useRouter: () => mockRouter,
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
  friendlyWriteError: (_e, fallback) => fallback,
  setTokenGetter: jest.fn(),
  setOnSessionExpired: jest.fn(),
}));

import api from '../src/api/client';
import { checkInToday, getMyStreak } from '../src/api/streaks';
import { getMyProfile } from '../src/api/profile';
import { computeAge } from '../src/lib/streaks';
import AgeCard from '../src/components/home/AgeCard';
import CheckinCard from '../src/components/home/CheckinCard';

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

// Route streak + family + profile reads by URL so each test controls one payload.
const routeGet = (byUrl) =>
  api.get.mockImplementation(async (url) => ({ data: byUrl[url] ?? {} }));

beforeEach(() => {
  jest.clearAllMocks();
  api.get.mockImplementation(async () => ({ data: {} }));
});

describe('streaks + profile API modules (Rule 6 named tools)', () => {
  test('getMyStreak reads /streaks/me', async () => {
    api.get.mockResolvedValueOnce({ data: { currentStreak: 2, longestStreak: 9 } });
    const streak = await getMyStreak();
    expect(api.get).toHaveBeenCalledWith('/streaks/me');
    expect(streak).toEqual({ currentStreak: 2, longestStreak: 9 });
  });

  test('checkInToday posts /streaks/checkin', async () => {
    api.post.mockResolvedValueOnce({ data: { alreadyCheckedIn: true, currentStreak: 3 } });
    const streak = await checkInToday();
    expect(api.post).toHaveBeenCalledWith('/streaks/checkin');
    expect(streak).toEqual({ alreadyCheckedIn: true, currentStreak: 3 });
  });

  test('getMyProfile reads /profile/me', async () => {
    api.get.mockResolvedValueOnce({ data: { dateOfBirth: '1950-04-15' } });
    const me = await getMyProfile();
    expect(api.get).toHaveBeenCalledWith('/profile/me');
    expect(me).toEqual({ dateOfBirth: '1950-04-15' });
  });
});

describe('computeAge (ported verbatim from web Streaks.jsx)', () => {
  test('null without a date of birth', () => {
    expect(computeAge(null)).toBeNull();
    expect(computeAge('')).toBeNull();
    expect(computeAge(undefined)).toBeNull();
  });

  // Expectations below carry the website's own parsing quirk, kept verbatim:
  // new Date('1950-04-15') is UTC midnight, and the local getters on a machine
  // west of UTC (this one: America/New_York) see the evening BEFORE — so the
  // breakdown counts from the previous local day, exactly as the web page does.
  test('plain years/months/days split', () => {
    const age = computeAge('1950-04-15', new Date(2026, 8, 4)); // 4 Sep 2026 local
    expect(age.years).toBe(76);
    expect(age.months).toBe(4);
    expect(age.days).toBe(21);
    // 1950-04-15T00:00Z → 2026-09-04 local midnight (04:00Z) floors to 27901.
    expect(age.totalDays).toBe(27901);
  });

  test('borrows days from the previous month and months from the year', () => {
    // Local dob reads Sep 29; day borrow pulls in August's 31 days, month
    // borrow rolls the year: 75 years, 11 months.
    const age = computeAge('1950-09-30', new Date(2026, 8, 4));
    expect(age).toMatchObject({ years: 75, months: 11, days: 6 });
  });

  test('a year and a bit', () => {
    const age = computeAge('2025-09-03', new Date(2026, 8, 4));
    expect(age).toMatchObject({ years: 1, months: 0, days: 2 });
  });
});

describe('Best streak line (web StreakCard.jsx)', () => {
  const streakWith = (longestStreak) => ({
    currentStreak: 3,
    longestStreak,
    lastCheckinDate: '2026-09-04',
    alreadyCheckedIn: true,
  });

  test('shows "Best streak: N days" when a longest streak exists', async () => {
    routeGet({ '/streaks/me': streakWith(5), '/family/links': { activeLinks: [] } });
    const r = await wrap(<CheckinCard />);
    await waitFor(() => expect(r.getByText(/Best streak: 5 days/)).toBeTruthy());
  });

  test('singular for a one-day best', async () => {
    routeGet({ '/streaks/me': streakWith(1), '/family/links': { activeLinks: [] } });
    const r = await wrap(<CheckinCard />);
    await waitFor(() => expect(r.getByText(/Best streak: 1 day$/)).toBeTruthy());
  });

  test('absent when there is no streak history yet', async () => {
    routeGet({ '/streaks/me': streakWith(0), '/family/links': { activeLinks: [] } });
    const r = await wrap(<CheckinCard />);
    await waitFor(() => expect(r.getByText(/days in a row/)).toBeTruthy());
    expect(r.queryByText(/Best streak/)).toBeNull();
  });
});

describe('Age card (web Streaks.jsx)', () => {
  test('with a date of birth: days lived plus the years/months/days line', async () => {
    routeGet({ '/profile/me': { dateOfBirth: '1950-04-15' } });
    const r = await wrap(<AgeCard />);
    const age = computeAge('1950-04-15');
    await waitFor(() =>
      expect(r.getByText(age.totalDays.toLocaleString())).toBeTruthy()
    );
    expect(r.getByText('days you have lived')).toBeTruthy();
    const breakdown =
      `${age.years} ${age.years === 1 ? 'year' : 'years'},\n` +
      `${age.months} ${age.months === 1 ? 'month' : 'months'}, ` +
      `${age.days} ${age.days === 1 ? 'day' : 'days'} old`;
    expect(r.getByText(breakdown)).toBeTruthy();
  });

  test('without a date of birth: the invitation, wording pinned to the web page', async () => {
    routeGet({ '/profile/me': {} });
    const r = await wrap(<AgeCard />);
    await waitFor(() =>
      expect(r.getByText('How many days have you lived?')).toBeTruthy()
    );
    expect(
      r.getByText('Add your date of birth in your profile to see your life in days.')
    ).toBeTruthy();
    fireEvent.press(r.getByText('Add date of birth'));
    expect(mockRouter.push).toHaveBeenCalledWith('/profile-edit');
  });

  test('a failed profile read renders nothing: no error, and no false invitation', async () => {
    // A DOB the person already gave must never come back as "add your date
    // of birth" just because the network dropped (H9: an error may go quiet,
    // but it must not masquerade as an instruction to re-enter data).
    api.get.mockRejectedValue(new Error('offline'));
    const r = await wrap(<AgeCard />);
    await waitFor(() => expect(r.toJSON()).toBeNull());
    expect(r.queryByText('How many days have you lived?')).toBeNull();
  });
});
