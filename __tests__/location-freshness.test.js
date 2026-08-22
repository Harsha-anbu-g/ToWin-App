// LOC-206: a stale position is refreshed, and never by a timer.
//
// WHY THIS MATTERS MORE THAN IT SOUNDS. A position saved six months ago is
// worse than no position at all: it does not read as missing, it reads as a
// distance, and every helper looking at that card believes it. Somebody who
// moved across the city keeps telling the people around them that they are two
// hours away.
//
// THE ONE THING THAT MAKES A QUIET REFRESH ALLOWABLE. It only ever happens
// where permission is ALREADY granted, so no system dialog can appear. iOS
// gives one prompt per install and it belongs to the tap on our own card. A
// silent read in any other state would spend that prompt somewhere nobody
// agreed to, which is why four of the tests below exist to prove it cannot.
//
// AND THE LINE THIS APP DOES NOT CROSS. Foreground only. No timer, no watcher,
// no background task, no AppState listener wired to location. An app for
// elderly people has no business knowing where they are while it is shut. The
// source scan at the bottom holds that for code nobody has written yet.
const mockLocation = {
  hasServicesEnabledAsync: jest.fn(async () => true),
  getForegroundPermissionsAsync: jest.fn(async () => ({ granted: true, canAskAgain: false })),
  requestForegroundPermissionsAsync: jest.fn(async () => ({ granted: true, canAskAgain: true })),
  getLastKnownPositionAsync: jest.fn(async () => null),
  getCurrentPositionAsync: jest.fn(async () => ({
    coords: { latitude: 45.62031, longitude: -73.66104 },
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

jest.mock('../src/api/client', () => ({
  __esModule: true,
  default: { get: jest.fn(async () => ({ data: {} })), put: jest.fn(async () => ({ data: {} })) },
  setTokenGetter: jest.fn(),
  setOnSessionExpired: jest.fn(),
}));

jest.mock('../src/context/AuthContext', () => ({
  useAuth: () => ({ user: { userId: 'me', role: 'ELDER' }, booted: true }),
}));

import fs from 'fs';
import path from 'path';
import { render, renderHook, waitFor } from '@testing-library/react-native';
import api from '../src/api/client';
import LocationPrimer from '../src/components/location/LocationPrimer';
import { STATUS } from '../src/lib/deviceLocation';
import { locationKey } from '../src/lib/storageKeys';
import useDevicePosition, { STALE_AFTER_MS } from '../src/lib/useDevicePosition';
import { ThemeProvider } from '../src/theme/ThemeContext';

const HOUR = 60 * 60 * 1000;
/** The old cell, and the one the phone would read now. */
const OLD = { locationLat: 45.5, locationLng: -73.56 };
const FRESH = { locationLat: 45.62, locationLng: -73.66 };

/** Put a record on the phone, saved this many hours ago. */
const savedHoursAgo = (hours, position = OLD) => {
  mockStore[locationKey('me')] = JSON.stringify({
    ...position,
    savedAt: Date.now() - hours * HOUR,
  });
};

/** Every way the module can reach the phone for a fix. */
const readsTaken = () =>
  mockLocation.getLastKnownPositionAsync.mock.calls.length +
  mockLocation.getCurrentPositionAsync.mock.calls.length;

const mount = async () => {
  const view = await renderHook(() => useDevicePosition());
  await waitFor(() => expect(view.result.current.status).not.toBeNull());
  return view;
};

beforeEach(() => {
  Object.keys(mockStore).forEach((key) => delete mockStore[key]);
  jest.clearAllMocks();
  mockLocation.hasServicesEnabledAsync.mockResolvedValue(true);
  mockLocation.getForegroundPermissionsAsync.mockResolvedValue({ granted: true, canAskAgain: false });
  mockLocation.getLastKnownPositionAsync.mockResolvedValue(null);
  mockLocation.getCurrentPositionAsync.mockResolvedValue({
    coords: { latitude: 45.62031, longitude: -73.66104 },
  });
  api.put.mockResolvedValue({ data: {} });
});

describe('how old is too old', () => {
  test('is one named constant, and it is a day', () => {
    // A magic 86400000 buried in a comparison is the thing that drifts.
    expect(STALE_AFTER_MS).toBe(24 * 60 * 60 * 1000);
  });

  test('a record from yesterday is stale, one from this morning is not', async () => {
    savedHoursAgo(1);
    const { result } = await mount();
    await waitFor(() => expect(result.current.hasPosition).toBe(true));
    expect(result.current.isStale).toBe(false);
  });

  test('no record at all counts as stale', async () => {
    mockLocation.getForegroundPermissionsAsync.mockResolvedValue({ granted: false, canAskAgain: true });
    const { result } = await mount();
    expect(result.current.isStale).toBe(true);
  });
});

describe('the quiet refresh, where permission is already granted', () => {
  test('reads once and saves the new cell when the record has gone stale', async () => {
    savedHoursAgo(30);
    const { result } = await mount();

    await waitFor(() => expect(api.put).toHaveBeenCalledWith('/profile/location', FRESH));
    expect(readsTaken()).toBe(2); // one last-known probe, one balanced fix
    await waitFor(() => expect(result.current.position).toEqual(FRESH));
    expect(JSON.parse(mockStore[locationKey('me')])).toMatchObject(FRESH);
    // The saved pair is the grid cell, never the doorstep 45.62031 / -73.66104.
    expect(String(FRESH.locationLat).split('.')[1].length).toBeLessThanOrEqual(2);
  });

  test('never raises the system prompt, because there is nothing left to ask', async () => {
    savedHoursAgo(30);
    await mount();

    await waitFor(() => expect(api.put).toHaveBeenCalled());
    expect(mockLocation.requestForegroundPermissionsAsync).not.toHaveBeenCalled();
  });

  test('reads nothing at all when the record is still fresh', async () => {
    savedHoursAgo(1);
    const { result } = await mount();
    await waitFor(() => expect(result.current.hasPosition).toBe(true));

    expect(readsTaken()).toBe(0);
    expect(api.put).not.toHaveBeenCalled();
    expect(result.current.position).toEqual(OLD);
  });

  test('fills in a position for somebody who has permission but no record', async () => {
    // A reinstall wipes the keychain, and the website can grant location
    // without this phone ever writing its own note.
    const { result } = await mount();

    await waitFor(() => expect(result.current.hasPosition).toBe(true));
    expect(api.put).toHaveBeenCalledWith('/profile/location', FRESH);
    expect(mockLocation.requestForegroundPermissionsAsync).not.toHaveBeenCalled();
  });

  test('happens once per mount, however many times the screen re-renders', async () => {
    savedHoursAgo(30);
    const view = await mount();
    await waitFor(() => expect(api.put).toHaveBeenCalled());

    await view.rerender();
    await view.rerender();

    expect(api.put).toHaveBeenCalledTimes(1);
    expect(readsTaken()).toBe(2);
  });
});

describe('every state where a silent read would spend the iOS prompt', () => {
  const STATES = {
    'never asked': () =>
      mockLocation.getForegroundPermissionsAsync.mockResolvedValue({ granted: false, canAskAgain: true }),
    refused: () =>
      mockLocation.getForegroundPermissionsAsync.mockResolvedValue({ granted: false, canAskAgain: false }),
    'switched off on the phone': () => mockLocation.hasServicesEnabledAsync.mockResolvedValue(false),
    'unsupported, no native module': () =>
      mockLocation.getForegroundPermissionsAsync.mockRejectedValue(new Error('ExpoLocation missing')),
  };

  test.each(Object.keys(STATES))('reads nothing and asks nothing when location is %s', async (state) => {
    STATES[state]();
    savedHoursAgo(30);
    const { result } = await mount();
    await waitFor(() => expect(result.current.status).not.toBe(STATUS.allowed));

    expect(readsTaken()).toBe(0);
    expect(api.put).not.toHaveBeenCalled();
    expect(mockLocation.requestForegroundPermissionsAsync).not.toHaveBeenCalled();
  });
});

describe('the way somebody who moved today asks for it themselves', () => {
  const paint = (props) =>
    render(
      <ThemeProvider>
        <LocationPrimer status={STATUS.allowed} {...props} />
      </ThemeProvider>
    );

  test('the card offers an update where a screen hands it a way to refresh', async () => {
    const onRefresh = jest.fn();
    const r = await paint({ context: 'profile', actionVariant: 'secondary', onRefresh });

    expect(r.getByText('Your position comes from your phone')).toBeOnTheScreen();
    expect(r.getByRole('button', { name: 'Update my location' })).toBeOnTheScreen();
    // The promise is repeated here, not left to the policy.
    expect(r.getByText(/two kilometre/)).toBeOnTheScreen();
    expect(r.getByText(/never your address/)).toBeOnTheScreen();
  });

  test('and says nothing at all on a screen that offers none', async () => {
    // The three browse screens are unchanged: a person with a position sees no
    // card there, exactly as before this story.
    const r = await paint({ context: 'offer', onEnable: jest.fn() });
    expect(r.toJSON()).toBeNull();
  });

  test('the update action runs the refresh, not the thing that prompts', async () => {
    const onRefresh = jest.fn();
    const onEnable = jest.fn();
    const r = await paint({ context: 'profile', onRefresh, onEnable });

    const { fireEvent } = require('@testing-library/react-native');
    await fireEvent.press(r.getByRole('button', { name: 'Update my location' }));

    expect(onRefresh).toHaveBeenCalledTimes(1);
    expect(onEnable).not.toHaveBeenCalled();
  });
});

// These read the source rather than running it, so a timer nobody has written
// yet is caught on the day somebody writes one.
describe('nothing in this app watches where anybody is', () => {
  const ROOTS = ['app', 'src'];
  const CODE = /\.(js|jsx)$/;
  const APP = path.join(__dirname, '..');

  const sourceFiles = () => {
    const found = [];
    const walk = (dir) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(full);
        else if (CODE.test(entry.name)) found.push(full);
      }
    };
    ROOTS.forEach((root) => walk(path.join(APP, root)));
    return found.map((f) => path.relative(APP, f)).sort();
  };

  const read = (file) => fs.readFileSync(path.join(APP, file), 'utf8');

  /** Comments say these words for good reasons. Only real calls count. */
  const CALLS = [
    'watchPositionAsync(',
    'startLocationUpdatesAsync(',
    'startGeofencingAsync(',
    'requestBackgroundPermissionsAsync(',
    'setInterval(',
  ];

  test('no watcher, no background updates, no geofence, no timer', () => {
    const offenders = [];
    for (const file of sourceFiles()) {
      const source = read(file);
      for (const call of CALLS) {
        if (source.includes(call)) offenders.push(`${file} calls ${call})`);
      }
    }
    expect(offenders).toEqual([]);
  });

  test('no file that touches location listens to the app going in and out', () => {
    // app/_layout.jsx has an AppState listener for the query cache, and that one
    // is allowed. What must never exist is a location read wired to it: that is
    // background tracking with extra steps.
    const offenders = [];
    for (const file of sourceFiles()) {
      const source = read(file);
      const touchesLocation = /deviceLocation|useDevicePosition|expo-location/.test(source);
      if (touchesLocation && /AppState\.addEventListener/.test(source)) offenders.push(file);
    }
    expect(offenders).toEqual([]);
  });
});
