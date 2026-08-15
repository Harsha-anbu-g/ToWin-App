# iOS Build Readiness

Technical verification of the Towinly iOS build, run on 2026-08-11 against branch
`ralph/towinly-uiux-overhaul` (`af22521`). Every claim below came from a command that
was actually run. Where a command could not run without the Apple Developer account,
that is stated plainly instead of guessed.

**Verdict: no blockers found on the app side.** The native iOS project generates
cleanly, the JS bundles for iOS, the icon is store-legal, and the required privacy
string is present and correctly worded. Three items need the Apple account (next
week), and two need a free Expo account before the first build command will run.

Environment: Node v24.13.0, Expo CLI 54.0.26, eas-cli 21.7.0, Expo SDK 54.0.0.

---

## 1. expo-doctor

```
npx expo-doctor
Running 18 checks on your project...
18/18 checks passed. No issues detected!
```

Zero issues. Re-run after the `eas.json` change described in section 8, still 18/18.
Nothing here blocks an App Store build.

---

## 2. Resolved iOS config

Read from `npx expo config --type public` and `npx expo config --type introspect`,
then confirmed against a real `expo prebuild` (section 3). **Where the two disagreed,
the prebuild output is the truth** and introspect was wrong. Details in section 3.

| Item | Value | Status |
| --- | --- | --- |
| `ios.bundleIdentifier` | `com.towinly.app` | Correct, matches the frozen identifier |
| `slug` / `scheme` | `towinly` / `towinly` | Correct, matches frozen values |
| `version` (CFBundleShortVersionString) | `1.0.0` | Present |
| `ios.buildNumber` | not set in app.json | Correct for remote versioning, see below |
| `ITSAppUsesNonExemptEncryption` | `false` | Present, skips the export compliance prompt on every upload |
| `ios.supportsTablet` | `false` | Deliberate, see section 6 |
| `ios.entitlements` | `{}` (empty) | Correct, no push, no associated domains, no Sign in with Apple |
| `CFBundleURLSchemes` | `towinly`, `com.towinly.app` | Correct |
| `CFBundleDisplayName` | `Towinly` | Correct |
| `UIUserInterfaceStyle` | `Light` | Matches the light-only design decision |
| Orientation | portrait and portraitUpsideDown | Matches `orientation: portrait` |

### Build number strategy

`eas.json` sets `cli.appVersionSource: "remote"` and `build.production.autoIncrement: true`.
This is the correct combination:

- The user-facing version string `1.0.0` keeps coming from `app.json`.
- The build number is stored on Expo's servers, not in the repo, and EAS increments it
  on every production build. `autoIncrement: true` bumps the build number only, never
  the version string.
- Because `ios.buildNumber` is absent from `app.json`, the first production build
  starts at `1`. That is expected, not a gap. Do not add `ios.buildNumber` by hand:
  with remote versioning it would be ignored and would mislead the next reader.

To raise the public version for a later release, edit `version` in `app.json`. Nothing
else needs touching.

### Privacy strings (NS*UsageDescription)

Exactly one is present, and it is the only one this app needs:

```
NSPhotoLibraryUsageDescription =
  "Towinly uses your photo library so you can choose a profile picture."
```

It names the app, names what is accessed, and gives the reason in user terms. It passes
Apple's requirement that the string say *why*.

The absence of every other usage string was verified against the source, not assumed.
Grepping `src/` and `app/` for permission-requiring APIs found:

- `app/profile-edit.jsx` calls `ImagePicker.requestMediaLibraryPermissionsAsync()` and
  `ImagePicker.launchImageLibraryAsync()`. Photo library read only. Covered.
- No `launchCameraAsync`, no camera use anywhere. The `expo-image-picker` plugin sets
  `cameraPermission: false` and `microphonePermission: false`, which correctly strips
  `NSCameraUsageDescription` and `NSMicrophoneUsageDescription` from the Info.plist.
- No biometric use. `src/lib/storage.js` uses
  `SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY` with no `requireAuthentication`, so the
  plugin's `faceIDPermission: false` is right and `NSFaceIDUsageDescription` is
  correctly absent.
