import { light, dark, spacing, radius, text, fontFamily } from '../src/theme/tokens';

test('core brand tokens match index.css exactly', () => {
  expect(light.blue).toBe('#4FA3CE');
  expect(light.blueDeep).toBe('#2E7DA6');
  expect(light.trustGold).toBe('#9C7A3C');
  expect(light.greenDeep).toBe('#1a5c2e');
  expect(light.surface).toBe('#f6f4ef');
  expect(light.canvas).toBe('#ffffff');
  expect(light.border).toBe('#e5e1d9');
  expect(light.ink).toBe('#1d1d1f');
});

test('alias tokens are ported (spot checks)', () => {
  expect(light.bubbleIn).toBe('#f0f0f5');
  expect(light.starGold).toBe('#f5b400');
  expect(light.btnDisabled).toBe('#94a3b8');
  expect(light.goldWash).toBe('#fbeed9');
  expect(light.infoLine).toBe('#bfdbfe');
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
  expect(dark.trustGold).toBe('#c9a468');
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
