// Night mode is OPT-IN ONLY. The phone's own light/dark setting must never
// drive it. An elder who has never touched a setting should see the same app
// at 9am and 9pm; a page that goes dark on its own reads as a fault.
//
// This became load-bearing with expo-system-ui (SHIP-604). Before that module
// was installed, `userInterfaceStyle` and `backgroundColor` in app.json were
// inert text: nothing on the native side read them. expo-system-ui makes them
// real, so the pin to "light" is now the thing that stops iOS or Android
// handing the app a dark appearance behind the JS theme's back.
//
// Three layers are checked, because each can fail on its own:
//   1. the native pin in app.json
//   2. the module that makes the pin act, at the SDK 54 version
//   3. the JS side: no screen anywhere asks the OS what colour scheme it is
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const appJson = JSON.parse(fs.readFileSync(path.join(ROOT, 'app.json'), 'utf8'));
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));

const SCAN_DIRS = ['app', 'src'];
// `useColorScheme` is the hook, `Appearance` the imperative API, and
// `colorScheme` catches the react-native-web / Paper spellings of the same idea.
const OS_APPEARANCE_RE = /\buseColorScheme\b|\bAppearance\b|\bcolorScheme\b/;

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else if (/\.(jsx?|tsx?)$/.test(entry.name)) files.push(full);
  }
  return files;
}

test('the native appearance is pinned to light, so the OS cannot flip the app', () => {
  expect(appJson.expo.userInterfaceStyle).toBe('light');
  // A per-platform override would silently beat the top-level pin.
  expect(appJson.expo.ios?.userInterfaceStyle).toBeUndefined();
  expect(appJson.expo.android?.userInterfaceStyle).toBeUndefined();
});

test('expo-system-ui is installed at the SDK 54 version, which is what makes the pin act', () => {
  const version = pkg.dependencies['expo-system-ui'];
  expect(version).toBeDefined();
  // SDK 54 ships expo-system-ui 6.x. A major bump here means the SDK moved,
  // and the SDK is locked at 54 for the owner's Expo Go client.
  expect(version).toMatch(/^[~^]?6\./);
  // The root view behind every screen is the brand parchment, not white or
  // black. Without expo-system-ui this line does nothing at all.
  expect(appJson.expo.backgroundColor).toBe('#f6f4ef');
});

test('nothing in the app asks the OS what colour scheme it is', () => {
  const offenders = [];
  for (const dir of SCAN_DIRS) {
    for (const file of walk(path.join(ROOT, dir))) {
      const lines = fs.readFileSync(file, 'utf8').split('\n');
      lines.forEach((line, i) => {
        // Comments explain the rule; only real code can break it.
        const code = line.replace(/\/\/.*$/, '').replace(/\/\*.*?\*\//g, '');
        if (OS_APPEARANCE_RE.test(code)) {
          offenders.push(`${path.relative(ROOT, file)}:${i + 1} ${line.trim()}`);
        }
      });
    }
  }
  expect(offenders).toEqual([]);
});

test('the theme starts light and only a stored preference moves it', async () => {
  // Read straight off disk rather than through a render: the point is that the
  // ONLY input to the initial mode is storage, and a render would prove it for
  // one mocked reading of one API rather than for the code's whole surface.
  const source = fs.readFileSync(path.join(ROOT, 'src/theme/ThemeContext.jsx'), 'utf8');
  expect(source).toMatch(/useState\('light'\)/);
  // Exactly one thing may set dark, and it is the saved preference.
  const darkSetters = source.match(/setMode\('dark'\)/g) ?? [];
  expect(darkSetters).toHaveLength(1);
  expect(source).toMatch(/saved === 'dark'/);
});
