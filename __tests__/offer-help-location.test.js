// LOC-204: the distance on Offer Help is a real one.
//
// THE BUG THESE TESTS EXIST TO CLOSE. OfferHelpList asked GET /needs/open.
// That endpoint answers through NeedService.getAllOpen, which builds every row
// with `toResponse(n, null, ...)` (NeedService.java:107): distanceKm is null on
// EVERY row. So the client guard `!Number.isFinite(n.distanceKm) ||
// n.distanceKm <= radiusKm` was true for everything, the 5/10/25/50/100 km pill
// filtered nothing at all, and the line "Showing needs within 25 km of you" was
// not true.
//
// THE FIX, WHICH IS THE WEBSITE'S OWN FLOW. GET /needs/nearby?lat&lng&radiusKm
// already exists (NeedController.java:76) and already returns a real
// distanceKm. ToWin/frontend/src/pages/HelperDashboard.jsx:280-281 picks
// between /needs/nearby and /needs/open on exactly the condition this screen
// now has. So: a helper with a saved position gets /needs/nearby, and one
// without keeps /needs/open with honest wording and the shared card on top.
//
// THE TWO RULES THAT MUST NOT BEND. Browsing is never gated behind handing over
// a position: without one, every open request still shows. And the coordinates
// that go on the wire are the coarsened ones from the local record, snapped to
// the 0.02 degree cell by src/lib/coarseLocation.js, never a raw fix.
//
// A note for whoever edits this file: render() and fireEvent() are async in
// @testing-library/react-native 14. Every one needs an await, or the press
// lands before the state change and the assertion reads an empty mock.
const mockLocation = {
  hasServicesEnabledAsync: jest.fn(async () => true),
  getForegroundPermissionsAsync: jest.fn(async () => ({ granted: false, canAskAgain: true })),
  requestForegroundPermissionsAsync: jest.fn(async () => ({ granted: true, canAskAgain: true })),
  getLastKnownPositionAsync: jest.fn(async () => null),
  getCurrentPositionAsync: jest.fn(async () => ({
    coords: { latitude: 45.50169, longitude: -73.56727 },
  })),
  Accuracy: { Balanced: 3 },
};
// Not { virtual: true }: see the note in __tests__/device-location.test.js:21.
jest.mock('expo-location', () => mockLocation);

const mockStore = {};
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async (key) => mockStore[key] ?? null),
  setItemAsync: jest.fn(async (key, value) => {
    mockStore[key] = value;
  }),
  deleteItemAsync: jest.fn(async (key) => {
    delete mockStore[key];
  }),
  WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'whenUnlockedThisDeviceOnly',
}));

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: () => true }),
  useLocalSearchParams: () => ({}),
  useFocusEffect: () => {},
  Redirect: () => null,
}));

jest.mock('../src/context/AuthContext', () => ({
  useAuth: () => ({ user: { role: 'HELPER', userId: 'me', emailVerified: true }, booted: true }),
}));

jest.mock('../src/api/client', () => ({
  __esModule: true,
  default: {
    post: jest.fn(async () => ({ data: {} })),
    get: jest.fn(async () => ({ data: [] })),
    put: jest.fn(async () => ({ data: {} })),
    delete: jest.fn(async () => ({ data: {} })),
  },
  setTokenGetter: jest.fn(),
  setOnSessionExpired: jest.fn(),
  friendlyWriteError: (_e, fallback) => fallback,
}));

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import api from '../src/api/client';
import OfferHelpList from '../src/components/needs/OfferHelpList';
import { locationKey } from '../src/lib/storageKeys';
import { light } from '../src/theme/tokens';
import { ConfirmProvider } from '../src/context/ConfirmContext';
import { ToastProvider } from '../src/context/ToastContext';
import { ThemeProvider } from '../src/theme/ThemeContext';

const ASK_TITLE = 'See how far away each request is';
const TITLE = 'A ride to the clinic on Thursday';

/** One open request, the way /needs/open answers: distanceKm is never set. */
const OPEN_NEED = {
  id: 'n1',
  title: TITLE,
  description: 'Thursday morning, back by noon.',
  status: 'OPEN',
  category: 'TRANSPORTATION',
  urgency: 'NORMAL',
  elderId: 'e1',
  elderName: 'Eleanor',
  createdAt: new Date().toISOString(),
};
/** The same request the way /needs/nearby answers it: a real distance. */
const NEARBY_NEED = { ...OPEN_NEED, distanceKm: 3.2 };

