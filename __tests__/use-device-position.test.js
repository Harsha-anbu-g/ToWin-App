// One shared way to ask for the phone's position (LOC-201).
//
// Before this hook existed, Add Friends was the only screen in the app that
// ever asked, so an elder who posted a help request but never opened Add
// Friends kept the town they typed at signup and read "0 km" to every helper
// in that town. Four screens now need the same ask, and four copies of the
// same useState/useEffect block is four chances to spend the iOS prompt in the
// wrong place.
//
// The rules under test, in the order they matter:
//   - mounting a screen NEVER prompts. iOS gives one system prompt per
//     install, and it belongs to the tap on our own card.
//   - a refusal resolves to a state. Nothing here may throw onto a screen an
//     elder opened to ask for help.
//   - the phone keeps its own record of what it saved, because the API cannot
//     be asked: ProfileResponse.java carries `city` and no coordinates, and
//     PUT /profile/location returns Void.
//   - that record is written ONLY after the PUT succeeded, and it holds the
//     COARSENED pair, never the doorstep fix the phone handed us.
const mockLocation = {
  hasServicesEnabledAsync: jest.fn(async () => true),
  getForegroundPermissionsAsync: jest.fn(async () => ({ granted: false, canAskAgain: true })),
  requestForegroundPermissionsAsync: jest.fn(async () => ({ granted: true, canAskAgain: true })),
  getLastKnownPositionAsync: jest.fn(async () => null),
  getCurrentPositionAsync: jest.fn(async () => ({
    // A doorstep, on purpose: the grid has to eat it before it reaches either
    // the wire or the phone's own record.
    coords: { latitude: 45.50169, longitude: -73.56727 },
  })),
  Accuracy: { Balanced: 3 },
};
// Not { virtual: true } — see the note in __tests__/device-location.test.js:21.
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
  default: { put: jest.fn(async () => ({ data: {} })) },
  setTokenGetter: jest.fn(),
  setOnSessionExpired: jest.fn(),
}));

jest.mock('../src/context/AuthContext', () => ({
  useAuth: () => ({ user: { userId: 'me', role: 'ELDER' }, booted: true }),
}));

import { act, renderHook, waitFor } from '@testing-library/react-native';
import api from '../src/api/client';
import { STATUS } from '../src/lib/deviceLocation';
import { KEYS, APP_WRITTEN_KEYS, locationKey } from '../src/lib/storageKeys';
import useDevicePosition from '../src/lib/useDevicePosition';

const COARSE = { locationLat: 45.5, locationLng: -73.56 };

beforeEach(() => {
  Object.keys(mockStore).forEach((key) => delete mockStore[key]);
  jest.clearAllMocks();
  mockLocation.hasServicesEnabledAsync.mockResolvedValue(true);
  mockLocation.getForegroundPermissionsAsync.mockResolvedValue({ granted: false, canAskAgain: true });
  mockLocation.requestForegroundPermissionsAsync.mockResolvedValue({ granted: true, canAskAgain: true });
  mockLocation.getLastKnownPositionAsync.mockResolvedValue(null);
  mockLocation.getCurrentPositionAsync.mockResolvedValue({
    coords: { latitude: 45.50169, longitude: -73.56727 },
  });
  api.put.mockResolvedValue({ data: {} });
});

/** Mount the hook and wait until the first status read has landed. */
const mount = async () => {
  const view = await renderHook(() => useDevicePosition());
  await waitFor(() => expect(view.result.current.status).not.toBeNull());
  return view;
};

describe('mounting a screen', () => {
  test('never prompts — the one iOS prompt belongs to the tap on our card', async () => {
    const { result } = await mount();
    expect(mockLocation.requestForegroundPermissionsAsync).not.toHaveBeenCalled();
    expect(result.current.status).toBe(STATUS.unknown);
  });

  test('reads the phone’s own record, so a saved position survives a restart', async () => {
    const savedAt = Date.now();
    mockStore[locationKey('me')] = JSON.stringify({ ...COARSE, savedAt });
    mockLocation.getForegroundPermissionsAsync.mockResolvedValue({ granted: true, canAskAgain: false });

    const { result } = await mount();
    await waitFor(() => expect(result.current.hasPosition).toBe(true));
    expect(result.current.position).toEqual(COARSE);
    expect(result.current.savedAt).toBe(savedAt);
  });

  test('no record means no position, even for somebody who typed a town on the website', async () => {
    const { result } = await mount();
    expect(result.current.hasPosition).toBe(false);
    expect(result.current.position).toBeNull();
  });

  test('an unreadable record is treated as no position, never as a crash', async () => {
    mockStore[locationKey('me')] = 'not json';
    const { result } = await mount();
    expect(result.current.hasPosition).toBe(false);
  });
});

