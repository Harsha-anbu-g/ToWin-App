import { light, dark, spacing, radius, text, fontFamily } from '../src/theme/tokens';

test('Claude palette core (owner design pivot 2026-07-10)', () => {
  expect(light.blue).toBe('#d97757'); // action = Anthropic orange
  expect(light.actionFill).toBe(light.blue);
  expect(light.actionInk).toBe('#ffffff');
  expect(light.surface).toBe('#faf9f5'); // Anthropic Light
  expect(light.canvas).toBe('#ffffff');
  expect(light.border).toBe('#e8e6dc'); // Anthropic Light Gray
  expect(light.ink).toBe('#141413'); // Anthropic Dark
  expect(light.inkFaint).toBe('#b0aea5'); // Anthropic Mid Gray
  expect(light.leaf).toBe('#788c5d'); // Anthropic green accent
});

test('product semantics survive the reskin', () => {
  expect(light.trustGold).toBe('#9C7A3C'); // trust is ALWAYS gold
  expect(light.logoGreen).toBe('#025E32'); // the tortoise keeps its stroke
  expect(light.red).toBe('#cc0000'); // reds stay semantic
  expect(light.starGold).toBe('#f5b400');
});

test('alias tokens are ported (spot checks)', () => {
  expect(light.bubbleIn).toBe('#f0eee6');
  expect(light.btnDisabled).toBe('#b0aea5');
  expect(light.avatarGrey).toBe('#e8e6dc');
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
  expect(dark.canvas).toBe('#262624');
  expect(dark.surface).toBe('#1b1a19');
  expect(dark.canvas).not.toBe(dark.surface);
});

test('night keeps the action orange, lightens text roles in-family', () => {
  expect(dark.blue).toBe('#d97757'); // action unchanged at night
  expect(dark.actionFill).toBe(light.blue);
  expect(dark.blueDeep).toBe('#e69673');
  expect(dark.trustGold).toBe('#c9a468');
  expect(dark.ink).toBe('#faf9f5');
  expect(dark.logoGreen).toBe('#025E32');
});

test('dark has every key light has (no missing remaps at runtime)', () => {
  expect(Object.keys(dark).sort()).toEqual(Object.keys(light).sort());
});

test('display font is Poppins (Anthropic headings)', () => {
  expect(fontFamily.display).toBe('Poppins_500Medium');
  expect(fontFamily.displayItalic).toBe('Poppins_500Medium_Italic');
});

test('radius scale unchanged', () => {
  expect(radius.md).toBe(11);
  expect(radius.pill).toBe(9999);
});
