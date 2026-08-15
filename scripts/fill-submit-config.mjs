#!/usr/bin/env node
// Fill submit.production in eas.json from the three values that only exist
// after the store accounts are open.
//
// Why a script and not a hand edit: the three values arrive on the same
// afternoon, in three different consoles, and every one of them fails late.
// A Team ID pasted in lower case, an Apple ID that is really the bundle
// identifier, a service account key that turns out to be an OAuth client file:
// each of those is accepted by a text editor and rejected by `eas submit`
// twenty minutes later, after a build has already been made. This validates
// all of it before a single byte is written.
//
// Usage:
//   node scripts/fill-submit-config.mjs \
//     --asc-app-id 1234567891 \
//     --apple-team-id ABCDE12345 \
//     --play-key ~/.secrets/towinly-play-service-account.json \
//     [--apple-id you@example.com] [--sku towinly-ios-001] \
//     [--eas-json ./eas.json]
//
// Environment variables are read when a flag is absent:
//   ASC_APP_ID, APPLE_TEAM_ID, PLAY_SERVICE_ACCOUNT_KEY, APPLE_ID, IOS_SKU
//
// Exit codes:
//   0  eas.json now carries submit.production
//   1  refused: a value was malformed, and nothing was written
//   2  could not run: eas.json is missing or is not valid JSON
//
// Never invents a value. There is no default ascAppId and no default Team ID,
// because a fake identifier that reaches a console is worse than an empty
// field. See docs/store/submit-config.md.

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const OK = 0;
const REFUSED = 1;
const CANNOT_RUN = 2;

/** Play track and release status the first configured submit should use. */
const DEFAULT_TRACK = 'internal';
const DEFAULT_RELEASE_STATUS = 'draft';

/** Apple's numeric App Store Connect ids run to about ten digits. */
const TYPICAL_ASC_APP_ID_DIGITS = 9;

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_EAS_JSON = path.join(SCRIPT_DIR, '..', 'eas.json');

// fs.writeSync rather than console.error: stderr is asynchronous when it is a
// pipe, and process.exit can cut off a message that has not flushed. The whole
// point of these two functions is that the message arrives.
const stopWith = (code, message) => {
  fs.writeSync(process.stderr.fd, `${message}\n`);
  process.exit(code);
};

const refuse = (message) => stopWith(REFUSED, `Refused. ${message}\neas.json was not touched.`);

const cannotRun = (message) => stopWith(CANNOT_RUN, `Cannot run. ${message}`);

/** Reads --flag value pairs. Unknown flags are refused rather than ignored. */
function parseArgs(argv) {
  const known = new Set([
    '--asc-app-id',
    '--apple-team-id',
    '--play-key',
    '--apple-id',
    '--sku',
    '--eas-json',
  ]);
  const parsed = {};
  for (let i = 0; i < argv.length; i += 1) {
    const flag = argv[i];
    if (!flag.startsWith('--')) continue;
    if (!known.has(flag)) {
      refuse(`Unknown option ${flag}. Known options: ${[...known].join(', ')}.`);
    }
    const value = argv[i + 1];
    if (value === undefined || value.startsWith('--')) {
      refuse(`${flag} needs a value.`);
    }
    parsed[flag.slice(2)] = value;
    i += 1;
  }
  return parsed;
}

/** Expands a leading ~ so a pasted path from a terminal history still works. */
const expandHome = (value) =>
  value.startsWith('~/') ? path.join(os.homedir(), value.slice(2)) : value;

function validateAscAppId(raw) {
  if (!raw) {
    refuse(
      'No ascAppId. It is the numeric Apple ID on App Store Connect > your app > ' +
        'App Information, and it does not exist until the app record does. Pass ' +
        '--asc-app-id or set ASC_APP_ID.'
    );
  }
  const value = raw.trim();
  if (!/^\d+$/.test(value)) {
    refuse(
      `ascAppId "${value}" is not digits only. It is the numeric Apple ID from the ` +
        'App Information page, not the bundle identifier and not the SKU. ' +
        'com.towinly.app is the bundle identifier and belongs in app.json.'
    );
  }
  if (value.length < TYPICAL_ASC_APP_ID_DIGITS) {
    console.warn(
      `Warning: ascAppId "${value}" has ${value.length} digits. Real App Store ` +
        'Connect ids run to about ten. Check you copied the whole number.'
    );
  }
  return value;
}

function validateAppleTeamId(raw) {
  if (!raw) {
    refuse(
      'No appleTeamId. It is the 10 character Team ID at developer.apple.com > ' +
        'Account > Membership details. Pass --apple-team-id or set APPLE_TEAM_ID.'
    );
  }
  const value = raw.trim();
  if (!/^[A-Z0-9]{10}$/.test(value)) {
    const hint = /^[a-zA-Z0-9]{10}$/.test(value)
      ? 'Team IDs are upper case. Copy it from the Membership details page rather than from an email.'
      : 'It is exactly 10 characters, upper case letters and digits only.';
    refuse(`appleTeamId "${value}" is malformed. ${hint}`);
  }
  return value;
}

function validateAppleId(raw) {
  if (!raw) return null;
  const value = raw.trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    refuse(
      `appleId "${value}" is not an email address. It is the Apple Account you ` +
        'enrolled with, not the Team ID and not the app name.'
    );
  }
  return value;
}

function validateSku(raw) {
  if (!raw) return null;
  const value = raw.trim();
  if (!value || /\s/.test(value)) {
    refuse(`sku "${raw}" is empty or contains whitespace. Use the SKU you typed when you created the app record.`);
  }
  return value;
}

