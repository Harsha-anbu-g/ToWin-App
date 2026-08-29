// Design law guard, same shape as no-stray-colors.test.js: the type ramp in
// src/theme/tokens.js is the only place font sizes live. These two screens are
// the last ones the 2026-08-11 deep audit touched that still set sizes by hand
// (finish-setup's "Signing in as" line, profile-edit's Change photo label).
// Scoped to these two files on purpose: the rest of the app still carries
// literals and closing them is the owner's call, not this guard's.
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const FILES = ['app/(auth)/finish-setup.jsx', 'app/profile-edit.jsx'];
const LITERAL_FONT_SIZE = /fontSize:\s*\d/;

test('the two audited screens exist where the guard looks for them', () => {
  // A rename would make the scan below pass by scanning nothing.
  for (const rel of FILES) {
    expect(fs.existsSync(path.join(ROOT, rel))).toBe(true);
  }
});

test('finish-setup and profile-edit set no font size by hand', () => {
  const offenders = [];
  for (const rel of FILES) {
    const lines = fs.readFileSync(path.join(ROOT, rel), 'utf8').split('\n');
    lines.forEach((line, i) => {
      if (LITERAL_FONT_SIZE.test(line)) offenders.push(`${rel}:${i + 1} ${line.trim()}`);
    });
  }
  expect(offenders).toEqual([]);
});
