// The images the stores and the launch screen use, pinned by size.
//
// These are the assets nobody looks at again after they are made, which is
// exactly why they drift. The splash shipped at 512 for a month (SHIP-604) and
// nothing noticed: it is not rendered in any test, and both stores accept an
// undersized launch image, they just upscale it on a 6.7" phone.
//
// PNG dimensions live in the IHDR chunk, which is always the first chunk:
// 8-byte signature, 4-byte length, 4-byte type "IHDR", then width and height
// as big-endian uint32. No decoding library needed.
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const appJson = JSON.parse(fs.readFileSync(path.join(ROOT, 'app.json'), 'utf8'));

function readPng(relPath) {
  const buf = fs.readFileSync(path.join(ROOT, relPath));
  expect(buf.subarray(1, 4).toString('ascii')).toBe('PNG');
  expect(buf.subarray(12, 16).toString('ascii')).toBe('IHDR');
  return {
    width: buf.readUInt32BE(16),
    height: buf.readUInt32BE(20),
    // 6 = truecolour with alpha, 2 = truecolour, 3 = indexed, 4 = grey + alpha
    colorType: buf.readUInt8(25),
  };
}

// app.json holds "./assets/x.png"; the reader wants "assets/x.png".
const fromConfig = (configured) => readPng(configured.replace(/^\.\//, ''));

// The splash is configured through the expo-splash-screen plugin, not the
// top-level "splash" key. That key is the legacy path, and Expo reads it with
// enableFullScreenImage_legacy: true — it pins the artwork to all four screen
// edges, so a 1024-square tortoise fills the whole phone for the second before
// the first screen paints. The plugin path sizes the mark instead.
const splashProps = appJson.expo.plugins.find(
  (plugin) => Array.isArray(plugin) && plugin[0] === 'expo-splash-screen'
)?.[1];

test('the splash is 1024 square, so it is not upscaled on a big phone', () => {
  const splash = fromConfig(splashProps.image);
  expect(splash.width).toBe(1024);
  expect(splash.height).toBe(1024);
  // The mark has to sit on the parchment the splash config paints, so the
  // artwork itself must be transparent, never flattened onto white.
  expect(splash.colorType).toBe(6);
  expect(splashProps.backgroundColor).toBe('#f6f4ef');
  expect(splashProps.resizeMode).toBe('contain');
});

test('the splash mark is sized small, and the legacy full-screen key is gone', () => {
  // 100pt is about a quarter of the width of a phone: a small mark on parchment,
  // not a tortoise filling the screen. Expo's own default is 200.
  expect(splashProps.imageWidth).toBe(100);
  // Present again, this would win back the full-screen behaviour on iOS.
  expect(appJson.expo.splash).toBeUndefined();
});

test('the app icon is 1024 square and carries NO alpha', () => {
  const icon = fromConfig(appJson.expo.icon);
  expect(icon.width).toBe(1024);
  expect(icon.height).toBe(1024);
  // App Store Connect rejects an icon with an alpha channel: ITMS-90717. It was
  // flattened onto parchment for that reason (STORE-201, 2026-07-12).
  expect(icon.colorType).not.toBe(6);
  expect(icon.colorType).not.toBe(4);
});

test('every adaptive-icon layer Android composites is 1024 square', () => {
  const { foregroundImage, backgroundImage, monochromeImage } = appJson.expo.android.adaptiveIcon;
  for (const layer of [foregroundImage, backgroundImage, monochromeImage]) {
    const png = fromConfig(layer);
    expect({ layer, ...png }).toMatchObject({ width: 1024, height: 1024 });
  }
});
