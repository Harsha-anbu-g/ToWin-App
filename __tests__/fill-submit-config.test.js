/**
 * Guards scripts/fill-submit-config.mjs, the one command that turns the three
 * store account values into a working submit profile.
 *
 * The script runs once, at midnight, on the day the accounts open, and every
 * value it takes is a value nobody in this repo has ever seen. So the two
 * things worth proving are the two that cost a whole evening when they fail:
 *
 *  1. A malformed value is refused with a message that says what to fix and
 *     where the real value lives. A lower case Team ID, a bundle identifier
 *     pasted where the numeric Apple ID goes, an OAuth client file mistaken
 *     for a service account key: all three are accepted by a text editor and
 *     rejected by eas submit twenty minutes later.
 *  2. A refusal never leaves eas.json half written. Everything is validated
 *     before a byte is written, and the write goes through a temp file and a
 *     rename.
 *
 * It also pins the repo's own eas.json to carrying no invented identifiers,
 * because a fake ascAppId that reaches a console is worse than an empty field.
 */
const { spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SCRIPT = path.join(ROOT, 'scripts', 'fill-submit-config.mjs');
const REAL_EAS_JSON = path.join(ROOT, 'eas.json');
const DOC = path.join(ROOT, 'docs', 'store', 'submit-config.md');

const EM_DASH = '—';

/** Shapes Apple documents: digits only, and ten upper case characters. */
const VALID_ASC_APP_ID = '1234567891';
const VALID_TEAM_ID = 'ABCDE12345';

const VALID_KEY = {
  type: 'service_account',
  project_id: 'towinly-play',
  client_email: 'eas-submit@towinly-play.iam.gserviceaccount.com',
  private_key: '-----BEGIN PRIVATE KEY-----\nnot-a-real-key\n-----END PRIVATE KEY-----\n',
};

let sandbox;
let easJsonPath;
let keyPath;
let untouched;

/** Runs the script with the ambient store variables stripped, so the test controls every input. */
function run(args, extraEnv = {}) {
  const env = { ...process.env, ...extraEnv };
  for (const key of ['ASC_APP_ID', 'APPLE_TEAM_ID', 'PLAY_SERVICE_ACCOUNT_KEY', 'APPLE_ID', 'IOS_SKU', 'EAS_JSON']) {
    if (!(key in extraEnv)) delete env[key];
  }
  return spawnSync(process.execPath, [SCRIPT, ...args], { encoding: 'utf8', env });
}

/** The three required flags, all valid, for the tests that vary one of them. */
const goodArgs = () => [
  '--asc-app-id',
  VALID_ASC_APP_ID,
  '--apple-team-id',
  VALID_TEAM_ID,
  '--play-key',
  keyPath,
  '--eas-json',
  easJsonPath,
];

const readEasJson = () => JSON.parse(fs.readFileSync(easJsonPath, 'utf8'));

beforeEach(() => {
  sandbox = fs.mkdtempSync(path.join(os.tmpdir(), 'towinly-submit-'));
  const appDir = path.join(sandbox, 'App');
  const secretsDir = path.join(sandbox, 'secrets');
  fs.mkdirSync(appDir);
  fs.mkdirSync(secretsDir);

  easJsonPath = path.join(appDir, 'eas.json');
  fs.copyFileSync(REAL_EAS_JSON, easJsonPath);

  keyPath = path.join(secretsDir, 'towinly-play-service-account.json');
  fs.writeFileSync(keyPath, JSON.stringify(VALID_KEY, null, 2));

  untouched = fs.readFileSync(easJsonPath, 'utf8');
});

afterEach(() => {
  // Only ever removes a directory this test made, inside the OS temp dir.
  if (sandbox && sandbox.startsWith(os.tmpdir()) && sandbox.includes('towinly-submit-')) {
    fs.rmSync(sandbox, { recursive: true, force: true });
  }
});

describe('fill-submit-config writes a usable submit profile', () => {
  test('the three required values produce the shape eas submit reads', () => {
    // Arrange / Act
    const result = run(goodArgs());

    // Assert
    expect(result.status).toBe(0);
    const { submit } = readEasJson();
    expect(submit.production.ios).toEqual({
      appleTeamId: VALID_TEAM_ID,
      ascAppId: VALID_ASC_APP_ID,
    });
    expect(submit.production.android).toEqual({
      serviceAccountKeyPath: keyPath,
      track: 'internal',
      releaseStatus: 'draft',
    });
  });

  test('the first configured Play submit cannot reach real users', () => {
    // Arrange / Act - internal track, draft release, so a mistyped command is survivable.
    run(goodArgs());

    // Assert
    const { android } = readEasJson().submit.production;
    expect(android.track).toBe('internal');
    expect(android.releaseStatus).toBe('draft');
  });

  test('it leaves the build profiles and the cli block alone', () => {
    // Arrange
    const before = JSON.parse(untouched);

    // Act
    run(goodArgs());

    // Assert
    const after = readEasJson();
    expect(after.build).toEqual(before.build);
    expect(after.cli).toEqual(before.cli);
  });

  test('the optional Apple account and SKU are written only when given', () => {
    // Arrange / Act
    run([...goodArgs(), '--apple-id', 'owner@example.com', '--sku', 'towinly-ios-001']);

    // Assert
    const { ios } = readEasJson().submit.production;
    expect(ios.appleId).toBe('owner@example.com');
    expect(ios.sku).toBe('towinly-ios-001');
  });

  test('omitting them writes no empty keys for eas to trip over', () => {
    // Arrange / Act
    run(goodArgs());

    // Assert
    const { ios } = readEasJson().submit.production;
    expect('appleId' in ios).toBe(false);
    expect('sku' in ios).toBe(false);
  });

  test('the values can arrive as environment variables instead of flags', () => {
    // Arrange / Act - the owner may already have them exported from another step.
    const result = run(['--eas-json', easJsonPath], {
      ASC_APP_ID: VALID_ASC_APP_ID,
      APPLE_TEAM_ID: VALID_TEAM_ID,
      PLAY_SERVICE_ACCOUNT_KEY: keyPath,
    });

    // Assert
    expect(result.status).toBe(0);
    expect(readEasJson().submit.production.ios.ascAppId).toBe(VALID_ASC_APP_ID);
  });

  test('the result is still valid JSON with a trailing newline', () => {
    // Arrange / Act
    run(goodArgs());

    // Assert
    const written = fs.readFileSync(easJsonPath, 'utf8');
    expect(() => JSON.parse(written)).not.toThrow();
    expect(written.endsWith('}\n')).toBe(true);
  });
});

describe('fill-submit-config refuses malformed values', () => {
  /** Every refusal must exit 1, say something useful, and change nothing. */
  const expectRefusal = (result, phrase) => {
    expect(result.status).toBe(1);
    expect(result.stderr.toLowerCase()).toContain(phrase.toLowerCase());
    expect(fs.readFileSync(easJsonPath, 'utf8')).toBe(untouched);
  };

  test('an ascAppId that is not digits, such as a bundle identifier', () => {
    // Arrange / Act
    const result = run([
      '--asc-app-id',
      'com.towinly.app',
      '--apple-team-id',
      VALID_TEAM_ID,
      '--play-key',
      keyPath,
      '--eas-json',
      easJsonPath,
    ]);

    // Assert
    expectRefusal(result, 'digits only');
  });

  test('a Team ID in lower case, which is the copy-from-email mistake', () => {
    // Arrange / Act
    const result = run([
      '--asc-app-id',
      VALID_ASC_APP_ID,
      '--apple-team-id',
      'abcde12345',
      '--play-key',
      keyPath,
      '--eas-json',
      easJsonPath,
    ]);

    // Assert
    expectRefusal(result, 'upper case');
  });

  test('a Team ID that is not ten characters', () => {
    // Arrange / Act
    const result = run([
      '--asc-app-id',
      VALID_ASC_APP_ID,
      '--apple-team-id',
      'ABCDE1234',
      '--play-key',
      keyPath,
      '--eas-json',
      easJsonPath,
    ]);

    // Assert
    expectRefusal(result, '10 characters');
  });

  test('a service account key path that does not exist', () => {
    // Arrange / Act
    const result = run([
      '--asc-app-id',
      VALID_ASC_APP_ID,
      '--apple-team-id',
      VALID_TEAM_ID,
      '--play-key',
      path.join(sandbox, 'secrets', 'missing.json'),
      '--eas-json',
      easJsonPath,
    ]);

    // Assert
    expectRefusal(result, 'not found');
  });

  test('a key file that is not JSON', () => {
    // Arrange
    fs.writeFileSync(keyPath, 'this is not json');

    // Act
    const result = run(goodArgs());

    // Assert
    expectRefusal(result, 'not valid json');
  });

  test('an OAuth client file mistaken for a service account key', () => {
    // Arrange - downloaded from the same console, one menu away.
    fs.writeFileSync(keyPath, JSON.stringify({ installed: { client_id: '123.apps.googleusercontent.com' } }));

    // Act
    const result = run(goodArgs());

    // Assert
    expectRefusal(result, 'service_account');
  });

  test('a service account key with no client_email', () => {
    // Arrange
    fs.writeFileSync(keyPath, JSON.stringify({ type: 'service_account', project_id: 'towinly-play' }));

    // Act
    const result = run(goodArgs());

    // Assert
    expectRefusal(result, 'client_email');
  });

  test('a key stored inside the app directory, where a commit would leak it', () => {
    // Arrange
    const insideKey = path.join(path.dirname(easJsonPath), 'play-key.json');
    fs.writeFileSync(insideKey, JSON.stringify(VALID_KEY));

    // Act
    const result = run([
      '--asc-app-id',
      VALID_ASC_APP_ID,
      '--apple-team-id',
      VALID_TEAM_ID,
      '--play-key',
      insideKey,
      '--eas-json',
      easJsonPath,
    ]);

    // Assert
    expectRefusal(result, 'outside the repository');
  });

  test('an appleId that is not an email address', () => {
    // Arrange / Act
    const result = run([...goodArgs(), '--apple-id', VALID_TEAM_ID]);

    // Assert
    expectRefusal(result, 'not an email address');
  });

  test('an unknown option, rather than silently ignoring it', () => {
    // Arrange / Act
    const result = run([...goodArgs(), '--apple-team', 'ABCDE12345']);

    // Assert
    expectRefusal(result, 'unknown option');
  });

  test('a flag with no value after it', () => {
    // Arrange / Act
    const result = run(['--asc-app-id', '--apple-team-id', VALID_TEAM_ID, '--eas-json', easJsonPath]);

    // Assert
    expectRefusal(result, 'needs a value');
  });

  test('missing values name the console page they come from', () => {
    // Arrange / Act
    const result = run(['--eas-json', easJsonPath]);

    // Assert
    expectRefusal(result, 'app information');
  });
});

describe('a refused run never leaves eas.json half written', () => {
  test('two good values and a bad third write nothing at all', () => {
    // Arrange - the ordering that a naive implementation gets wrong: validate,
    // write, validate, write. Both good values must stay out of the file.
    const result = run([
      '--asc-app-id',
      VALID_ASC_APP_ID,
      '--apple-team-id',
      VALID_TEAM_ID,
      '--play-key',
      path.join(sandbox, 'secrets', 'missing.json'),
      '--eas-json',
      easJsonPath,
    ]);

    // Assert
    expect(result.status).toBe(1);
    const written = fs.readFileSync(easJsonPath, 'utf8');
    expect(written).toBe(untouched);
    expect(written).not.toContain(VALID_ASC_APP_ID);
    expect(written).not.toContain(VALID_TEAM_ID);
  });

  test('no temp file is left behind by a refusal or by a success', () => {
    // Arrange
    const appDir = path.dirname(easJsonPath);

    // Act
    run(['--asc-app-id', 'nope', '--apple-team-id', VALID_TEAM_ID, '--play-key', keyPath, '--eas-json', easJsonPath]);
    run(goodArgs());

    // Assert
    expect(fs.readdirSync(appDir).filter((name) => name.includes('.tmp-'))).toEqual([]);
  });

  test('a missing eas.json exits 2, which is not the same as a refusal', () => {
    // Arrange / Act - a caller that treats every non-zero code alike cannot tell
    // "you typed something wrong" from "this is not the app directory".
    const result = run([
      '--asc-app-id',
      VALID_ASC_APP_ID,
      '--apple-team-id',
      VALID_TEAM_ID,
      '--play-key',
      keyPath,
      '--eas-json',
      path.join(sandbox, 'nowhere', 'eas.json'),
    ]);

    // Assert
    expect(result.status).toBe(2);
    expect(result.stderr).toContain('No eas.json');
  });
});

describe('the repo carries no invented identifiers', () => {
  test('eas.json parses and submit.production holds no fake Apple values', () => {
    // Arrange / Act
    const real = JSON.parse(fs.readFileSync(REAL_EAS_JSON, 'utf8'));

    // Assert - an empty object that works beats a placeholder that fails at submit.
    const production = real.submit?.production ?? {};
    expect(JSON.stringify(production)).not.toMatch(/ABCDE12345|1234567891|you@example\.com/);
    if (production.ios) {
      expect(production.ios.ascAppId ?? '').toMatch(/^\d*$/);
    }
  });

  test('the script is wired into package.json so it can be found without reading this test', () => {
    // Arrange / Act
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));

    // Assert
    expect(fs.existsSync(SCRIPT)).toBe(true);
    expect(pkg.scripts['submit:config']).toContain('fill-submit-config.mjs');
  });
});

describe('the submit config document', () => {
  test('exists and names where each of the three values is found', () => {
    // Arrange / Act
    const doc = fs.readFileSync(DOC, 'utf8');

    // Assert
    expect(doc).toContain('App Information');
    expect(doc).toContain('Membership');
    expect(doc).toContain('service account');
  });

  test('states the ordering trap, because getting it wrong stalls day one', () => {
    // Arrange / Act
    const doc = fs.readFileSync(DOC, 'utf8').toLowerCase();

    // Assert
    expect(doc).toContain('com.towinly.app');
    expect(doc).toContain('app record');
  });

  test('writes the Expo login and init steps as owner actions', () => {
    // Arrange / Act
    const doc = fs.readFileSync(DOC, 'utf8');

    // Assert
    expect(doc).toContain('eas login');
    expect(doc).toContain('eas init');
  });

  test('carries no em dash, like every other word a stranger reads', () => {
    // Arrange / Act
    const doc = fs.readFileSync(DOC, 'utf8');

    // Assert
    expect(doc.includes(EM_DASH)).toBe(false);
  });
});