const wrap = (ui) =>
  render(
    <ThemeProvider>
      {/* gcTime Infinity: the default 5 minute gc timer outlives the worker */}
      <QueryClientProvider
        client={new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } })}
      >
        <ToastProvider>
          <ConfirmProvider>{ui}</ConfirmProvider>
        </ToastProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );

/**
 * A position this phone already saved, in the shape savePosition writes.
 * The raw Montreal fix on purpose: readSavedPosition snaps it to the grid, so
 * the values that reach the wire prove the coarsening happened.
 */
const givePosition = (locationLat = 45.50169, locationLng = -73.56727) => {
  mockStore[locationKey('me')] = JSON.stringify({ locationLat, locationLng, savedAt: Date.now() });
};

/** Every GET the screen made against one path, newest last. */
const callsTo = (path) => api.get.mock.calls.filter(([url]) => url === path);

/** Every background colour on a node's flattened style. */
const fills = (node) =>
  []
    .concat(node.props.style ?? [])
    .flat()
    .map((s) => s?.backgroundColor)
    .filter(Boolean);

/** Answer each endpoint the screen reads, with the shapes the backend returns. */
const serve = ({ nearby = [NEARBY_NEED], open = [OPEN_NEED] } = {}) => {
  api.get.mockImplementation(async (url) => {
    if (url === '/needs/nearby') return { data: nearby };
    if (url === '/needs/open') return { data: open };
    return { data: [] };
  });
};

beforeEach(() => {
  Object.keys(mockStore).forEach((key) => delete mockStore[key]);
  jest.clearAllMocks();
  serve();
  mockLocation.hasServicesEnabledAsync.mockResolvedValue(true);
  mockLocation.getForegroundPermissionsAsync.mockResolvedValue({ granted: false, canAskAgain: true });
});

