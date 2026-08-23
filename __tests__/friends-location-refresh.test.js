// Add Friends has to redraw its distances when a stale position is replaced.
//
// The finding this pins (LOC-208 sweep, left for the owner and now fixed):
// useDevicePosition refreshes a position older than a day quietly on mount.
// The discover query key is ['discover', path, radiusKm] and carries no
// position, so when that refresh landed nothing refetched. Every distance on
// screen had been computed by the SERVER from the old position, and the person
// was never told to pull down. Offer Help never had the bug, because its key
// is ['needs-nearby', lat, lng, radiusKm]: a new position changes the key and
// refetches by itself.
//
// The rule: a position that actually changed re-asks the server. A position
// that merely arrived for the first time does not, or every ordinary mount
// would fetch the same list twice.
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, waitFor } from '@testing-library/react-native';
import { ThemeProvider } from '../src/theme/ThemeContext';
import { ToastProvider } from '../src/context/ToastContext';
import { ConfirmProvider } from '../src/context/ConfirmContext';

const mockRouter = { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: () => true };
jest.mock('expo-router', () => ({
  useRouter: () => mockRouter,
  useFocusEffect: () => {},
  useLocalSearchParams: () => ({}),
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
  useAuth: () => ({ user: { role: 'HELPER', userId: 'me', emailVerified: true }, booted: true }),
}));

// The screen's reaction is what is under test, not the device plumbing, so the
// position module is mocked at its own edge. STATUS keeps its real values:
// the screen compares against them.
const STATUS = {
  unknown: 'unknown',
  allowed: 'allowed',
  refused: 'refused',
  blocked: 'blocked',
  off: 'off',
  unsupported: 'unsupported',
};
const DAY = 24 * 60 * 60 * 1000;
const mockPosition = {
  status: STATUS.allowed,
  saved: null, // set per test
  refreshed: null, // what readSavedPosition returns after a refresh
};
jest.mock('../src/lib/deviceLocation', () => ({
  __esModule: true,
  STATUS,
  currentStatus: jest.fn(async () => mockPosition.status),
  enableAndSave: jest.fn(async () => ({ status: mockPosition.status, position: null })),
  readSavedPosition: jest.fn(async () =>
    mockPosition.refreshed ? mockPosition.refreshed : mockPosition.saved
  ),
  refreshSavedPosition: jest.fn(async () => {
    // The silent read lands: from here on the record is the newer one.
    mockPosition.refreshed = { locationLat: 45.52, locationLng: -73.58, savedAt: Date.now() };
    return true;
  }),
}));

import api from '../src/api/client';
import { refreshSavedPosition } from '../src/lib/deviceLocation';
import FriendsScreen from '../app/friends/index';

const wrap = (ui) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <ThemeProvider>
        <ToastProvider>
          <ConfirmProvider>{ui}</ConfirmProvider>
        </ToastProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

const discoverCalls = () =>
  api.get.mock.calls.filter(([path]) => String(path).startsWith('/discover')).length;

beforeEach(() => {
  jest.clearAllMocks();
  mockPosition.status = STATUS.allowed;
  mockPosition.saved = null;
  mockPosition.refreshed = null;
});

describe('Add Friends and a position that changed underneath it', () => {
  test('a stale position that gets refreshed re-asks the server for distances', async () => {
    // Two days old, and permission already granted: exactly the person the
    // silent refresh exists for.
    mockPosition.saved = { locationLat: 45.5, locationLng: -73.56, savedAt: Date.now() - 2 * DAY };

    wrap(<FriendsScreen />);

    // The first paint fetches once, with distances the server computed from the
    // OLD position.
    await waitFor(() => expect(discoverCalls()).toBeGreaterThanOrEqual(1));
    await waitFor(() => expect(refreshSavedPosition).toHaveBeenCalled());

    // The refresh landed, so the distances on screen are now wrong and the
    // screen has to ask again. This is the whole finding.
    await waitFor(() => expect(discoverCalls()).toBeGreaterThanOrEqual(2));
  });

  test('a fresh position is left alone, and the list is not fetched twice', async () => {
    mockPosition.saved = { locationLat: 45.5, locationLng: -73.56, savedAt: Date.now() - 60_000 };

    wrap(<FriendsScreen />);

    await waitFor(() => expect(discoverCalls()).toBeGreaterThanOrEqual(1));
    // Nothing to refresh, so nothing may re-fetch. A record arriving for the
    // first time is not a change.
    expect(refreshSavedPosition).not.toHaveBeenCalled();
    await new Promise((r) => setTimeout(r, 50));
    expect(discoverCalls()).toBe(1);
  });

  test('no position at all still fetches exactly once', async () => {
    mockPosition.saved = null;
    mockPosition.status = STATUS.unknown; // never asked, so nothing may read

    wrap(<FriendsScreen />);

    await waitFor(() => expect(discoverCalls()).toBe(1));
    expect(refreshSavedPosition).not.toHaveBeenCalled();
    await new Promise((r) => setTimeout(r, 50));
    expect(discoverCalls()).toBe(1);
  });
});
