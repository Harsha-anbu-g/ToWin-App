// Where the tab bar's glass lens sits, and how wide it is.
//
// Why this is a module and not four constants in the layout: the lens kept
// letting the label's letters poke out of its sides, and the reason was
// invisible to the eye and to a bounding-box check alike. A capsule with
// `borderRadius: 999` on a 54pt-tall lens has a 27pt CORNER radius, and the
// label sits ~5pt above the lens's bottom edge — deep inside that curve.
// Measured on an iPhone-width web build (2026-08-19): the lens box was 75pt
// wide, but AT THE LABEL'S BASELINE the capsule had narrowed to 52.3pt, while
// the label was 62pt. 4.8pt of letters outside the glass on each side, with
// both boxes still overlapping perfectly. So the rule the code must obey is
// not "the label box is inside the lens box" — it is "the label is inside the
// capsule's real outline at the label's own height", and that needs the
// arithmetic below, kept where a test can check it.
//
// Two changes fall out of it: a rounded-rectangle radius instead of a full
// pill (straight sides where the letters are), and a hard cap on the label's
// width so a long word truncates INSIDE the glass instead of spilling over it.
import { radius } from '../theme/tokens';

/** The bar's own paddingTop — the top of the row the tab items lay out in. */
export const BAR_PADDING_TOP = 8;
/** @react-navigation/bottom-tabs tabVerticalUiKit: `padding: 5`, flex-start. */
const ITEM_PADDING = 5;
/** The icon's box in tabIcon(): a 22pt glyph with 3pt of padding above/below. */
const ICON_BLOCK = 28;

/** Lens top, measured from the top of the bar. */
export const LENS_TOP = 6;
/**
 * Lens height: covers the icon AND the label (owner call 2026-08-17), with
 * enough room BELOW the label that it reads clear of the corner arc rather
 * than inside it.
 */
export const LENS_H = 60;
/** The tallest line box a label can have: 11pt at the 1.2 chrome cap. */
const MAX_LABEL_H = 16;
/**
 * Rounded rectangle, NOT a pill. `radius.pill` here is what pushed the letters
 * outside the glass; 16 keeps the sides near-straight where the label reads.
 */
export const LENS_RADIUS = radius.card;

/** Air between the label and the lens edge when there is room for it. */
const LABEL_AIR = 7;
/** How close the lens may come to the slot's edges. */
const SLOT_MARGIN = 3;
/** Never smaller than this, so an icon-only lens still reads as a capsule. */
const MIN_LENS_W = 48;

/** Where the label's bottom edge falls, measured from the top of the bar. */
export const labelBottomInBar = (labelHeight) =>
  BAR_PADDING_TOP + ITEM_PADDING + ICON_BLOCK + labelHeight;

/**
 * How far the capsule's side has curved inwards at a given distance above its
 * bottom edge. Straight-sided below the corner arc, so 0 once dy >= radius.
 */
export const cornerInsetAt = (dyFromBottom, r = LENS_RADIUS) => {
  if (dyFromBottom >= r) return 0;
  if (dyFromBottom <= 0) return r;
  return r - Math.sqrt(r * r - Math.pow(r - dyFromBottom, 2));
};

/** The capsule's real width at the label's baseline — what the eye judges. */
export const lensWidthAtLabel = (lensWidth, labelHeight) =>
  lensWidth - 2 * cornerInsetAt(LENS_TOP + LENS_H - labelBottomInBar(labelHeight));

/**
 * The label can never be allowed to grow wider than the glass it sits in, at
 * any OS text size. Past this it truncates (numberOfLines={1}) inside the lens.
 *
 * Derived, not guessed: take the widest the lens may ever be in this slot,
 * then subtract however much its corners have curved in at the label's own
 * height. A flat guess here truncated "My Helpers" at default text size.
 */
export const labelMaxWidth = (slotWidth) => {
  const widestLens = slotWidth - 2 * SLOT_MARGIN;
  const inset = cornerInsetAt(LENS_TOP + LENS_H - labelBottomInBar(MAX_LABEL_H));
  return Math.max(24, widestLens - 2 * inset - 1); // 1pt so it never just grazes
};

/** Lens width for a measured label: hugs it, never leaves the slot. */
export const lensWidthFor = (labelWidth, slotWidth) => {
  if (slotWidth <= 0) return 0;
  const content = Math.max(labelWidth ?? 0, 22); // icon row is 22pt wide
  const hug = content + 2 * LABEL_AIR;
  return Math.max(MIN_LENS_W, Math.min(hug, slotWidth - 2 * SLOT_MARGIN));
};

/** Left edge of the lens for slot `index`, so it sits centred in that slot. */
export const lensXFor = (index, slotWidth, lensWidth) =>
  index * slotWidth + (slotWidth - lensWidth) / 2;
