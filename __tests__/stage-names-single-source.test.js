// One name per rung (HARD-110). The trust ladder had four spellings of the
// same seven rungs living in four files: two local SHORT_STAGES arrays that
// disagreed about rung 5 ('Met' vs 'Met in person'), a third copy called
// STAGE_LABELS on the Trust Score screen, and the real one in
// src/lib/trustStages.js that nobody imported.
//
// The app needs TWO registers, not one word: a compact form for the chip under
// a name ("Stage 3 of 7 · Phone") and a long form for sentences ("reaches the
// Phone Ready stage"). That is what the website does too — TrustJourney.jsx
// carries `label` and `short` side by side on one row per rung. The defect was
// never the two registers; it was that both were re-typed per screen.
//
// So the rule this file locks: trustStages.js names the rungs, in both
// registers, and no screen writes a rung name of its own.
const fs = require('fs');
const path = require('path');

const {
  FULL_STAGES,
  PHONE_STAGE,
  SHORT_STAGES,
  STAGE_COUNT,
} = require('../src/lib/trustStages');
const { STAGES } = require('../src/data/landingSlides');
const { centerActionFor, secondTabFor } = require('../src/lib/roles');

const ROOT = path.join(__dirname, '..');
const SCAN_DIRS = ['app', 'src'];
const SOURCE_OF_TRUTH = path.join('src', 'lib', 'trustStages.js');

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else if (/\.(jsx?|tsx?)$/.test(entry.name)) files.push(full);
  }
  return files;
}

// Comments are blanked before matching (the convention view-label-a11y.test.js
// and link-role.test.js use) so a rung name can be explained in prose without
// the prose tripping the rule.
function readCode(file) {
  return fs
    .readFileSync(file, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/(^|[^:])\/\/[^\n]*/gm, '$1');
}

function sourceFiles() {
  return SCAN_DIRS.flatMap((dir) => walk(path.join(ROOT, dir)))
    .filter((f) => !path.relative(ROOT, f).endsWith(SOURCE_OF_TRUTH));
}

describe('the ladder is named in exactly one file', () => {
  test('both registers cover all seven rungs and line up index for index', () => {
    expect(SHORT_STAGES).toHaveLength(STAGE_COUNT);
    expect(FULL_STAGES).toHaveLength(STAGE_COUNT);
    // Same rung at the same index in both registers: the short form of
    // "Phone Ready" is "Phone", never the rung above or below it.
    expect(SHORT_STAGES[PHONE_STAGE]).toBe('Phone');
    expect(FULL_STAGES[PHONE_STAGE]).toBe('Phone Ready');
  });

  test('the long register is the backend’s own stage labels, unchanged', () => {
    // Source: backend TrustScoreService.stageLabel / FamilyJourneyService, and
    // the website's TrustJourney LEVELS labels. Renaming a rung here would
    // rename what the rung MEANS to a member, so this list is pinned.
    expect(FULL_STAGES).toEqual([
      'Just Connected',
      'Messaging',
      'Phone Ready',
      'Video Ready',
      'Social Media',
      'Ready to Meet',
      'Fully Trusted',
    ]);
  });

  test('the landing story reads the shared names rather than retyping them', () => {
    expect(STAGES).toBe(FULL_STAGES);
  });

  test('no screen writes a stage list of its own', () => {
    const names = new Set([...SHORT_STAGES, ...FULL_STAGES]);
    const offenders = [];
    for (const file of sourceFiles()) {
      // Innermost array literals only — enough to catch a retyped ladder
      // without needing a parser.
      for (const literal of readCode(file).match(/\[[^[\]]*\]/g) || []) {
        const quoted = literal.match(/'[^']*'|"[^"]*"/g) || [];
        const rungs = quoted
          .map((q) => q.slice(1, -1))
          .filter((s) => names.has(s));
        if (new Set(rungs).size >= 3) {
          offenders.push(`${path.relative(ROOT, file)}: ${rungs.join(', ')}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  test('no screen spells a rung name into a sentence by hand', () => {
    // "Phone Ready" is the one that had spread furthest: the privacy policy,
    // the terms, the guide, and both phone-number fields each carried their
    // own copy of it.
    const offenders = sourceFiles()
      .filter((file) => /Phone Ready/.test(readCode(file)))
      .map((file) => path.relative(ROOT, file));
    expect(offenders).toEqual([]);
  });
});

describe('the elder tab bar says two different words', () => {
  test('the centre action and the second tab are not one letter apart', () => {
    const action = centerActionFor('ELDER').label;
    const tab = secondTabFor('ELDER').label;
    expect(action).not.toBe(tab);
    // "Post Help" and "Posted Help" sat side by side, one letter apart, for
    // the audience least able to absorb that distinction.
    expect(editDistance(action, tab)).toBeGreaterThanOrEqual(3);
  });

  test('BOTH sees the same pair as an elder', () => {
    expect(centerActionFor('BOTH').label).toBe(centerActionFor('ELDER').label);
    expect(secondTabFor('BOTH')).toEqual(secondTabFor('ELDER'));
  });
});

function editDistance(a, b) {
  const rows = Array.from({ length: a.length + 1 }, (_, i) =>
    Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      rows[i][j] = Math.min(
        rows[i - 1][j] + 1,
        rows[i][j - 1] + 1,
        rows[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
    }
  }
  return rows[a.length][b.length];
}
