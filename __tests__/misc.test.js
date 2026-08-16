// Deep-audit 2026-08-11, "misc" group. One describe per finding, each pinning
// the exact thing the audit measured so it cannot drift back.
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { Linking } from 'react-native';
import { ThemeProvider } from '../src/theme/ThemeContext';
import { ToastProvider } from '../src/context/ToastContext';
import { ConfirmProvider } from '../src/context/ConfirmContext';

let mockRole = 'HELPER';

// One router object for the whole file, because that is what expo-router
// actually hands back: useRouter() returns the module-level `router` singleton
// (expo-router/build/hooks.js). A mock that minted a fresh object per render
// would break every useCallback that closes over it and quietly hide the memo
// this file measures.
const mockRouter = { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: () => true };
jest.mock('expo-router', () => ({
  useRouter: () => mockRouter,
  useFocusEffect: () => {},
  useLocalSearchParams: () => ({ id: 'them' }),
  Redirect: () => null,
}));

jest.mock('../src/api/client', () => ({
  __esModule: true,
  default: {
    get: jest.fn(async () => ({ data: [] })),
    post: jest.fn(async () => ({ data: {} })),
    put: jest.fn(async () => ({ data: {} })),
    delete: jest.fn(async () => ({ data: {} })),
  },
  friendlyWriteError: (_e, fallback) => fallback,
  setTokenGetter: jest.fn(),
  setOnSessionExpired: jest.fn(),
}));

jest.mock('../src/context/AuthContext', () => ({
  __esModule: true,
  AuthProvider: ({ children }) => children,
  useAuth: () => ({ user: { role: mockRole, userId: 'me', emailVerified: true }, booted: true }),
}));

// Avatar sits inside every person card, so counting its renders counts the
// card's renders — which is exactly what DEEP-23 is about. It draws nothing so
// the names it would echo don't collide with the row's own name text.
const mockAvatar = { renders: 0 };
jest.mock('../src/components/ui/Avatar', () => {
  return function AvatarStub() {
    mockAvatar.renders += 1;
    return null;
  };
});

import api from '../src/api/client';
import CreatorCard from '../src/components/feedback/CreatorCard';
import CheckinCard from '../src/components/home/CheckinCard';
import MyEldersPanel from '../src/components/trust/MyEldersPanel';
import FriendsScreen from '../app/friends/index';
import UserProfile from '../app/user/[id]';

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

// Style props arrive as objects or arrays depending on the element.
const sizeOf = (node) => [node.props.style].flat(Infinity).filter(Boolean).find((s) => s.fontSize)?.fontSize;

beforeEach(() => {
  jest.clearAllMocks();
  mockAvatar.renders = 0;
  mockRole = 'HELPER';
  api.get.mockResolvedValue({ data: [] });
});