/**
 * Validates the Play service account key and returns its absolute path.
 *
 * Refuses a key that lives inside the app directory. The file is a credential
 * with release permission on the Play listing, and a credential inside a git
 * tree is one `git add .` away from being public forever.
 */
function validatePlayKey(raw, appDir) {
  if (!raw) {
    refuse(
      'No Play service account key. It is the JSON downloaded from Google Cloud ' +
        'Console > IAM and Admin > Service accounts > Keys. Pass --play-key or set ' +
        'PLAY_SERVICE_ACCOUNT_KEY.'
    );
  }
  const resolved = path.resolve(expandHome(raw.trim()));
  if (!fs.existsSync(resolved)) {
    refuse(`Play service account key not found at ${resolved}.`);
  }
  const relativeToApp = path.relative(appDir, resolved);
  if (!relativeToApp.startsWith('..') && !path.isAbsolute(relativeToApp)) {
    refuse(
      `The Play service account key is inside the app directory at ${resolved}. ` +
        'Keep it outside the repository, for example in ~/.secrets, and chmod 600 it. ' +
        'It can publish releases, so a committed copy is a real leak.'
    );
  }

  let parsed;
  try {
    parsed = JSON.parse(fs.readFileSync(resolved, 'utf8'));
  } catch (error) {
    refuse(`Play service account key at ${resolved} is not valid JSON: ${error.message}`);
  }
  if (parsed.type !== 'service_account') {
    refuse(
      `Play service account key at ${resolved} has type "${parsed.type ?? 'missing'}". ` +
        'A service account key says "service_account". An OAuth client file downloaded ' +
        'from the same console does not, and eas submit will reject it.'
    );
  }
  if (typeof parsed.client_email !== 'string' || !parsed.client_email) {
    refuse(`Play service account key at ${resolved} has no client_email. It is not a usable key.`);
  }
  return { keyPath: resolved, clientEmail: parsed.client_email };
}

function readEasJson(easJsonPath) {
  if (!fs.existsSync(easJsonPath)) {
    cannotRun(`No eas.json at ${easJsonPath}.`);
  }
  try {
    return JSON.parse(fs.readFileSync(easJsonPath, 'utf8'));
  } catch (error) {
    cannotRun(`eas.json at ${easJsonPath} is not valid JSON: ${error.message}`);
  }
}

/**
 * Writes through a temp file in the same directory and renames over the
 * original. A crash or a full disk leaves the old eas.json whole, never a
 * truncated one, because rename within a filesystem is atomic.
 */
function writeAtomically(easJsonPath, contents) {
  const temp = `${easJsonPath}.tmp-${process.pid}`;
  try {
    fs.writeFileSync(temp, contents, 'utf8');
    JSON.parse(fs.readFileSync(temp, 'utf8'));
    fs.renameSync(temp, easJsonPath);
  } catch (error) {
    if (fs.existsSync(temp)) fs.unlinkSync(temp);
    cannotRun(`Could not write ${easJsonPath}: ${error.message}`);
  }
}

const args = parseArgs(process.argv.slice(2));
const easJsonPath = path.resolve(args['eas-json'] ?? process.env.EAS_JSON ?? DEFAULT_EAS_JSON);
const appDir = path.dirname(easJsonPath);

// Every value is validated before anything is written, so a bad third argument
// cannot leave a file carrying the first two.
const ascAppId = validateAscAppId(args['asc-app-id'] ?? process.env.ASC_APP_ID);
const appleTeamId = validateAppleTeamId(args['apple-team-id'] ?? process.env.APPLE_TEAM_ID);
const appleId = validateAppleId(args['apple-id'] ?? process.env.APPLE_ID);
const sku = validateSku(args.sku ?? process.env.IOS_SKU);
const { keyPath, clientEmail } = validatePlayKey(
  args['play-key'] ?? process.env.PLAY_SERVICE_ACCOUNT_KEY,
  appDir
);
const easJson = readEasJson(easJsonPath);

const production = {
  ios: {
    ...(appleId ? { appleId } : {}),
    appleTeamId,
    ascAppId,
    ...(sku ? { sku } : {}),
  },
  android: {
    serviceAccountKeyPath: keyPath,
    track: DEFAULT_TRACK,
    releaseStatus: DEFAULT_RELEASE_STATUS,
  },
};

const next = {
  ...easJson,
  submit: { ...(easJson.submit ?? {}), production },
};

writeAtomically(easJsonPath, `${JSON.stringify(next, null, 2)}\n`);

console.log(`Wrote submit.production to ${easJsonPath}`);
console.log(`  ios.ascAppId              : ${ascAppId}`);
console.log(`  ios.appleTeamId           : ${appleTeamId}`);
if (appleId) console.log(`  ios.appleId               : ${appleId}`);
if (sku) console.log(`  ios.sku                   : ${sku}`);
console.log(`  android.serviceAccountKeyPath : ${keyPath}`);
console.log(`  android.track             : ${DEFAULT_TRACK}, releaseStatus ${DEFAULT_RELEASE_STATUS}`);
console.log(`  the key belongs to        : ${clientEmail}`);
console.log('');
console.log('Read the diff before committing. The key path is written into a tracked file,');
console.log('so if you would rather EAS held the key, run `eas credentials -p android`,');
console.log('upload it there, and remove serviceAccountKeyPath by hand.');
process.exitCode = OK;
