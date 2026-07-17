import { light, dark, spacing, radius, text, type, fontFamily } from '../src/theme/tokens';

test('core brand tokens match index.css exactly', () => {
  expect(light.blue).toBe('#4FA3CE');
  expect(light.blueDeep).toBe('#2E7DA6');
  expect(light.greenDeep).toBe('#1a5c2e');
  expect(light.canvas).toBe('#f6f4ef'); // all boxes warm parchment (user 2026-07-12)
  expect(light.border).toBe('#e5e1d9');
  expect(light.ink).toBe('#1d1d1f');
});

// The one deliberate website deviation: the gold family clashed with the white
// mobile pages (user call 2026-07-12), so the trust accent is the brand deep
// green and every saffron/amber token is retired.
test('trust accent is deep green; saffron/amber family is retired', () => {
  expect(light.trustGold).toBe('#1a5c2e');
  expect(dark.trustGold).toBe('#7cc28f');
  for (const key of ['amber', 'amberWash', 'amberDeep', 'goldWash', 'goldLine', 'goldDeep', 'goldWash2', 'starGold']) {
    expect(light[key]).toBeUndefined();
    expect(dark[key]).toBeUndefined();
  }
});

// 2026-07-11 redesign (Claude Design handoff) — locked surface + shape + type values.
test('redesign: pages are white, parchment survives only on the check-in hero', () => {
  expect(light.surface).toBe('#ffffff'); // surface.page — user decision, NOT parchment
  expect(light.surfaceFill).toBe('#f2f2f5'); // segmented tracks, neutral chips, search fields
  expect(light.heroParchment).toBe('#f6f4ef'); // the ONLY warm surface kept
  // audit 2026-07-17: handoff's #8a919c was ~3:1 on its fills (fails AA);
  // darkened to the greyText value, which clears 4.5:1 on white/parchment/tracks
  expect(light.inkFaint2).toBe('#646b76'); // faint meta text
  // night mode keeps the warm-charcoal grammar: hero card sits lighter than the page
  expect(dark.surface).toBe('#201f1d');
  expect(dark.heroParchment).toBe(dark.canvas);
  expect(dark.surfaceFill).not.toBe(dark.surface);
});

test('redesign: shape scale — 12 inputs, 16 cards, 18 hero, pills round', () => {
  expect(radius.input).toBe(12);
  expect(radius.card).toBe(16);
  expect(radius.hero).toBe(18);
  expect(radius.pill).toBe(9999);
});

test('redesign: SF type ramp per handoff', () => {
  expect(type.title).toBe(28);
  expect(type.cardTitle).toBe(19);
  expect(type.body).toBe(16); // audit 2026-07-17: elder rule — running text never below 16 (handoff said 15)
  expect(type.meta).toBe(13);
  expect(type.caption).toBe(12);
  expect(type.segCount).toBe(11);
  expect(type.tabLabel).toBe(10);
  expect(type.bigNumber).toBe(48);
});

test('alias tokens are ported (spot checks)', () => {
  expect(light.bubbleIn).toBe('#f0f0f5');
  expect(light.btnDisabled).toBe('#94a3b8');
  expect(light.infoLine).toBe('#bfdbfe');
});

test('tokens added on the website 2026-07-09 sync are ported', () => {
  expect(light.skyBarFrom).toBe('#7FC0E0'); // trust-ladder bar gradient start (user-locked)
  expect(light.actionFill).toBe(light.blue); // web: var(--blue)
  expect(light.actionInk).toBe('#ffffff');
  expect(light.logoGreen).toBe('#025E32');
  // dark block does not override these — brand fill stays sky-blue at night
  expect(dark.actionFill).toBe(light.blue);
  expect(dark.logoGreen).toBe('#025E32');
});

test('type scale never below 13, body 18', () => {
  expect(text.base).toBe(18);
  expect(text.xs).toBe(13);
});

test('spacing is the 8px scale', () => {
  expect(spacing[2]).toBe(8);
  expect(spacing[16]).toBe(64);
});

test('night cards lighter than night page (elevation grammar)', () => {
  expect(dark.canvas).toBe('#2a2927');
  expect(dark.surface).toBe('#201f1d');
  expect(dark.canvas).not.toBe(dark.surface);
});

test('night keeps action blue, lightens text roles in-family', () => {
  expect(dark.blue).toBe('#4FA3CE'); // brand action unchanged
  expect(dark.blueDeep).toBe('#7ec0e4');
  expect(dark.trustGold).toBe('#7cc28f'); // trust accent lightens in the green family
  expect(dark.ink).toBe('#f2f0ec');
});

test('dark has every key light has (no missing remaps at runtime)', () => {
  expect(Object.keys(dark).sort()).toEqual(Object.keys(light).sort());
});

test('display font is Newsreader 400', () => {
  expect(fontFamily.display).toBe('Newsreader_400Regular');
});

test('radius scale matches web', () => {
  expect(radius.md).toBe(11);
  expect(radius.xl).toBe(18);
  expect(radius.pill).toBe(9999);
});
