/**
 * Guards scripts/capture-store-shots.mjs, the one command that takes a store
 * screenshot.
 *
 * The browser half of that script cannot run here, so this file covers the
 * half that carries the rule: the tape measure, and the refusal.
 *
 * The rule exists because of a real failure. On 2026-08-15 three shots were
 * taken at a 1320 wide viewport instead of 440 at scale 3. Every mechanical
 * check of the day passed: the files were 1320 x 2868, RGB, no alpha, exactly
 * what Apple asks for. The picture was a desktop page at a third of phone
 * type size. The only signal that separated the two was weight, because a
 * phone-scale render puts three times as much ink on the page.
 *
 * So the fixtures here are those actual files, kept in screenshots/superseded/
 * because nothing in this repo is ever deleted. They are the precise case
 * where dimensions say yes and the picture says no.
 */
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SCRIPT = path.join(ROOT, 'scripts', 'capture-store-shots.mjs');
const SHOTS = path.join(ROOT, 'docs', 'store', 'screenshots');

const EM_DASH = '—';

/**
 * A real phone-scale capture: 1320 x 2868, 157,173 bytes.
 *
 * Deliberately the frozen copy in superseded/, not the live raw. The live file
 * is re-shot whenever the UI moves, so a byte count pinned to it fails for the
 * one reason that says nothing about the script. Everything under superseded/
 * is the historical record and never changes, so the number can be typed in
 * and mean something.
 */
const PHONE_SCALE = path.join(
  SHOTS, 'superseded', '2026-08-29-pre-appstore-recapture', 'raw-02-checkin.png'
);
/** The smallest desktop-scale mistake on disk: same dimensions, 58,589 bytes. */
const DESKTOP_SCALE_SMALLEST = path.join(SHOTS, 'superseded', 'raw-15-chat-thread-desktop-scale.png');
/** The largest desktop-scale mistake on disk: same dimensions, 107,542 bytes. */
const DESKTOP_SCALE_LARGEST = path.join(SHOTS, 'superseded', 'raw-16-family-parent-checked-in-desktop-scale.png');

function run(args) {
  return spawnSync(process.execPath, [SCRIPT, ...args], { encoding: 'utf8' });
}

describe('capture-store-shots --verify', () => {
  test('passes a real phone-scale capture and prints what it measured', () => {
    const { status, stdout } = run(['--verify', PHONE_SCALE]);
    expect(stdout).toContain('1320 x 2868');
    expect(stdout).toContain('157173');
    expect(status).toBe(0);
  });

  test('refuses the desktop-scale capture whose dimensions are correct', () => {
    const { status, stderr } = run(['--verify', DESKTOP_SCALE_SMALLEST]);
    expect(status).toBe(1);
    expect(stderr).toContain('58589');
    expect(stderr.toLowerCase()).toContain('desktop');
  });

  test('refuses the heaviest desktop-scale capture too, not only the smallest', () => {
    const { status } = run(['--verify', DESKTOP_SCALE_LARGEST]);
    expect(status).toBe(1);
  });

  test('reports a missing file as could-not-observe, never as a pass', () => {
    const { status } = run(['--verify', path.join(SHOTS, 'no-such-file.png')]);
    expect(status).toBe(2);
  });
});

describe('capture-store-shots capture mode', () => {
  test('names the flag it is missing and starts no browser', () => {
    const { status, stderr } = run(['--out', '/tmp/whatever.png']);
    expect(status).toBe(2);
    expect(stderr).toContain('--route');
  });

  test('refuses any attempt to move the pinned frame', () => {
    const { status, stderr } = run(['--route', '/', '--out', '/tmp/whatever.png', '--viewport', '1320x2868']);
    expect(status).toBe(2);
    expect(stderr).toContain('440');
  });

  test('accepts --dump-text and still names the flag it is actually missing', () => {
    // The sweep for a phone number in a frame is evidence, so the flag that
    // writes it must not be the thing that fails the run.
    const { status, stderr } = run(['--out', '/tmp/whatever.png', '--dump-text', '/tmp/whatever.txt']);
    expect(status).toBe(2);
    expect(stderr).toContain('--route');
    expect(stderr).not.toContain('--dump-text');
  });

  test('refuses a seat it does not know', () => {
    const { status, stderr } = run(['--route', '/', '--out', '/tmp/whatever.png', '--seat', 'admin']);
    expect(status).toBe(2);
    expect(stderr).toContain('--seat');
  });
});

describe('the script itself', () => {
  const source = fs.readFileSync(SCRIPT, 'utf8');

  test('pins the frame as constants, not as values a caller passes in', () => {
    // Pinned by declaration. The refusal test above is what proves no caller
    // can move them; this one proves the three numbers themselves are right.
    expect(source).toMatch(/VIEWPORT = \{ width: 440, height: 956 \}/);
    expect(source).toMatch(/DEVICE_SCALE_FACTOR = 3\b/);
    expect(source).toMatch(/COLOR_SCHEME = 'light'/);
  });

  test('carries no em dash in anything it can print', () => {
    expect(source).not.toContain(EM_DASH);
  });
});
