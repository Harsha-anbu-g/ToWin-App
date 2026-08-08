// SHIP-606 — the three react-review findings (2026-07-12), re-derived against
// the code as it stands today rather than fixed from the old line numbers.
//
// These are structural invariants, not copy checks, so they are read off the
// source rather than off a render: the defect is "which attribute is present
// next to which role", and a scan states that for EVERY file, including files
// nobody has written yet. Comments are stripped before matching, because the
// SHIP-601 drift guard was defeated by exactly that (a stale string in a
// comment satisfied a whole-file substring check).
//
// The behavioural half of finding 3 lives in posted-help.test.js, where the
// render harness already exists.
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

// Line comments and block comments are removed so a rule can be explained in
// prose directly above the code it governs without tripping its own guard.
function readCode(file) {
  return fs
    .readFileSync(file, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/\/\/[^\n]*/g, '');
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

function sitesFor(attr) {
  const found = [];
  for (const file of sourceFiles()) {
    const code = readCode(file);
    const re = new RegExp(`accessibilityRole=("|{')${attr}("|'})`, 'g');
    let m;
    while ((m = re.exec(code)) !== null) {
      found.push({
        where: `${path.relative(ROOT, file)}:${code.slice(0, m.index).split('\n').length}`,
        element: elementAround(code, m.index),
      });
    }
  }
  return found;
}

// ---------------------------------------------------------------------------
// Finding 2a: a radio must announce whether it is chosen, on BOTH platforms.
//
// Two bugs sat on top of each other here. `accessibilityState={{ selected }}`
// renders aria-selected, which is not an attribute role="radio" carries, so
// the state went unannounced: a screen reader read three identical options and
// never said which one was picked.
//
// Switching to `accessibilityState={{ checked }}` fixes native and does
// nothing for the phone-web build, because react-native-web 0.21 reads
// accessibilityState only in TouchableWithoutFeedback and isDisabled — never
// on View or Pressable (verified by grep across its dist/). It forwards
// `aria-checked` straight to the DOM instead. React Native 0.81 goes the other
// way and folds `aria-checked` into accessibilityState
// (Libraries/Components/View/View.js: `checked: ariaChecked ?? accessibilityState?.checked`).
// So `aria-checked` is the single spelling both sides understand, and it is
// the one this app uses everywhere.
// ---------------------------------------------------------------------------
test('every radio announces whether it is chosen, on native and on web', () => {
  const sites = sitesFor('radio');
  expect(sites.length).toBeGreaterThan(0); // the scan must actually find radios

  const offenders = sites
    .filter(({ element }) => !/aria-checked=/.test(element))
    .map(({ where, element }) =>
      `${where} ${
        /accessibilityState/.test(element)
          ? 'uses accessibilityState, which the web build drops; use aria-checked'
          : 'never says whether it is chosen'
      }`
    );
  expect(offenders).toEqual([]);
});

// ---------------------------------------------------------------------------
// Finding 2b: a group of choices must say what it is a group OF.
//
// Without a label on the radiogroup, a screen reader announces the arrival of
// a group and then reads the options with no idea what question they answer.
// The visible heading sitting above the group is a separate node; it is not
// wired to it. This is the "cannot say two of three" symptom in the finding.
// ---------------------------------------------------------------------------
test('every radiogroup carries a label saying what is being chosen', () => {
  const sites = sitesFor('radiogroup');
  expect(sites.length).toBeGreaterThan(0);

  const offenders = sites
    .filter(({ element }) => !/accessibilityLabel=/.test(element))
    .map(({ where }) => `${where} radiogroup has no accessibilityLabel`);
  expect(offenders).toEqual([]);
});

// ---------------------------------------------------------------------------
// Finding 2c, found by the scan rather than by the review: finish-setup had two
// radios with no group around them at all. Loose radios are worse than an
// unlabelled group — there is nothing to count them, so "one of two" is not
// available either. Coarse but true: this app authors a group and its radios in
// the same file, so a file with radios and no radiogroup has orphans.
// ---------------------------------------------------------------------------
test('no file has radios without a radiogroup to hold them', () => {
  const offenders = [];
  for (const file of sourceFiles()) {
    const code = readCode(file);
    if (!/accessibilityRole=("|{')radio("|'})/.test(code)) continue;
    if (!/accessibilityRole=("|{')radiogroup("|'})/.test(code)) {
      offenders.push(`${path.relative(ROOT, file)} has radios but no radiogroup`);
    }
  }
  expect(offenders).toEqual([]);
});

// ---------------------------------------------------------------------------
// Finding 1: what "link" promises.
//
// The PRD paraphrases this finding as "elements that navigate are not
// announced as links". The original review said the opposite, and the original
// is the one that holds up: the defect is role="link" on a control that does
// NOT navigate. A link tells a screen reader "activating this takes you
// somewhere". Opening a sheet over the current screen takes you nowhere, and
// on register that mismatch sits directly above the signup checkbox, on the
// two controls a person is most likely to open before agreeing to anything.
//
// In-app route changes are left as links on purpose: they do navigate, which
// is what the role means. Only the open-a-sheet-in-place case is wrong.
// ---------------------------------------------------------------------------
test('nothing announced as a link merely opens a sheet over the current screen', () => {
  const sites = sitesFor('link');
  expect(sites.length).toBeGreaterThan(0);

  const OPENS_AN_OVERLAY = /set[A-Z]\w*(Open|Visible|Sheet|Modal|Shown)\s*\(/;
  const offenders = sites
    .filter(({ element }) => OPENS_AN_OVERLAY.test(element))
    .map(({ where }) => `${where} is role="link" but opens an overlay in place; it is a button`);
  expect(offenders).toEqual([]);
});

// Finding 3 is NOT scanned for here, on purpose. The review asked for
// try/finally around every onRefresh so a refresh failing on poor WiFi could
// not leave the spinner turning. Re-derived against the current code, that
// cannot happen: every refresh in the app awaits queryClient.invalidateQueries,
// and query-core attaches `.catch(noop)` to each refetch unless throwOnError is
// set (node_modules/@tanstack/query-core/build/modern/queryClient.js,
// refetchQueries), so the promise resolves even when the fetch throws. Adding
// the shape to five more files would have been churn against a bug that cannot
// occur. The property an elder actually experiences is pinned behaviourally in
// posted-help.test.js instead, which stays true however the refresh is written.
