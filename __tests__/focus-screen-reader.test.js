// Regression for the white-screen crash (2026-08-02): findNodeHandle throws
// on react-native-web ("not supported on web"), and both modal sheets called
// it from Modal onShow — opening the ☰ menu or Ask AI in a browser unmounted
// the entire app. The helper must never reach findNodeHandle on web.
import { Platform } from 'react-native';
import focusForScreenReader from '../src/lib/focusForScreenReader';

describe('focusForScreenReader', () => {
  afterEach(() => jest.restoreAllMocks());

  test('on web, moves DOM focus without touching findNodeHandle', () => {
    jest.replaceProperty(Platform, 'OS', 'web');
    const focus = jest.fn();
    // Arrange: on web the ref IS the DOM node — findNodeHandle would throw.
    const ref = { current: { focus } };

    expect(() => focusForScreenReader(ref)).not.toThrow();
    expect(focus).toHaveBeenCalledTimes(1);
  });

  test('on web, a node without focus() is a quiet no-op', () => {
    jest.replaceProperty(Platform, 'OS', 'web');
    expect(() => focusForScreenReader({ current: {} })).not.toThrow();
  });

  test('an empty ref is a quiet no-op on every platform', () => {
    expect(() => focusForScreenReader({ current: null })).not.toThrow();
    expect(() => focusForScreenReader(null)).not.toThrow();
  });

  test('on native, hands the resolved node to setAccessibilityFocus', () => {
    jest.replaceProperty(Platform, 'OS', 'ios');
    const RN = require('react-native');
    const spy = jest
      .spyOn(RN.AccessibilityInfo, 'setAccessibilityFocus')
      .mockImplementation(() => {});
    const findSpy = jest.spyOn(RN, 'findNodeHandle').mockReturnValue(42);

    focusForScreenReader({ current: { some: 'component' } });

    expect(findSpy).toHaveBeenCalled();
    expect(spy).toHaveBeenCalledWith(42);
  });
});
