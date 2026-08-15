# Launch action checklist

**Read `README.md` in this folder first.** It is the entry point, it holds the
consolidated timeline, and it settles the places where these documents disagree.

**Truth pass run on 2026-08-15.** Every unchecked box below was re-checked
against the code, the live site, the production backend or the CLI. Nothing was
carried forward on trust. Five boxes moved. One of them changes the privacy
answers on both stores. The old wording and the reason for each change are in
section 4 at the bottom.

Three lists now, not two:

- **Section 1, before you pay Apple.** Finish these first. The 99 USD and the
  Google 14 day clock both start at enrollment, so anything left here becomes
  paid waiting time.
- **Section 2, owner actions.** Money, accounts, humans, console forms.
- **Section 3, repo actions.** Code, config, docs.

Every item carries a label: **[owner]** if only the account holder can do it,
**[repo]** if it is code or config or docs, **[owner then repo]** if a free
account has to exist before the repo can be changed.

Sources: the submission assessment of 2026-08-11, `App/docs/store/listings.md`,
`App/docs/store/privacy-labels.md`, `App/docs/store/screenshots-and-review.md`,
and the 2026-08-15 truth pass recorded here.

---

## 1. Before you pay Apple

Nothing in this section costs money and nothing needs a paid account. Every
hour spent here is an hour not spent on the meter.

- [x] **Confirm the production PostHog flag.** DONE 2026-08-15, and the answer
  is yes. See the box in section 2 for the evidence and for what it changes.
  **This is the highest-value item on the page: submitting the privacy forms
  without it would have been a false declaration on both stores.**
- [x] **Reword `photosPermission`.** DONE. `App/app.json` line 65 already
  covers both the profile picture and the optional ID photo. Evidence in
  section 3.
- [x] **Prove the privacy page and the support page are live and correct.**
  DONE 2026-08-15. Both return 200 and both render the right document in a real
  browser. Evidence in section 3.
- [ ] **Decide individual or organization enrollment.** [owner] The enrollment
  type sets the seller name shown beside the app, and changing it later means a
  new enrollment and a transfer. The organization path needs a DUNS number
  first, and that wait lands entirely before the payment step. Analysis and a
  recommendation: `App/docs/store/enrollment-decision.md`.
- [x] **Aggregate the iOS privacy manifest statically.** DONE 2026-08-15.
  8 manifests found by glob, 4 API categories, 7 reason codes, zero tracking
  and zero declared collection. No row contradicts the store labels. Full table
  with Apple's verbatim wording and a plain-English why for each row:
  `App/docs/store/privacy-manifest-aggregate.md`. Pinned by
  `App/__tests__/privacy-manifest.test.js`, 8 tests.
- [x] **Run the config-plugin dry run.** DONE 2026-08-15. expo-doctor 18/18,
  prebuild exit 0 with zero warnings, identity unchanged,
  `ITSAppUsesNonExemptEncryption` present and false in the generated plist, and
  the one permission the app can raise has its string. Full output and the
  re-run commands: `App/docs/store/ios-build-readiness.md`, section
  "Pre-enrollment dry run, 2026-08-15". `pod install` and a compile could not
  run here: Command Line Tools only, no full Xcode.
- [ ] **Bake all eight screenshots.** [repo] The three missing captures are
  DONE 2026-08-15: `raw-14-helper-trust-score.png`, `raw-15-chat-thread.png`
  and `raw-16-family-parent-checked-in.png`, all measured 1320 x 2868 with no
  alpha. Baking the full eight is what remains.
- [ ] **Adopt the listing fields and repin the test.** [repo] The guarded copy
  and the intended copy are two different documents right now.
- [ ] **Answer every console question that does not need the account open.**
  [repo] Age rating, export compliance, category, review notes, demo seat.
- [ ] **Write the pay-day runbook.** [repo] One ordered document for the hour
  the account opens.
- [ ] **Create a free Expo account and run `eas login` then `eas init`.**
  [owner then repo] Free, no Apple money, but it needs the owner's browser.
  `eas whoami` prints `Not logged in` today. Commands in
  `App/docs/store/PAY-DAY-RUNBOOK.md`.
- [ ] **Send a test message to help@towinly.com and confirm a person receives
  it.** [owner] Five public pages, both store contact fields and App Review all
  write to that address. Apple writes to it first.

---

## 2. Owner actions (accounts, payments, people)

