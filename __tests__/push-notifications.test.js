// The app half of push: permission asked once and respected, the token
// registered for the signed-in person, sign-out silencing exactly this
// device, and a tapped notification opening the screen it is about.
import { Platform } from 'react-native';

const mockNotifications = {
  setNotificationHandler: jest.fn(),
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  getExpoPushTokenAsync: jest.fn(),
  addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  getLastNotificationResponseAsync: jest.fn(() => Promise.resolve(null)),
};
jest.mock('expo-notifications', () => mockNotifications, { virtual: true });
jest.mock('expo-device', () => ({ isDevice: true }), { virtual: true });
jest.mock('expo-constants', () => ({
  expoConfig: { extra: { eas: { projectId: 'test-project-id' } } },
}));

jest.mock('../src/api/client', () => ({
  __esModule: true,
  default: { post: jest.fn(() => Promise.resolve({})), delete: jest.fn(() => Promise.resolve({})) },
}));

jest.mock('../src/lib/storage', () => {
  const store = new Map();
  return {
    setItemAsync: jest.fn(async (k, v) => void store.set(k, v)),
    getItemAsync: jest.fn(async (k) => store.get(k) ?? null),
    deleteItemAsync: jest.fn(async (k) => void store.delete(k)),
    __store: store,
  };
});

import api from '../src/api/client';
const Store = jest.requireMock('../src/lib/storage');
import { KEYS } from '../src/lib/storageKeys';
import {
  answerColdStartTapAsync,
  registerForPushAsync,
  setupForegroundHandler,
  unregisterPushAsync,
  routeForNotification,
  wireNotificationTaps,
} from '../src/lib/pushNotifications';

beforeEach(() => {
  jest.clearAllMocks();
  Store.__store.clear();
  Platform.OS = 'ios';
});

describe('registering for pings', () => {
  test('a granted permission registers this device for the signed-in person', async () => {
    mockNotifications.getPermissionsAsync.mockResolvedValue({ granted: true, canAskAgain: true });
    mockNotifications.getExpoPushTokenAsync.mockResolvedValue({ data: 'ExponentPushToken[abc]' });

    const token = await registerForPushAsync();

    expect(token).toBe('ExponentPushToken[abc]');
    expect(api.post).toHaveBeenCalledWith('/notifications/token', {
      token: 'ExponentPushToken[abc]',
      platform: 'ios',
    });
    // Remembered so sign-out can silence exactly this phone.
    expect(Store.__store.get(KEYS.pushToken)).toBe('ExponentPushToken[abc]');
  });

  test('a refusal is respected: no token minted, nothing sent, no retry nag', async () => {
    mockNotifications.getPermissionsAsync.mockResolvedValue({ granted: false, canAskAgain: false });

    const token = await registerForPushAsync();

    expect(token).toBeNull();
    expect(mockNotifications.requestPermissionsAsync).not.toHaveBeenCalled();
    expect(mockNotifications.getExpoPushTokenAsync).not.toHaveBeenCalled();
    expect(api.post).not.toHaveBeenCalled();
  });

  test('undecided permission asks the system dialog exactly once', async () => {
    mockNotifications.getPermissionsAsync.mockResolvedValue({ granted: false, canAskAgain: true });
    mockNotifications.requestPermissionsAsync.mockResolvedValue({ granted: true });
    mockNotifications.getExpoPushTokenAsync.mockResolvedValue({ data: 'ExponentPushToken[new]' });

    await registerForPushAsync();

    expect(mockNotifications.requestPermissionsAsync).toHaveBeenCalledTimes(1);
    expect(api.post).toHaveBeenCalled();
  });

  test('the web build never touches the native module', async () => {
    Platform.OS = 'web';

    const token = await registerForPushAsync();

    expect(token).toBeNull();
    expect(mockNotifications.getPermissionsAsync).not.toHaveBeenCalled();
    expect(api.post).not.toHaveBeenCalled();
  });

  test('a failed registration degrades to silence, never to a crash', async () => {
    mockNotifications.getPermissionsAsync.mockRejectedValue(new Error('boom'));

    await expect(registerForPushAsync()).resolves.toBeNull();
  });
});

