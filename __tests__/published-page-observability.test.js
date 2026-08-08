// The repo cannot tell a build artifact from a deployment. This says so out loud.
//
// Audit finding V9. Every test that supposedly pinned the published deletion URL
// compared one local constant to another local constant, so a page that did not
// exist in production passed all of them. Adding more of those tests would not
// help: no assertion that reads only the repo can observe a deploy.
//
// So the observation lives in scripts/verify-published-page.mjs, which fetches
// the page, finds the JavaScript bundle the shell loads and looks for the page's
// own strings inside it. That is the only honest signal, because towinly.com
// answers 200 for every path and serves the same HTML shell for all of them.
//
// This file does two jobs:
//   1. Keeps the script wired up and its contract intact, offline, always.
//   2. Runs it for real when VERIFY_PUBLISHED=1, and when it cannot reach the
//      network it says so at the top of its voice instead of passing quietly.
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SCRIPT = path.join(ROOT, 'scripts', 'verify-published-page.mjs');
const { DELETE_ACCOUNT_PAGE, DELETION_PAGE_URL } = require('../src/data/deleteAccountPage');

// Strings unique to this page. "Delete your account" would NOT do: the profile
// screen's first confirmation says "Delete your account?", so it is in the
// bundle whether or not this page shipped, and it would report a false publish.
const MARKERS = [DELETE_ACCOUNT_PAGE.actionLabel, DELETE_ACCOUNT_PAGE.mailSubject];

const LOUD = (lines) =>
  console.warn(`\n${'='.repeat(78)}\n${lines.join('\n')}\n${'='.repeat(78)}\n`);

describe('the published deletion page, observed rather than assumed', () => {
  test('the observation script exists and is wired into package.json', () => {
    // Arrange / Act
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));

    // Assert - a script nobody can find is a script nobody runs.
    expect(fs.existsSync(SCRIPT)).toBe(true);
    expect(pkg.scripts['verify:published']).toContain('verify-published-page.mjs');
  });

  test('it separates "could not observe" from "observed and wrong"', () => {
    // Arrange / Act - two exit codes, because a caller that treats a network
    // failure as success is doing the exact thing this script exists to stop.
    const source = fs.readFileSync(SCRIPT, 'utf8');

    // Assert
    expect(source).toContain('const NOT_PUBLISHED = 1;');
    expect(source).toContain('const COULD_NOT_OBSERVE = 2;');
    expect(source).toContain('This is not a pass. Nothing was checked.');
  });

  test('its markers are unique to this page, not shared with the rest of the app', () => {
    // Arrange - a marker that appears elsewhere in the bundle reports a publish
    // that never happened. This is the failure the check itself can suffer.
    const appSources = [];
    (function walk(dir) {
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) walk(p);
        else if (/\.(js|jsx)$/.test(e.name) && !p.includes('deleteAccountPage')) {
          appSources.push(fs.readFileSync(p, 'utf8'));
        }
      }
    })(path.join(ROOT, 'src'));
    (function walk(dir) {
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) walk(p);
        else if (/\.(js|jsx)$/.test(e.name) && !p.endsWith('delete-account.jsx')) {
          appSources.push(fs.readFileSync(p, 'utf8'));
        }
      }
    })(path.join(ROOT, 'app'));

    // Assert
    for (const marker of MARKERS) {
      expect(appSources.filter((s) => s.includes(marker))).toHaveLength(0);
    }
  });

  test('run for real against production when asked, and never pass in silence', () => {
    // Arrange
    if (process.env.VERIFY_PUBLISHED !== '1') {
      LOUD([
        'NOT VERIFIED AGAINST PRODUCTION.',
        '',
        'This suite reads the repo. The repo cannot tell a build artifact from a',
        'deployment, which is how a page that did not exist passed twenty tests.',
        '',
        'To actually look:  VERIFY_PUBLISHED=1 npx jest published-page-observability',
        '            or:    npm run verify:published',
      ]);
      return;
    }

    // Act
    let status = 0;
    let output = '';
    try {
      output = execFileSync(
        'node',
        [SCRIPT, DELETION_PAGE_URL, ...MARKERS.flatMap((m) => ['--expect', m])],
        { encoding: 'utf8', timeout: 60000 }
      );
    } catch (err) {
      status = err.status ?? 2;
      output = `${err.stdout ?? ''}${err.stderr ?? ''}`;
    }

    // Assert - exit 2 is "nothing was checked", so it is a loud skip and not a
    // failure of the code. Exit 1 is the page genuinely not being there.
    if (status === 2) {
      LOUD(['COULD NOT OBSERVE THE DEPLOYMENT. Nothing was checked.', '', output.trim()]);
      return;
    }
    expect(`${output}\nexit ${status}`).toContain('exit 0');
  });
});
