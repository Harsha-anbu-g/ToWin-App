// Reanimated 4 can't spin up its worklets runtime under Jest — it ships an
// official mock (animations resolve instantly to their end values). On SDK 54
// (worklets 0.5.x) there is no separate worklets mock path; the reanimated
// mock covers what our components touch.
jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'));

// ToastProvider reads useSafeAreaInsets (rulebook pass 2026-07-27: the toast
// must clear the tab bar + home indicator), and it wraps every test tree — so
// every suite needs the library's official mock (zero insets), not a provider.
// Per-file jest.mock calls still override this where a test needs custom insets.
jest.mock('react-native-safe-area-context', () => {
  // The library's mock is an ESM default export — spread it so named imports
  // (useSafeAreaInsets, SafeAreaView) resolve under Babel interop.
  const mock = require('react-native-safe-area-context/jest/mock').default;
  return { __esModule: true, ...mock, default: mock };
});

// The haptic layer (src/lib/haptics.js) is imported by ToastContext, which
// wraps every test tree — no native vibrator exists under Jest.
jest.mock('expo-haptics', () => ({
  notificationAsync: jest.fn(() => Promise.resolve()),
  selectionAsync: jest.fn(() => Promise.resolve()),
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}));
