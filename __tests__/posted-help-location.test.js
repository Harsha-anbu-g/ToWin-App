// LOC-203: Post Help asks for the phone's position AFTER the request is posted.
//
// WHY HERE AND NOT ON THE FORM. Owner decision, 2026-08-22: nothing interrupts
// an elder while they are writing a request. app/(tabs)/action.jsx:57 pushes to
// /(tabs)/posted-help the moment the post lands, so this list is the first
// thing they see afterwards. They have their request in front of them, which is
// the one moment "helpers nearby see how far away you are" means something.
//
// WHAT IS BROKEN WITHOUT IT. Add Friends was the only screen in the app that
// ever asked. An elder who posts a request and never opens Add Friends keeps
// the town centre they typed at signup, so every helper in that town reads the
// same "0 km" and nobody can tell who is on their street.
//
// THE HARD RULE THESE TESTS EXIST TO HOLD. A refused, dismissed, failed or
// unsupported position never blocks posting. The form works exactly as it did,
// the request still inherits the elder's stored town, and POST /needs still
// carries no coordinates (NeedService.java:81-86, locked by LOC-202 in
// __tests__/needs-post-location.test.js).
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
  useAuth: () => ({ user: { role: 'ELDER', userId: 'me', emailVerified: true }, booted: true }),
}));

