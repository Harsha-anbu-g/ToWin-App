# iOS privacy manifest: the aggregate, read before there is a build

The launch checklist used to defer this to "the first EAS build". That build
cannot happen until the owner has paid Apple, and this check does not have to
wait for the money. Every library manifest is already on disk under
`App/node_modules`, so the union is knowable today.

- **Computed:** 2026-08-15, against `expo` 54.0.36 and `react-native` 0.81.5.
- **Method:** walk `App/node_modules` for every file named
  `PrivacyInfo.xcprivacy`, parse each one with `@expo/plist`, union the four
  fields Apple reads.
- **Manifests found by glob: 8.** The list was not hardcoded. A dependency
  change changes it, which is why `App/__tests__/privacy-manifest.test.js`
  re-globs on every run.
- Reason-code descriptions below are quoted verbatim from Apple's own
  documentation, fetched from
  `developer.apple.com/documentation/bundleresources/app-privacy-configuration/nsprivacyaccessedapitypes/nsprivacyaccessedapitypereasons`.
  Nothing here is paraphrased from memory.

Reproduce it:

```bash
cd App
find node_modules -name PrivacyInfo.xcprivacy | sort
for f in $(find node_modules -name PrivacyInfo.xcprivacy | sort); do
  echo "### $f"; plutil -convert json -o - "$f"; echo
done
npx jest privacy-manifest
```

---

## 1. The eleven manifests

Eight at the 2026-08-15 pass. Three more on 2026-08-16, when the push
notification feature added expo-notifications and expo-device (which pulls in
expo-application). All three declare API categories and reason codes that were
ALREADY in the union below, zero tracking and zero collected data, so section 2
gained no new row: only the "Declared by" columns widened.

| # | File | Package |
|---|---|---|
| 1 | `expo-application/ios/PrivacyInfo.xcprivacy` | expo-application |
| 2 | `expo-constants/ios/PrivacyInfo.xcprivacy` | expo-constants |
| 3 | `expo-device/ios/PrivacyInfo.xcprivacy` | expo-device |
| 4 | `expo-file-system/ios/PrivacyInfo.xcprivacy` | expo-file-system |
| 5 | `expo-notifications/ios/PrivacyInfo.xcprivacy` | expo-notifications |
| 6 | `expo-system-ui/ios/PrivacyInfo.xcprivacy` | expo-system-ui |
| 7 | `react-native/React/Resources/PrivacyInfo.xcprivacy` | react-native |
| 8 | `react-native/ReactCommon/cxxreact/PrivacyInfo.xcprivacy` | react-native |
| 9 | `react-native/third-party-podspecs/RCT-Folly/PrivacyInfo.xcprivacy` | react-native |
| 10 | `react-native/third-party-podspecs/boost/PrivacyInfo.xcprivacy` | react-native |
| 11 | `react-native/third-party-podspecs/glog/PrivacyInfo.xcprivacy` | react-native |

Push-feature note for section 2, kept here so the counts read honestly:
expo-notifications and expo-application declare `UserDefaults CA92.1` (the
notification settings each library remembers), expo-application declares
`FileTimestamp C617.1`, and expo-device declares `SystemBootTime 35F9.1`. Each
sentence in section 2 stays true as written.

## 2. The union: four API categories, seven reason codes

Apple's reason codes are opaque strings. The last column is the sentence to say
to a reviewer who asks about a row, written from what this app actually does.

### NSPrivacyAccessedAPICategoryUserDefaults

| Reason | Declared by | Apple's wording | Why this app touches it |
|---|---|---|---|
| `CA92.1` | expo-constants, expo-system-ui, react-native | "Declare this reason to access user defaults to read and write information that is only accessible to the app itself. This reason does not permit reading information that was written by other apps or the system, or writing information that can be accessed by other apps." | Towinly remembers small settings on the phone: the chosen text size, night mode, which first-time explainer cards have been seen, and which activity rows have been read. Every one of them belongs to this app and no other app can read them. `src/theme/ThemeContext.jsx`, `src/components/ui/FirstTimeCard.jsx` and `src/lib/seenIds.js` are the callers. The session token is not here: that goes to the Keychain through `expo-secure-store`. |

### NSPrivacyAccessedAPICategoryFileTimestamp

