// The floating tab bar wears the geometry taken from the owner's WhatsApp
// screenshot (2026-08-28, iPhone 16 Pro, "see this, I need like this"): the
// screen's width minus a small fixed gap each side ("it will have a very
// very small gap"), 72pt tall, its bottom edge ~23pt above the screen's
// bottom edge. Build 17 floated the capsule 40pt up, on a shelf above the
// home indicator; WhatsApp's sits inside that zone. A capsule sized to its
// tabs was tried and left 36pt either side on a Pro Max: too much. These
// pins keep the numbers from drifting back.
// jest-expo runs with Platform.OS === 'ios', the seat this geometry is for.
const {
  TAB_BAR_HEIGHT,
  TAB_BAR_MARGIN,
  isFloatingTabBar,
  tabBarBottom,
  tabBarCapsuleWidth,
  tabBarSpace,
} = require('../src/lib/tabBarMetrics');

const IPHONE_16_PRO = { width: 402, bottomInset: 34 };
const IPHONE_16_PRO_MAX = { width: 430, bottomInset: 34 };
const IPHONE_SE_3 = { width: 375, bottomInset: 0 };

test('on iOS the bar floats', () => {
  expect(isFloatingTabBar).toBe(true);
});

test('the capsule is the screen minus a very small gap each side, on every phone', () => {
  expect(TAB_BAR_MARGIN).toBe(16);
  for (const phone of [IPHONE_16_PRO, IPHONE_16_PRO_MAX, IPHONE_SE_3]) {
    const w = tabBarCapsuleWidth(phone.width);
    expect(w).toBe(phone.width - 32);
    expect((phone.width - w) / 2).toBe(16);
  }
});

test('every slot still fits "Posted Help" at 11pt/600 (~62pt) on the smallest phone', () => {
  expect(tabBarCapsuleWidth(IPHONE_SE_3.width) / 5).toBeGreaterThanOrEqual(62);
});

test('the capsule sits inside the home-indicator zone: 23pt off the bottom on a 16 Pro', () => {
  expect(tabBarBottom({ bottom: IPHONE_16_PRO.bottomInset })).toBe(23);
  // A phone with no indicator keeps a small lift rather than sitting on the edge.
  expect(tabBarBottom({ bottom: IPHONE_SE_3.bottomInset })).toBe(8);
  expect(tabBarBottom(undefined)).toBe(8);
});

test('the capsule is 72pt tall and everything pinned above it starts where it ends', () => {
  expect(TAB_BAR_HEIGHT).toBe(72);
  expect(tabBarSpace({ bottom: 34 })).toBe(23 + 72);
});

test('the capsule is placed by two equal insets, never left + width', () => {
  // The library's tab bar style carries right: 0. With left + width on top,
  // the owner's iPhone drew the capsule against the left edge (2026-08-28)
  // while desktop Chrome centred it. Equal insets centre on every engine.
  const fs = require('fs');
  const path = require('path');
  const layout = fs.readFileSync(path.join(__dirname, '..', 'app', '(tabs)', '_layout.jsx'), 'utf8');
  expect(layout).toMatch(/left: barLeft,\s*right: barLeft,/);
  expect(layout).not.toMatch(/left: barLeft,\s*width: barW/);
});