jest.mock('../src/api/client', () => ({
  __esModule: true,
  default: {
    post: jest.fn(async () => ({ data: {} })),
    get: jest.fn(async () => ({ data: { content: [] } })),
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
import ActionScreen from '../app/(tabs)/action';
import PostedHelpList from '../src/components/needs/PostedHelpList';
import { locationKey } from '../src/lib/storageKeys';
import { light } from '../src/theme/tokens';
import { ConfirmProvider } from '../src/context/ConfirmContext';
import { ToastProvider } from '../src/context/ToastContext';
import { ThemeProvider } from '../src/theme/ThemeContext';

const ASK_TITLE = 'Let helpers see how far away you are';
const ONE_NEED = {
  content: [
    {
      id: 'n1',
      title: 'A ride to the clinic on Thursday',
      status: 'OPEN',
      category: 'TRANSPORTATION',
      urgency: 'NORMAL',
      applications: [],
    },
  ],
};

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

/** A position this phone already saved, in the shape savePosition writes. */
const givePosition = () => {
  mockStore[locationKey('me')] = JSON.stringify({
    locationLat: 45.5,
    locationLng: -73.56,
    savedAt: Date.now(),
  });
};

/** Every background colour on a node's flattened style. */
const fills = (node) =>
  []
    .concat(node.props.style ?? [])
    .flat()
    .map((s) => s?.backgroundColor)
    .filter(Boolean);

beforeEach(() => {
  Object.keys(mockStore).forEach((key) => delete mockStore[key]);
  jest.clearAllMocks();
  api.get.mockResolvedValue({ data: ONE_NEED });
  mockLocation.hasServicesEnabledAsync.mockResolvedValue(true);
  mockLocation.getForegroundPermissionsAsync.mockResolvedValue({ granted: false, canAskAgain: true });
});

describe('the card on the screen an elder lands on after posting', () => {
  test('appears when this phone has saved no position yet', async () => {
    const r = await wrap(<PostedHelpList />);

    await waitFor(() => expect(r.getByText(ASK_TITLE)).toBeOnTheScreen());
    // The same three promises the Add Friends wording makes, said here too.
    expect(r.getByText(/two kilometre area/)).toBeOnTheScreen();
    expect(r.getByText(/never your address/)).toBeOnTheScreen();
    expect(r.getByText(/Never while the app is closed/)).toBeOnTheScreen();
    // It asks about THIS screen, not about finding friends.
    expect(r.queryByText('See who is nearby')).toBeNull();
  });

  test('never adds a second filled sky-blue button to the screen', async () => {
    // The locked rule is one filled primary per screen (HCI 8). This list does
    // not own one, and the card must not quietly hand it one either.
    const r = await wrap(<PostedHelpList />);
    await waitFor(() => expect(r.getByText(ASK_TITLE)).toBeOnTheScreen());

    const ask = r.getByRole('button', { name: 'Use my location' });
    expect(fills(ask)).not.toContain(light.actionFill);
    expect(
      r.queryAllByRole('button').filter((b) => fills(b).includes(light.actionFill))
    ).toHaveLength(0);
  });

  test('is gone once this phone has a position', async () => {
    givePosition();
    const r = await wrap(<PostedHelpList />);

    await waitFor(() => expect(r.getByText('A ride to the clinic on Thursday')).toBeOnTheScreen());
    expect(r.queryByText(ASK_TITLE)).toBeNull();
    expect(r.queryByRole('button', { name: 'Use my location' })).toBeNull();
  });

  test('Not now takes it away and leaves the request exactly where it was', async () => {
    const r = await wrap(<PostedHelpList />);
    await waitFor(() => expect(r.getByText(ASK_TITLE)).toBeOnTheScreen());

    await fireEvent.press(r.getByRole('button', { name: 'Not now' }));

    await waitFor(() => expect(r.queryByText(ASK_TITLE)).toBeNull());
    expect(r.getByText('A ride to the clinic on Thursday')).toBeOnTheScreen();
    // Saying no is not a save. Nothing was written, and nothing was sent.
    expect(api.put).not.toHaveBeenCalled();
    expect(mockLocation.requestForegroundPermissionsAsync).not.toHaveBeenCalled();
  });

  test('after a no, it says what was lost and that the request still shows', async () => {
    // A screen that goes quiet after a refusal reads as broken to an elder
    // (HCI 1), and a refusal has to be reversible (HCI 3). Both live in the
    // words, so both are asserted here.
    mockLocation.getForegroundPermissionsAsync.mockResolvedValue({
      granted: false,
      canAskAgain: false,
    });
    const r = await wrap(<PostedHelpList />);

    await waitFor(() =>
      expect(r.getByText('Location is turned off for Towinly')).toBeOnTheScreen()
    );
    expect(r.getByText(/Your request still shows without it/)).toBeOnTheScreen();
    expect(r.getByText('A ride to the clinic on Thursday')).toBeOnTheScreen();
  });

  test('mounting the screen never raises the system prompt', async () => {
    // iOS gives one prompt per install. It belongs to the tap on our card.
    const r = await wrap(<PostedHelpList />);
    await waitFor(() => expect(r.getByText(ASK_TITLE)).toBeOnTheScreen());

    expect(mockLocation.requestForegroundPermissionsAsync).not.toHaveBeenCalled();
  });
});

describe('posting is never blocked by the position', () => {
  // Each state an elder can be in when they tap Post Help. The card lives on
  // the screen AFTER this one, so none of these may change what the form does.
  const STATES = {
    'never asked': () =>
      mockLocation.getForegroundPermissionsAsync.mockResolvedValue({ granted: false, canAskAgain: true }),
    refused: () =>
      mockLocation.getForegroundPermissionsAsync.mockResolvedValue({ granted: false, canAskAgain: false }),
    'switched off on the phone': () => mockLocation.hasServicesEnabledAsync.mockResolvedValue(false),
    'unsupported, no native module': () =>
      mockLocation.getForegroundPermissionsAsync.mockRejectedValue(new Error('ExpoLocation missing')),
  };

  test.each(Object.keys(STATES))('the request still posts with location %s', async (state) => {
    STATES[state]();
    const r = await wrap(<ActionScreen />);

    await fireEvent.changeText(r.getByLabelText('Title'), 'A ride to the clinic on Thursday');
    await fireEvent.press(r.getByRole('button', { name: 'Post Help' }));

    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/needs', expect.any(Object)));
    const body = api.post.mock.calls.find(([url]) => url === '/needs')[1];
    // LOC-202's rule, re-asserted from the screen that now asks for a position:
    // the coordinate never rides along, so the elder's own stored position wins.
    expect(body).not.toHaveProperty('locationLat');
    expect(body).not.toHaveProperty('locationLng');
    expect(Object.keys(body).sort()).toEqual(['category', 'description', 'title', 'urgency']);
  });

  test.each(Object.keys(STATES))('the landing screen still shows the request with location %s', async (state) => {
    STATES[state]();
    const r = await wrap(<PostedHelpList />);

    await waitFor(() => expect(r.getByText('A ride to the clinic on Thursday')).toBeOnTheScreen());
    // Whatever the card says, or does not say, the request is readable.
    expect(r.getByText(/Rides/)).toBeOnTheScreen();
  });

  test('a dismissed card leaves the next post working', async () => {
    const r = await wrap(<PostedHelpList />);
    await waitFor(() => expect(r.getByText(ASK_TITLE)).toBeOnTheScreen());
    await fireEvent.press(r.getByRole('button', { name: 'Not now' }));
    await waitFor(() => expect(r.queryByText(ASK_TITLE)).toBeNull());

    const form = await wrap(<ActionScreen />);
    await fireEvent.changeText(form.getByLabelText('Title'), 'Someone to sit with me on Sunday');
    await fireEvent.press(form.getByRole('button', { name: 'Post Help' }));

    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/needs', expect.any(Object)));
    const body = api.post.mock.calls.find(([url]) => url === '/needs')[1];
    expect(body.title).toBe('Someone to sit with me on Sunday');
    expect(body).not.toHaveProperty('locationLat');
  });
});
