// LOC-205: Profile Edit can use the phone, and Save no longer undoes it.
//
// WHAT WAS BROKEN. profile-edit.jsx:271-277 is the only way anybody's position
// was ever set: it forward-geocodes the town in the box and PUTs that town's
// single centre point. Everyone in one town lands on one dot, so every card
// between them reads "0 km".
//
// THE TRAP THIS FILE EXISTS TO LOCK. ProfileService.java:88-97 sets lat and lng
// to NULL on every PUT /profile/location that carries no coordinates, and
// re-sets them when it does. The save handler runs its town geocode whenever
// `form.city.trim() !== me.city`. So after the phone's own position is saved,
// the backend reverse-geocodes a town into me.city, the box still holds the old
// typed text, the guard sees a difference, and one press of Save replaces a
// ~2 km cell with a town centre. The person's own Save button undoes what they
// just asked for. Copying the resolved town back into the box is what keeps the
// guard shut, and these tests hold it shut.
//
// A note for whoever edits this file: render() and fireEvent() are async in
// @testing-library/react-native 14. Every one needs an await. And wait on the
// RENDER before reading an api mock: the request is recorded a tick before
// React flushes it, and reading the mock first is a race that only fails under
// load (LOC-204 lost three runs to it).
const mockLocation = {
  hasServicesEnabledAsync: jest.fn(async () => true),
  getForegroundPermissionsAsync: jest.fn(async () => ({ granted: false, canAskAgain: true })),
  requestForegroundPermissionsAsync: jest.fn(async () => ({ granted: true, canAskAgain: true })),
  getLastKnownPositionAsync: jest.fn(async () => null),
  getCurrentPositionAsync: jest.fn(async () => ({
    // A front door in Montreal. What reaches the wire must be the cell, 45.5
    // and -73.56, never these five decimal places.
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
}));

jest.mock('expo-image-picker', () => ({
  launchImageLibraryAsync: jest.fn(async () => ({ canceled: true })),
  requestMediaLibraryPermissionsAsync: jest.fn(async () => ({ granted: true })),
  MediaTypeOptions: { Images: 'Images' },
}));

jest.mock('../src/api/client', () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn(), put: jest.fn(), delete: jest.fn() },
  setTokenGetter: jest.fn(),
  setOnSessionExpired: jest.fn(),
  friendlyWriteError: (_e, fallback) => fallback,
}));

jest.mock('../src/context/AuthContext', () => ({
  useAuth: () => ({ user: { role: 'ELDER', userId: 'me', emailVerified: true }, booted: true }),
}));

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import ProfileEdit from '../app/profile-edit';
import api from '../src/api/client';
import { locationKey } from '../src/lib/storageKeys';
import { light } from '../src/theme/tokens';
import { ConfirmProvider } from '../src/context/ConfirmContext';
import { ToastProvider } from '../src/context/ToastContext';
import { ThemeProvider } from '../src/theme/ThemeContext';

const ASK_TITLE = 'Use your phone instead of a typed town';

/** The account before anybody touches it: a town typed at signup, nothing else. */
const ME = {
  name: 'Margaret',
  bio: 'Retired teacher.',
  interests: ['Chess'],
  languages: ['English'],
  lookingFor: 'BOTH',
  hobbies: null,
  skillsOffered: null,
  city: 'Montreal',
  phone: '',
  dateOfBirth: '1953-05-14',
  occupation: '',
  gender: '',
  facebookUrl: '',
  instagramUrl: '',
  idVerified: false,
};

const wrap = () =>
  render(
    <ThemeProvider>
      {/* gcTime Infinity: the default 5 minute gc timer outlives the worker */}
      <QueryClientProvider
        client={new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } })}
      >
        <ToastProvider>
          <ConfirmProvider>
            <ProfileEdit />
          </ConfirmProvider>
        </ToastProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );

/** The form only exists once /profile/me lands. */
const loaded = (r) => waitFor(() => expect(r.getByDisplayValue('Margaret')).toBeTruthy());

/** A position this phone already saved, so the card has nothing left to ask. */
const givePosition = () => {
  mockStore[locationKey('me')] = JSON.stringify({
    locationLat: 45.5,
    locationLng: -73.56,
    savedAt: Date.now(),
  });
};

const putsTo = (path) => api.put.mock.calls.filter(([url]) => url === path);
const getsMatching = (fragment) => api.get.mock.calls.filter(([url]) => url.includes(fragment));

/** Every background colour on a node's flattened style. */
const fills = (node) =>
  []
    .concat(node.props.style ?? [])
    .flat()
    .map((s) => s?.backgroundColor)
    .filter(Boolean);

/**
 * /profile/me answers `city` and never coordinates (ProfileResponse has no
 * locationLat), so `town` is the only thing a refetch can tell the screen.
 */
