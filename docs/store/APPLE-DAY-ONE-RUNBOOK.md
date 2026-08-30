# Apple day one runbook

The exact order of commands and clicks for the day the Apple Developer account
goes live. Nothing here is meant to be worked out on the day. Read it once now,
then follow it top to bottom on the day.

Written against this repo at `App/eas.json` and `App/app.json` as they stand on
2026-08-11, and against `eas-cli` 21.7.0. Every command below was checked against
that CLI's own help output and source, so the flags and the prompt wording are the
real ones, not remembered ones.

Companion files in this folder, all of them prerequisites you should have read
before the day:

- `ios-build-readiness.md` for the technical state of the build.
- `ios-content-readiness.md` for URLs, demo seats, age rating, export compliance.
- `listings.md` for the words that go in the store fields.
- `privacy-labels.md` for the App Privacy answers.
- `screenshots-and-review.md` for the screenshots and the App Review notes block.

Frozen facts this runbook assumes and never changes:

- Bundle identifier and Android package: `com.towinly.app`.
- Expo slug and URL scheme: `towinly`.
- Expo SDK stays at 54.
- The Google sign in button is web only, so guideline 4.8 does not apply and Sign
  in with Apple is not required. Do not add it and do not answer review questions
  as though it were there.

---

## Part 0. Do these before the account exists

Everything in Part 0 needs a free Expo account and nothing from Apple. Doing it
now removes about an hour of surprise from day one. If any of it is still open on
the day, do it first, before you touch Apple.

### 0.1 Link the project to EAS

```bash
cd "/Users/aghar/Documents/Projects/ToWin App/App"
npm install -g eas-cli          # or use npx eas-cli@21.7.0 everywhere below
eas login
eas whoami
eas init
```

`eas init` creates the EAS project and writes `extra.eas.projectId` into
`app.json`. Review that diff and commit it.

**What can go wrong.** `eas init` also writes an `owner` field if your account
name differs from the slug. **Fix:** accept it, commit it, and do not hand edit
it later. The slug `towinly` is frozen, the owner field is not part of the
frozen identifier set.

### 0.2 Configure EAS Update on purpose

All four build profiles in `eas.json` set a `channel`, `expo-updates` is
installed, but there is no `updates.url` yet. The first `eas build` of any
profile will notice that and silently write one into `app.json`.

```bash
eas update:configure
git diff app.json
```

Commit the diff. Now the config change is a reviewed commit rather than a
mystery that appears mid build.

**What can go wrong.** You skip this and the mutation lands during the
production build, so the file that produced your first store binary is not the
file in your last commit. **Fix:** run it now.

### 0.3 Prove the native compile without Apple

`eas.json` already has a `simulator` profile for exactly this.

```bash
eas build -p ios --profile simulator
```

This compiles Swift, resolves CocoaPods, and produces a runnable `.app`. It needs
no Apple membership and no signing. If it passes, the only thing the production
build adds is code signing.

**What can go wrong.** A pod or Swift failure shows up here. **Fix:** better to
find it today than on the day the clock is running.

### 0.4 Close the content blockers

From `ios-content-readiness.md`, in priority order:

1. **Decide the Support URL.** App Store Connect will not let you submit without
   one. Today there is no support page. Either point it at
   `https://www.towinly.com/app/delete-account`, which is live and names
   `help@towinly.com`, or add an `/app/support` route in this repo. Decide before
   the day, do not decide in the console.
2. **Send a test email to `help@towinly.com` and confirm a human receives it.**
   Five public surfaces and both store consoles depend on that mailbox. App
   Review does write to it.
3. **Add the in app deletion path to the review notes block** in
   `screenshots-and-review.md`. Exact wording is in that file under Gap A.
4. **Protect the demo seats from a reviewer's deletion test.** Seed a fourth
   throwaway account, or warm the demo id cache at backend startup. A reviewer
   who deletes the shared `elder` seat can strand the whole review.
5. **Settle the app name.** Two files disagree today. `docs/store-listing.md` at
   the project root says `Towinly: Trusted Help`. `App/docs/store/listings.md`
   says `Towinly: Elder Care Companion`. `__tests__/store-listing.test.js` reads
   the root file. Pick one, update both files, run `npx jest store-listing`, and
   write the winner at the top of this runbook before the day. The name is typed
   once, into a field that needs a review to change.

### 0.5 Have the screenshots finished

Eight portrait shots at 1320 x 2868, captured from a native build, never from
the web build. The plan and the captions are in `screenshots-and-review.md`.
Verify each file before the day: exact pixel size, no alpha channel
(`sips -g hasAlpha file.png`), light mode, no em dash anywhere in the baked in
text.

### 0.6 Print the day one crib sheet

