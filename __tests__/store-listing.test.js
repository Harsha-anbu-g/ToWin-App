// The store listing, checked by machine instead of by eye.
//
// Every field in `docs/store-listing.md` is typed into a console by hand on a
// day when the owner is tired, and both consoles reject an over-length field
// with a red box and no explanation of which character pushed it over. The
// counts were previously stated in prose ("That is 21 characters") and nothing
// recomputed them when the text changed.
//
// So the pasteable strings live in fenced `store-fields` / `store-field-counts`
// blocks, and this file recounts them. The counts block is the interesting one:
// it pins what the doc CLAIMS against what the doc CONTAINS, so a silent edit
// to a field is a failing test rather than a rejected submission.
const fs = require('fs');
const path = require('path');

const LISTING = path.join(__dirname, '..', '..', 'docs', 'store-listing.md');
const doc = fs.readFileSync(LISTING, 'utf8');

/** Read a fenced block by its info string, e.g. ```store-fields. */
function fencedBlock(name) {
  const match = doc.match(new RegExp('```' + name + '\\n([\\s\\S]*?)```'));
  if (!match) throw new Error(`no \`\`\`${name} block in docs/store-listing.md`);
  return match[1];
}

/** `key: value` lines → object. Values keep their internal spaces and colons. */
function parseFields(name) {
  return Object.fromEntries(
    fencedBlock(name)
      .split('\n')
      .filter((line) => line.trim() !== '')
      .map((line) => {
        const at = line.indexOf(':');
        if (at === -1) throw new Error(`\`\`\`${name} line is not "key: value": ${line}`);
        return [line.slice(0, at).trim(), line.slice(at + 1).trim()];
      })
  );
}

/** Text between two HTML-comment markers, invisible in rendered markdown. */
function markedSection(name) {
  const match = doc.match(
    new RegExp(`<!-- ${name}:start -->\\n([\\s\\S]*?)<!-- ${name}:end -->`)
  );
  if (!match) throw new Error(`no <!-- ${name}:start --> section in docs/store-listing.md`);
  return match[1].trim();
}

const fields = parseFields('store-fields');
const counts = parseFields('store-field-counts');

// Both stores, as they stand in 2026. The App Store name and the Play title are
// separate console fields that happen to share a 30-character ceiling, so one
// string covers both.
// Name, subtitle and keywords are per-locale fields in App Store Connect, so the
// English (U.K.) slot that serves India carries its own three. They are pinned
// together because a keyword line can only avoid wasting terms if you know which
// words its OWN name and subtitle already spent.
const LIMITS = {
  app_name: 30,
  subtitle: 30,
  play_short: 80,
  promo: 170,
  keywords: 100,
  app_name_en_gb: 30,
  subtitle_en_gb: 30,
  keywords_en_gb: 100,
  full_description: 4000,
};

/** The name and subtitle Apple indexes alongside a given keyword field. */
const localeOf = (keywordField) => (keywordField.endsWith('_en_gb') ? '_en_gb' : '');

const measured = {
  ...Object.fromEntries(
    Object.keys(fields)
      .filter((key) => key in LIMITS)
      .map((key) => [key, fields[key].length])
  ),
  full_description: markedSection('full-description').length,
};

describe('every store field fits the console that will hold it', () => {
  test.each(Object.keys(LIMITS))('%s is within its limit', (key) => {
    expect(measured[key]).toBeDefined();
    expect(measured[key]).toBeLessThanOrEqual(LIMITS[key]);
  });

  // The acceptance criterion is that the count is STATED. A stated count that
  // nothing recomputes is worse than none, because it reads as verified.
  test.each(Object.keys(LIMITS))('the stated count for %s is the real one', (key) => {
    expect(counts[key]).toBeDefined();
    const [stated, limit] = counts[key].split('/').map(Number);
    expect(limit).toBe(LIMITS[key]);
    expect(stated).toBe(measured[key]);
  });
});

describe.each(Object.keys(fields).filter((key) => key.startsWith('keywords')))(
  '%s spends its 100 characters',
  (key) => {
    const tokens = fields[key].split(',');

    test('there are no spaces at all, after commas or inside terms', () => {
      // Apple splits the field on commas AND spaces, so a space is either a
      // wasted character (after a comma) or a silent extra split (inside a term).
      expect(fields[key]).not.toMatch(/\s/);
    });

    test('no term is empty and none repeats', () => {
      expect(tokens.filter((token) => token === '')).toEqual([]);
      expect([...new Set(tokens)]).toHaveLength(tokens.length);
    });

    test("nothing repeats a word Apple already indexes from this locale's name or subtitle", () => {
      // Checked against the SAME locale's name and subtitle. Checking the U.K.
      // keyword line against the U.S. name is a false guard in both directions:
      // it forbids words that locale never spent, and it lets through words it did.
      const locale = localeOf(key);
      const name = fields[`app_name${locale}`];
      const subtitle = fields[`subtitle${locale}`];
      expect(name).toBeDefined();
      expect(subtitle).toBeDefined();
      const indexed = new Set(
        `${name} ${subtitle}`
          .toLowerCase()
          .split(/[^a-z]+/)
          .filter(Boolean)
      );
      expect(tokens.filter((token) => indexed.has(token.toLowerCase()))).toEqual([]);
    });

    test('the field is worth its slot: at least ten terms', () => {
      expect(tokens.length).toBeGreaterThanOrEqual(10);
    });
  }
);