- [ ] **Enroll in the Apple Developer Program, 99 USD per year.** [owner]
  Blocks launch because no App Store Connect app record can exist without it,
  and every iOS item below depends on that record. Settle the enrollment type
  first: see section 1.
- [ ] **Get a DUNS number first if enrolling as a company.** [owner] Apple
  requires a DUNS number for organization accounts. Individual enrollment skips
  it and shows the personal legal name as the seller on the store. Blocks Apple
  enrollment for a company account, so decide before starting the 99 USD step.
- [ ] **Register a Google Play Console developer account, 25 USD one time.**
  [owner] Blocks launch because there is no Play listing, no closed-testing
  track and no Data safety form without it. Register it the same day as the
  Apple one: Google's clock is the one you do not control.
- [ ] **Accept the agreements and complete identity verification in both
  consoles.** [owner] Apple asks you to accept the Developer Program License
  Agreement at first sign in, and an unaccepted agreement makes later Apple
  steps fail with a vague authentication error. Play requires identity
  verification on the developer account. Towinly is free and ships no in-app
  purchase, so Apple's Paid Applications Agreement and the banking and tax
  forms behind it do not apply. Evidence for the free claim: none of the 32
  runtime dependencies in `App/package.json` is a purchase, subscription or
  billing SDK.
- [x] **Run `railway variables` on the production backend and check
  `POSTHOG_API_KEY`.** DONE 2026-08-15. **It is set**, 48 characters, on the
  `backend` service of the `towin` project, production environment. Command:
  `railway variable list --project 7c8febeb-a2ff-4ab3-8275-8038c3cd529d
  --service backend --environment production --json`, which returned 39
  variables. Values were not printed.

  **What that means, traced through the code.**
  `ToWin/backend/.../auth/service/AuthService.java:92` calls
  `postHogService.capture("pending:" + request.getEmail(),
  "user_signup_started", Map.of("role", ...))`. The distinct id is the
  **plaintext email address**. The mobile app reaches that endpoint:
  `App/app/(auth)/register.jsx:192` posts `/auth/register`, which
  `AuthController.java:24` maps to `AuthService.register`. The second event,
  `user_signed_up` at `AuthService.java:173`, keys on the user UUID instead, so
  only the first one carries the address.

  **What it changes.** Both privacy forms must now declare Email plus Analytics
  shared with a third party. The rows to flip are listed in
  `App/docs/store/privacy-labels.md` section 5 item 1, and the console answers
  are tracked in `App/docs/store/app-store-connect-fields.md`. The alternative
  is to clear `POSTHOG_API_KEY` on the production backend before submitting,
  which is a one-command owner action that restores the labels as written.
  Either answer is fine. Submitting the old labels with the key set is not.
- [ ] **Enter the privacy answers in both consoles** [owner] from
  `App/docs/store/privacy-labels.md` (Apple App Privacy questionnaire, Play
  Data safety form). Only the account holder can fill console forms. Blocks
  launch because neither store accepts a submission without them. Read the
  PostHog box above before you type anything.
- [x] **Capture the raw store screenshots.** DONE 2026-08-11. Thirteen captures
  in `App/docs/store/screenshots/`, every one at 1320 x 2868 (Apple's iPhone 6.9
  inch size), taken from the live phone web build with real seeded data on all
  three demo seats. No Xcode, Android SDK or physical phone was needed.
- [ ] **Recruit 12 testers for Google's closed test and keep them enrolled 14
  consecutive days.** [owner] Required before a personal Play account gets
  production access. Blocks the Android launch and is the longest single item,
  about three weeks including setup, so start it the day the Play account
  exists. One day below 12 testers restarts the run.
- [ ] **Decide on the lawyer review of the legal pages.** [owner] Both policies
  ship with a visible draft notice: `App/src/data/legalContent.js:14` exports
  `DRAFT` with `asOf: 'Draft of 2 August 2026'`, and the notice renders live at
  `https://www.towinly.com/app/privacy` above the first section. Neither store
  demands lawyer sign-off, so this blocks credibility rather than review. The
  banner is on screen for every reviewer and every user.
- [ ] **Send a test message to help@towinly.com.** [owner] See section 1.

---

## 3. Repo actions (code, config, docs)