- No location, contacts, calendar, microphone, notifications, media library writes, or
  tracking. No `expo-location`, `expo-contacts`, `expo-camera`, `expo-notifications`,
  `AppTrackingTransparency`, or IDFA anywhere in the app source.
- Nothing saves to the photo library, so `NSPhotoLibraryAddUsageDescription` is
  correctly absent.

Verdict: the usage-string set is complete and minimal. Declaring a permission this app
does not use would be a worse outcome than missing one, because App Review asks about
unused permission strings.

---

## 3. Prebuild (throwaway directory)

`expo prebuild` was run in a copy under `/private/tmp`, never in the repo. The repo has
no `ios/` directory and `git status` stayed clean throughout. The copy has since been
deleted.

```
npx expo prebuild --platform ios --no-install
- Creating native directory (./ios)
✔ Created native directory
✔ Updated package.json
✔ Finished prebuild
```

**The native iOS project generates without error.** Generated `ios/Towinly.xcodeproj`,
`AppDelegate.swift`, `Info.plist`, `SplashScreen.storyboard`, `Images.xcassets`,
`Towinly.entitlements`, `Podfile`.

### Introspect was wrong about two things

This matters, because reading only the introspect output would have produced two
fabricated blockers in this report:

| Key | `--type introspect` said | Real prebuild output | Which is right |
| --- | --- | --- | --- |
| `NSAppTransportSecurity` | `NSAllowsArbitraryLoads: true` | `NSAllowsArbitraryLoads: false`, `NSAllowsLocalNetworking: true` | Prebuild. ATS is properly locked down. No App Review justification needed. |
| `UIRequiredDeviceCapabilities` | `["armv7"]` | `["arm64"]` | Prebuild. Modern and correct. |

Treat `expo config --type introspect` as a plugin-resolution preview, not as the build
artifact. Any future readiness check should confirm Info.plist claims against a real
prebuild.

### Xcode project settings (only visible in the prebuild)

```
TARGETED_DEVICE_FAMILY      = "1"      (iPhone only)
IPHONEOS_DEPLOYMENT_TARGET  = 15.1
PRODUCT_BUNDLE_IDENTIFIER   = com.towinly.app
CURRENT_PROJECT_VERSION     = 1
expo.jsEngine               = hermes
RCTNewArchEnabled           = true     (New Architecture on)
```

`TARGETED_DEVICE_FAMILY = "1"` is where the iPhone-only decision is actually enforced.
Deployment target 15.1 is the SDK 54 standard and well within what Apple accepts.

### Generated Expo.plist

```
EXUpdatesEnabled        = false
EXUpdatesCheckOnLaunch  = ALWAYS
EXUpdatesLaunchWaitMs   = 0
EXUpdatesRuntimeVersion = file:fingerprint
```

There is no `EXUpdatesURL`, and updates are disabled. This is the concrete proof that
EAS Update is not configured yet. See section 8, item B. It does not stop the app from
building or working; it only means over-the-air updates are off.

---

## 4. Icon and image assets

Measured with `sips` and Python PIL. Alpha was checked as a full channel min/max scan,
not just a header flag, and all four corners were sampled to rule out baked-in rounded
corners.

| Asset | Size | Alpha channel | Corner pixels | Verdict |
| --- | --- | --- | --- | --- |
| `assets/icon.png` | 1024x1024 | **none** (min/max 255/255) | all four `(246,244,239,255)` opaque parchment | **Store-legal.** Square, opaque, no rounding baked in |
| `assets/android-icon-foreground.png` | 1024x1024 | yes (0-255) | transparent | Correct, adaptive foreground must be transparent |
| `assets/android-icon-background.png` | 1024x1024 | none | opaque parchment | Correct |
| `assets/android-icon-monochrome.png` | 1024x1024 | yes, greyscale (LA) | transparent | Correct for Android 13 themed icons |
| `assets/splash-icon.png` | 1024x1024 | yes | transparent | Correct, splash sits on `#f6f4ef` |
| `assets/favicon.png` | 48x48 | yes | transparent | Web only, not used by iOS |

The icon that actually ships was also checked, not just the source. Prebuild generated:

```
ios/Towinly/Images.xcassets/AppIcon.appiconset/App-Icon-1024x1024@1x.png
  1024x1024, hasAlpha: no
```