describe('nothing a stranger reads carries an em dash', () => {
  // stop-slop, the hardest rule. It applies to the words baked into the
  // screenshots as much as to the description, so both are scanned here.
  const stranger = [
    ['the pasteable fields', Object.values(fields).join('\n')],
    ['the full description', markedSection('full-description')],
    ['the screenshot captions', markedSection('screenshot-captions')],
  ];

  test.each(stranger)('%s', (_label, text) => {
    expect(text).not.toMatch(/[—–]/);
  });

  test.each(stranger)('%s states Y instead of contrasting it against not-X', (_label, text) => {
    // "not a race, it is a friendship" is the same tell as "not a race, it's a
    // friendship", so the contraction and the long form both have to be caught.
    expect(text.toLowerCase()).not.toMatch(/\bnot\b[^.!?\n]*,\s*(it|they)('s|'re| is| are)\b/);
  });
});

describe('the screenshot captions describe the product that shipped', () => {
  const captions = markedSection('screenshot-captions');

  test('the trust ladder is the real seven steps', () => {
    const { STAGE_COUNT, SHORT_STAGES } = require('../src/lib/trustStages');
    expect(STAGE_COUNT).toBe(7);
    expect(SHORT_STAGES).toHaveLength(STAGE_COUNT);
    expect(captions).toMatch(/[Ss]even steps/);
  });

  test('the pinned captions are the ones baked into the eight files', () => {
    // Three copies of these words exist: this block, the plan in
    // docs/store/screenshots-and-review.md, and manifest.json, which is what
    // scripts/bake_screenshots.py actually renders. store-screenshots.test.js
    // pins the plan against the manifest; this pins the listing against it too,
    // so a caption cannot be edited in one document and shipped from another.
    const manifest = JSON.parse(
      fs.readFileSync(
        path.join(__dirname, '..', 'docs', 'store', 'screenshots', 'manifest.json'),
        'utf8'
      )
    );
    const flatten = (text) => text.replace(/\s+/g, ' ').trim();
    const pinned = captions
      .split('\n')
      .reduce((lines, line) => {
        // A leading "N." opens a caption; an indented line continues the one above.
        if (/^\d+\.\s/.test(line)) return [...lines, line.replace(/^\d+\.\s/, '')];
        if (lines.length === 0) {
          throw new Error(`screenshot-captions starts with a continuation line: ${line}`);
        }
        return [...lines.slice(0, -1), `${lines[lines.length - 1]} ${line.trim()}`];
      }, [])
      .map(flatten);
    const baked = manifest.shots.map((shot) =>
      flatten([shot.caption, shot.sub].filter(Boolean).join(' '))
    );
    expect(pinned).toEqual(baked);
  });

  test('the score split is the real 7 + 5 + 3, adding to 15', () => {
    // The words on the shot must match the words in the app. app/trust/index.jsx
    // tells a helper "up to 15 points: 7 ... 5 ... and 3 ...".
    const screen = fs.readFileSync(path.join(__dirname, '..', 'app', 'trust', 'index.jsx'), 'utf8');
    expect(screen).toContain('up to 15 points: 7 for growing trust together, 5 from their review');
    for (const claim of ['15 points', '7 for the', '5 for their', '3 for your']) {
      expect(captions).toContain(claim);
    }
  });
});

describe('the two Play images that exist are the ones Play will accept', () => {
  // Same IHDR read as launch-assets.test.js: signature, length, "IHDR", then
  // width, height and colour type. Colour type 2 is truecolour with NO alpha,
  // which is what both Play image slots require.
  const IMAGES = path.join(__dirname, '..', '..', 'docs', 'store-images');

  const readPng = (name) => {
    const buf = fs.readFileSync(path.join(IMAGES, name));
    expect(buf.subarray(12, 16).toString('ascii')).toBe('IHDR');
    return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20), colorType: buf.readUInt8(25) };
  };

  test.each([
    ['towinly-play-feature-graphic.png', 1024, 500],
    ['towinly-play-hi-res-icon.png', 512, 512],
  ])('%s is %i x %i with no alpha', (name, width, height) => {
    expect(readPng(name)).toEqual({ width, height, colorType: 2 });
  });

  test('the listing points at the files that are actually on disk', () => {
    for (const name of fs.readdirSync(IMAGES).filter((f) => f.endsWith('.png'))) {
      expect(doc).toContain(name);
    }
  });
});

describe('the screenshot spec matches what the app is built to run on', () => {
  const appJson = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'app.json'), 'utf8'));

  test('no iPad set is owed, because the app does not claim iPad', () => {
    // The moment supportsTablet flips to true, App Store Connect starts
    // demanding a 13" iPad set and this doc goes stale in the worst way:
    // silently, in the field the submission is blocked on.
    expect(appJson.expo.ios.supportsTablet).toBe(false);
    expect(doc).toMatch(/supportsTablet/);
  });
});