- [ ] **Link the EAS project.** [owner then repo] `App/app.json` has no
  `extra.eas.projectId`, so the channel fields in `App/eas.json` are inert and
  no store build can be produced. `eas whoami` prints `Not logged in`, so this
  cannot start in the repo: the owner signs in to a free Expo account first,
  then `eas init` writes the id and the repo commits it. Blocks launch because
  without it there is no binary to submit.
- [x] **Reword `photosPermission` in `App/app.json`.** DONE, and the earlier
  entry was stale. `app.json` line 65 reads: "Towinly uses your photo library
  so you can choose a profile picture, and so you can send a photo of your ID
  if you choose to verify who you are." That covers both uses of the picker.
  `App/app/profile-edit.jsx:156` defines one `pickImage()` that calls
  `ImagePicker.requestMediaLibraryPermissionsAsync()` at line 160, and two
  callers share it: `changePhoto` at line 179, which sends
  `PUT /profile/photo`, and `uploadId` at line 204, which sends
  `POST /auth/verify-id` at line 216. One permission, two uses, one sentence
  that names both. No second key is needed. `grep -rn ImagePicker app src`
  returns matches in that one file only, so no other screen can trigger the
  prompt.
- [x] **The privacy URL and the Support URL are live and correct.** DONE
  2026-08-15, verified twice and in two different ways, because a 200 proves
  nothing on this site: `experiments.baseUrl` is `/app` and the web export is
  `output: "single"`, so every path under `/app` returns the same 2751 byte
  shell. `diff` of the two fetched HTML files reports them identical.

  1. Bundle check. `node scripts/verify-published-page.mjs` exit 0 for both.
     `/app/support` carries "Get help", "A person reads every message", "Ask us
     anything" and "help@towinly.com". `/app/privacy` carries "Who else touches
     your information", "Amazon keeps your photos and identity documents" and
     "Groq writes the answers". Bundle
     `entry-926de61279975bf29cc53cb327675faa.js`, 3072KB.
  2. Render check. Chromium at 440 x 956 through Playwright 1.62.1.
     `/app/support` renders 1829 visible characters starting "Get help" and
     including all six sections and the draft-free support copy. `/app/privacy`
     renders 6951 visible characters starting "Privacy policy", then the draft
     notice, then "What we collect".

  Both addresses respond with `x-robots-tag: noindex`, which is deliberate.
  `__tests__/support-page.test.js` passes 9 of 9. **What is left is [owner]
  only: typing the two addresses into App Store Connect and Play Console.** Use
  `https://www.towinly.com/app/privacy` and
  `https://www.towinly.com/app/support`. Do not use
  `https://www.towinly.com/privacy`: that is an older document with no contact
  address and a location paragraph describing a device setting the app does not
  have.
- [x] **Aggregate the iOS privacy manifest, before there is a build.** DONE
  2026-08-15. `App/docs/store/privacy-manifest-aggregate.md` holds the union of
  the 8 library manifests found under `App/node_modules`: 4 API categories, 7
  reason codes quoted verbatim from Apple, `NSPrivacyTracking` false and
  `NSPrivacyCollectedDataTypes` empty in every one. Diffed row by row against
  `privacy-labels.md` section 1: no contradiction. `ios.privacyManifests` was
  deliberately NOT added to `app.json`, with the reasoning and the condition
  that would flip it recorded in section 5 of that document.
  `App/__tests__/privacy-manifest.test.js` re-globs on every run and fails on a
  new API type, reason code, tracking domain or declared collection.

  Two gaps this static pass could not close, named rather than glossed:
  Hermes is on Apple's list of SDKs that must ship a manifest and its binary
  arrives at `pod install`, so it is not on disk to check; and 17 of the 20
  native dependencies ship no manifest at all, which is allowed but is not
  proof. Both are written up in section 6 of the aggregate.
- [ ] **Adopt the listings and repin the test.** [repo] Copy the approved
  fields from `App/docs/store/listings.md` into the pinned blocks of
  `docs/store-listing.md` at the project root and rerun `npx jest store-listing`
  so `App/__tests__/store-listing.test.js` guards the real fields. Update the
  pinned `screenshot-captions` block to the 8-caption set in
  `App/docs/store/screenshots-and-review.md` at the same time. Blocks a safe
  console paste: unpinned copy can drift after edits.
- [x] **Capture the last three planned shots.** DONE 2026-08-15. See the owner
  list above for the evidence.