Have these in front of you before you sign in to anything:

| Thing | Value |
| --- | --- |
| Bundle ID | `com.towinly.app` |
| App name | decided in step 0.4.5 |
| Subtitle | from `listings.md` |
| SKU | suggested: `towinly-ios-001` |
| Primary language | English (U.S.) |
| Primary category | ~~Lifestyle~~ Social Networking (corrected 2026-08-30, APS-13, to match the justified answer in `console-answers.md` and `app-store-connect-fields.md`) |
| Secondary category | ~~Social Networking~~ Lifestyle (same correction) |
| Privacy policy URL | `https://www.towinly.com/app/privacy` |
| Support URL | decided in step 0.4.1 |
| Marketing URL | `https://www.towinly.com` |
| Review sign in | `elder` / `12345678` |
| Review contact | your name, phone, `help@towinly.com` |

Note the privacy policy URL carefully. `https://www.towinly.com/privacy` is a
different and stale document. Never give Apple that one.

---

## Part 1. Enrollment

### 1. Choose individual or organization

Do this before you pay, because changing it later is expensive in time.

**Individual.** Cost is 99 USD per year.

- What it needs: an Apple Account with two factor authentication turned on, a
  government photo ID, and a payment card. That is the whole list.
- How it verifies you: fastest is the Apple Developer app on an iPhone, which
  scans your ID and matches it to your face. The web route asks for the same
  documents but takes longer to clear.
- What the store shows: your legal personal name as the seller and developer.
  For Towinly that means a stranger reading the listing sees the founder's name,
  not a company.
- Team size: one. You cannot add other people to the developer portal.
- Typical time from payment to an active membership: often within a day or two.
  Budget up to a week and do not book anything against it.

**Organization.** Cost is the same 99 USD per year.

- What it needs: a real legal entity, a D-U-N-S number for that entity, a public
  website whose domain matches the entity, and legal authority to sign for it.
- The D-U-N-S number is free but is the long pole. If the entity does not have
  one, requesting it can take from a few days to a few weeks. If Towinly is not
  incorporated yet, this route is not available in a week.
- What the store shows: the company name as the seller.
- Team size: many, with roles.

**The call for a solo founder shipping next week: enroll as an individual.** It
is the only one of the two that can be active in a week, and the app has no
second person who needs portal access. The cost is that the store shows a
personal name.

**What can go wrong.** You start as an individual and later want the company
name on the listing. **Fix:** Apple does not treat this as a settings toggle.
You either ask Apple Developer Support to convert the account, or you create an
organization account and use App Transfer to move the app across. Both are real
and both take days of back and forth. Plan the switch for a quiet week, never
mid review.

**What can go wrong.** The Apple Account you enroll with is an old personal one
with a shared or forgotten password. **Fix:** this account becomes the Account
Holder and cannot be swapped casually. Use an address you control forever and
turn on two factor before you start.

### 2. Pay and wait for the membership to activate

1. Open the Apple Developer app on your iPhone, or go to
   `developer.apple.com/programs/enroll`.
2. Sign in with the Apple Account chosen in step 1.
3. Select Individual, confirm your legal name and address exactly as they appear
   on your ID, and complete ID verification.
4. Pay the 99 USD.
5. Wait for the activation email.

**What can go wrong.** Enrollment sits in "pending" with no email. **Fix:** it is
usually identity verification, not payment. Check the Apple Developer app for a
request to resubmit a document. If nothing appears after two business days,
contact Apple Developer Support. This is the single step with no workaround, so
start it the moment you can.

**What can go wrong.** Your legal name on the ID does not match the name on the
Apple Account. **Fix:** correct the Apple Account name first at
`account.apple.com`, then re-submit. A mismatch is a common silent hold.

### 3. First sign in: accept the agreements

The moment the membership is active:

1. Go to `developer.apple.com/account`.
2. Open **Agreements** and accept anything pending. The Apple Developer Program
   License Agreement is usually waiting.
3. Go to `appstoreconnect.apple.com`, open **Business** (older name: Agreements,
   Tax, and Banking), and confirm the free apps agreement shows as active.

Towinly is free with no in app purchases, so you do **not** need to fill in
banking details or tax forms. Only paid apps and apps with purchases need the
Paid Applications Agreement.

**What can go wrong.** This is the most common cause of a confusing failure two
steps later. Unaccepted agreements make the developer portal API refuse
requests, and `eas credentials` reports it as a vague authentication error.
**Fix:** accept every pending agreement before you run a single EAS command. If
a later step fails with an Apple authentication error, come back here first.

---

## Part 2. Identifiers and the app record

### 4. Register the App ID

You can let EAS do this for you, but do it by hand first. It is thirty seconds
and it is the one moment where a name clash is still cheap to discover.

