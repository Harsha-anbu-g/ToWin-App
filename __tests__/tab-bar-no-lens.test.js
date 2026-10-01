// Owner call 2026-09-25: "the 3d lens in the bottom bar, remove it, that not
// good". The gliding glass bubble that slid under the selected tab is gone; the
// frosted capsule stays, and colour plus a heavier icon stroke mark the active
// tab. Source scans, the way motion-tokens locks this shell: a lens cannot
// creep back in without a test saying so.
const fs = require('fs');
const path = require('path');

const layout = fs.readFileSync(path.join(__dirname, '..', 'app', '(tabs)', '_layout.jsx'), 'utf8');

test('the tab bar draws no gliding lens and takes no drag gesture', () => {
  for (const word of ['GlassLens', 'LENS_', 'PanResponder', 'lensX', 'Animated']) {
    expect(layout).not.toContain(word);
  }
});

test('the frosted capsule stays: real glass on iOS 26, the sheet, the hairline ring', () => {
  expect(layout).toContain('GlassView');
  expect(layout).toContain('tabBarBackground');
  expect(layout).toContain('borderColor: t.border');
});

test('the active tab is marked by colour and a heavier stroke', () => {
  expect(layout).toContain('tabBarActiveTintColor: t.blueDeep');
  expect(layout).toContain('strokeWidth={focused ? 2.2 : 1.8}');
});
