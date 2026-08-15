/**
 * Guards the upload-ready store screenshots.
 *
 * A store screenshot is not code, so nothing else in this repo would notice if
 * one went missing, came out the wrong size, picked up an alpha channel, or
 * drifted away from the caption the listing promises. Both stores reject an
 * alpha channel outright: Apple's screenshot specifications say "Images can't
 * include alpha channels or transparencies", and Play asks for "JPEG or 24-bit
 * PNG (no alpha)". That rejection lands at upload time, which is exactly the
 * hour the owner is paying for.
 *
 * Dimensions and colour type are read out of the PNG header here rather than
 * shelled out to sips, so the test runs the same way on any machine.
 */
const fs = require('fs');
const path = require('path');

const SHOT_DIR = path.join(__dirname, '..', 'docs', 'store', 'screenshots');
const FINAL_DIR = path.join(SHOT_DIR, 'final');
const MANIFEST = path.join(SHOT_DIR, 'manifest.json');
const PLAN_DOC = path.join(__dirname, '..', 'docs', 'store', 'screenshots-and-review.md');

const EM_DASH = '—';
const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

/** PNG colour type 2 is truecolour: three channels, no alpha. */
const COLOR_TYPE_TRUECOLOUR = 2;

const manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
const { shots, sizes } = manifest;

/** raw-13-landing-trust-ladder.png -> landing-trust-ladder */
function slugOf(rawName) {
  return rawName.replace(/^raw-/, '').replace(/^\d+-/, '').replace(/\.png$/, '');
}

function bakedPath(shot, store) {
  const slot = String(shot.slot).padStart(2, '0');
  return path.join(FINAL_DIR, store, `${slot}-${slugOf(shot.raw)}-${store}.png`);
}

/**
 * Reads width, height and colour type from IHDR, and looks for tRNS.
 *
 * The chunk list is walked rather than scanned for the four bytes "tRNS",
 * because those bytes can occur by chance inside compressed pixel data and a
 * store screenshot that failed one run in a thousand for no visible reason
 * would teach the next reader to ignore this test.
 */
function readPng(file) {
  const buf = fs.readFileSync(file);
  if (!buf.subarray(0, 8).equals(PNG_MAGIC)) {
    throw new Error(`${file} is not a PNG`);
  }

  const chunks = [];
  let offset = 8;
  while (offset + 8 <= buf.length) {
    const length = buf.readUInt32BE(offset);
    const type = buf.toString('ascii', offset + 4, offset + 8);
    chunks.push({ type, start: offset + 8 });
    if (type === 'IEND') break;
    offset += 12 + length; // length + type + data + crc
  }

  const ihdr = chunks.find((c) => c.type === 'IHDR');
  if (!ihdr) {
    throw new Error(`${file} has no IHDR chunk`);
  }
  return {
    width: buf.readUInt32BE(ihdr.start),
    height: buf.readUInt32BE(ihdr.start + 4),
    bitDepth: buf[ihdr.start + 8],
    colorType: buf[ihdr.start + 9],
    // tRNS turns an otherwise opaque PNG transparent, so it counts as alpha.
    hasTransparencyChunk: chunks.some((c) => c.type === 'tRNS'),
    bytes: buf.length,
  };
}

/** Collapse deliberate line breaks so a caption can be compared to prose. */
function flatten(text) {
  return text.replace(/\s+/g, ' ').trim();
}

const stores = Object.keys(sizes);
const everyShotAndStore = shots.flatMap((shot) =>
  stores.map((store) => [`${store} slot ${shot.slot} ${slugOf(shot.raw)}`, shot, store])
);

describe('store screenshots: the set is complete and in upload order', () => {
  test('the manifest holds exactly eight shots, numbered 1 to 8 with no gaps', () => {
    expect(shots).toHaveLength(8);
    expect(shots.map((s) => s.slot)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });

  test('every shot names a raw capture that exists', () => {
    const missing = shots
      .filter((s) => !fs.existsSync(path.join(SHOT_DIR, s.raw)))
      .map((s) => s.raw);
    expect(missing).toEqual([]);
  });

  test('both store folders hold exactly the eight baked files and nothing stale', () => {
    for (const store of stores) {
      const onDisk = fs.readdirSync(path.join(FINAL_DIR, store)).filter((f) => f.endsWith('.png'));
      const expected = shots.map((s) => path.basename(bakedPath(s, store)));
      expect(onDisk.sort()).toEqual(expected.sort());
    }
  });
});

describe('store screenshots: every file passes what the stores check at upload', () => {
  test.each(everyShotAndStore)('%s is present, exact and opaque', (_label, shot, store) => {
    const file = bakedPath(shot, store);
    expect(fs.existsSync(file)).toBe(true);

    const png = readPng(file);
    const [width, height] = sizes[store];
    expect([png.width, png.height]).toEqual([width, height]);

    // No alpha, by either route: an alpha colour type or a tRNS chunk.
    expect(png.colorType).toBe(COLOR_TYPE_TRUECOLOUR);
    expect(png.hasTransparencyChunk).toBe(false);
    expect(png.bitDepth).toBe(8);

    // A capture that renders blank still has the right dimensions, so hold a
    // floor as well. Real shots of these screens run well past 100 KB.
    expect(png.bytes).toBeGreaterThan(50 * 1024);
  });

  test('the Play set obeys the rule that the long side is at most twice the short side', () => {
    // Play: "The maximum dimension of your screenshot can't be more than twice
    // as long as the minimum dimension." The iOS renders are 1 to 2.17 and
    // would be refused, which is the whole reason a second size is baked.
    const [w, h] = sizes.play;
    expect(Math.max(w, h)).toBeLessThanOrEqual(2 * Math.min(w, h));

    const [iw, ih] = sizes.ios;
    expect(Math.max(iw, ih)).toBeGreaterThan(2 * Math.min(iw, ih));
  });

  test('the iOS size is one Apple accepts for a 6.9 inch iPhone in portrait', () => {
    const APPLE_69_PORTRAIT = [
      [1260, 2736],
      [1290, 2796],
      [1320, 2868],
    ];
    expect(APPLE_69_PORTRAIT).toContainEqual(sizes.ios);
  });
});

describe('store screenshots: the words baked into them', () => {
  test('no caption or sub-caption contains an em dash', () => {
    const offenders = shots
      .filter((s) => s.caption.includes(EM_DASH) || (s.sub || '').includes(EM_DASH))
      .map((s) => s.slot);
    expect(offenders).toEqual([]);
  });

  test('the captions still match the pinned block in screenshots-and-review.md', () => {
    const doc = fs.readFileSync(PLAN_DOC, 'utf8');
    const block = doc.match(
      /<!-- screenshot-captions:start -->([\s\S]*?)<!-- screenshot-captions:end -->/
    );
    expect(block).not.toBeNull();

    const pinned = block[1]
      .split(/^\s*(?=\d\.\s)/m)
      .map((entry) => flatten(entry.replace(/^\d\.\s*/, '')))
      .filter(Boolean);

    const baked = shots.map((s) => flatten([s.caption, s.sub].filter(Boolean).join(' ')));
    expect(pinned).toEqual(baked);
  });
});