const serve = ({ town = 'Montreal', geocode = { lat: 45.51, lng: -73.58, city: 'Laval' } } = {}) => {
  api.get.mockImplementation(async (url) => {
    if (url.startsWith('/geocode/search')) return { data: geocode };
    return { data: { ...ME, city: town } };
  });
  api.put.mockResolvedValue({ data: {} });
  api.post.mockResolvedValue({ data: {} });
};

beforeEach(() => {
  Object.keys(mockStore).forEach((key) => delete mockStore[key]);
  jest.clearAllMocks();
  serve();
  mockLocation.hasServicesEnabledAsync.mockResolvedValue(true);
  mockLocation.getForegroundPermissionsAsync.mockResolvedValue({ granted: false, canAskAgain: true });
});

describe('the offer to use the phone instead of a typed town', () => {
  test('sits on the screen when this phone has saved no position', async () => {
    const r = await wrap();
    await loaded(r);

    await waitFor(() => expect(r.getByText(ASK_TITLE)).toBeOnTheScreen());
    // The same three promises the Add Friends wording makes, said here too.
    expect(r.getByText(/two kilometre area/)).toBeOnTheScreen();
    expect(r.getByText(/never your address/)).toBeOnTheScreen();
    expect(r.getByText(/Never while the app is closed/)).toBeOnTheScreen();
    // It asks about this screen, not about finding friends.
    expect(r.queryByText('See who is nearby')).toBeNull();
  });

  test('leaves the one filled button where it belongs, on Save Changes', async () => {
    const r = await wrap();
    await loaded(r);
    await waitFor(() => expect(r.getByText(ASK_TITLE)).toBeOnTheScreen());

    const filled = r.queryAllByRole('button').filter((b) => fills(b).includes(light.actionFill));
    expect(filled).toHaveLength(1);
    expect(fills(r.getByRole('button', { name: 'Save Changes' }))).toContain(light.actionFill);
    expect(fills(r.getByRole('button', { name: 'Use my location' }))).not.toContain(light.actionFill);
  });

  test('is gone once this phone has a position', async () => {
    givePosition();
    const r = await wrap();
    await loaded(r);

    expect(r.queryByText(ASK_TITLE)).toBeNull();
    expect(r.queryByRole('button', { name: 'Use my location' })).toBeNull();
  });

  test('opening the screen never raises the system prompt', async () => {
    const r = await wrap();
    await loaded(r);
    await waitFor(() => expect(r.getByText(ASK_TITLE)).toBeOnTheScreen());

    expect(mockLocation.requestForegroundPermissionsAsync).not.toHaveBeenCalled();
  });
});

