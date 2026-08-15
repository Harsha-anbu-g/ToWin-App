// The iOS privacy manifest, pinned before there is a build to read.
//
// Apple aggregates the app target's PrivacyInfo.xcprivacy with the one every
// framework ships, and rejects a submission whose App Privacy answers
// contradict it. The launch checklist used to defer this check to "the first
// EAS build", which cannot happen until the owner has paid. It does not have to
// wait: the library manifests are already on disk in node_modules, so the union
// is knowable today.
//
// What this test guards is the gap between today and submission. A dependency
// bump can quietly add an API type, a reason code or a tracking domain, and
// nothing else in the repo would notice. Here it fails the suite.
//
// The prose version, with a plain-English sentence for every row and the diff
// against the store labels, is docs/store/privacy-manifest-aggregate.md. Change
// one, change the other.
const fs = require('fs');
const path = require('path');
const plistModule = require('@expo/plist');

const plist = plistModule.default || plistModule;
const NODE_MODULES = path.join(__dirname, '..', 'node_modules');

/**
 * Every PrivacyInfo.xcprivacy under node_modules, found by walking rather than
 * by a hardcoded list. A hardcoded list would keep passing after a dependency
 * change, which is the one thing this test exists to catch.
 */
function findManifests(dir, depth = 0, found = []) {
  if (depth > 6) return found;
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return found; // unreadable directory: skip it rather than fail the suite
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isFile() && entry.name === 'PrivacyInfo.xcprivacy') {
      found.push(path.relative(NODE_MODULES, full));
    } else if (entry.isDirectory() && entry.name !== '.bin') {
      findManifests(full, depth + 1, found);
    }
  }
  return found;
}

/** package name = the path segment(s) before the first slash, scope aware. */
function packageOf(relPath) {
  const parts = relPath.split(path.sep);
  return parts[0].startsWith('@') ? `${parts[0]}/${parts[1]}` : parts[0];
}

/**
 * The pinned aggregate, recorded 2026-08-15 against expo 54.0.36 and
 * react-native 0.81.5. Every reason code below is quoted verbatim from Apple's
 * own documentation in the companion markdown file.
 *
 * Adding a row here is a deliberate act: it means somebody read the new
 * declaration, wrote down why this app touches that API, and re-checked the
 * store labels. That is exactly the work the test refuses to let anyone skip.
 */
const PINNED = {
  manifestCount: 8,
  apiTypes: {
    NSPrivacyAccessedAPICategoryUserDefaults: ['CA92.1'],
    NSPrivacyAccessedAPICategoryFileTimestamp: ['0A2A.1', '3B52.1', 'C617.1'],
    NSPrivacyAccessedAPICategoryDiskSpace: ['85F4.1', 'E174.1'],
    NSPrivacyAccessedAPICategorySystemBootTime: ['35F9.1'],
  },
  packages: [
    'expo-constants',
    'expo-file-system',
    'expo-system-ui',
    'react-native',
  ],
};

/** Parse every manifest once and hand the same shape to each test. */
function readAggregate() {
  const files = findManifests(NODE_MODULES).sort();
  const apiTypes = {}; // category -> Set(reason codes)
  const byCategory = {}; // category -> Set(package names)
  const trackingDomains = new Set();
  const collectedDataTypes = new Set();
  const trackingTrue = [];

  for (const rel of files) {
    const pkg = packageOf(rel);
    const parsed = plist.parse(fs.readFileSync(path.join(NODE_MODULES, rel), 'utf8'));

    for (const entry of parsed.NSPrivacyAccessedAPITypes ?? []) {
      const category = entry.NSPrivacyAccessedAPIType;
      apiTypes[category] = apiTypes[category] ?? new Set();
      byCategory[category] = byCategory[category] ?? new Set();
      byCategory[category].add(pkg);
      for (const reason of entry.NSPrivacyAccessedAPITypeReasons ?? []) {
        apiTypes[category].add(reason);
      }
    }
    for (const domain of parsed.NSPrivacyTrackingDomains ?? []) trackingDomains.add(domain);
    for (const type of parsed.NSPrivacyCollectedDataTypes ?? []) {
      collectedDataTypes.add(type.NSPrivacyCollectedDataType ?? JSON.stringify(type));
    }
    if (parsed.NSPrivacyTracking === true) trackingTrue.push(rel);
  }

  return { files, apiTypes, byCategory, trackingDomains, collectedDataTypes, trackingTrue };
}

describe('iOS privacy manifest aggregate', () => {
  const aggregate = readAggregate();

  test('the manifests are found by walking node_modules, not by a hardcoded list', () => {
    expect(aggregate.files.length).toBeGreaterThan(0);
    expect(aggregate.files.length).toBe(PINNED.manifestCount);
    expect([...new Set(aggregate.files.map(packageOf))].sort()).toEqual(PINNED.packages);
  });

  test('no accessed API category appears that is not pinned', () => {
    const unpinned = Object.keys(aggregate.apiTypes).filter((c) => !(c in PINNED.apiTypes));
    expect(unpinned).toEqual([]);
  });

  test('no reason code appears that is not pinned', () => {
    const surprises = [];
    for (const [category, reasons] of Object.entries(aggregate.apiTypes)) {
      const pinned = PINNED.apiTypes[category] ?? [];
      for (const reason of reasons) {
        if (!pinned.includes(reason)) surprises.push(`${category} / ${reason}`);
      }
    }
    expect(surprises).toEqual([]);
  });

  test('no library declares a tracking domain', () => {
    // A tracking domain forces the App Tracking Transparency prompt and flips
    // the Apple "Used to Track You" answers. Towinly declares no tracking.
    expect([...aggregate.trackingDomains]).toEqual([]);
  });

  test('no library sets NSPrivacyTracking to true', () => {
    expect(aggregate.trackingTrue).toEqual([]);
  });

  test('no library declares that it collects data', () => {
    // Empty in all eight today. A library that starts collecting would change
    // the App Privacy answers in docs/store/privacy-labels.md section 1.
    expect([...aggregate.collectedDataTypes]).toEqual([]);
  });

  test('every pinned category is still declared by at least one package', () => {
    // The mirror of the checks above: a category that silently disappears means
    // the aggregate document is describing a build that no longer exists.
    for (const category of Object.keys(PINNED.apiTypes)) {
      expect(Object.keys(aggregate.apiTypes)).toContain(category);
      expect([...aggregate.byCategory[category]].length).toBeGreaterThan(0);
    }
  });

  test('app.json declares no ios.privacyManifests, which is the recorded decision', () => {
    // Not an accident. @expo/config-plugins/build/ios/PrivacyInfo.js returns the
    // config untouched when this key is absent, so adding it changes the built
    // app. Every required-reason API this app reaches is called from a pod, and
    // each of those pods declares it, so an app-level block would be a claim
    // about the app target that is not true. The reasoning and the condition
    // that would flip it are in docs/store/privacy-manifest-aggregate.md.
    const appJson = JSON.parse(
      fs.readFileSync(path.join(__dirname, '..', 'app.json'), 'utf8')
    );
    expect(appJson.expo.ios.privacyManifests).toBeUndefined();
  });
});
