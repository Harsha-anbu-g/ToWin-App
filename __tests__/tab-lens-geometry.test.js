// The tab bar's glass lens must contain its label's letters — not the label's
// bounding box, the actual letters, measured against the capsule's curved
// outline at the height the label reads at.
//
// The regression this locks: with `borderRadius: 999` on a 54pt lens the
// corner radius was 27pt, so at the label's baseline the glass had narrowed
// from 75pt to 52.3pt while the label was 62pt wide — 4.8pt of letters outside
// the glass on each side, with every bounding-box check still passing.
import {
  LENS_H,
  LENS_RADIUS,
  LENS_TOP,
  cornerInsetAt,
  labelMaxWidth,
  lensWidthAtLabel,
  lensWidthFor,
  lensXFor,
} from '../src/lib/tabLensGeometry';

// Real phone widths, narrowest first, and the slot counts the roles produce:
// elder/BOTH and helper get 5 slots (one is the centre FAB), FAMILY gets 3.
const PHONE_WIDTHS = [320, 360, 375, 390, 393, 402, 430];
const SLOT_COUNTS = [3, 4, 5];
// The label's own line box at 11pt, from default OS text up to the chrome cap
// of 1.2 (tokens.js fontScaleCaps.chrome).
const LABEL_HEIGHTS = [13, 14, 15, 16];

describe('tab lens geometry', () => {
  test('the lens is a rounded rectangle, never a full pill', () => {
    // A pill's corner radius is half its height; that is the bug this replaces.
    expect(LENS_RADIUS).toBeLessThan(LENS_H / 2);
  });

  test('corner inset is 0 once the label clears the corner arc', () => {
    expect(cornerInsetAt(LENS_RADIUS)).toBe(0);
    expect(cornerInsetAt(LENS_RADIUS + 5)).toBe(0);
    // and it is the full radius at the very bottom edge
    expect(cornerInsetAt(0)).toBe(LENS_RADIUS);
  });

  test('the old full-pill geometry is what pushed letters out (documents the bug)', () => {
    // Measured on the web build at iPhone width: lens 75 wide, 54 tall,
    // radius 999 → 27, label 62 wide sitting 5pt above the lens bottom.
    const oldInset = cornerInsetAt(5, 27);
    expect(75 - 2 * oldInset).toBeLessThan(62); // the letters did not fit
  });

  test('every label fits inside the glass, on every phone and text size', () => {
    for (const width of PHONE_WIDTHS) {
      for (const slots of SLOT_COUNTS) {
        const slotWidth = width / slots;
        const cap = labelMaxWidth(slotWidth);
        for (const labelHeight of LABEL_HEIGHTS) {
          // The widest a label may render, plus a couple of shorter ones.
          for (const labelWidth of [22, 40, cap * 0.75, cap]) {
            const lensWidth = lensWidthFor(labelWidth, slotWidth);
            const glassAtLabel = lensWidthAtLabel(lensWidth, labelHeight);
            expect(glassAtLabel).toBeGreaterThanOrEqual(labelWidth);
          }
        }
      }
    }
  });

  test('the lens stays inside its own slot', () => {
    for (const width of PHONE_WIDTHS) {
      for (const slots of SLOT_COUNTS) {
        const slotWidth = width / slots;
        const lensWidth = lensWidthFor(labelMaxWidth(slotWidth), slotWidth);
        expect(lensWidth).toBeLessThanOrEqual(slotWidth);
        for (let i = 0; i < slots; i += 1) {
          const x = lensXFor(i, slotWidth, lensWidth);
          expect(x).toBeGreaterThanOrEqual(i * slotWidth - 0.01);
          expect(x + lensWidth).toBeLessThanOrEqual((i + 1) * slotWidth + 0.01);
        }
      }
    }
  });

  test('the real tab labels are not truncated at default text size', () => {
    // Rendered widths measured in the web build at 393pt (11pt, weight 600).
    // The first cap tried here was a flat guess and cut "My Helpers" down to
    // "My Help…" on the owner's own screen.
    const MEASURED = { 'My Helpers': 62, 'Posted Help': 66, Messages: 55, Profile: 36 };
    const slotWidth = 393 / 5; // the busiest bar: elder/helper, 5 slots
    for (const [label, width] of Object.entries(MEASURED)) {
      expect(labelMaxWidth(slotWidth)).toBeGreaterThanOrEqual(width);
    }
  });

  test('the lens hugs a short label instead of filling the slot', () => {
    // A wide slot (FAMILY's 3 tabs) must not give "Profile" a slot-wide blob.
    const slotWidth = 393 / 3;
    expect(lensWidthFor(36, slotWidth)).toBeLessThan(slotWidth * 0.6);
  });

  test('the lens covers the icon as well as the label', () => {
    const iconTop = 8 + 5; // bar paddingTop + tab item padding
    expect(LENS_TOP).toBeLessThanOrEqual(iconTop);
    for (const labelHeight of LABEL_HEIGHTS) {
      expect(LENS_TOP + LENS_H).toBeGreaterThanOrEqual(8 + 5 + 28 + labelHeight);
    }
  });
});
