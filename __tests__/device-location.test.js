// Asking for a position, and what happens at every answer.
//
// The rules under test are the ones a real elder depends on:
//   - nothing is read until the person agreed on OUR card first (iOS gives one
//     system prompt per install; spending it cold is unrecoverable)
//   - "no" is told apart from "no, and stop asking", because only the second
//     one means the app must send them to Settings instead of offering a button
//   - whatever the phone returns is rounded before it can reach the network
//   - every failure resolves to a state, never a throw: this runs on a screen
//     an elder opens to find a friend, and a crash there is the worst outcome
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
// Not { virtual: true }: expo-location is really installed now, and marking
// a real module virtual let the genuine one load in a full-suite run, where
// hasServicesEnabledAsync resolves false and every state read came back 'off'.
jest.mock('expo-location', () => mockLocation);

jest.mock('../src/api/client', () => ({
  __esModule: true,
  default: { put: jest.fn(async () => ({ data: {} })) },
  setTokenGetter: jest.fn(),
  setOnSessionExpired: jest.fn(),
}));

import api from '../src/api/client';
import {
  STATUS,
  currentStatus,
  enableAndSave,
  readCoarsePosition,
  requestPermission,
  savePosition,
} from '../src/lib/deviceLocation';

beforeEach(() => {
  jest.clearAllMocks();
  mockLocation.hasServicesEnabledAsync.mockResolvedValue(true);
  mockLocation.getForegroundPermissionsAsync.mockResolvedValue({ granted: false, canAskAgain: true });
  mockLocation.requestForegroundPermissionsAsync.mockResolvedValue({ granted: true, canAskAgain: true });
  mockLocation.getLastKnownPositionAsync.mockResolvedValue(null);
  mockLocation.getCurrentPositionAsync.mockResolvedValue({
    coords: { latitude: 45.50169, longitude: -73.56727 },
  });
});

describe('reading the current state without prompting', () => {
  test('never prompts — checking status must not spend the one iOS prompt', async () => {
    await currentStatus();
    expect(mockLocation.requestForegroundPermissionsAsync).not.toHaveBeenCalled();
  });

  test('not asked yet reads as unknown', async () => {
    expect(await currentStatus()).toBe(STATUS.unknown);
  });

  test('already allowed reads as allowed', async () => {
    mockLocation.getForegroundPermissionsAsync.mockResolvedValue({ granted: true, canAskAgain: false });
    expect(await currentStatus()).toBe(STATUS.allowed);
  });

  test('refused for good reads as blocked, not merely refused', async () => {
    // The difference decides whether the screen offers a button that can work
    // or sends the person to Settings.
    mockLocation.getForegroundPermissionsAsync.mockResolvedValue({ granted: false, canAskAgain: false });
    expect(await currentStatus()).toBe(STATUS.blocked);
  });

  test('location switched off for the whole phone is its own state', async () => {
    mockLocation.hasServicesEnabledAsync.mockResolvedValue(false);
    expect(await currentStatus()).toBe(STATUS.off);
  });

  test('a missing native module resolves to unsupported rather than throwing', async () => {
    mockLocation.hasServicesEnabledAsync.mockRejectedValue(new Error('ExpoLocation missing'));
    await expect(currentStatus()).resolves.toBe(STATUS.unsupported);
  });
});

describe('asking', () => {
  test('a yes reads as allowed', async () => {
    expect(await requestPermission()).toBe(STATUS.allowed);
  });

  test('a no that can be asked again reads as refused', async () => {
    mockLocation.requestForegroundPermissionsAsync.mockResolvedValue({ granted: false, canAskAgain: true });
    expect(await requestPermission()).toBe(STATUS.refused);
  });

  test('a final no reads as blocked', async () => {
    mockLocation.requestForegroundPermissionsAsync.mockResolvedValue({ granted: false, canAskAgain: false });
    expect(await requestPermission()).toBe(STATUS.blocked);
  });
});

describe('reading a position', () => {
  test('the position leaves the device rounded, never at street level', async () => {
    const out = await readCoarsePosition();
    // 45.50169 / -73.56727 is a doorstep; the grid must have eaten it.
    expect(out).toEqual({ locationLat: 45.5, locationLng: -73.56 });
  });

  test('a last-known fix is preferred, and is rounded too', async () => {
    mockLocation.getLastKnownPositionAsync.mockResolvedValue({
      coords: { latitude: 45.51999, longitude: -73.55001 },
    });
    const out = await readCoarsePosition();
    expect(mockLocation.getCurrentPositionAsync).not.toHaveBeenCalled();
    expect(String(out.locationLat).split('.')[1].length).toBeLessThanOrEqual(2);
  });

  test('balanced accuracy, not the battery-hungry best', async () => {
    await readCoarsePosition();
    expect(mockLocation.getCurrentPositionAsync).toHaveBeenCalledWith(
      expect.objectContaining({ accuracy: mockLocation.Accuracy.Balanced })
    );
  });

  test('a timeout or an indoor failure returns null instead of throwing', async () => {
    mockLocation.getLastKnownPositionAsync.mockRejectedValue(new Error('timeout'));
    await expect(readCoarsePosition()).resolves.toBeNull();
  });
});

describe('saving', () => {
  test('a rounded position goes to the endpoint the website already uses', async () => {
    await savePosition({ locationLat: 45.5, locationLng: -73.56 });
    expect(api.put).toHaveBeenCalledWith('/profile/location', {
      locationLat: 45.5,
      locationLng: -73.56,
    });
  });

  test('nothing is sent when there is no position', async () => {
    await savePosition(null);
    expect(api.put).not.toHaveBeenCalled();
  });

  test('a failed save is swallowed — the person asked for friends, not a sync', async () => {
    api.put.mockRejectedValueOnce(new Error('offline'));
    await expect(savePosition({ locationLat: 1, locationLng: 2 })).resolves.toBe(false);
  });
});

describe('the whole flow', () => {
  test('a yes reads and saves a rounded position', async () => {
    const { status, position } = await enableAndSave();
    expect(status).toBe(STATUS.allowed);
    expect(position).toEqual({ locationLat: 45.5, locationLng: -73.56 });
    expect(api.put).toHaveBeenCalledWith('/profile/location', position);
  });

  test('a no never reads a position and never sends anything', async () => {
    mockLocation.requestForegroundPermissionsAsync.mockResolvedValue({ granted: false, canAskAgain: true });
    const { status, position } = await enableAndSave();
    expect(status).toBe(STATUS.refused);
    expect(position).toBeNull();
    expect(mockLocation.getCurrentPositionAsync).not.toHaveBeenCalled();
    expect(api.put).not.toHaveBeenCalled();
  });
});
