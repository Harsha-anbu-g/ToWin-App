// Night-mode integrity guard: screens and components must use theme tokens,
// never raw hex colors. The ONLY homes for hex values are src/theme/tokens.js
// (the locked palette) and src/theme/parity.js (documented web one-offs).
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SCAN_DIRS = ['app', 'src/components', 'src/context', 'src/lib'];
const HEX_RE = /#[0-9a-fA-F]{3,8}\b/g;

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else if (/\.(jsx?|tsx?)$/.test(entry.name)) files.push(full);
  }
  return files;
}

test('no hex color literals outside src/theme', () => {
  const offenders = [];
  for (const dir of SCAN_DIRS) {
    const abs = path.join(ROOT, dir);
    if (!fs.existsSync(abs)) continue;
    for (const file of walk(abs)) {
      const content = fs.readFileSync(file, 'utf8');
      const hits = content.match(HEX_RE);
      if (hits) offenders.push(`${path.relative(ROOT, file)}: ${hits.join(', ')}`);
    }
  }
  expect(offenders).toEqual([]);
});
