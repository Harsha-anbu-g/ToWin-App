// A label nobody hears (HARD-109). React Native derives isAccessibilityElement
// from the `accessible` prop, and on a plain View that prop defaults to false.
// So `<View accessibilityLabel="five stars">` is DROPPED on iOS: VoiceOver walks
// straight into the children and announces whatever they say, which for five
// Star paths is nothing at all. The landing page's rating shipped that way.
//
// Two shapes are legitimate and both are accepted here:
//
//   1. The label names ONE thing, and collapsing it is the intent: a chip, a
//      rating, an icon pair. Those carry `accessible`.
//   2. The View is a grouping container holding buttons and cards. Those must
//      NOT carry `accessible` (it swallows every control inside), so they carry
//      no label either; something the person can actually reach says the name.
//
// The rule below is what separates them: a View that keeps a label has to say
// out loud that it means to be one element.
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SCAN_DIRS = ['app', 'src'];

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else if (/\.(jsx?|tsx?)$/.test(entry.name)) files.push(full);
  }
  return files;
}

// Comments are blanked before matching (the convention link-role.test.js uses)
// so this rule can be explained in prose directly above the code it governs
// without tripping over its own examples.
function readCode(file) {
  return fs
    .readFileSync(file, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/(^|[^:])\/\/[^\n]*/gm, '$1');
}

function sourceFiles() {
  return SCAN_DIRS.flatMap((dir) => walk(path.join(ROOT, dir)));
}

// The JSX element that owns an attribute: from the "<" that opens the tag to
// the ">" that closes the opening tag. Enough to see the sibling props.
function elementAround(code, index) {
  const start = code.lastIndexOf('<', index);
  let depth = 0;
  for (let i = start; i < code.length; i += 1) {
    const ch = code[i];
    if (ch === '{') depth += 1;
    else if (ch === '}') depth -= 1;
    else if (ch === '>' && depth === 0) return code.slice(start, i + 1);
  }
  return code.slice(start);
}

// Only plain containers. Pressable, Text and every custom component set their
// own isAccessibilityElement (or render one that does), so a label on those
// lands; a bare View is the one that silently drops it.
const PLAIN_VIEW = /^<\s*(View|Animated\.View|ScrollView|Animated\.ScrollView)[\s/>]/;
// `accessible` on its own, `accessible={...}`, or the aria spelling.
const DECLARES_ELEMENT = /\baccessible\b|accessibilityRole=|\brole=/;

function droppedLabelSites() {
  const found = [];
  for (const file of sourceFiles()) {
    const code = readCode(file);
    const re = /accessibilityLabel=/g;
    let m;
    while ((m = re.exec(code)) !== null) {
      const element = elementAround(code, m.index);
      if (!PLAIN_VIEW.test(element)) continue;
      if (DECLARES_ELEMENT.test(element)) continue;
      found.push(`${path.relative(ROOT, file)}:${code.slice(0, m.index).split('\n').length}`);
    }
  }
  return found;
}

test('no plain View carries a label the platform will throw away', () => {
  expect(droppedLabelSites()).toEqual([]);
});

// The scan is only worth having if it can actually see a violation, so prove
// it fires on the exact shape that shipped.
test('the scan recognises the shape it exists to catch', () => {
  const bad = '<View accessibilityLabel="five stars" style={{ gap: 3 }}>';
  expect(PLAIN_VIEW.test(bad)).toBe(true);
  expect(DECLARES_ELEMENT.test(bad)).toBe(false);

  const fixed = '<View accessible accessibilityLabel="five stars" style={{ gap: 3 }}>';
  expect(DECLARES_ELEMENT.test(fixed)).toBe(true);

  // A Pressable brings its own accessibility element, so a label on it lands.
  expect(PLAIN_VIEW.test('<Pressable accessibilityLabel="Close menu">')).toBe(false);
});