describe('DEEP-21: founder card text meets the 16px body floor', () => {
  test('the pitch paragraphs and the contact links are not 14px', async () => {
    const r = await wrap(<CreatorCard />);

    const pitch = r.getByText(/This isn't a university project/);
    const blurb = r.getByText(/your feedback is what shapes it/);
    expect(sizeOf(pitch)).toBeGreaterThanOrEqual(16);
    expect(sizeOf(blurb)).toBeGreaterThanOrEqual(16);

    // Contact rows carry addresses that have to be read exactly. The mail row
    // is the support address since 2026-08-15: the personal Gmail and the
    // WhatsApp number left the app before store submission (owner decision).
    expect(sizeOf(r.getByText('help@towinly.com'))).toBeGreaterThanOrEqual(16);
    expect(r.queryByText(/agharsha\.anbu@gmail\.com/)).toBeNull();
    expect(r.queryByText(/438-535-5782/)).toBeNull();
    expect(sizeOf(r.getByText('Visit my portfolio'))).toBeGreaterThanOrEqual(16);

    // The credential line is secondary, so meta (14) is its floor, but it must
    // come from the ramp rather than a literal.
    expect(sizeOf(r.getByText(/Full-Stack Engineer/))).toBeGreaterThanOrEqual(14);
  });
});

describe('DEEP-30: a contact tap that opens nothing says so', () => {
  test('a rejected mailto raises the fallback address instead of silence', async () => {
    const openURL = jest.spyOn(Linking, 'openURL').mockRejectedValue(new Error('no handler'));
    const r = await wrap(<CreatorCard />);

    await fireEvent.press(r.getByLabelText('help@towinly.com'));

    await waitFor(() => expect(openURL).toHaveBeenCalledWith('mailto:help@towinly.com'));
    // The toast is the only feedback there is, so it has to say the tap failed
    // AND hand the address back (the row's own label is the second match).
    await waitFor(() => expect(r.getAllByText(/mail app/i).length).toBeGreaterThan(0));
    expect(r.getAllByText(/help@towinly\.com/i).length).toBeGreaterThan(1);

    openURL.mockRestore();
    r.unmount();
  });
});

describe('DEEP-23: the Find list keeps its PersonRow memo', () => {
  const PEOPLE = [
    { userId: 'p1', name: 'Margaret', trustScore: 12, distanceKm: 2 },
    { userId: 'p2', name: 'Arun', trustScore: 0, distanceKm: 3 },
    { userId: 'p3', name: 'Lakshmi', trustScore: 5, distanceKm: 4 },
  ];

  test('changing the distance does not re-render every person card', async () => {
    api.get.mockImplementation(async (url) => {
      if (url === '/discover/elders') return { data: PEOPLE };
      if (url === '/connections') return { data: [] };
      return { data: [] };
    });

    const r = await wrap(<FriendsScreen />);
    await waitFor(() => expect(r.getByText('Margaret')).toBeTruthy());

    const before = mockAvatar.renders;
    // A radius pill is list-level state: no person's row data changed.
    await fireEvent.press(r.getByLabelText('50 kilometers'));
    await waitFor(() => expect(r.getByLabelText('50 kilometers')).toBeTruthy());

    expect(mockAvatar.renders).toBe(before);
    r.unmount();
  });
});

describe('DEEP-27: a failed connections fetch never offers "Add as friend"', () => {
  test('the action slot asks to retry instead of guessing at strangerhood', async () => {
    api.get.mockImplementation(async (url) => {
      if (url === '/connections') throw new Error('network');
      if (url === `/profile/them`) return { data: { name: 'Margaret', role: 'ELDER', trustScore: 9 } };
      return { data: [] };
    });

    const r = await wrap(<UserProfile />);
    await waitFor(() => expect(r.getAllByText(/Margaret/).length).toBeGreaterThan(0));

    await waitFor(() => expect(r.queryByText('Add as friend')).toBeNull());
    expect(r.getByText(/We couldn't load/)).toBeTruthy();
    r.unmount();
  });
});

describe('DEEP-26: a failed family-links fetch never invites a duplicate link', () => {
  test('the check-in card stays quiet instead of claiming there is no family', async () => {
    mockRole = 'ELDER';
    api.get.mockImplementation(async (url) => {
      if (url === '/streaks/me') return { data: { currentStreak: 4, alreadyCheckedIn: false } };
      if (url === '/family/links') throw new Error('network');
      return { data: {} };
    });

    const r = await wrap(<CheckinCard />);
    await waitFor(() => expect(r.getByText("I'm here today")).toBeTruthy());

    await waitFor(() => expect(r.queryByText('Add your family')).toBeNull());
    r.unmount();
  });
});

describe('DEEP-36: a paused trusted elder stays in Trusted Elders', () => {
  const PAUSED_TRUSTED = {
    id: 'c1',
    status: 'PAUSED',
    otherUserId: 'u1',
    otherUserName: 'Margaret',
    currentTrustLevel: 'TRUSTED',
  };

  test('the paused card and its count stay in the segment it was paused from', async () => {
    api.get.mockImplementation(async (url) => {
      if (url === '/connections') return { data: [PAUSED_TRUSTED] };
      if (url === '/trust/my-score') return { data: { customers: [] } };
      return { data: { entries: [] } };
    });

    const r = await wrap(<MyEldersPanel />);
    // Building Trust is the default segment: a trusted friend must not be
    // sitting in it.
    await waitFor(() => expect(r.getByLabelText('Trusted Elders, 1')).toBeTruthy());
    expect(r.getByLabelText('Building Trust, 0')).toBeTruthy();
    expect(r.queryByText('Resume')).toBeNull();

    await fireEvent.press(r.getByLabelText(/Trusted Elders/));
    await waitFor(() => expect(r.getByText('Resume')).toBeTruthy());
    expect(r.getAllByText('Margaret').length).toBeGreaterThan(0);
    r.unmount();
  });
});