**The App Store icon is 1024x1024 with no alpha channel and square corners.** This is
the single most common upload rejection and it is clear.

No ICC profile is embedded in any icon. That is fine; Apple assumes sRGB.

---

## 5. Splash and asset references

Every asset path referenced in `app.json` exists on disk. All six checked individually:

```
OK  assets/icon.png
OK  assets/splash-icon.png
OK  assets/android-icon-foreground.png
OK  assets/android-icon-background.png
OK  assets/android-icon-monochrome.png
OK  assets/favicon.png
```

Prebuild produced a working `SplashScreen.storyboard` with a `SplashScreenLegacy`
imageset (`image.png`, `@2x`, `@3x`) and a `SplashScreenBackground` colorset, and
`UILaunchStoryboardName = SplashScreen` in the Info.plist. The splash renders
`scaleAspectFit` on `#f6f4ef`, matching the `contain` resize mode.

Two notes, neither blocking:

- The imageset name `SplashScreenLegacy` reflects the deprecated top-level `splash`
  key in `app.json`. It still works correctly in SDK 54. Migrating to the
  `expo-splash-screen` config plugin is a tidy-up for later, not a release gate.
- All three scale slots hold the same 1024x1024 file, so the `@1x` and `@2x` slots
  carry more pixels than they need. Cosmetic, costs a few hundred KB.

`expo-splash-screen` is not a direct dependency, and does not need to be. The launch
storyboard is pure native and needs no JS module. Nothing in the app calls
`preventAutoHideAsync`, so the splash hides on its own when the first screen renders.

---

## 6. iPad: is `supportsTablet: false` the right call?

Yes, and the code supports it.

- The app is single-column, bottom-tab, thumb-reach, built for one-handed phone use.
  There is no iPad layout anywhere in `app/` or `src/`, no size-class branching, and no
  split-view handling.
- Shipping `supportsTablet: true` without an iPad layout would mean stretched phone
  screens on a 13-inch display, which invites a 4.0 Design rejection, and it would force
  a second full set of iPad screenshots in App Store Connect.
- With `false`, the app is iPhone-only and still installs and runs on iPad in
  compatibility mode, so iPad owners are not shut out.
- `TARGETED_DEVICE_FAMILY = "1"` in the generated project confirms the setting reaches
  the build.

This is a sound store choice. It also removes iPad screenshots from the launch checklist.

---

## 7. iOS JS bundle: proven to build

Beyond config checking, the actual iOS bundle was produced:

```
npx expo export --platform ios
› ios bundles (1):
_expo/static/js/ios/entry-2ffa6e72829e81e6d728f9307e59002f.hbc (7.38 MB)
```

Compiled to Hermes bytecode with no errors and no unresolved imports. Fonts
(Newsreader, Poppins), icon fonts, and all image assets resolved. Output went to a
scratch directory, not the repo.

This does not prove the native Swift and CocoaPods compile, which needs a real build.
Section 8, item E covers how to prove that without the Apple account.

### One risk found and measured: `experiments.baseUrl: "/app"`

`app.json` sets `experiments.baseUrl: "/app"` for the phone-web deployment at
`towinly.com/app/`. In expo-router, `appendBaseUrl` and `stripBaseUrl` are guarded only
by `NODE_ENV !== 'development'`, with **no platform guard**, so this web setting was
suspected of leaking into native.

It was tested rather than guessed. Two iOS exports were run from a throwaway copy,
changing only that one key, and the content-addressed bundle names compared:

```
with    experiments.baseUrl "/app"  ->  entry-f6910a7306892c22ae1e34a29fb209e2.hbc
without experiments.baseUrl         ->  entry-9ed32d846a75d4a6f16e9d4095b365cb.hbc
```

Different hashes, so the setting **is** baked into the native iOS bundle.

The impact was then traced to the call sites, and it is small:

- `usePathname()` returns the clean `pathname` field, which is **not** prefixed. The
  app's only use of it, `src/components/AskAiAssistant.jsx:52`, is unaffected.
- Only `unstable_globalHref` gets the `/app` prefix. Nothing in the app reads it.
- `TabTrigger` from `expo-router/ui` also prefixes, but the app uses the standard
  `Tabs` from `expo-router` (`app/(tabs)/_layout.jsx:11`), so this path is never hit.
