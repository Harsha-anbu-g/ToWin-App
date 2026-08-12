// Regression for the vanished Peekaboo cells (2026-08-02): passing
// accessibilityRole="button" to an SVG shape makes react-native-web render an
// HTML <button> inside the <svg>, which browsers refuse to paint. The role
// must reach native platforms only.
import { Platform } from 'react-native';
import { svgButtonA11y } from '../src/lib/svgA11y';

describe('svgButtonA11y', () => {
  afterEach(() => jest.restoreAllMocks());

  test('on web: no role, so the SVG tag survives', () => {
    jest.replaceProperty(Platform, 'OS', 'web');
    const props = svgButtonA11y('Hidden cell');
    expect(props.accessible).toBe(true);
    expect(props.accessibilityLabel).toBe('Hidden cell');
    expect(props.accessibilityRole).toBeUndefined();
    expect(props.role).toBeUndefined();
    // The label is no longer all the web build gets: focus and keyboard
    // activation carry no role and so cannot trigger the tag swap. Their
    // behaviour is pinned in ui-web-parity.test.js (DEEP-35).
  });

  test('on native: full button semantics for TalkBack/VoiceOver', () => {
    jest.replaceProperty(Platform, 'OS', 'ios');
    expect(svgButtonA11y('Hidden cell')).toEqual({
      accessible: true,
      accessibilityRole: 'button',
      accessibilityLabel: 'Hidden cell',
    });
  });
});