describe('enabling', () => {
  test('prompts exactly once per tap', async () => {
    const { result } = await mount();
    await act(async () => {
      await result.current.enable();
    });
    expect(mockLocation.requestForegroundPermissionsAsync).toHaveBeenCalledTimes(1);
    expect(result.current.status).toBe(STATUS.allowed);
  });

  test('writes the phone’s record only after the save succeeded', async () => {
    const { result } = await mount();
    await act(async () => {
      await result.current.enable();
    });
    expect(api.put).toHaveBeenCalledWith('/profile/location', COARSE);

    const record = JSON.parse(mockStore[locationKey('me')]);
    expect(record.locationLat).toBe(COARSE.locationLat);
    expect(record.locationLng).toBe(COARSE.locationLng);
    expect(Number.isFinite(record.savedAt)).toBe(true);
    expect(result.current.hasPosition).toBe(true);
  });

  test('a failed save leaves no record, so the next visit tries again', async () => {
    api.put.mockRejectedValueOnce(new Error('offline'));
    const { result } = await mount();
    await act(async () => {
      await result.current.enable();
    });
    expect(mockStore[locationKey('me')]).toBeUndefined();
    expect(result.current.hasPosition).toBe(false);
  });

  test('the coordinates written are the coarsened ones, never the doorstep fix', async () => {
    const { result } = await mount();
    await act(async () => {
      await result.current.enable();
    });
    const record = JSON.parse(mockStore[locationKey('me')]);
    // 45.50169 / -73.56727 is a front door. Two decimals is the grid.
    expect(record).toMatchObject(COARSE);
    expect(String(record.locationLat).split('.')[1].length).toBeLessThanOrEqual(2);
    expect(String(record.locationLng).split('.')[1].length).toBeLessThanOrEqual(2);
  });

  test('a refusal resolves to a state and never throws', async () => {
    mockLocation.requestForegroundPermissionsAsync.mockResolvedValue({ granted: false, canAskAgain: true });
    const { result } = await mount();
    await act(async () => {
      await expect(result.current.enable()).resolves.toBeDefined();
    });
    expect(result.current.status).toBe(STATUS.refused);
    expect(result.current.hasPosition).toBe(false);
    expect(api.put).not.toHaveBeenCalled();
  });

  test('a final no reads as blocked, so the card can send them to Settings', async () => {
    mockLocation.requestForegroundPermissionsAsync.mockResolvedValue({ granted: false, canAskAgain: false });
    const { result } = await mount();
    await act(async () => {
      await result.current.enable();
    });
    expect(result.current.status).toBe(STATUS.blocked);
  });

  test('a missing native module resolves to unsupported rather than throwing', async () => {
    mockLocation.hasServicesEnabledAsync.mockRejectedValue(new Error('ExpoLocation missing'));
    const { result } = await mount();
    await act(async () => {
      await result.current.enable();
    });
    expect(result.current.status).toBe(STATUS.unsupported);
  });
});

describe('dismissing', () => {
  test('starts undismissed and stays dismissed once the person says not now', async () => {
    const { result } = await mount();
    expect(result.current.dismissed).toBe(false);
    await act(async () => {
      result.current.dismiss();
    });
    expect(result.current.dismissed).toBe(true);
  });
});

describe('the storage key', () => {
  test('is per account, so a shared phone never hands one person’s position to the next', () => {
    expect(locationKey('a')).toBe(`${KEYS.locationPrefix}a`);
    expect(locationKey('b')).not.toBe(locationKey('a'));
    expect(locationKey(undefined)).toBe(`${KEYS.locationPrefix}anon`);
  });

  test('is registered as app-written, so the website collision test covers it', () => {
    expect(APP_WRITTEN_KEYS).toContain(locationKey('example'));
  });
});
