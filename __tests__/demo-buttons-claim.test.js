/**
 * HARD-102. The store documents told App Review the demo buttons are not there.
 * They are.
 *
 * `eas.json` sets `EXPO_PUBLIC_SHOW_DEMO=1` on the production profile, and
 * `src/lib/appEnv.js` records why: an owner decision of 2026-08-16 reversing an
 * earlier audit's hide. The demo seats are public by design. They are handed to
 * Apple's reviewer in writing, shown on the website, and the data self-resets
 * minutes after use, so one tap spares an elder the typing.
 *
 * THE FLAG IS NOT THE DEFECT. Do not remove it. The reviewer note is the defect,
 * and a reviewer who reads "compiled out of production builds, do not look for
 * them" and then sees two buttons under the login form has been handed a reason
 * to doubt everything else on the page.
 *
 * So the claim is tied to the flag rather than to a sentence. Flip the flag off
 * one day and this check turns itself off with it.
 */
const fs = require('fs');
const path = require('path');

const APP = path.join(__dirname, '..');
const STORE_DIR = path.join(APP, 'docs', 'store');
// The root docs folder sits beside App/ and is outside its git repository. It
// still reaches Apple, so it is guarded here when it is reachable.
const ROOT_LISTING = path.join(APP, '..', 'docs', 'store-listing.md');

const easJson = JSON.parse(fs.readFileSync(path.join(APP, 'eas.json'), 'utf8'));
const productionShowsDemo = easJson.build?.production?.env?.EXPO_PUBLIC_SHOW_DEMO === '1';

// Sentences that only make sense if the buttons are absent from a store build.
const DENIALS = [
  /compiled out of (the )?production/i,
  /demo buttons? (are|is) (compiled out|not (there|present|shown|visible))/i,
  /do not look for them/i,
  /sets that flag on the `?preview`? profile only/i,
  /reviewer must type the credentials/i,
];

/** A page with its preserved history removed, whitespace flattened. */
const liveTextOf = (file) => {
  const raw = fs.readFileSync(file, 'utf8');
  const cut = raw.search(/^#{2,3} Corrections made on /m);
  return (cut === -1 ? raw : raw.slice(0, cut))
    .replace(/~~[\s\S]*?~~/g, '')
    .replace(/Old wording:[\s\S]*?\n\s*\n/g, '')
    .replace(/used to (end|say|read)\s+"[\s\S]*?"/g, '')
    .replace(/\s+/g, ' ');
};

const pages = [
  ...fs.readdirSync(STORE_DIR).filter((f) => f.endsWith('.md')).map((f) => path.join(STORE_DIR, f)),
  ...(fs.existsSync(ROOT_LISTING) ? [ROOT_LISTING] : []),
];

describe('the demo buttons claim matches the build flag', () => {
  test('the production profile really does ship the buttons', () => {
    // The whole check hangs off this. If the owner ever turns the flag off, the
    // documents may say the buttons are absent again, and this test is where
    // that decision has to be made on purpose rather than by accident.
    expect(productionShowsDemo).toBe(true);
  });

  test('appEnv shows the buttons on exactly that flag', () => {
    const appEnv = fs.readFileSync(path.join(APP, 'src', 'lib', 'appEnv.js'), 'utf8');
    expect(appEnv).toContain('EXPO_PUBLIC_SHOW_DEMO');
    expect(appEnv).toContain("flag === '1'");
  });

  test('the root store-listing page is reachable and being checked', () => {
    // It lives outside App/ and outside its git repository, which is exactly
    // why it drifted. Fail loudly rather than skip quietly if it moves.
    expect(fs.existsSync(ROOT_LISTING)).toBe(true);
  });

  test.each(pages.map((p) => [path.relative(APP, p), p]))(
    '%s never says the buttons are absent',
    (_name, file) => {
      if (!productionShowsDemo) return;
      const live = liveTextOf(file);
      const found = DENIALS.filter((re) => re.test(live)).map((re) => {
        const m = live.match(re);
        return `${re}: ...${live.slice(Math.max(0, m.index - 70), m.index + 110)}...`;
      });
      expect(found).toEqual([]);
    }
  );

  test('console-answers.md already told the truth and still does', () => {
    const live = liveTextOf(path.join(STORE_DIR, 'console-answers.md'));
    expect(live).toContain('One tap demo buttons sit below the login form');
  });
});
