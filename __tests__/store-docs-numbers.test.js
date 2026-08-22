// The store documents are worked from by hand on submission day, and every
// figure in them used to be typed. Six of them had drifted by 2026-08-22: the
// dependency count said 32 against a tree of 38, the App Privacy answer said
// eleven data types against a table of twelve, three documents said version
// 1.0.0 after 1.1.0 build 10 was uploaded, two said thirteen raw captures
// against sixteen on disk, one said five baked shots against eight, and forty
// citations pointed at line numbers that had moved.
//
// So the numbers are recomputed here from the tree, and the documents are read
// back. A stale figure fails the suite on the next run instead of being found
// by a reviewer. HARD-116.
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const STORE = path.join(ROOT, 'docs', 'store');

const docs = fs
  .readdirSync(STORE)
  .filter((f) => f.endsWith('.md'))
  .map((f) => ({ name: f, text: fs.readFileSync(path.join(STORE, f), 'utf8') }));

const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
const appJson = JSON.parse(fs.readFileSync(path.join(ROOT, 'app.json'), 'utf8'));

/** Every figure below is a count of something real, taken at read time. */
const real = {
  dependencies: Object.keys(pkg.dependencies).length,
  devDependencies: Object.keys(pkg.devDependencies).length,
  version: appJson.expo.version,
  finalIosShots: fs
    .readdirSync(path.join(STORE, 'screenshots', 'final', 'ios'))
    .filter((f) => f.endsWith('.png')).length,
  rawCaptures: fs
    .readdirSync(path.join(STORE, 'screenshots'))
    .filter((f) => /^raw-\d+.*\.png$/.test(f)).length,
};

/** The "Collected: Yes" rows of the Apple Data Linked to You table. */
function dataLinkedYesRows() {
  const labels = docs.find((d) => d.name === 'privacy-labels.md').text;
  const start = labels.indexOf('### 1.2 Data Linked to You');
  const end = labels.indexOf('### 1.3 Data Not Linked to You');
  expect(start).toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);
  return labels
    .slice(start, end)
    .split('\n')
    .filter((line) => line.startsWith('|') && line.includes('**Yes**')).length;
}

/** Every line of every store doc, tagged with where it came from. */
const lines = docs.flatMap((d) =>
  d.text.split('\n').map((text, i) => ({ where: `${d.name}:${i + 1}`, text }))
);

describe('the dependency counts the documents quote', () => {
  test('every "N runtime dependencies" is the real number', () => {
    const claims = lines
      .map((l) => ({ ...l, m: l.text.match(/(\d+)\s+runtime dep(?:endencie|)s?/) }))
      .filter((l) => l.m);

    expect(claims.length).toBeGreaterThan(0); // the scan must find the claims
    for (const c of claims) {
      expect(`${c.where} says ${c.m[1]}`).toBe(`${c.where} says ${real.dependencies}`);
    }
  });

  test('every "N dev deps" is the real number', () => {
    const claims = lines
      .map((l) => ({ ...l, m: l.text.match(/(\d+)\s+dev deps/) }))
      .filter((l) => l.m);

    expect(claims.length).toBeGreaterThan(0);
    for (const c of claims) {
      expect(`${c.where} says ${c.m[1]}`).toBe(`${c.where} says ${real.devDependencies}`);
    }
  });
});

describe('the version the documents quote', () => {
  test('every stated version is app.json\'s, unless the line is a dated revision note', () => {
    // A line that names BOTH an old version and the current one is history
    // ("written for 1.0.0, revised for 1.1.0") and is left alone on purpose.
    const wrong = lines
      .map((l) => ({ ...l, m: l.text.match(/[Vv]ersion\s+`?(\d+\.\d+\.\d+)`?/) }))
      .filter((l) => l.m && l.m[1] !== real.version && !l.text.includes(real.version))
      .map((l) => `${l.where}: ${l.text.trim()}`);

    expect(wrong).toEqual([]);
  });
});

describe('the App Privacy answer counts its own table', () => {
  test('every document that quotes the count quotes the counted one', () => {
    // Two documents recite this number into two different consoles, and the
    // table it comes from is edited whenever a data type is added.
    const rows = dataLinkedYesRows();
    const claims = lines
      .map((l) => ({ ...l, m: l.text.match(/(\w+) data types are Yes/) }))
      .filter((l) => l.m);

    expect(claims.length).toBeGreaterThan(1);
    for (const c of claims) {
      expect(`${c.where} says ${c.m[1]}`).toBe(`${c.where} says ${rows}`);
    }
  });
});

describe('the screenshot counts', () => {
  test('nothing claims a baked-shot count other than what is on disk', () => {
    const claims = lines
      .map((l) => ({ ...l, m: l.text.match(/(\d+) (?:shots|files) .*final|final\/ios` returns (\d+)/) }))
      .filter((l) => l.m)
      .map((l) => ({ where: l.where, n: Number(l.m[1] ?? l.m[2]) }))
      // The dated correction sections quote what an older `ls` returned. Those
      // are history and say so; only live claims are checked.
      .filter((c) => !/on 2026-08-15 `ls`/.test(lines.find((l) => l.where === c.where).text));

    for (const c of claims) {
      expect(`${c.where} says ${c.n}`).toBe(`${c.where} says ${real.finalIosShots}`);
    }
  });

  test('the raw capture count is the number of raw files', () => {
    const claims = lines
      .map((l) => ({ ...l, m: l.text.match(/(\d+) raw captures/) }))
      .filter((l) => l.m);

    expect(claims.length).toBeGreaterThan(0);
    for (const c of claims) {
      expect(`${c.where} says ${c.m[1]}`).toBe(`${c.where} says ${real.rawCaptures}`);
    }
  });
});

describe('citations survive the next edit', () => {
  test('no store document cites an app source file by line number', () => {
    // A line number is right until somebody adds an import. Symbol names
    // (`pickImage`, `DRAFT`, `objectionableError`) stay right, and they are
    // what a reader greps for anyway. Forty of these had already gone stale.
    const cite = /`(?:App\/)?(?:app|src|scripts)\/[A-Za-z0-9_\-[\]()/.]+\.(?:jsx?|py|json):\d+/;
    const offenders = lines.filter((l) => cite.test(l.text)).map((l) => `${l.where}: ${l.text.trim()}`);

    expect(offenders).toEqual([]);
  });

  test('every file a store document names in backticks exists', () => {
    const filePat = /`((?:App\/)?(?:app|src|scripts|docs)\/[A-Za-z0-9_\-[\]()/.]+\.(?:jsx?|py|json|md))`/g;
    const missing = [];
    for (const l of lines) {
      for (const m of l.text.matchAll(filePat)) {
        const rel = m[1].startsWith('App/') ? m[1].slice(4) : m[1];
        // `docs/store-listing.md` is the one load-bearing file above the repo:
        // the git root is App/ and the project root is not versioned, so a
        // bare docs/ path resolves against either.
        const here = fs.existsSync(path.join(ROOT, rel));
        const above = fs.existsSync(path.join(ROOT, '..', rel));
        if (!here && !above) missing.push(`${l.where}: ${m[1]}`);
      }
    }
    expect(missing).toEqual([]);
  });
});
