// The session bridge. On towinly.com/app/ the app and the website are the same
// origin, so one sign-in should mean one session — and, more importantly, one
// LOG OUT should mean one log out. On a shared phone, "Log out" in the app
// leaving the website signed in is an elder-safety fault, not a nicety.
import { KEYS, SHARED_SESSION_TOKEN } from '../src/lib/storageKeys';

const loadOn = (os) => {
  let mod;
  jest.isolateModules(() => {
    jest.doMock('react-native', () => ({ Platform: { OS: os } }));
    mod = require('../src/lib/webSession');
  });
  return mod;
};

const realWindow = global.window;

function fakeWindow() {
  const store = new Map();
  const listeners = new Map();
  return {
    localStorage: {
      getItem: (k) => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => store.set(k, String(v)),
      removeItem: (k) => store.delete(k),
    },
    addEventListener: (type, fn) => {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type).add(fn);
    },
    removeEventListener: (type, fn) => listeners.get(type)?.delete(fn),
    // test helper — mimics another tab writing to the shared localStorage
    emitStorage: (key, newValue) =>
      listeners.get('storage')?.forEach((fn) => fn({ key, newValue })),
    _store: store,
  };
}

afterEach(() => {
  global.window = realWindow;
  jest.dontMock('react-native');
});

describe('webSession on the web', () => {
  let win;
  let session;

  beforeEach(() => {
    win = fakeWindow();
    global.window = win;
    session = loadOn('web');
  });

  test('reads the website token', () => {
    win._store.set(SHARED_SESSION_TOKEN, 'jwt-from-website');
    expect(session.readWebsiteToken()).toBe('jwt-from-website');
  });

  test('returns null when the website has no token', () => {
    expect(session.readWebsiteToken()).toBeNull();
  });

  test('writes the website token so signing in here signs you in there', () => {
    session.writeWebsiteToken('jwt-new');
    expect(win._store.get(SHARED_SESSION_TOKEN)).toBe('jwt-new');
  });

  test('clears the website token so logging out here logs you out there', () => {
    win._store.set(SHARED_SESSION_TOKEN, 'jwt-old');
    session.clearWebsiteToken();
    expect(win._store.has(SHARED_SESSION_TOKEN)).toBe(false);
  });

  test('survives storage being blocked (private mode) without throwing', () => {
    global.window = {
      localStorage: {
        getItem: () => {
          throw new Error('blocked');
        },
        setItem: () => {
          throw new Error('blocked');
        },
        removeItem: () => {
          throw new Error('blocked');
        },
      },
      addEventListener: () => {},
      removeEventListener: () => {},
    };
    const blocked = loadOn('web');
    expect(blocked.readWebsiteToken()).toBeNull();
    expect(() => blocked.writeWebsiteToken('x')).not.toThrow();
    expect(() => blocked.clearWebsiteToken()).not.toThrow();
  });

  test('another tab signing in reports the new token', () => {
    const seen = [];
    session.subscribeSessionChanges((t) => seen.push(t));
    win.emitStorage(SHARED_SESSION_TOKEN, 'jwt-other-tab');
    expect(seen).toEqual(['jwt-other-tab']);
  });

  test('another tab signing out reports null', () => {
    const seen = [];
    session.subscribeSessionChanges((t) => seen.push(t));
    win.emitStorage(SHARED_SESSION_TOKEN, null);
    expect(seen).toEqual([null]);
  });

  test('a second app tab is heard too, not only the website', () => {
    const seen = [];
    session.subscribeSessionChanges((t) => seen.push(t));
    win.emitStorage(KEYS.authToken, 'jwt-app-tab');
    expect(seen).toEqual(['jwt-app-tab']);
  });

  test('unrelated keys are ignored', () => {
    const seen = [];
    session.subscribeSessionChanges((t) => seen.push(t));
    win.emitStorage('cookieConsent', 'accepted');
    win.emitStorage(null, null); // localStorage.clear() fires key === null
    expect(seen).toEqual([]);
  });

  test('unsubscribing stops the updates', () => {
    const seen = [];
    const off = session.subscribeSessionChanges((t) => seen.push(t));
    off();
    win.emitStorage(SHARED_SESSION_TOKEN, 'jwt-late');
    expect(seen).toEqual([]);
  });
});

describe('webSession on a phone', () => {
  let session;

  beforeEach(() => {
    session = loadOn('ios');
  });

  test('never touches storage — the keychain is the only store', () => {
    expect(session.readWebsiteToken()).toBeNull();
    expect(() => session.writeWebsiteToken('jwt')).not.toThrow();
    expect(() => session.clearWebsiteToken()).not.toThrow();
  });

  test('subscribing is a no-op that still returns an unsubscribe', () => {
    const off = session.subscribeSessionChanges(() => {
      throw new Error('must never fire on native');
    });
    expect(typeof off).toBe('function');
    expect(() => off()).not.toThrow();
  });
});