1. `developer.apple.com/account` then **Certificates, Identifiers & Profiles**.
2. **Identifiers**, then the plus button.
3. Choose **App IDs**, then **App**.
4. Description: `Towinly`.
5. Bundle ID: choose **Explicit** and type `com.towinly.app` exactly.
6. Capabilities: leave every box unchecked. The app ships with empty
   entitlements. No push notifications, no associated domains, no Sign in with
   Apple, no iCloud.
7. Register.

**What can go wrong.** Apple says the identifier is unavailable. Bundle
identifiers are globally unique across all of Apple's developers, and this one
was frozen in this repo without ever being checked against Apple. **Fix:** this
is the only moment the identifier is still changeable, because the freeze binds
from the first upload, not from the repo. If `com.towinly.app` is taken, stop
the runbook, pick a replacement, and change it in `app.json` under both
`ios.bundleIdentifier` and `android.package`, then re-run the readiness checks.
Do not proceed on a guess.

**What can go wrong.** You pick Wildcard instead of Explicit. **Fix:** a wildcard
App ID cannot be used for App Store distribution. Delete it and create an
explicit one.

**What can go wrong.** You tick a capability you do not use. **Fix:** untick it.
An entitlement in the profile that is not in the app, or the reverse, makes the
build fail at signing with a mismatch error.

### 5. Create the app record in App Store Connect

Do this by hand too. There is an automatic path in step 10, and it names the app
wrong for this repo. See the warning at the end of this step.

1. `appstoreconnect.apple.com` then **Apps**, then the plus button, then
   **New App**.
2. Platforms: tick **iOS** only.
3. Name: the name settled in step 0.4.5. Maximum 30 characters.
4. Primary Language: **English (U.S.)**.
5. Bundle ID: pick `com.towinly.app` from the dropdown. It appears because of
   step 4.
6. SKU: `towinly-ios-001`. This is internal, never shown to a user, and cannot be
   changed after creation. Any stable string is fine, so choose one you will not
   be embarrassed by in a spreadsheet three years from now.
7. User Access: **Full Access**.
8. Create.

Write down the numeric **App Store Connect App ID** that appears in the URL and
under App Information. It looks like `1234567891`. You need it in step 11.

**What can go wrong.** "The app name you entered is already being used."
**Fix:** App Store names are unique. Have a second and third choice ready from
`listings.md` before the day. Creating the record reserves the name, so create
it the moment the account is live even if the build is days away.

**What can go wrong.** The bundle ID is missing from the dropdown. **Fix:** the
App ID from step 4 has not propagated. Wait a few minutes and reload. If it is
still missing, check you are in the right team.

**Warning about the automatic path.** If you skip this step, `eas submit` will
create the record for you. It takes the app name from `exp.name` in `app.json`,
which is the single word `Towinly`, not the 29 character marketing title. You
would end up with a listing called `Towinly` and would have to rename it, and a
rename needs a version review. Either create the record by hand as above, or set
`appName` in the submit profile before running `eas submit`.

---

## Part 3. Credentials

### 6. Set up signing credentials

```bash
cd "/Users/aghar/Documents/Projects/ToWin App/App"
eas credentials -p ios
```

`eas credentials` takes only `-p` or `--platform`. There is no profile flag. It
asks for the profile as its first question.

The prompts, in order, and the correct answer each time:

1. `Which build profile do you want to configure?` Answer **production**.
2. Menu. Choose **Build Credentials: Manage everything needed to build your
   project**.
3. Submenu. Choose **All: Set up all the required credentials to build your
   project**.
4. `Do you want to log in to your Apple account?` Answer **yes**. Saying no means
   you must supply a certificate and profile by hand, which you do not have.
5. `Apple ID:` your Apple Account email from step 1.
6. `Password (for you@example.com):` your Apple Account password. It is not
   stored on Expo's servers, only used for this session.
7. Two factor code from your trusted device.
8. If your Apple Account belongs to more than one team, pick the Towinly team.
   For a fresh individual account there will be exactly one.
9. EAS creates an **Apple Distribution certificate** and an **App Store
   provisioning profile** for `com.towinly.app` and stores both on EAS servers.

Verify when it finishes: the menu should show a distribution certificate and a
provisioning profile against `com.towinly.app`.

**What can go wrong.** "Authentication with Apple Developer Portal failed."
**Fix:** in order. First, go back to step 3 and accept every pending agreement.
Second, sign in to `developer.apple.com` in a browser once and clear any interstitial.
Third, retry the command. Apple's two factor flow occasionally needs a second
attempt, and the CLI offers `Would you like to try again?`.