describe('with a position this phone saved', () => {
  test('asks the endpoint that carries a real distance, with the chosen radius', async () => {
    givePosition();
    const r = await wrap(<OfferHelpList />);

    // The row has to be on screen before the calls are counted: the request
    // lands a tick before React flushes it, and reading the mock first is a
    // race this suite has already lost twice.
    await waitFor(() => expect(r.getByText(TITLE)).toBeOnTheScreen());
    expect(callsTo('/needs/nearby')).toHaveLength(1);
    // 25 km is the screen's opening ring, like the website's.
    expect(api.get).toHaveBeenCalledWith('/needs/nearby', {
      params: { lat: 45.5, lng: -73.56, radiusKm: 25 },
    });
    // The endpoint that answers distanceKm null for every row is not asked at all.
    expect(callsTo('/needs/open')).toHaveLength(0);
  });

  test('sends the coarsened coordinates, never the raw fix', async () => {
    // 45.50169 / -73.56727 is a front door. 45.5 / -73.56 is a ~2 km cell.
    // /discover answers distances to 0.1 km, so three calls trilaterate
    // whatever is stored: the snap is the only defence there is.
    givePosition();
    await wrap(<OfferHelpList />);

    await waitFor(() => expect(callsTo('/needs/nearby')).toHaveLength(1));
    const { params } = callsTo('/needs/nearby')[0][1];
    expect(params.lat).toBe(45.5);
    expect(params.lng).toBe(-73.56);
    expect(String(params.lat)).not.toContain('45.50169');
    expect(String(params.lng)).not.toContain('73.56727');
  });

  test('changing the distance asks the server again instead of re-slicing a stale list', async () => {
    // radiusKm lives in the query key. The same mistake was already fixed once
    // for /discover in commit 8c046a0; it does not come back here.
    givePosition();
    const r = await wrap(<OfferHelpList />);
    await waitFor(() => expect(callsTo('/needs/nearby')).toHaveLength(1));

    await fireEvent.press(r.getByLabelText(/Distance 25 kilometres/));

    await waitFor(() => expect(callsTo('/needs/nearby')).toHaveLength(2));
    expect(api.get).toHaveBeenLastCalledWith('/needs/nearby', {
      params: { lat: 45.5, lng: -73.56, radiusKm: 50 },
    });
    expect(r.getByText('Showing needs within 50 km of you')).toBeOnTheScreen();
  });

  test('the card is gone, because there is nothing left to ask for', async () => {
    givePosition();
    const r = await wrap(<OfferHelpList />);

    await waitFor(() => expect(r.getByText(TITLE)).toBeOnTheScreen());
    expect(r.queryByText(ASK_TITLE)).toBeNull();
    expect(r.queryByRole('button', { name: 'Use my location' })).toBeNull();
  });

  test('an empty answer shows the empty state, never a dead screen', async () => {
    givePosition();
    serve({ nearby: [] });
    const r = await wrap(<OfferHelpList />);

    await waitFor(() =>
      expect(r.getByText(/No open needs within 25 km right now/)).toBeOnTheScreen()
    );
  });

  test('a failed answer says so and offers the retry, never an empty list', async () => {
    givePosition();
    api.get.mockImplementation(async (url) => {
      if (url === '/needs/nearby') throw new Error('offline');
      return { data: [] };
    });
    const r = await wrap(<OfferHelpList />);

    await waitFor(() => expect(r.getByText(/We couldn't load/)).toBeOnTheScreen());
    expect(r.getByRole('button', { name: 'Try again' })).toBeOnTheScreen();
  });
});

describe('with no position on this phone', () => {
  test('keeps the list that shows everything, and never asks for a distance it cannot use', async () => {
    const r = await wrap(<OfferHelpList />);

    // Browsing is never the price of handing over a position.
    await waitFor(() => expect(r.getByText(TITLE)).toBeOnTheScreen());
    expect(callsTo('/needs/open')).toHaveLength(1);
    expect(callsTo('/needs/nearby')).toHaveLength(0);
  });

  test('the row stops claiming a radius it cannot apply', async () => {
    const r = await wrap(<OfferHelpList />);

    await waitFor(() => expect(r.getByText('Showing every open request')).toBeOnTheScreen());
    expect(r.queryByText('Showing needs within 25 km of you')).toBeNull();
  });

  test('shows the card, in the words of this screen', async () => {
    const r = await wrap(<OfferHelpList />);

    await waitFor(() => expect(r.getByText(ASK_TITLE)).toBeOnTheScreen());
    // The same three promises the Add Friends wording makes, said here too.
    expect(r.getByText(/two kilometre area/)).toBeOnTheScreen();
    expect(r.getByText(/never your address/)).toBeOnTheScreen();
    expect(r.getByText(/Never while the app is closed/)).toBeOnTheScreen();
    // It asks about requests, not about finding friends.
    expect(r.queryByText('See who is nearby')).toBeNull();
  });

  test('keeps the screen to one filled sky-blue button', async () => {
    const r = await wrap(<OfferHelpList />);
    await waitFor(() => expect(r.getByText(ASK_TITLE)).toBeOnTheScreen());

    const filled = r.queryAllByRole('button').filter((b) => fills(b).includes(light.actionFill));
    expect(filled).toHaveLength(1);
    expect(fills(r.getByRole('button', { name: 'Use my location' }))).toContain(light.actionFill);
  });

  test('Not now takes the card away and leaves the list exactly where it was', async () => {
    const r = await wrap(<OfferHelpList />);
    await waitFor(() => expect(r.getByText(ASK_TITLE)).toBeOnTheScreen());

    await fireEvent.press(r.getByRole('button', { name: 'Not now' }));

    await waitFor(() => expect(r.queryByText(ASK_TITLE)).toBeNull());
    expect(r.getByText(TITLE)).toBeOnTheScreen();
    // Saying no is not a save. Nothing was written, and nothing was sent.
    expect(api.put).not.toHaveBeenCalled();
    expect(mockLocation.requestForegroundPermissionsAsync).not.toHaveBeenCalled();
  });

  test('after a no for good, it says what was lost and that every request still shows', async () => {
    mockLocation.getForegroundPermissionsAsync.mockResolvedValue({ granted: false, canAskAgain: false });
    const r = await wrap(<OfferHelpList />);

    await waitFor(() => expect(r.getByText(TITLE)).toBeOnTheScreen());
    expect(r.getByText('Location is turned off for Towinly')).toBeOnTheScreen();
    expect(r.getByText(/Every open request still shows without it/)).toBeOnTheScreen();
  });

  test('an empty list reads honestly, with no distance to widen', async () => {
    serve({ open: [] });
    const r = await wrap(<OfferHelpList />);

    await waitFor(() => expect(r.getByText('No open requests right now. Check back soon.')).toBeOnTheScreen());
    expect(r.queryByText(/Try a wider distance/)).toBeNull();
  });

  test('mounting the screen never raises the system prompt', async () => {
    // iOS gives one prompt per install. It belongs to the tap on our card.
    const r = await wrap(<OfferHelpList />);
    await waitFor(() => expect(r.getByText(ASK_TITLE)).toBeOnTheScreen());

    expect(mockLocation.requestForegroundPermissionsAsync).not.toHaveBeenCalled();
  });
});