- `stripBaseUrl` on an incoming native deep link like `towinly:///profile` finds no
  `/app` prefix and returns the path unchanged, so deep links still resolve.

**Severity: low. Not a blocker.** No change made, because removing `baseUrl` would break
the phone-web deployment, and the native cost is currently zero. Worth one manual deep
link test on the first TestFlight build: open `towinly://` links and confirm they land
on the right screen.

---

## 8. Production build profile: what is ready, what is missing

Current `eas.json` production profile:

```json
"production": {
  "autoIncrement": true,
  "channel": "production",
  "env": { "EXPO_PUBLIC_LEGAL_CONTACT_EMAIL": "help@towinly.com" }
}
```

This is structurally valid and enough for `eas build -p ios --profile production` to
start. Five things to know before running it.

### A. The project is not linked to EAS yet (needs a free Expo account, not Apple)

`extra.eas.projectId` and `owner` are both absent from the resolved config. Confirmed:

```
npx eas config --platform ios --profile production --non-interactive
  An Expo user account is required to proceed.
```

On first run, `eas build` will create the EAS project and **write `extra.eas.projectId`
into `app.json`**. Better to do it deliberately with `eas init` and review the diff than
to discover the mutation mid-build. Costs nothing, needs no Apple account.

### B. `channel` is set but EAS Update is not configured

All three original profiles specify a `channel`, `expo-updates@29.0.19` is installed,
but there is no `updates.url` in the config and the generated `Expo.plist` shows
`EXUpdatesEnabled = false`.

Reading the eas-cli source (`commandUtils/workflow/buildProfileUtils.js:112`,
`update/configure.js:254`), `eas build` detects that at least one profile has a channel
and runs `ensureEASUpdateIsConfiguredAsync`, which **writes an `updates.url` block into
`app.json`** and logs "Configured EAS Update".

So this is not a hard blocker, it is an unannounced config mutation. Run
`eas update:configure` first, on purpose, and commit the diff. Needs only the free Expo
account. Note this fires no matter which profile you build, because the check scans all
profiles for a channel.

### C. Fields that will need the Apple Developer account

`submit.production` is currently empty (`{}`). For `eas submit -p ios` it needs:

| Field | What it is | Where it comes from |
| --- | --- | --- |
| `appleId` | the Apple ID email used to sign in | your account, next week |
| `appleTeamId` | 10-character Team ID | Apple Developer membership page |
| `ascAppId` | App Store Connect app ID (numeric) | created when you register the app record in App Store Connect |
| `sku` | internal identifier for the app record | your choice, set at app creation |
| `language` | primary listing language | your choice, e.g. `en-US` |

Leaving `submit.production` empty is fine: `eas submit` prompts for these interactively
and can write them back. Fill them in only once the account exists, so nothing invented
gets committed.

For `eas build` itself, signing credentials (distribution certificate and provisioning
profile) are generated by EAS on first build and stored remotely. No `credentialsSource`
entry is needed; the default handles it. **This step is the one that genuinely cannot
happen before the account exists.**

### D. Nothing else in the production profile is missing

No `resourceClass` is set, so EAS uses its default, which is correct for this app.
`distribution` is absent, which correctly defaults to store distribution.

### E. Change made: a credential-free simulator profile

To prove the **native** compile before the Apple account exists, a `simulator` profile
was added to `eas.json`:

```json
"simulator": {
  "distribution": "internal",
  "ios": { "simulator": true },
  "env": { "EXPO_PUBLIC_LEGAL_CONTACT_EMAIL": "help@towinly.com" }
}
```

Run `eas build -p ios --profile simulator` with only a free Expo account. It compiles
Swift, resolves CocoaPods, and produces a runnable `.app` for the iOS Simulator with no
signing and no Apple membership. That closes the last gap this audit could not close on
its own.

This addition is additive and cannot affect the production build: it is a separate
profile, it has no `channel`, and the `production` profile was left byte-for-byte
unchanged. `expo-doctor` re-run after the edit: still 18/18.

---

## 9. Privacy manifest

There is no app-level `ios.privacyManifests` in `app.json` and prebuild generated no
`PrivacyInfo.xcprivacy` at the app level. This is expected and most likely fine.

