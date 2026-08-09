// UX-709: contrast checked by machine, not eyeballed. These tests compute the
// real WCAG ratio of the ink tokens against every surface they render on, so
// a token edit that quietly drops below AA fails CI instead of shipping.
//
// Deliberately NOT asserted here: actionInk (#ffffff) on actionFill (#4FA3CE)
// measures 2.81:1. That pair is the owner's explicit waiver, documented in
// tokens.js — the sky-blue fill with white ink stays. The browser audit
// records it in ralph/progress.txt each time; it is not a silent skip.
import { light, dark } from '../src/theme/tokens';

const hexToRgb = (hex) => {
  const h = hex.replace('#', '');
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
};

const luminance = ([r, g, b]) => {
  const f = (c) => {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
};

const ratio = (fgHex, bgHex) => {
  const l1 = luminance(hexToRgb(fgHex));
  const l2 = luminance(hexToRgb(bgHex));
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
};

// Every light surface the deep-sky ink actually sits on in the app: white
// page, parchment cards/hero, both blue tints (Ask-AI chip, landing trust
// chips, active-tab pill), and the neutral segmented track.
const LIGHT_INK_SURFACES = [
  ['surface', light.surface],
  ['canvas', light.canvas],
  ['heroParchment', light.heroParchment],
  ['blueTint', light.blueTint],
  ['blueWash', light.blueWash],
  ['surfaceFill', light.surfaceFill],
];

test('deep sky ink clears 4.5:1 on every light surface it renders on', () => {
  const failures = LIGHT_INK_SURFACES.filter(
    ([, bg]) => ratio(light.blueDeep, bg) < 4.5
  ).map(([name, bg]) => `${name} ${bg}: ${ratio(light.blueDeep, bg).toFixed(2)}`);
  expect(failures).toEqual([]);
});

test('badge numerals: white on badgeFill keeps the real 4.5:1 (no waiver)', () => {
  // tokens.js: a badge is not an action, so it gets no fill waiver.
  expect(ratio('#ffffff', light.badgeFill)).toBeGreaterThanOrEqual(4.5);
  expect(ratio('#ffffff', dark.badgeFill)).toBeGreaterThanOrEqual(4.5);
});

test('night mode deep sky ink clears 4.5:1 on the night surfaces', () => {
  for (const bg of [dark.surface, dark.canvas]) {
    expect(ratio(dark.blueDeep, bg)).toBeGreaterThanOrEqual(4.5);
  }
});
