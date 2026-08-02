// Regression for the vanished Peekaboo cells (2026-08-02): passing
// accessibilityRole="button" to an SVG shape makes react-native-web render an
// HTML <button> inside the <svg>, which browsers refuse to paint. The role
// must reach native platforms only.
import { Platform } from 'react-native';
import { svgButtonA11y } from '../src/lib/svgA11y';

describe('svgButtonA11y', () => {
  afterEach(() => jest.restoreAllMocks());

  test('on web: label only — no role, so the SVG tag survives', () => {
    jest.replaceProperty(Platform, 'OS', 'web');
    expect(svgButtonA11y('Hidden cell')).toEqual({
      accessible: true,
      accessibilityLabel: 'Hidden cell',
    });
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