Apple's required-reason API rules are satisfied per-library: each pod ships its own
manifest, which CocoaPods bundles and Apple reads. Confirmed present in the installed
dependencies:

```
node_modules/react-native/React/Resources/PrivacyInfo.xcprivacy
node_modules/react-native/ReactCommon/cxxreact/PrivacyInfo.xcprivacy
node_modules/expo-constants/ios/PrivacyInfo.xcprivacy
node_modules/expo-file-system/ios/PrivacyInfo.xcprivacy
node_modules/expo-system-ui/ios/PrivacyInfo.xcprivacy
... plus RCT-Folly, boost, glog
```

An app-level manifest is only needed if the app's own native code calls a required-reason
API, and this app has no custom native code.

This cannot be fully closed before an upload. If Apple emails **ITMS-91053 (missing API
declaration)** after the first TestFlight upload, add `ios.privacyManifests` to
`app.json` naming the API and reason it lists. Treat it as a first-upload follow-up, not
a pre-build blocker.

Separately, the App Store Connect privacy questionnaire (the nutrition label) is
account-side work and is not covered here.

---

## 10. Findings summary

### Blocking

None on the app side. Nothing in the code, config, or assets stops a production build.

### Needs a free Expo account, do before the first build

1. **EAS project not linked.** No `extra.eas.projectId`. Run `eas init`, commit the
   `app.json` diff.
2. **EAS Update not configured while channels are set.** Run `eas update:configure`
   deliberately, commit the diff, rather than letting `eas build` write it silently.

### Needs the Apple Developer account, next week

3. **Signing credentials.** Generated by EAS on first `eas build -p ios`.
4. **`submit.production` fields.** `appleId`, `appleTeamId`, `ascAppId`, `sku`,
   `language`. Fill in only after the App Store Connect app record exists.

### Verify on the first real build, cannot be verified now

5. **Privacy manifest.** Watch for ITMS-91053 after the first upload. Section 9.
6. **Deep links with `baseUrl` set.** Open a `towinly://` link on the TestFlight build
   and confirm routing. Section 7. Low risk, measured, not theoretical.

### Cosmetic, no action needed before launch

7. Splash uses the deprecated top-level `splash` key. Works correctly on SDK 54.
   Migrate to the `expo-splash-screen` plugin when convenient.
8. Splash `@1x` and `@2x` slots hold the full 1024x1024 image. Costs a few hundred KB.

### Confirmed good

- `expo-doctor` 18/18, twice.
- Native iOS project generates without error.
- iOS JS bundle compiles to Hermes bytecode, 7.38 MB, no errors.
- Bundle identifier, slug, and scheme match the frozen values.
- App icon 1024x1024, no alpha, square corners, both source and generated.
- `ITSAppUsesNonExemptEncryption: false` present.
- ATS locked down (`NSAllowsArbitraryLoads: false`) in the real build.
- `UIRequiredDeviceCapabilities: ["arm64"]` in the real build.
- Exactly one usage string, correct, and it is the only one the code needs.
- Empty entitlements, consistent with Google sign-in being web-only and Sign in with
  Apple not being required.
- iPhone-only enforced at `TARGETED_DEVICE_FAMILY = "1"`.
- Every asset referenced in `app.json` exists on disk.
- Repo left clean. No `ios/` directory created in the working tree.

---

## Change log for this audit

One file was modified: `eas.json`, adding the `simulator` build profile described in
section 8E. Nothing else in the repo was touched. All prebuild and export work happened
in throwaway directories under `/private/tmp`, which were deleted afterwards.

---

# Pre-enrollment dry run, 2026-08-15

Second pass, run on branch `ralph/apple-prepay-readiness` at `aed22c2`, before
any money reaches Apple. Purpose: find the day-one build failures now, while
fixing them is free. Every command below can be re-run after enrollment and
diffed against these outputs.

Environment: Node v24.13.0, Expo SDK 54.0.0, `expo` 54.0.36, `react-native`
0.81.5, expo-doctor 1.20.2. Command Line Tools only on this machine, no full
Xcode.

