// The floating tab bar wears the geometry taken from the owner's WhatsApp
// screenshot (2026-08-28, iPhone 16 Pro, "see this, I need like this"): the
// screen's width minus WhatsApp's own 21pt gap each side ("it will have a
// very very small gap"; "you can see a gap in WhatsApp, I need the same"),
// 72pt tall, its bottom edge ~23pt above the screen's
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

test("the capsule is the screen minus WhatsApp's 21pt gap each side, on every phone", () => {
  // 21 is measured, not chosen: 62px each side at 2.95px/pt in the owner's
  // WhatsApp screenshot. 16 read as touching beside the rounded corner.
  expect(TAB_BAR_MARGIN).toBe(21);
  for (const phone of [IPHONE_16_PRO, IPHONE_16_PRO_MAX, IPHONE_SE_3]) {
    const w = tabBarCapsuleWidth(phone.width);
    expect(w).toBe(phone.width - 42);
    expect((phone.width - w) / 2).toBe(21);
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

test('the capsule is placed with start/end, the axis the library uses, never left/right or width', () => {
  // @react-navigation/bottom-tabs positions the bar with start: 0, end: 0.
  // On native, Yoga lets start/end win over left/right when both are set, so
  // left: 21 / right: 21 drew a full-width bar on the phone while the web
  // showed the gap (Radon simulator vs Chrome, 2026-08-28). Only start/end
  // of our own can override the library's.
  const fs = require('fs');
  const path = require('path');
  const layout = fs.readFileSync(path.join(__dirname, '..', 'app', '(tabs)', '_layout.jsx'), 'utf8');
  expect(layout).toMatch(/start: barLeft,\s*end: barLeft,/);
  expect(layout).not.toMatch(/left: barLeft,\s*(right: barLeft|width: barW)/);
});