describe('sign-out silences this device', () => {
  test('the server goodbye needs no session, and the local record clears after it succeeds', async () => {
    Store.__store.set(KEYS.pushToken, 'ExponentPushToken[abc]');

    await unregisterPushAsync();

    expect(api.delete).toHaveBeenCalledWith('/notifications/token', {
      data: { token: 'ExponentPushToken[abc]' },
    });
    expect(Store.__store.has(KEYS.pushToken)).toBe(false);
  });

  test('no stored token means nothing to say to the server', async () => {
    await unregisterPushAsync();

    expect(api.delete).not.toHaveBeenCalled();
  });

  test('a dead network keeps the token for the next boot to retry, and never throws', async () => {
    Store.__store.set(KEYS.pushToken, 'ExponentPushToken[abc]');
    api.delete.mockRejectedValue(new Error('offline'));

    await expect(unregisterPushAsync()).resolves.toBeUndefined();
    // The goodbye failed, so the record survives: PushRegistrar retries it
    // on the next signed-out start.
    expect(Store.__store.get(KEYS.pushToken)).toBe('ExponentPushToken[abc]');
  });
});

describe('a tapped notification opens the screen it is about', () => {
  test.each([
    [{ type: 'message', connectionId: 'c1' }, '/chat/c1'],
    [
      { type: 'message', connectionId: 'c1', channel: 'FAMILY_UPDATES' },
      '/chat/c1?channel=FAMILY_UPDATES',
    ],
    [{ type: 'need', needId: 'n1' }, '/my-requests'],
    [{ type: 'need_accepted', needId: 'n1', connectionId: 'c2' }, '/my-jobs'],
  ])('%o opens %s', (data, path) => {
    expect(routeForNotification(data)).toBe(path);
  });

  test('unknown or malformed data opens nothing rather than a wrong screen', () => {
    expect(routeForNotification(undefined)).toBeNull();
    expect(routeForNotification({})).toBeNull();
    expect(routeForNotification({ type: 'message' })).toBeNull();
    expect(routeForNotification({ type: 'mystery' })).toBeNull();
  });

  test('a live tap routes through the wired listener', () => {
    const router = { push: jest.fn() };
    let captured;
    mockNotifications.addNotificationResponseReceivedListener.mockImplementation((fn) => {
      captured = fn;
      return { remove: jest.fn() };
    });

    wireNotificationTaps(router);
    captured({
      notification: {
        request: { content: { data: { type: 'message', connectionId: 'c9' } } },
      },
    });

    expect(router.push).toHaveBeenCalledWith('/chat/c9');
  });

  test('the cold-start tap is answered by its own gated call, not the listener', async () => {
    const router = { push: jest.fn() };
    mockNotifications.getLastNotificationResponseAsync.mockResolvedValue({
      notification: {
        request: { content: { data: { type: 'need_accepted', needId: 'n2' } } },
      },
    });

    // Wiring the live listener alone must NOT answer the cold start: that
    // waits for auth to boot, so the opened screen can actually load.
    wireNotificationTaps(router);
    await Promise.resolve();
    expect(router.push).not.toHaveBeenCalled();

    await answerColdStartTapAsync(router);

    expect(router.push).toHaveBeenCalledWith('/my-jobs');
  });
});

describe('the foreground policy', () => {
  const handlerFor = () => {
    setupForegroundHandler();
    return mockNotifications.setNotificationHandler.mock.calls[0][0].handleNotification;
  };
  const pingOf = (data) => ({ request: { content: { data } } });

  test('a plain chat message stays silent while the app is open', async () => {
    const handle = handlerFor();
    const answer = await handle(pingOf({ type: 'message', connectionId: 'c1' }));
    expect(answer.shouldShowBanner).toBe(false);
    expect(answer.shouldShowAlert).toBe(false);
  });

  test.each([
    [{ type: 'need', needId: 'n1' }],
    [{ type: 'need_accepted', needId: 'n1' }],
    [{ type: 'message', connectionId: 'c1', channel: 'FAMILY_UPDATES' }],
  ])('%o shows a banner even in-app: no badge covers it', async (data) => {
    const handle = handlerFor();
    const answer = await handle(pingOf(data));
    expect(answer.shouldShowBanner).toBe(true);
    expect(answer.shouldPlaySound).toBe(false);
  });
});

describe('Android waits for its own launch', () => {
  test('no permission dialog is spent where no token source exists yet', async () => {
    Platform.OS = 'android';

    const token = await registerForPushAsync();

    expect(token).toBeNull();
    expect(mockNotifications.getPermissionsAsync).not.toHaveBeenCalled();
    expect(mockNotifications.requestPermissionsAsync).not.toHaveBeenCalled();
  });
});