**Verdict: nothing found that would fail a build.** 18 of 18 doctor checks
pass, prebuild finishes clean with no warnings, the identity is unchanged, the
encryption flag is present and false in the real generated plist, and the one
permission the app can trigger has its purpose string. Two facts came out of
this run that were not known before, both in section D.

## A. expo-doctor

```bash
cd App && npx expo-doctor
```

```
Running 18 checks on your project...
18/18 checks passed. No issues detected!
```

Nothing to fix, so nothing was fixed. No check was skipped and no failing check
was reported as passing.

## B. expo config --type introspect

```bash
cd App && npx expo config --type introspect --json
```

**Identity, all three frozen values confirmed unchanged:**

| Field | Value |
|---|---|
| `ios.bundleIdentifier` | `com.towinly.app` |
| `android.package` | `com.towinly.app` |
| `slug` | `towinly` |
| `scheme` | `towinly` |
| `name` | `Towinly` |
| `version` | `1.0.0` |
| `sdkVersion` | `54.0.0` |

**Resolved plugin list**, in order: `expo-router`, `expo-secure-store` with
`faceIDPermission: false`, `expo-font`, `expo-image-picker` with
`photosPermission` set and `cameraPermission` and `microphonePermission` both
`false`.

**Purpose strings in the introspected plist:** exactly one,
`NSPhotoLibraryUsageDescription`. See section C for why that is the right
number and section D for the check that proves it.

## C. expo prebuild -p ios --no-install

Run in a throwaway directory, never in the repo. The project was copied out with
`rsync` excluding `node_modules`, `.git`, `ios`, `android`, `dist` and `.expo`,
then `node_modules` was symlinked back so no install was needed.

```bash
SCRATCH=/private/tmp/<scratch>/prebuild-dry
mkdir -p "$SCRATCH"
cd App && rsync -a --exclude node_modules --exclude .git --exclude ios \
  --exclude android --exclude dist --exclude .expo ./ "$SCRATCH/"
ln -sfn "$PWD/node_modules" "$SCRATCH/node_modules"
cd "$SCRATCH" && npx expo prebuild -p ios --no-install
```

```
- Creating native directory (./ios)
✔ Created native directory
- Updating package.json
✔ Updated package.json
- Running prebuild
✔ Finished prebuild
```

Exit code 0. **Zero warnings and zero errors.** No config plugin threw, which
matters because a plugin that throws at prebuild throws identically on EAS.

Generated: `ios/Podfile`, `ios/Podfile.properties.json`,
`ios/Towinly.xcodeproj`, and `ios/Towinly/` containing `AppDelegate.swift`,
`Info.plist`, `SplashScreen.storyboard`, `Images.xcassets`,
`Towinly-Bridging-Header.h` and `Towinly.entitlements`.

`Towinly.entitlements` is an empty `<dict/>`. The app requests no capability, so
there is nothing for Apple to provision beyond the signing certificate.

`Podfile.properties.json` reads `{"expo.jsEngine": "hermes",
"EX_DEV_CLIENT_NETWORK_INSPECTOR": "true"}`. The Hermes line is the empirical
confirmation that the JS engine is Hermes, which matters for the third-party SDK
question in `privacy-manifest-aggregate.md` section 6.

**The repo was left clean.** `ls -d ios` in `App/` returns
`No such file or directory`, and `git status --short` shows no new native
directory.

## D. The two things this run found that were not known before

**1. `expo config --type introspect` is a preview, not the artifact, and the two
disagree on exactly the keys a reviewer would ask about.**

| Key | introspect said | the generated `Info.plist` says |
|---|---|---|
| `NSAppTransportSecurity` | `NSAllowsArbitraryLoads: true`, plus a localhost exception | `NSAllowsArbitraryLoads: false`, `NSAllowsLocalNetworking: true` |
| `UIRequiredDeviceCapabilities` | `["armv7"]` | `["arm64"]` |

Both differences run in the app's favour, and both would have read as findings
if introspect had been trusted as the answer. Arbitrary loads are **off** in the
built app, so App Transport Security is enforced and there is no exception to
justify at review. The device capability is `arm64`, which is the only correct
value for a current iPhone. **Rule for the next person: verify plist claims
against a prebuild, never against introspect.**

**2. Prebuild generates no app-level `PrivacyInfo.xcprivacy`.**

