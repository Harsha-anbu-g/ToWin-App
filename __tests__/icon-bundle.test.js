// DEEP-06: icons must not come from the lucide-react-native barrel.
//
// `import { Check } from 'lucide-react-native'` pulls the package entry, which
// re-exports 1,745 icon modules. Metro does not tree-shake and app.json ships
// web as a single bundle, so all 1,745 icons land in the download for the 56
// the app actually draws. Elders on old phones and metered data pay for that.
//
// The app draws its icons from src/components/icons instead: the same lucide
// artwork, but only the icons in use.
import { render } from '@testing-library/react-native';
import Svg, { Path } from 'react-native-svg';
import fs from 'fs';
import path from 'path';

const APP_ROOT = path.resolve(__dirname, '..');
const SOURCE_DIRS = ['app', 'src'];

function sourceFiles(dir, found = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) sourceFiles(full, found);
    else if (/\.(js|jsx)$/.test(entry.name)) found.push(full);
  }
  return found;
}

const FILES = SOURCE_DIRS.flatMap((d) => sourceFiles(path.join(APP_ROOT, d))).map((full) => ({
  rel: path.relative(APP_ROOT, full),
  src: fs.readFileSync(full, 'utf8'),
}));

// Every prop object in a rendered tree, so assertions do not depend on the
// host component names react-native-svg happens to use.
function allProps(node, found = []) {
  if (!node || typeof node !== 'object') return found;
  if (Array.isArray(node)) {
    node.forEach((n) => allProps(n, found));
    return found;
  }
  if (node.props) found.push(node.props);
  allProps(node.children, found);
  return found;
}

// A plain shape rendered with the same props, so colour assertions compare
// like with like instead of hardcoding react-native-svg's internal format.
async function reference(props) {
  const tree = await render(
    <Svg>
      <Path d="M0 0" {...props} />
    </Svg>
  );
  return allProps(tree.toJSON()).find((p) => typeof p.d === 'string');
}

test('no screen or component imports icons from the lucide-react-native barrel', () => {
  const offenders = FILES.filter((f) => /from\s+'lucide-react-native'/.test(f.src)).map((f) => f.rel);
  expect(offenders).toEqual([]);
});

test('the shared icon module exports every icon the app imports from it', () => {
  const icons = require('../src/components/icons');
  const wanted = new Set();
  for (const { src } of FILES) {
    const re = /import\s*\{([^{}]*?)\}\s*from\s*'\.{1,2}\/[^']*icons'/g;
    let match;
    while ((match = re.exec(src))) {
      match[1]
        .split(',')
        .map((n) => n.trim())
        .filter(Boolean)
        .forEach((n) => wanted.add(n));
    }
  }
  expect(wanted.size).toBeGreaterThan(0);
  const missing = [...wanted].filter((name) => typeof icons[name] === 'undefined');
  expect(missing).toEqual([]);
});

test('the icon module stays small: it holds the icons in use, not a whole library', () => {
  const icons = require('../src/components/icons');
  // The app draws 56. A few spare is fine; hundreds means a barrel crept back.
  expect(Object.keys(icons).length).toBeLessThan(150);
});

test('an icon renders lucide artwork at the size, colour and stroke it is given', async () => {
  const { Check } = require('../src/components/icons');
  const tree = await render(<Check size={16} color="#1a5c2e" strokeWidth={2.5} />);
  const props = allProps(tree.toJSON());
  expect(props[0].width).toBe(16);
  expect(props[0].height).toBe(16);
  // The tick's own path, drawn in the colour and weight the caller asked for.
  // Colours are compared against a plain Path so the assertion does not depend
  // on how react-native-svg happens to normalise a hex string.
  const drawn = props.find((p) => typeof p.d === 'string');
  expect(drawn.d).toBe('M20 6 9 17l-5-5');
  expect(drawn.stroke).toEqual((await reference({ stroke: '#1a5c2e' })).stroke);
  expect(drawn.strokeWidth).toBe(2.5);
});

test('an icon accepts fill, so a filled star reads as earned', async () => {
  const { Star } = require('../src/components/icons');
  const tree = await render(<Star size={12} color="#9C7A3C" fill="#9C7A3C" />);
  const gold = await reference({ stroke: '#9C7A3C', fill: '#9C7A3C' });
  const drawn = allProps(tree.toJSON()).find((p) => typeof p.d === 'string');
  expect(drawn.fill).toEqual(gold.fill);
  expect(drawn.stroke).toEqual(gold.stroke);
});

test('every icon in the module draws at least one shape', async () => {
  const icons = require('../src/components/icons');
  const blank = [];
  for (const [name, Icon] of Object.entries(icons)) {
    const tree = await render(<Icon size={24} color="#1f2933" />);
    const shapes = allProps(tree.toJSON()).filter((p) => p.stroke !== undefined);
    if (shapes.length === 0) blank.push(name);
  }
  expect(blank).toEqual([]);
});
