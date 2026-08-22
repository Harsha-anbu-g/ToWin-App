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

// UX-714: the final browser sweep measured in-bubble chat timestamps (ink4)
// at 4.35-4.36:1 on the tinted bubbles by day and 4.03:1 by night — the one
// real contrast failure left. Chat's in-bubble meta line now uses ink3;
// these pin the math on every bubble surface so the fix cannot rot.
const compositeOver = (rgba, bgHex) => {
  const m = rgba.match(/rgba\(([\d.]+),\s*([\d.]+),\s*([\d.]+),\s*([\d.]+)\)/);
  const [r, g, b, a] = [+m[1], +m[2], +m[3], +m[4]];
  const [br, bg2, bb] = hexToRgb(bgHex);
  const mix = (f, bk) => Math.round(f * a + bk * (1 - a));
  return (
    '#' +
    [mix(r, br), mix(g, bg2), mix(b, bb)]
      .map((v) => v.toString(16).padStart(2, '0'))
      .join('')
  );
};

test('chat bubble meta ink (ink3) clears 4.5:1 inside both bubbles, day and night', () => {
  // Day: incoming bubble + own-message blue tint are both solid hexes.
  expect(ratio(light.ink3, light.bubbleIn)).toBeGreaterThanOrEqual(4.5);
  expect(ratio(light.ink3, light.blueTint)).toBeGreaterThanOrEqual(4.5);
  // Night: blueTint is an alpha wash — composite it over the page first.
  const nightMine = compositeOver(dark.blueTint, dark.surface);
  expect(ratio(dark.ink3, dark.bubbleIn)).toBeGreaterThanOrEqual(4.5);
  expect(ratio(dark.ink3, nightMine)).toBeGreaterThanOrEqual(4.5);
});

// HARD-108. The failed line is the OTHER ink in that same Text node, and it was
// the one failing. "Didn't send. Tap to try again." is the only instruction for
// rescuing an unsent message, and at night redDeep measured 2.56:1 on both
// bubbles, which is under the 3:1 large-text floor let alone the 4.5 this line
// needs at type.meta.
test('the chat failed-message line clears 4.5:1 inside both bubbles, day and night', () => {
  expect(ratio(light.redDeep, light.bubbleIn)).toBeGreaterThanOrEqual(4.5);
  expect(ratio(light.redDeep, light.blueTint)).toBeGreaterThanOrEqual(4.5);
  const nightMine = compositeOver(dark.blueTint, dark.surface);
  expect(ratio(dark.redDeep, dark.bubbleIn)).toBeGreaterThanOrEqual(4.5);
  expect(ratio(dark.redDeep, nightMine)).toBeGreaterThanOrEqual(4.5);
});

test('chat renders its in-bubble meta line with ink3, not the failing ink4', () => {
  const fs = require('fs');
  const path = require('path');
  const chatSrc = fs.readFileSync(
    path.join(__dirname, '..', 'app', 'chat', '[connectionId].jsx'),
    'utf8'
  );
  // The timestamp/Sending/failed line inside the bubble: its non-failed ink
  // must be ink3. A regression back to ink4 re-fails AA on the tints.
  expect(chatSrc).toMatch(/item\.failed \? t\.redDeep : t\.ink3/);
});
