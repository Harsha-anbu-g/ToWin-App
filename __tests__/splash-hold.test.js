// The native launch screen holds until the app can paint its first screen,
// then fades over it (src/lib/splash.js). The one unacceptable outcome is a
// launch screen that never leaves, so the ceiling is tested as hard as the hold.
const mockSplash = {
  preventAutoHideAsync: jest.fn(() => Promise.resolve(true)),
  hideAsync: jest.fn(() => Promise.resolve()),
  setOptions: jest.fn(),
};
jest.mock('expo-splash-screen', () => mockSplash);

// The module remembers whether it has released, so every test gets a fresh
// copy — and the react-native it reads Platform.OS from, so the web test can
// set the OS on the instance the module actually sees.
function loadSplash(os = 'ios') {
  jest.resetModules();
  require('react-native').Platform.OS = os;
  return require('../src/lib/splash');
}

beforeEach(() => {
  jest.clearAllMocks();
});

// Fake timers here too: holdSplash arms the 4 s ceiling, and with real timers
// that timer outlives this file. It then fires into a torn-down environment
// (Platform is gone), a TypeError inside a Node timer, and under load it
// takes the whole jest worker down with no summary line. A test that starts a
// timer owns it.
test('holds the splash and asks for a short fade', () => {
  jest.useFakeTimers();
  try {
    const { holdSplash, SPLASH_FADE_MS } = loadSplash();
    holdSplash();
    expect(mockSplash.preventAutoHideAsync).toHaveBeenCalledTimes(1);
    expect(mockSplash.setOptions).toHaveBeenCalledWith({ fade: true, duration: SPLASH_FADE_MS });
    // UI motion stays under 300ms (Emil rules).
    expect(SPLASH_FADE_MS).toBeLessThan(300);
  } finally {
    jest.useRealTimers();
  }
});

test('releases once, however many times it is asked', () => {
  const { holdSplash, releaseSplash } = loadSplash();
  holdSplash();
  releaseSplash();
  releaseSplash();
  expect(mockSplash.hideAsync).toHaveBeenCalledTimes(1);
});

test('releases by itself at the ceiling, so a broken boot never freezes the launch screen', () => {
  jest.useFakeTimers();
  try {
    const { holdSplash, SPLASH_MAX_HOLD_MS } = loadSplash();
    holdSplash();
    jest.advanceTimersByTime(SPLASH_MAX_HOLD_MS - 1);
    expect(mockSplash.hideAsync).not.toHaveBeenCalled();
    jest.advanceTimersByTime(1);
    expect(mockSplash.hideAsync).toHaveBeenCalledTimes(1);
    // Long enough for a slow keychain read; short enough not to read as frozen.
    expect(SPLASH_MAX_HOLD_MS).toBeLessThanOrEqual(5000);
  } finally {
    jest.useRealTimers();
  }
});

test('an early release cancels the ceiling, so hide is never called twice', () => {
  jest.useFakeTimers();
  try {
    const { holdSplash, releaseSplash, SPLASH_MAX_HOLD_MS } = loadSplash();
    holdSplash();
    releaseSplash();
    jest.advanceTimersByTime(SPLASH_MAX_HOLD_MS * 2);
    expect(mockSplash.hideAsync).toHaveBeenCalledTimes(1);
  } finally {
    jest.useRealTimers();
  }
});

test('does nothing on the web, which has no native splash', () => {
  const { holdSplash, releaseSplash } = loadSplash('web');
  holdSplash();
  releaseSplash();
  expect(mockSplash.setOptions).not.toHaveBeenCalled();
  expect(mockSplash.preventAutoHideAsync).not.toHaveBeenCalled();
  expect(mockSplash.hideAsync).not.toHaveBeenCalled();
});

test('shrugs off the native module refusing (a dev reload with the splash already gone)', async () => {
  mockSplash.preventAutoHideAsync.mockRejectedValueOnce(new Error('already hidden'));
  mockSplash.hideAsync.mockRejectedValueOnce(new Error('already hidden'));
  const { holdSplash, releaseSplash } = loadSplash();
  expect(() => {
    holdSplash();
    releaseSplash();
  }).not.toThrow();
  // Let the rejections settle: an unhandled one fails the run.
  await new Promise((resolve) => setImmediate(resolve));
});