**What can go wrong.** The 2FA code never arrives, or you are on a machine with
no trusted device nearby. **Fix:** have the iPhone signed in to the same Apple
Account and unlocked before you start. Do not start this step from a cafe with
your phone in a bag.

**What can go wrong.** You already hit Apple's limit of two Apple Distribution
certificates. **Fix:** not possible on a new account, but if it ever happens, use
the same menu to revoke an unused certificate. Never revoke one that a live app
depends on.

**What can go wrong.** You want to skip this step and let `eas build` do it.
**Fix:** you can, the build asks the same questions. Doing it separately means a
credential problem surfaces in thirty seconds instead of ten minutes into a
queued build.

### 7. Set up the App Store Connect API key for automated submits

This is what makes `eas submit` run without typing an Apple password every time.
It also survives 2FA prompts, which app specific passwords handle badly.

First, one click in the browser, because a brand new team has API access switched
off:

1. `appstoreconnect.apple.com` then **Users and Access**.
2. **Integrations** tab, then **App Store Connect API**, then **Team Keys**.
3. If you see a **Request Access** button, click it and agree. Only the Account
   Holder can do this, which on an individual account is you.

Then let EAS create and store the key:

```bash
eas credentials -p ios
```

1. `Which build profile do you want to configure?` Answer **production**.
2. Menu. Choose **App Store Connect: Manage your API Key**.
3. Choose **Set up your project to use an API Key for EAS Submit**.
4. Choose **[Add a new key]**.
5. Sign in to Apple again if prompted.
6. EAS creates the key, uploads it to EAS servers, and assigns it to this
   project. You never see the `.p8` file and never have to store it.

Manual alternative, if you would rather hold the key yourself:

1. In **Team Keys**, click the plus button.
2. Name: `EAS Submit`.
3. Access: **App Manager** is enough for uploading builds. **Admin** is more than
   you need.
4. Generate, then download the `.p8` file. **Apple lets you download it exactly
   once.** Note the **Key ID** and the **Issuer ID** shown on the same page.
5. Store the `.p8` outside this repo, for example `~/keys/towinly-asc.p8`.
6. Add all three fields to the submit profile in `eas.json`:

```json
"submit": {
  "production": {
    "ios": {
      "ascApiKeyPath": "/Users/aghar/keys/towinly-asc.p8",
      "ascApiKeyId": "XXXXXXXXXX",
      "ascApiKeyIssuerId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
    }
  }
}
```

All three or none. The CLI warns and falls back to prompting if you set only
some of them.

**What can go wrong.** You lose the `.p8`. **Fix:** you cannot re-download it.
Revoke the key in App Store Connect and make a new one. This is a good reason to
prefer the EAS managed route above.

**What can go wrong.** You commit the `.p8`. **Fix:** `.gitignore` in this repo
already ignores `*.p8`, so an accidental `git add` of the file alone will not
stage it. The path in `eas.json` is committed though, so keep the key outside the
repo and keep the path pointing at your home directory.

**What can go wrong.** `EXPO_APPLE_APP_SPECIFIC_PASSWORD` is set in your shell
from an old experiment. EAS prefers it over the API key whenever it is present,
and it must match `xxxx-xxxx-xxxx-xxxx` or the command throws. **Fix:**
`unset EXPO_APPLE_APP_SPECIFIC_PASSWORD` before submitting.

**What can go wrong.** The Issuer ID is rejected as invalid. **Fix:** it must be
a UUID. It is easy to paste the Key ID into the Issuer field by mistake, because
they sit next to each other on the same page.

---

## Part 4. Build

### 8. Make the working tree say what you mean

EAS packages your working directory, not your last commit. With the default
settings, files that git ignores are excluded and everything else is uploaded,
including uncommitted edits. As of today this repo has an uncommitted `eas.json`
and an untracked `docs/` directory.

```bash
cd "/Users/aghar/Documents/Projects/ToWin App/App"
git status
git branch --show-current
```

Decide deliberately what ships. Commit the `eas.json` change at minimum, so the
binary you upload can be traced to a commit.

**What can go wrong.** A half finished experiment on disk ends up in the store
binary. **Fix:** `git status` before every production build, every time.

**What can go wrong.** You expect `.env.local` to reach the build. It will not,
because git ignores it. **Fix:** production environment values come from the
`env` block of the production profile in `eas.json`, which today sets
`EXPO_PUBLIC_LEGAL_CONTACT_EMAIL`. Anything else it needs must go there or into
EAS environment variables.

### 9. Run the production build

```bash
eas build -p ios --profile production
```

Useful additions, none of them required:

```bash
eas build -p ios --profile production -m "First store build"   # label the build
eas build -p ios --profile production --wait                    # block until done
```

What to expect:

1. If step 6 was done, EAS finds the certificate and profile and does not ask
   about Apple at all. If it was skipped, you get the same Apple prompts here.
2. `No remote versions are configured for this project, buildNumber will be
   initialized based on the value from the local project.` This is correct and
   expected. `eas.json` sets `appVersionSource: "remote"` and the production
   profile sets `autoIncrement: true`, and `app.json` deliberately has no
   `ios.buildNumber`. The first build initializes the remote build number at
   **1**. Every later production build increments it by one. The public version
   string stays `1.0.0` from `app.json`.
3. The build is queued, then compiles on EAS servers. On the free plan expect
   anywhere from fifteen minutes to a few hours depending on the queue. Plan the
   day around a long wait rather than a short one.
4. When it finishes you get a build page URL and an `.ipa` artifact.

Check on it from another terminal:

```bash
eas build:list --platform ios --limit 5
eas build:view                 # shows the last build
eas build:view <build-id>      # shows a specific one
```

**What can go wrong.** The build fails in the "Install pods" or "Run fastlane"
phase. **Fix:** open the build page and read the failing phase log, not the
summary. If the simulator build in step 0.3 passed, a failure here is almost
always credentials, not code.

**What can go wrong.** "Provisioning profile doesn't include signing certificate"
or a similar mismatch. **Fix:** `eas credentials -p ios`, profile `production`,
Build Credentials, then **All**, and let EAS regenerate the pair. Mismatches come
from a certificate revoked on Apple's side while EAS still holds the old profile.

**What can go wrong.** You are tempted to add `--non-interactive` on the first
run. **Fix:** do not. The first build has decisions in it. Save
`--non-interactive` for later automated runs, and pair it with
`--freeze-credentials` so an unattended run can never quietly regenerate signing
material.

**What can go wrong.** You bump Expo or a package to fix a build error. **Fix:**
SDK 54 is locked for this project. Fix the error inside SDK 54.

### 10. Optional: build and submit in one command

Once the submit profile is filled in you can chain them:

```bash
eas build -p ios --profile production --auto-submit
```

`--auto-submit` uses the submit profile with the same name as the build profile,
which here is `production`. There is also
`--auto-submit-with-profile PROFILE_NAME` if the names ever differ, and
`--what-to-test "..."` which fills the TestFlight "What to Test" field on the way
through.

Do **not** use this for the first submission. Run the two steps separately the
first time so that a submit problem is not tangled up with a build problem.

---

## Part 5. Submit

### 11. Fill in the submit profile

`eas.json` today has `"submit": { "production": {} }`, which is valid and makes
`eas submit` ask for everything interactively. Fill it in now that the real
values exist, so future submissions are one command.

```json
"submit": {
  "production": {
    "ios": {
      "appleId": "you@example.com",
      "appleTeamId": "ABCDE12345",
      "ascAppId": "1234567891",
      "sku": "towinly-ios-001",
      "language": "en-US"
    }
  }
}
```

Where each value comes from:

| Field | Where you find it | Format the CLI enforces |
| --- | --- | --- |
| `appleId` | the Apple Account you enrolled with | must be a valid email address |
| `appleTeamId` | developer.apple.com, Membership details | exactly 10 uppercase letters or digits |
| `ascAppId` | App Store Connect, App Information, or the app URL | digits only |
| `sku` | what you typed in step 5 | free text |
| `language` | primary listing language | defaults to `en-US` if omitted |

If you took the manual API key route in step 7, add `ascApiKeyPath`,
`ascApiKeyId` and `ascApiKeyIssuerId` here too.

**What can go wrong.** You paste the Team ID in lower case, or an 11 character
string. **Fix:** the CLI rejects it with a clear message. Copy it from the
Membership page rather than from an email.

**What can go wrong.** You leave `ascAppId` out and run with
`--non-interactive`. **Fix:** the CLI stops with "Set ascAppId in the submit
profile (eas.json) or re-run this command in interactive mode."

### 12. Submit the build

```bash
eas submit -p ios --latest
```

Other ways to pick the binary, if `--latest` grabs the wrong one:

```bash
eas submit -p ios --id <build-id>          # a specific EAS build
eas submit -p ios --path ./build.ipa       # a local file
eas submit -p ios --url https://...        # a hosted archive
```

Other flags worth knowing:

```bash
eas submit -p ios --latest --wait                       # block until Apple accepts
eas submit -p ios --latest --what-to-test "First build" # fills TestFlight What to Test
eas submit -p ios --latest -g "Team (Expo)"             # add to an internal group
eas submit -p ios --latest --verbose --verbose-fastlane # when it fails and you need the log
```

What to expect:

1. EAS resolves the archive and reads the submit profile.
2. With `ascAppId` set, it goes straight to uploading. Without it, it prints
   "Ensuring your app exists on App Store Connect", signs in to Apple, and
   creates or confirms the record. See the naming warning in step 5.
3. Upload, then Apple processing.

**Know which path you took, because it changes step 13.** The TestFlight internal
group named **Team (Expo)**, with access to all builds and every Admin added to
it, is created only on the second path, the one where EAS ensures the app record
itself. Setting `ascAppId` in `eas.json` makes EAS skip that whole branch, so no
group is created and no group is auto populated. That is fine. It just means you
create the internal group by hand once, in step 13.

Watch it:

```bash
eas submit:list
eas submit:status
```

**What can go wrong.** The upload succeeds and then the build never appears in
TestFlight. **Fix:** processing takes from five minutes to about an hour. If
after an hour there is nothing, check your email. Apple sends processing
failures by email and not to the console.

**What can go wrong.** An email titled **ITMS-91053: Missing API declaration**
arrives. **Fix:** expected risk, documented in `ios-build-readiness.md` section 9.
Add an `ios.privacyManifests` block to `app.json` naming exactly the APIs and
reasons Apple lists in that email, rebuild, resubmit. It does not block
TestFlight, only the store submission.

**What can go wrong.** An email about **ITMS-90683 missing purpose string** or a
similar Info.plist complaint. **Fix:** unlikely here. The one usage string this
app needs is present and correct, and was verified against a real prebuild.

**What can go wrong.** Export compliance is asked on every upload. **Fix:** it
should not be, because `ITSAppUsesNonExemptEncryption: false` is set in
`app.json`. If Apple asks anyway, the answer is that the app uses only exempt
encryption. Then confirm the key survived into the built `Info.plist`.

**What can go wrong.** The submit fails with an Apple authentication error even
though the build worked. **Fix:** building and submitting use different Apple
credentials. Building uses the certificate. Submitting uses the API key. Re-run
step 7.

---

## Part 6. TestFlight

### 13. Internal testing, same day

Internal testing needs no review. As soon as the build finishes processing it is
installable.

1. App Store Connect, your app, **TestFlight** tab.
2. The build shows as **Processing**, then as ready.
3. Find or create the internal group.
   - If you submitted without `ascAppId`, a group called **Team (Expo)** is
     already there with access to all builds. Nothing to do.
   - If you submitted with `ascAppId` set, create one: **Internal Testing**, plus
     button, name it `Team`, and turn on the option to automatically add every
     new build. Then add yourself as a tester.
4. To add another person: **Users and Access**, invite them as an App Store
   Connect user, then add them to the internal group under TestFlight.
5. Testers install the TestFlight app on their iPhone and accept the emailed
   invitation.

You can also push a build into a named internal group straight from the CLI:

```bash
eas submit -p ios --latest -g "Team"
```

Limits: up to 100 internal testers, each of whom must be a user on your App Store
Connect team. Builds stay installable for 90 days.

**Test this first, before anything else:** open a `towinly://` deep link on the
device and confirm it lands on the right screen. `app.json` sets
`experiments.baseUrl: "/app"` for the phone web deployment, and that value is
baked into the native bundle. The analysis says the impact is zero, but it was
reasoned rather than run on a device. This is the run.

Also check on the device: sign in as `elder`, `helper` and
`demo.sarah@towin.app`, walk the daily check in, open a chat, open the AI
assistant and confirm the consent dialog appears before the first question, and
walk Profile then Account and data then Delete my account far enough to see both
confirmations without confirming the second one.

**What can go wrong.** "This build is missing compliance information." **Fix:**
tap the build in TestFlight and answer the encryption question. Then work out why
the Info.plist key did not survive, because it should have.

**What can go wrong.** You cannot add a second internal tester. **Fix:** invite
them under Users and Access first. A person who is not an App Store Connect user
cannot be an internal tester. If an individual account will not let you add
users at all, use external testing instead, which has no such requirement.

### 14. External testing, allow one to two days

External testing reaches up to 10,000 people who are not on your team, including
by public link. The first build of every new version needs **Beta App Review**.

1. TestFlight tab, **Testers and Groups**, create a group, for example
   `Early families`.
2. Turn on **Enable public link** if you want a shareable URL, and set a tester
   limit.
3. Add the build to the group.
4. App Store Connect asks for **Test Information** before it will send the build
   to review. Fill in all of it:
   - **Beta App Description**: what the app does and what you want tested.
   - **Feedback Email**: `help@towinly.com`.
   - **Privacy Policy URL**: `https://www.towinly.com/app/privacy`.
   - **Sign in required**: yes. Username `elder`, password `12345678`.
   - **What to Test**: the release notes block from `listings.md`, or a shorter
     line naming the two or three flows you want exercised.
   - **Contact information**: your name, phone and email.