- [ ] **Bake the remaining shots to both store sizes.** [repo] Five of eight
  are baked, into `App/docs/store/screenshots/final/ios/` and `.../play/` by
  `App/scripts/bake_screenshots.py`, which enforces the parchment band,
  Newsreader 400, no shadow, no decorative blue, and asserts on any em dash.
  Apple needs one screenshot and Play needs two, so five clears both minimums
  today. Verify every baked file by machine: exact pixel size, `sips -g
  hasAlpha` reporting no, light mode, and no em dash in any caption. Wrong
  sizes and alpha channels fail at upload time.

### The one canonical screenshot path

**`App/docs/store/screenshots/final/ios/` and
`App/docs/store/screenshots/final/play/`.** Every other path is a copy.

Three reasons, in order of weight:

1. `git rev-parse --show-toplevel` returns
   `/Users/aghar/Documents/Projects/ToWin App/App`. The project root holds no
   git repository at all, so the previously named `docs/store-images/` sits
   outside version control. A store upload asset that no commit records is an
   asset nobody can roll back.
2. `App/scripts/bake_screenshots.py` already writes to the `final/` folders, so
   the tooling and the path agree with no change.
3. The 13 raw captures and every screenshot document already live under
   `App/docs/store/`. Splitting raw from baked across two trees is how the
   wrong image gets uploaded.

`docs/store-images/` at the project root keeps the two assets that are already
there and are read by `App/__tests__/store-listing.test.js`: the Play feature
graphic and the Play hi-res icon. It holds no screenshots.

---

## 4. Corrected on 2026-08-15

Each entry gives the old wording, the new verdict and the evidence that settled
it. History is kept so a future reader can see what moved and why.

**1. photosPermission was listed as open. It is done.**
Old wording: "Reword `photosPermission` in `App/app.json`. The string covers
only the profile picture, but `App/app/profile-edit.jsx` uses the same picker
to upload a government ID to `/auth/verify-id`."
Why it changed: the string in `app.json` line 65 already names both uses. It
was reworded at some point after the checklist was written on 2026-08-12 and
the box was never ticked. Checked against `app/profile-edit.jsx` lines 156, 179
and 204, which confirm one shared picker and two callers.

**2. The support page was listed as going live on the next deploy. It is
already live.**
Old wording: "It goes live at that address on the next deploy, so DEPLOY BEFORE
typing it into App Store Connect."
Why it changed: both `/app/support` and `/app/privacy` answer 200 today and
both render the correct document in a real browser. The deploy happened. The
repo half of the box is closed and only the console paste remains.

**3. The PostHog check was listed as an open owner action. It is answered, and
the answer is not the one the labels assume.**
Old wording: "Run `railway variables` on the production backend and check
`POSTHOG_API_KEY`. If it is set, the server captures a signup event keyed on
the plaintext email."
Why it changed: the Railway CLI on this machine is already authenticated as the
account holder, so the read-only variable listing could run. `POSTHOG_API_KEY`
is set. `App/docs/store/privacy-labels.md` section 5 item 1 now records the
answer instead of the question, and the affected rows are flagged there.

**4. The final screenshot path pointed outside version control.**
Old wording: "saved under `docs/store-images/screenshots/ios/` and
`.../play/`."
Why it changed: the git repository root is `App/`, so that path is unversioned.
The canonical path is now `App/docs/store/screenshots/final/`, which is where
`bake_screenshots.py` already writes. Reasoning is in section 3.

**5. Linking the EAS project was labelled a repo action. It starts as an owner
action.**
Old wording: "Link the EAS project. Run `eas init` ... under the owner's
logged-in Expo account and commit the result."
Why it changed: `eas whoami` prints `Not logged in`, and `eas login` opens a
browser. The repo cannot start this. The label is now [owner then repo] so the
dependency is visible from the list rather than from the sentence.

**6. Baking screenshots was ticked as done. It is five of eight.**
Old wording: "Bake the store-ready versions. DONE."
Why it changed: `ls App/docs/store/screenshots/final/ios` returns 5 files, and
the plan in `screenshots-and-review.md` is 8. Five clears both store minimums,
so nothing is blocked, but the box was overstating the work.

---

When every box above is checked, the remaining path is mechanical: production
build with `eas build`, deliver with `eas submit`, paste the listing fields,
attach the screenshots, and send both submissions for review with the notes
from `App/docs/store/screenshots-and-review.md` section 2. Work it from
`App/docs/store/PAY-DAY-RUNBOOK.md`, which orders every step for enrollment day.
