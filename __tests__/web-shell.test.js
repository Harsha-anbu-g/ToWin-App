// Two hooks that exist only because react-native-web turns the real thing into
// a no-op: the keyboard inset (KeyboardAvoidingView does nothing in a browser)
// and the offline check (NetInfo's web probe fetches the site root, which under
// /app/ is the MARKETING site and says nothing about the app's API).
import { act, renderHook } from '@testing-library/react-native';

// Platform.OS is read inside each hook rather than at module scope, so one
// mutable value can drive both platforms without reloading the module graph.
let mockPlatformOS = 'web';
jest.mock('react-native', () => {
  const actual = jest.requireActual('react-native');
  // A Proxy, not a spread: spreading react-native's index touches every lazy
  // getter on it, and DevMenu throws the moment it is read under Jest.
  return new Proxy(actual, {
    get(target, prop) {
      if (prop !== 'Platform') return target[prop];
      return {
        ...target.Platform,
        get OS() {
          return mockPlatformOS;
        },
        select: (spec) => spec[mockPlatformOS] ?? spec.default,
      };
    },
  });
});

// NetInfo reaches for a native module that does not exist under Jest, and the
// web branch must never call it anyway.
const mockNetInfoUnsubscribe = jest.fn();
jest.mock('@react-native-community/netinfo', () => ({
  __esModule: true,
  default: { addEventListener: jest.fn(() => mockNetInfoUnsubscribe) },
}));

const NetInfo = require('@react-native-community/netinfo').default;
const useKeyboardInset = require('../src/lib/useKeyboardInset').default;
const useIsOffline = require('../src/lib/useIsOffline').default;

const realWindow = global.window;

function listenerBag() {
  const listeners = new Map();
  return {
    addEventListener: (type, fn) => {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type).add(fn);
    },
    removeEventListener: (type, fn) => listeners.get(type)?.delete(fn),
    emit: (type) => listeners.get(type)?.forEach((fn) => fn()),
    count: (type) => listeners.get(type)?.size ?? 0,
  };
}

beforeEach(() => {
  mockPlatformOS = 'web';
  jest.clearAllMocks();
});

afterEach(() => {
  global.window = realWindow;
});

describe('useKeyboardInset', () => {
  const setViewport = ({ innerHeight = 800, height = 800, offsetTop = 0 }) => {
    const bag = listenerBag();
    global.window = { innerHeight, visualViewport: { height, offsetTop, ...bag } };
    return global.window;
  };

  const inset = async () => (await renderHook(() => useKeyboardInset())).result.current;

  test('no keyboard means no inset', async () => {
    setViewport({ innerHeight: 800, height: 800 });
    expect(await inset()).toBe(0);
  });

  test('an open keyboard is measured from the shrunken viewport', async () => {
    setViewport({ innerHeight: 800, height: 500 });
    expect(await inset()).toBe(300);
  });

  test('a page scrolled up by Safari does not inflate the inset', async () => {
    // Safari scrolls the focused field into view: the visual viewport moves
    // down by offsetTop, and that is not keyboard height.
    setViewport({ innerHeight: 800, height: 500, offsetTop: 60 });
    expect(await inset()).toBe(240);
  });

  test('collapsing browser chrome is not mistaken for a keyboard', async () => {
    setViewport({ innerHeight: 800, height: 740 });
    expect(await inset()).toBe(0);
  });

  test('a browser without visualViewport keeps the old behaviour', async () => {
    global.window = { innerHeight: 800, ...listenerBag() };
    expect(await inset()).toBe(0);
  });

  test('never reports an inset on a phone — KeyboardAvoidingView handles it', async () => {
    setViewport({ innerHeight: 800, height: 500 });
    mockPlatformOS = 'ios';
    expect(await inset()).toBe(0);
  });

  test('follows the keyboard opening after the screen is already up', async () => {
    const win = setViewport({ innerHeight: 800, height: 800 });
    const { result } = await renderHook(() => useKeyboardInset());
    expect(result.current).toBe(0);

    win.visualViewport.height = 460;
    await act(async () => {
      win.visualViewport.emit('resize');
    });
    expect(result.current).toBe(340);
  });

  test('stops listening when the screen goes away', async () => {
    const win = setViewport({ innerHeight: 800, height: 800 });
    const { unmount } = await renderHook(() => useKeyboardInset());
    expect(win.visualViewport.count('resize')).toBe(1);
    await unmount();
    expect(win.visualViewport.count('resize')).toBe(0);
  });
});

describe('useIsOffline', () => {
  const setOnline = (onLine) => {
    const bag = listenerBag();
    global.window = { navigator: onLine === undefined ? {} : { onLine }, ...bag };
    return global.window;
  };

  const offline = async () => (await renderHook(() => useIsOffline())).result.current;

  test('a connected browser is not offline', async () => {
    setOnline(true);
    expect(await offline()).toBe(false);
  });

  test('a disconnected browser is offline', async () => {
    setOnline(false);
    expect(await offline()).toBe(true);
  });

  test('a browser that does not report onLine reads as online, never offline', async () => {
    // Guessing "offline" here would hide the whole app behind a false banner.
    setOnline(undefined);
    expect(await offline()).toBe(false);
  });

  test('never asks NetInfo on the web — its probe would hit the marketing site', async () => {
    setOnline(true);
    await renderHook(() => useIsOffline());
    expect(NetInfo.addEventListener).not.toHaveBeenCalled();
  });

  test('reacts when the connection comes back', async () => {
    const win = setOnline(false);
    const { result } = await renderHook(() => useIsOffline());
    expect(result.current).toBe(true);

    win.navigator.onLine = true;
    await act(async () => {
      win.emit('online');
    });
    expect(result.current).toBe(false);
  });

  test('reacts when the connection drops', async () => {
    const win = setOnline(true);
    const { result } = await renderHook(() => useIsOffline());

    win.navigator.onLine = false;
    await act(async () => {
      win.emit('offline');
    });
    expect(result.current).toBe(true);
  });

  test('stops listening when the screen goes away', async () => {
    const win = setOnline(true);
    const { unmount } = await renderHook(() => useIsOffline());
    expect(win.count('online')).toBe(1);
    expect(win.count('offline')).toBe(1);
    await unmount();
    expect(win.count('online')).toBe(0);
    expect(win.count('offline')).toBe(0);
  });

  test('a phone still uses NetInfo, which reads the OS state directly', async () => {
    setOnline(true);
    mockPlatformOS = 'ios';
    await renderHook(() => useIsOffline());
    expect(NetInfo.addEventListener).toHaveBeenCalled();
  });
});