5. Submit for Beta App Review.

Beta review is lighter than App Store review but it is a real human. It checks
crashes, obvious guideline problems, and whether the app works at all. Turnaround
is usually within a day, sometimes two.

Two things that matter for how you plan the week:

- Beta review is triggered by a new **version**, not by every build. Once
  `1.0.0` is approved for external testing, later builds of `1.0.0` normally go
  out to external testers without waiting.
- You can run internal and external testing at the same time. Do internal on day
  one, external on day one or two, and put the real store submission behind
  whatever you learn.

**What can go wrong.** Beta review rejects for the same reason store review
would. **Fix:** good. It is cheaper here. The likely one for this app is
guideline 1.2, safety in a user generated content app. The answer lives in the
review notes block in `screenshots-and-review.md`, which names report, block, the
content filter, and the contact address. Paste that same block into the beta
review notes.

**What can go wrong.** A tester deletes a shared demo account and the seat does
not come back. **Fix:** this is the hazard in `ios-content-readiness.md` Gap B.
Close it before you invite anyone, and re-verify all three logins after any
testing round.

**What can go wrong.** The build expires mid test. **Fix:** TestFlight builds last
90 days. Not a day one problem, but note it if the launch slips.

---

## Part 7. The first App Store submission

### 15. Fill the listing

App Store Connect, your app, then the version page. Everything below is typed by
hand for the first release. There is an `eas metadata:push` command that can
write these fields from a file, but it is not worth the risk on a first
submission, where a bad push overwrites console fields you cannot easily see.

**App Information** (applies to all versions):

- Name and Subtitle from `listings.md`.
- Privacy Policy URL: `https://www.towinly.com/app/privacy`.
- Category: ~~Lifestyle primary, Social Networking secondary~~ Social
  Networking primary, Lifestyle secondary (corrected 2026-08-30, APS-13; the
  reasoning lives in `app-store-connect-fields.md` section 2.4).
- Content Rights: declare that the app does not contain third party content.
- Age Rating: work through the questionnaire using the answers already worked out
  in `ios-content-readiness.md` section 3. Every content category is None. The
  capability questions are where the rating comes from: chat between users **yes**,
  user generated content **yes**, unrestricted web access **no**, in app controls
  for objectionable content **yes**. Let App Store Connect compute the number and
  record whatever it returns. Do not argue it down and do not overstate the
  moderation to move it.

**Pricing and Availability:**

- Price: Free.
- Availability: the launch markets are the United States and India. Selecting all
  countries is also fine and is simpler to manage.

**App Privacy:**

- Answer from `privacy-labels.md`. Do not improvise here. Every row in that file
  was derived from what the backend actually receives.
- Do not claim end to end encryption for the Sealed box. The encryption is server
  side and the privacy policy says so.

**Version 1.1.0 information:**

- Screenshots: the 6.9 inch iPhone set, 1320 x 2868. No iPad set is owed because
  `ios.supportsTablet` is false.
- Promotional Text, Description, Keywords, What's New: from `listings.md`.
- Build: select the build you uploaded in step 12.
- App Review Information:
  - **Sign in required: yes.** Username `elder`, password `12345678`.
  - **Notes:** paste the whole `review-notes` block from
    `screenshots-and-review.md`. It lists all three demo seats, explains why this
    is not a dating app, points at the safety controls, and walks the reviewer
    into guardian mode. Add the in app deletion path line from Gap A.
  - Contact: your first name, last name, phone number, and `help@towinly.com`.
- Version Release: choose **Manually release this version**. You want to decide
  the hour your first app goes live, not find out from a notification.

**What can go wrong.** A field silently refuses to save because it is over the
character limit. **Fix:** every block in `listings.md` has a machine counted
length next to it. Paste, do not retype.

**What can go wrong.** The description pastes with hard line breaks in the middle
of sentences. **Fix:** each paragraph in `listings.md` is deliberately one
unwrapped line. Copy from the raw file, not from a rendered preview.

### 16. Pre-submission checklist

Walk this list out loud before you click. Every item is either proven in the
readiness docs or is a thing only you can confirm.

Build and binary:

- [ ] The build in App Store Connect is the one from step 12, and it processed
      without an email from Apple.
- [ ] Version reads `1.0.0`, build number reads `1`.
- [ ] The app was installed from TestFlight on a real iPhone and opened.
- [ ] All three demo seats sign in on that device, right now, not yesterday.
- [ ] A `towinly://` deep link opens the right screen.
- [ ] Account deletion is reachable at Profile, Account and data, Delete my
      account, and asks twice.