describe('using the phone, then pressing Save', () => {
  test('saves the coarsened cell and puts the town it resolved into the box', async () => {
    // The backend reverse-geocodes the cell and answers the new town on the
    // next /profile/me (ProfileService.java:93-97).
    serve({ town: 'Montreal' });
    const r = await wrap();
    await loaded(r);
    await waitFor(() => expect(r.getByText(ASK_TITLE)).toBeOnTheScreen());
    api.get.mockImplementation(async (url) => {
      if (url.startsWith('/geocode/search')) return { data: { lat: 45.51, lng: -73.58, city: 'Laval' } };
      return { data: { ...ME, city: 'Ville-Marie' } };
    });

    await fireEvent.press(r.getByRole('button', { name: 'Use my location' }));

    await waitFor(() => expect(r.getByDisplayValue('Ville-Marie')).toBeTruthy());
    expect(putsTo('/profile/location')).toHaveLength(1);
    expect(api.put).toHaveBeenCalledWith('/profile/location', {
      locationLat: 45.5,
      locationLng: -73.56,
    });
  });

  test('Save afterwards does not geocode the town and does not overwrite the cell', async () => {
    // This is the whole story. One forward geocode here would replace the
    // ~2 km cell with a town centre and undo the save.
    serve({ town: 'Montreal' });
    const r = await wrap();
    await loaded(r);
    await waitFor(() => expect(r.getByText(ASK_TITLE)).toBeOnTheScreen());
    api.get.mockImplementation(async (url) => {
      if (url.startsWith('/geocode/search')) return { data: { lat: 45.51, lng: -73.58, city: 'Laval' } };
      return { data: { ...ME, city: 'Ville-Marie' } };
    });
    await fireEvent.press(r.getByRole('button', { name: 'Use my location' }));
    await waitFor(() => expect(r.getByDisplayValue('Ville-Marie')).toBeTruthy());

    await fireEvent.press(r.getByRole('button', { name: 'Save Changes' }));

    await waitFor(() => expect(api.put).toHaveBeenCalledWith('/profile/elder', expect.any(Object)));
    expect(getsMatching('/geocode/search')).toHaveLength(0);
    expect(putsTo('/profile/location')).toHaveLength(1);
  });

  test('a refetch that will not land still cannot let Save overwrite the cell', async () => {
    // The position is saved against the account either way. What must not
    // happen is the box keeping stale text that Save then forward-geocodes.
    serve({ town: 'Montreal' });
    const r = await wrap();
    await loaded(r);
    await waitFor(() => expect(r.getByText(ASK_TITLE)).toBeOnTheScreen());
    api.get.mockImplementation(async (url) => {
      if (url.startsWith('/geocode/search')) return { data: { lat: 45.51, lng: -73.58, city: 'Laval' } };
      throw new Error('offline');
    });

    await fireEvent.press(r.getByRole('button', { name: 'Use my location' }));
    await waitFor(() => expect(putsTo('/profile/location')).toHaveLength(1));
    await fireEvent.press(r.getByRole('button', { name: 'Save Changes' }));

    await waitFor(() => expect(api.put).toHaveBeenCalledWith('/profile/elder', expect.any(Object)));
    expect(getsMatching('/geocode/search')).toHaveLength(0);
    expect(putsTo('/profile/location')).toHaveLength(1);
  });

  test('a town the person types afterwards still wins, because they asked for it', async () => {
    serve({ town: 'Montreal' });
    const r = await wrap();
    await loaded(r);
    await waitFor(() => expect(r.getByText(ASK_TITLE)).toBeOnTheScreen());
    api.get.mockImplementation(async (url) => {
      if (url.startsWith('/geocode/search')) return { data: { lat: 45.51, lng: -73.58, city: 'Laval' } };
      return { data: { ...ME, city: 'Ville-Marie' } };
    });
    await fireEvent.press(r.getByRole('button', { name: 'Use my location' }));
    await waitFor(() => expect(r.getByDisplayValue('Ville-Marie')).toBeTruthy());

    await fireEvent.changeText(r.getByLabelText('My town or city'), 'Laval');
    await fireEvent.press(r.getByRole('button', { name: 'Save Changes' }));

    await waitFor(() => expect(getsMatching('/geocode/search')).toHaveLength(1));
    expect(api.put).toHaveBeenLastCalledWith('/profile/location', {
      locationLat: 45.51,
      locationLng: -73.58,
      city: 'Laval',
    });
  });
});

describe('the typed town keeps working exactly as it did', () => {
  const STATES = {
    refused: () =>
      mockLocation.requestForegroundPermissionsAsync.mockResolvedValue({ granted: false, canAskAgain: true }),
    'refused for good': () =>
      mockLocation.requestForegroundPermissionsAsync.mockResolvedValue({ granted: false, canAskAgain: false }),
    'switched off on the phone': () => mockLocation.hasServicesEnabledAsync.mockResolvedValue(false),
    'unsupported, no native module': () =>
      mockLocation.getForegroundPermissionsAsync.mockRejectedValue(new Error('ExpoLocation missing')),
    'the read gives nothing back': () => {
      mockLocation.getCurrentPositionAsync.mockResolvedValue(null);
      mockLocation.getLastKnownPositionAsync.mockResolvedValue(null);
    },
  };

  test.each(Object.keys(STATES))('typing a town still saves it with location %s', async (state) => {
    STATES[state]();
    const r = await wrap();
    await loaded(r);

    await fireEvent.changeText(r.getByLabelText('My town or city'), 'Laval');
    await fireEvent.press(r.getByRole('button', { name: 'Save Changes' }));

    await waitFor(() => expect(getsMatching('/geocode/search')).toHaveLength(1));
    expect(api.put).toHaveBeenLastCalledWith('/profile/location', {
      locationLat: 45.51,
      locationLng: -73.58,
      city: 'Laval',
    });
  });

  test('a refusal leaves the box alone and says what happened', async () => {
    mockLocation.requestForegroundPermissionsAsync.mockResolvedValue({ granted: false, canAskAgain: true });
    const r = await wrap();
    await loaded(r);
    await waitFor(() => expect(r.getByText(ASK_TITLE)).toBeOnTheScreen());

    await fireEvent.press(r.getByRole('button', { name: 'Use my location' }));

    await waitFor(() =>
      expect(r.getByText('Your position comes from the town you type')).toBeOnTheScreen()
    );
    // The refused wording promises the typed town keeps working. "the box
    // above" is literal: the card sits directly under that field.
    expect(r.getByText(/looks up the town in the box above/)).toBeOnTheScreen();
    expect(r.getByText(/That still works/)).toBeOnTheScreen();
    // The typed town is untouched, and nothing was written.
    expect(r.getByDisplayValue('Montreal')).toBeTruthy();
    expect(putsTo('/profile/location')).toHaveLength(0);
  });
});