| Reason | Declared by | Apple's wording | Why this app touches it |
|---|---|---|---|
| `C617.1` | react-native (core, cxxreact, RCT-Folly, boost, glog) | "Declare this reason to access the timestamps, size, or other metadata of files inside the app container, app group container, or the app's CloudKit container." | The React Native runtime reads the size and date of files it ships with, chiefly the JavaScript bundle it loads at launch. These files sit inside the app's own container and none of them belongs to the person using the phone. |
| `3B52.1` | expo-file-system | "Declare this reason to access the timestamps, size, or other metadata of files or directories that the user specifically granted access to, such as using a document picker view controller." | The one moment a person hands Towinly a file is choosing a photo: a profile picture, or the optional photo of an ID. The picker returns a file the person picked on purpose, and the app reads its size to refuse an oversized upload before wasting the person's data. `src/lib/uploadFile.js`. |
| `0A2A.1` | expo-file-system | "Declare this reason if your third-party SDK is providing a wrapper function around file timestamp API(s) for the app to use, and you only access the file timestamp APIs when the app calls your wrapper function. This reason may only be declared by third-party SDKs." | This is expo-file-system describing itself, not describing Towinly. The library is the wrapper; the app calls it. Nothing is read unless the app asks. |

### NSPrivacyAccessedAPICategoryDiskSpace

| Reason | Declared by | Apple's wording | Why this app touches it |
|---|---|---|---|
| `E174.1` | expo-file-system | "Declare this reason to check whether there is sufficient disk space to write files, or to check whether the disk space is low so that the app can delete files when the disk space is low. The app must behave differently based on disk space in a way that is observable to users. Information accessed for this reason, or any derived information, may not be sent off-device." | expo-file-system checks there is room before it writes a temporary file. Towinly writes a temporary file only while a chosen photo is on its way to the server. The number never leaves the phone. |
| `85F4.1` | expo-file-system | "Declare this reason to display disk space information to the person using the device." | Declared by the library. Towinly shows nobody their free disk space. No screen in `app/` displays a storage figure. |

### NSPrivacyAccessedAPICategorySystemBootTime

| Reason | Declared by | Apple's wording | Why this app touches it |
|---|---|---|---|
| `35F9.1` | react-native (boost) | "Declare this reason to access the system boot time in order to measure the amount of time that has elapsed between events that occurred within the app or to perform calculations to enable timers. Information accessed for this reason, or any derived information, may not be sent off-device." | Boost's timer code measures elapsed time inside the app so animations and timeouts run at the right speed. It is a stopwatch, not a clock that identifies a device, and the value stays on the phone. |

## 3. The three fields that decide the tracking answers

| Field | Value across all eight | What it means for the store forms |
|---|---|---|
| `NSPrivacyTracking` | `false` in all 8 | No library asks to track. Towinly shows no App Tracking Transparency prompt and answers "No" to "Used to Track You" on every Apple data type. |
| `NSPrivacyTrackingDomains` | empty in all 8 | Nothing is contacted for tracking, so iOS blocks nothing and no domain has to be listed. |
| `NSPrivacyCollectedDataTypes` | empty in all 8 | No library declares that it collects anything. Everything Towinly collects, it collects through its own network calls to its own backend, which is what `privacy-labels.md` section 1 describes. |

## 4. Diff against `privacy-labels.md` section 1, row by row

The two documents answer different questions, and reading them as if they
answered the same one is how a contradiction gets invented. A library manifest
says what **that library** does. Section 1 says what **Towinly** does through
its own API calls. A row only conflicts when the manifest declares something
section 1 denies.

| Section 1 row | Section 1 answer | Manifest evidence | Verdict |
|---|---|---|---|
| Identifiers / Device ID | No, "Nothing reads or sends one." | No manifest declares any Device ID or advertising API category, and `NSPrivacyTracking` is false in all eight | **Agrees** |
| Diagnostics / Crash, Performance, Other | No, "No crash or performance SDK." | No manifest declares a crash, diagnostics or performance category | **Agrees** |
| Usage Data / Advertising | No | No tracking domains, no tracking flag, no advertising category anywhere | **Agrees** |
| Usage Data / Product Interaction | PostHog-blocked, see `privacy-labels.md` section 5 item 1 | The manifests are silent, and correctly so: the PostHog event is sent by the **Spring Boot backend**, not by any iOS library. A privacy manifest cannot see server-side collection | **No conflict, and the manifest cannot settle it.** The answer comes from the backend, not from here |
| User Content / Photos or Videos | Yes, optional | expo-file-system declares `3B52.1`, the document-picker timestamp reason, which is exactly the photo-picker path | **Agrees, and corroborates** |
| Every other collected row (name, email, messages, bio, DOB) | Yes | `NSPrivacyCollectedDataTypes` is empty in all eight | **No conflict.** The empty array means no library collects. It says nothing about the app's own API calls, which is where all of it happens |

**No row contradicts. Nothing needs to change in either document because of the
manifest.** The one row that is still open, Usage Data / Product Interaction, is
open for a reason the manifest cannot reach.

## 5. Decision: `ios.privacyManifests` is NOT added to `app.json`

