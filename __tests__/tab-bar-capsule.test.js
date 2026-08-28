// The floating tab bar wears the geometry measured off the owner's WhatsApp
// screenshot (2026-08-28, iPhone 16 Pro, "see this, I need like this"): about
// 360pt wide on a 402pt screen, 72pt tall, its bottom edge ~23pt above the
// screen's bottom edge. Build 17 had the side inset right but floated the
// capsule 40pt up, on a shelf above the home indicator; WhatsApp's sits
// inside that zone. These pins keep the numbers from drifting back.
// jest-expo runs with Platform.OS === 'ios', the seat this geometry is for.
const {
  TAB_BAR_HEIGHT,
  TAB_BAR_MARGIN,
  TAB_BAR_SLOT_WIDTH,
  isFloatingTabBar,
  tabBarBottom,
  tabBarCapsuleWidth,
  tabBarSpace,
} = require('../src/lib/tabBarMetrics');

const IPHONE_16_PRO = { width: 402, bottomInset: 34 };
const IPHONE_SE_3 = { width: 375, bottomInset: 0 };

test('on iOS the bar floats', () => {
  expect(isFloatingTabBar).toBe(true);
});

test("an elder's five slots make WhatsApp's 360pt capsule on a 16 Pro, 21pt from each side", () => {
  const w = tabBarCapsuleWidth(IPHONE_16_PRO.width, 5);
  expect(w).toBe(360);
  expect((IPHONE_16_PRO.width - w) / 2).toBe(21);
  expect(TAB_BAR_SLOT_WIDTH * 5).toBe(360);
});

test('fewer slots make a narrower capsule, the way iOS 26 sizes a bar to its tabs', () => {
  expect(tabBarCapsuleWidth(IPHONE_16_PRO.width, 4)).toBe(288); // helper
  expect(tabBarCapsuleWidth(IPHONE_16_PRO.width, 3)).toBe(216); // family
});

test('a small phone still keeps the capsule at least the minimum inset off each side', () => {
  const w = tabBarCapsuleWidth(IPHONE_SE_3.width, 5);
  expect(w).toBe(IPHONE_SE_3.width - 2 * TAB_BAR_MARGIN);
  expect(TAB_BAR_MARGIN).toBe(20);
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