```bash
find ios -name PrivacyInfo.xcprivacy   # returns nothing
```

This confirms the reading of `@expo/config-plugins/build/ios/PrivacyInfo.js`
recorded in `privacy-manifest-aggregate.md` section 5: the plugin returns the
config untouched when `ios.privacyManifests` is absent, so no app-target
manifest is written. The app target is `AppDelegate.swift` plus generated
bootstrap, and it contains no `UserDefaults` reference, so it calls no
required-reason API and needs no declaration of its own. Every required-reason
API in the build comes from a pod, and each of those pods declares it. The
decision to add nothing stands, and is now backed by the artifact rather than by
a reading of the plugin source.

## E. ITSAppUsesNonExemptEncryption, confirmed in the real plist

Not in `app.json`, and not in introspect. In the file prebuild actually wrote:

```bash
plutil -convert json -o - "$SCRATCH/ios/Towinly/Info.plist"
```

```json
"ITSAppUsesNonExemptEncryption": false
```

Present, and false. Export compliance therefore answers itself in App Store
Connect and no annual self-classification report is triggered.

## F. Permission coverage: every permission the app can trigger

The question is not "does each plist key have a string". It is "can the app
raise a system prompt that has no string behind it", because that is a hard
crash on device rather than a warning.

The whole app raises exactly one prompt. Proof:

```bash
grep -rn "requestPermission\|PermissionsAsync\|getPermissions" app src | grep -v __tests__
```

```
app/profile-edit.jsx:160:  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
```

One call, one prompt, one string:

| Prompt the app can raise | Purpose string in the generated plist | Covered |
|---|---|---|
| Photo library, from `profile-edit.jsx:160` | `NSPhotoLibraryUsageDescription`, "Towinly uses your photo library so you can choose a profile picture, and so you can send a photo of your ID if you choose to verify who you are." | Yes, and it names both uses of the picker |

The prompts the app **cannot** raise, and why no string is needed for each:

| Prompt | Why it can never fire |
|---|---|
| Camera | `expo-image-picker` plugin sets `cameraPermission: false`, so the key is stripped from the plist and no camera API is reachable |
| Microphone | `expo-image-picker` plugin sets `microphonePermission: false` |
| Face ID | `expo-secure-store` plugin sets `faceIDPermission: false` |
| Location | No `expo-location` in `package.json`. The app geocodes a typed town name on the server |
| Notifications | No `expo-notifications` in `package.json` |
| Contacts | No `expo-contacts` in `package.json`. Emergency contacts are typed by hand |
| Speech recognition | `expo-speech` is text to speech, which is output only and needs no permission |

Confirmed against the generated `Info.plist`: `NSPhotoLibraryUsageDescription`
is the only `NS...UsageDescription` key present. There is no orphan string for a
permission the app does not use, and no missing string for one it does.

## G. What could not be checked on this machine

Named rather than glossed, because a skipped check reported as passing is the
failure this whole pass exists to prevent.

- **`pod install` and a compile.** This machine has Command Line Tools only, no
  full Xcode, so CocoaPods cannot resolve and nothing was compiled. Prebuild
  generating a clean project is not the same as the project building. EAS
  compiles on its own macOS image, so the first real answer arrives with the
  first build.
- **The Hermes privacy manifest.** `hermes` is on Apple's list of third-party
  SDKs that must ship a manifest and a signature, and the hermes-engine artifact
  is fetched during `pod install`, so it is not on disk here. See
  `privacy-manifest-aggregate.md` section 6.
- **Anything needing a signed binary:** the deep-link round trip on a device,
  the built app's runtime behaviour, and TestFlight.

## H. Re-run this after enrollment and diff

```bash
cd App
npx expo-doctor
npx expo config --type introspect --json > /tmp/introspect-after.json
# prebuild into a scratch copy, exactly as section C shows, then:
plutil -convert json -o - "$SCRATCH/ios/Towinly/Info.plist"
find "$SCRATCH/ios" -name PrivacyInfo.xcprivacy
```

Expect the same output, with one addition: once `eas init` has run, `app.json`
gains `extra.eas.projectId` and introspect will show it. Any other difference is
worth reading before starting a paid build.
