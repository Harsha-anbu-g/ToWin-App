// The haptic layer (rulebook §11), locked by tests: the causal map fires the
// documented system pattern per event, the off switch silences everything,
// and the saved preference is honored on load.
import * as Haptics from 'expo-haptics';
import * as SecureStore from 'expo-secure-store';

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(() => Promise.resolve(null)),
  setItemAsync: jest.fn(() => Promise.resolve()),
}));

describe('haptic causal map', () => {
  let lib;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.isolateModules(() => {
      lib = require('../src/lib/haptics');
    });
  });

  test('success and error fire the matching notification pattern', () => {
    lib.haptic.success();
    lib.haptic.error();

    expect(Haptics.notificationAsync).toHaveBeenCalledWith(
      Haptics.NotificationFeedbackType.Success
    );
    expect(Haptics.notificationAsync).toHaveBeenCalledWith(
      Haptics.NotificationFeedbackType.Error
    );
  });

  test('selection fires the selection tick', () => {
    lib.haptic.selection();

    expect(Haptics.selectionAsync).toHaveBeenCalledTimes(1);
  });

  test('turning haptics off silences every event and persists the choice', async () => {
    await lib.setHapticsEnabled(false);

    lib.haptic.success();
    lib.haptic.error();
    lib.haptic.selection();

    expect(Haptics.notificationAsync).not.toHaveBeenCalled();
    expect(Haptics.selectionAsync).not.toHaveBeenCalled();
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith('towin-haptics', 'off');
    expect(lib.isHapticsEnabled()).toBe(false);
  });

  test('a saved "off" is honored on load and announced to subscribers', async () => {
    SecureStore.getItemAsync.mockResolvedValueOnce('off');
    const heard = [];
    lib.subscribeHaptics((on) => heard.push(on));

    await lib.loadHapticsPreference();

    expect(lib.isHapticsEnabled()).toBe(false);
    expect(heard).toEqual([false]);
  });

  test('an unreadable preference keeps haptics on (never blocks startup)', async () => {
    SecureStore.getItemAsync.mockRejectedValueOnce(new Error('locked'));

    await lib.loadHapticsPreference();

    expect(lib.isHapticsEnabled()).toBe(true);
  });
});