- [ ] The AI consent dialog appears before the first question on a fresh account.
- [ ] No Google sign in button appears anywhere on the device. It is web only,
      and its absence is why guideline 4.8 does not apply.

Listing:

- [ ] Name, subtitle, keywords, description and What's New are pasted from
      `listings.md` with no em dash anywhere.
- [ ] Eight screenshots uploaded, correct size, no alpha, light mode.
- [ ] Privacy policy URL is the `/app/privacy` one, not the stale `/privacy`.
- [ ] Support URL resolves to a live page that names a contact address.
- [ ] Age rating questionnaire completed.
- [ ] App Privacy answers completed from `privacy-labels.md`.
- [ ] Price is Free, countries are set.

Review support:

- [ ] Sign in required is on, with the `elder` credentials.
- [ ] The full review notes block is pasted in.
- [ ] `help@towinly.com` is monitored by a human this week, and a test email to
      it was received.
- [ ] The demo seats are protected from a reviewer's deletion test.

Then click **Add for Review**, then **Submit to App Review**.

### 17. After you submit

- The status goes Waiting for Review, then In Review, then Pending Developer
  Release because you chose manual release.
- Typical wait is around a day, sometimes two. A first app from a brand new
  account can take longer.
- Watch email. Apple asks questions through the Resolution Center, and a
  question left unanswered stalls the review indefinitely.
- If you need to change something after submitting but before review starts, use
  **Remove from Review**, fix, and submit again. This puts you back at the end of
  the queue, so only do it for something real.

The rejections this app is most exposed to, and the answer to each:

| Guideline | Why it might come up | The answer |
| --- | --- | --- |
| 1.2 Safety, user generated content | Strangers meet through the app | Report, block, write time content filter, terms agreed at signup, published contact address. All named in the review notes and all in the build. |
| 1.2 mistaken for dating | Reviewers pattern match "strangers meet in person" | The review notes lead with this. No swiping, no photo browsing, no romance framing, meeting is step six of seven. |
| 2.1 Incomplete information | A demo account fails to sign in | Re-verify all three seats immediately before submitting, and again if the review takes more than a day. |
| 5.1.1(v) Account deletion | Reviewer finds the web deletion page first, which only sends an email | The in app path is real and is named in the review notes. |
| 2.3.3 Screenshots | Screenshots must show the app in use | Every shot is a real screen from a native build. |
| 4.8 Sign in with Apple | Does not apply | Google sign in returns null off web. Nothing to do. Do not add Sign in with Apple to appease a mistaken reviewer. Reply explaining the gating instead. |

**What can go wrong.** A rejection arrives with a vague guideline number.
**Fix:** reply in the Resolution Center and ask for the specific screen. A polite
question with a concrete answer usually turns a rejection round faster than a
resubmission does. Reply, do not resubmit blindly.

**What can go wrong.** You are approved and the app sits in Pending Developer
Release and you forget. **Fix:** that is the intended state. Release it when you
are ready, from the version page.

---

## Part 8. Rough timing

Nothing below is a promise from Apple. It is what to plan against.

| Step | Realistic time | Can it run in parallel |
| --- | --- | --- |
| Enrollment approval | a few hours to a few days | nothing Apple related can start before it |
| Accept agreements | five minutes | no |
| App ID and app record | ten minutes | no |
| `eas credentials` | ten minutes | no |
| ASC API key | ten minutes | yes, alongside the build |
| `eas build` production | fifteen minutes to a few hours in the free queue | yes, do the listing while it runs |
| `eas submit` and Apple processing | five minutes to an hour | yes |
| Internal TestFlight | immediate once processed | yes |
| Beta App Review for external testing | usually under a day, sometimes two | yes, alongside listing work |
| Filling the listing | one to two hours if the copy is ready | yes, during the build |
| App Store review | around a day, sometimes longer for a first app | no |

The one sequence with no shortcut: enrollment, then agreements, then credentials,
then build, then upload. Everything else can be overlapped.

---

## Part 9. The short version

For the day itself, when you do not want to read prose.

```bash
cd "/Users/aghar/Documents/Projects/ToWin App/App"

# once, before Apple exists
eas login
eas init
eas update:configure
eas build -p ios --profile simulator

# on the day, after the membership is active and agreements are accepted
eas credentials -p ios      # production, Build Credentials, All, log in to Apple
eas credentials -p ios      # production, App Store Connect key, Set up, Add a new key
git status                  # what is on disk is what ships
eas build -p ios --profile production
eas build:list --platform ios --limit 5
eas submit -p ios --latest
eas submit:status
```

Browser work in the same order: accept agreements, register the App ID, create
the app record, fill the listing, fill Test Information, submit for beta review,
then submit for App Store review.