Nothing was added, on purpose. A speculative block is worse than none.

**Why not:**

1. Every required-reason API this app reaches is called from a pod, and each of
   those pods already declares it. Apple attaches the declaration to the binary
   that makes the call. An app-level block listing four categories the app
   target does not itself call would be a claim about the app target that is not
   true.
2. Adding the key is a real change to the built app, not a harmless annotation.
   `node_modules/@expo/config-plugins/build/ios/PrivacyInfo.js` line 41 reads
   `const privacyManifests = config.ios?.privacyManifests; if
   (!privacyManifests) { return config; }`. With the key absent the plugin is a
   no-op. With the key present it writes and registers an app-target
   `PrivacyInfo.xcprivacy`.
3. The tracking answers the block would carry are already `false` and empty
   across all eight manifests, and the app ships no ad, attribution, analytics
   or crash SDK on the device. Checked by name against every runtime dependency
   in `package.json`: zero matches for ad, analytics, PostHog, Sentry, Firebase,
   Amplitude, Mixpanel, AppsFlyer, Adjust, Branch, Segment, attribution or
   tracking. The only hit was `@expo-google-fonts/newsreader`, which matched on
   the letters "ad" inside "Newsreader".

**What would flip this decision, in order of likelihood:**

- Apple emails **ITMS-91053, "Missing API declaration"** after the first upload
  and names an API the pods do not cover. Add the block then, listing exactly
  what the email names.
- A dependency is added that calls a required-reason API and ships no manifest
  of its own. `__tests__/privacy-manifest.test.js` will not catch that one,
  because a library with no manifest declares nothing to compare.
- Towinly adds an analytics or attribution SDK on the device. That changes the
  tracking answers as well as the manifest.

`App/__tests__/privacy-manifest.test.js` pins this decision as a test, so
removing it is a visible act rather than a quiet one.

## 6. One honest gap this static pass cannot close

Not a blocker today. It is named so nobody reports it as checked.

**Seventeen of the twenty native dependencies ship no manifest at all.**
`@react-native-community/netinfo`, `expo`, `expo-crypto`, `expo-font`,
`expo-haptics`, `expo-image`, `expo-image-picker`, `expo-linking`,
`expo-router`, `expo-secure-store`, `expo-speech`, `expo-updates`,
`react-native-reanimated`, `react-native-safe-area-context`,
`react-native-screens`, `react-native-svg` and `react-native-worklets` carry no
`PrivacyInfo.xcprivacy`. None of them appears on Apple's list, so none is
required to ship one, and a library with no manifest is Apple's signal that it
uses no required-reason API. The absence is not a blocker. It is also not
proof. If ITMS-91053 arrives naming one of these, this list is where to start.

One near miss worth writing down so nobody re-checks it: Apple's list includes
`Reachability`, and `@react-native-community/netinfo` looks like a match. It is
not. netinfo ships its own `RNCConnectionStateWatcher.m` over Apple's
`SystemConfiguration` framework. The listed `Reachability` is the separate
tonymillion CocoaPod, which this app does not use.

## 7. Hermes: investigated, closed, do not re-open

An earlier version of this document carried Hermes as an open gap, on the
grounds that `hermes` is entry 45 on Apple's third-party SDK requirements list
and the engine binary is a tarball fetched at `pod install` rather than a file in
`node_modules`. That was the same class of mistake as the `Reachability` near
miss above, and it is now resolved.

**Apple's `hermes` entry is Imgur's SDK, not Meta's JavaScript engine.** The
published list carries a bare lowercase `hermes` with no disambiguation. An Apple
DTS engineer settled it on Apple's own developer forums, thread 759394: the
listed `hermes` refers to Imgur's SDK. Meta's engine ships to CocoaPods as
`hermes-engine`, a different name, and Apple gave the React Native community the
same answer directly.

What follows for this repo:

- Nothing needs checking after prebuild.
  `node_modules/react-native/sdks/hermes-engine/hermes-engine.podspec`
  (react-native 0.81.5) references no `PrivacyInfo.xcprivacy`, so
  `find ios/Pods -path "*hermes*" -name "PrivacyInfo.xcprivacy"` returning
  nothing is the correct result, not a defect.
- No report to the React Native project is warranted. An earlier draft suggested
  filing one. Do not.
- The app still runs on Hermes, and
  `ios-build-readiness.md` still records that correctly. Using the engine and
  owing Apple a signed manifest for it are separate questions, and only the first
  is true.

The general rule this is the second instance of: **a name on Apple's list
matching a name in this app is not by itself a match.** Confirm the publisher
before treating an entry as an obligation.

If ITMS-91061 or ITMS-91053 ever arrives after an upload and names hermes,
revisit this section then. Until that happens it is closed.
