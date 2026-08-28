// The two auth screens speak ONE type scale.
//
// Register was carrying three at once: the legacy web-parity `text` ramp
// (14/16/24), the locked `type` ramp (13/16/24), and bare `fontSize: 16`
// literals — three names for the same 16, plus a 14 that sits one point off
// `type.meta` and reads as a rendering error rather than a level (rulebook §6,
// "near-identical adjacent sizes"). The worst of it landed on the role cards,
// where the option's own NAME rendered smaller than its description.
//
// Login is pinned with it because the two screens share the alert block and a
// person walks straight from one to the other; a fix that lands on only one of
// them just moves the seam.
//
// Source scan, same convention as font-scaling.test.js and no-stray-colors.js:
// a render pin cannot see a NEW Text that ships with the wrong size.
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
// Register split in two on 2026-08-28: the role question, then the form.
const SCREENS = ['app/(auth)/login.jsx', 'app/(auth)/register.jsx', 'app/(auth)/create-account.jsx'];

const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

// The wordmark under the tortoise on login: a brand lockup, deliberately its
// own size and not a step on the reading ramp. The ONE allowed literal.
const BRAND_LOCKUP = 22;

describe.each(SCREENS)('%s', (screen) => {
  test('uses the locked `type` ramp, never the legacy `text` scale', () => {
    const legacy = read(screen).match(/\btext\.(xs|sm|base|lg|xl|2xl|3xl)\b/g);
    expect(legacy).toBeNull();
  });

  test('carries no bare fontSize literal except the brand lockup', () => {
    const literals = [...read(screen).matchAll(/fontSize:\s*(\d+)/g)].map((m) => Number(m[1]));
    expect(literals.filter((size) => size !== BRAND_LOCKUP)).toEqual([]);
  });

  test('every line height is the body 1.5 (16 → 24)', () => {
    const heights = [...read(screen).matchAll(/lineHeight:\s*(\d+)/g)].map((m) => Number(m[1]));
    expect(heights.length).toBeGreaterThan(0);
    expect([...new Set(heights)]).toEqual([24]);
  });
});

test('the account form spends its border widths on one language: 1 idle, 2 chosen', () => {
  // The inputs and the consent checkbox are choice controls. The checkbox
  // was the last 1.5pt line on the page. (The role cards moved to their own
  // page as hairline rows on 2026-08-28; rows draw borderTopWidth, not a box.)
  const widths = [...read('app/(auth)/create-account.jsx').matchAll(/borderWidth:\s*([^,\n]+)/g)].map(
    (m) => m[1].trim()
  );
  expect(widths.length).toBeGreaterThan(0);
  for (const width of widths) {
    expect(width).toMatch(/^(1|agreed \? 2 : 1)$/);
  }
});

test('the checkbox size and the legal-link indent come from one constant', () => {
  const src = read('app/(auth)/create-account.jsx');
  expect(src).toMatch(/const CHECKBOX_SIZE = 22;/);
  // Two bare 22s here meant the links stopped lining up the moment the box moved.
  expect(src).toMatch(/width: CHECKBOX_SIZE/);
  expect(src).toMatch(/marginLeft: CHECKBOX_SIZE \+ spacing\[3\]/);
});
