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
- [x] **Decide individual or organization enrollment.** DECIDED 2026-08-15:
  **individual**, chosen by the owner in session. The seller name will be the
  owner's legal personal name; confirm it against the government photo ID
  before enrolling. The DUNS item in section 2 no longer applies. Analysis and
  the conditions that would reopen it: `App/docs/store/enrollment-decision.md`.
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
- [x] **Bake all eight screenshots.** DONE 2026-08-15. Sixteen files, eight per
  store, in `App/docs/store/screenshots/final/ios/` and `.../play/`, named by
  upload slot so the folder sorts in listing order. Every one measured with
  `sips`: iOS all 1320 x 2868, Play all 1080 x 1920, `hasAlpha: no` and RGB on
  all sixteen, 148 KB to 571 KB. Em-dash grep over the captions returns 0.
  Guarded by `App/__tests__/store-screenshots.test.js`, 23 tests, proven to
  fail on a wrong size, an alpha channel, a missing shot and an em dash.
  The three captures from APL-804 were re-shot at phone scale first: see
  `App/docs/store/screenshots/superseded/README.md`.
- [x] **Adopt the listing fields and repin the test.** DONE 2026-08-15. The
  approved fields from `App/docs/store/listings.md` are in the pinned blocks of
  the root `docs/store-listing.md`, and `App/__tests__/store-listing.test.js`
  now guards the real text at 39 tests, up from 34. Confirmed on 2026-08-15 by
  re-running `npx jest store-listing`: 39 passed.
- [x] **Answer every console question that does not need the account open.**
  DONE 2026-08-15. One sheet for both stores at
  `App/docs/store/console-answers.md`: console label on the left, answer on the
  right. Age rating every question with its reason, export compliance,
  advertising identifier proved by scan rather than assumed (956 installed
  packages, 0 hits; 0 IDFA symbols; `NSPrivacyTracking` false in all 8 bundled
  manifests), category, price, territories, the whole Play IARC questionnaire,
  and the review notes at 3967 of Apple's 4000 characters. All three demo seats
  re-verified against the live production backend the same day: 15 requests, 15
  HTTP 200s, with connection counts, unread counts and trust progress recorded
  as numbers. Guarded by `App/__tests__/console-answers.test.js`, 12 tests,
  each proven to fail on a real defect. Section 10 of the sheet lists the 20
  items that genuinely need an account open.
- [x] **Write the pay-day runbook.** DONE 2026-08-15.
  `App/docs/store/PAY-DAY-RUNBOOK.md`, 309 lines, eight parts in the order the
  day runs: before you pay, the payment, the first thirty minutes, the listing
  paste, screenshots, privacy answers, the iOS submit, and the Play track with
  its own timeline. Every field points at the one file that owns it rather than
  repeating it. Closes with an honest still-open list and the end-of-run
  verification table.
- [x] **Create a free Expo account and run `eas login` then `eas init`.**
  DONE 2026-08-15. Account `harshavardhan_ag` (agharsha.anbu@gmail.com),
  project created and linked: `@harshavardhan_ag/towinly`, ID
  `6cf0141c-c99a-4663-87df-12f271989e7b`, written to `app.json` with
  `owner: harshavardhan_ag` pinned so builds never land in the auto-created
  team account. Verified with `eas project:info`.
- [x] **Send a test message to help@towinly.com and confirm a person receives
  it.** DONE 2026-08-15, confirmed by the owner in session: the mail arrives
  and a person reads it. Five public pages, both store contact fields and App
  Review all write to that address. Apple writes to it first.

---

## 2. Owner actions (accounts, payments, people)

- [x] **Enroll in the Apple Developer Program, 99 USD per year.** PAID
  2026-08-16 as an individual, via web enrollment at
  `developer.apple.com/enroll`. The Developer app's ID scanner rejected the
  government photo ID for the Canada region ("Invalid Submission"), so the web
  route was used: no scanner, and identity questions go to a human if Apple
  asks at all. Awaiting activation: usually 1 to 2 days, budget a week. Watch
  agharsha.anbu@gmail.com for the confirmation and for any document request.
- [x] **Get a DUNS number first if enrolling as a company.** NOT APPLICABLE:
  the owner decided individual enrollment on 2026-08-15, which skips the DUNS
  number entirely and shows the personal legal name as the seller. Kept here
  in case the decision is ever reopened per `enrollment-decision.md` section 6.
- [ ] **Register a Google Play Console developer account, 25 USD one time.**
  DEFERRED by owner decision 2026-08-16: **launch is App Store first, Play
  later.** The same-day advice stands whenever Play starts: registration,
  identity check and the 12-tester 14-day gate mean Android goes live roughly
  5 to 6 weeks after the day this account is created. India is a
  majority-Android market, so the India launch effectively waits with it.
  Every Play item below inherits this deferral.
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

  **RESOLVED 2026-08-15: the key is gone.** The owner chose to clear it.
  `POSTHOG_API_KEY` was deleted from the `backend` service in production,
  verified by a read-back (38 variables remain, the key absent), and the
  backend was redeployed the same hour so the running server dropped it from
  memory. `PostHogService` is a documented no-op with a blank key, so the
  privacy labels in `App/docs/store/privacy-labels.md` stand exactly as
  written and no legal page changes. The three formerly blocked rows are
  resolved to No / not shared in that file, section 5 item 1.
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
- [x] **Send a test message to help@towinly.com.** DONE 2026-08-15, owner
  confirmed. See section 1.

---

## 3. Repo actions (code, config, docs)

- [x] **Link the EAS project.** DONE 2026-08-15. `eas init` wrote
  `extra.eas.projectId: 6cf0141c-c99a-4663-87df-12f271989e7b` into
  `App/app.json`, `owner: harshavardhan_ag` pinned alongside it, and
  `eas project:info` confirms `@harshavardhan_ag/towinly`. The channel fields
  in `App/eas.json` are live now: a store build can be produced the moment the
  paid accounts exist.
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

  One gap this static pass could not close, named rather than glossed: 17 of the
  20 native dependencies ship no manifest at all, which is allowed but is not
  proof. Written up in section 6 of the aggregate.

  A second gap was listed here and has since been closed. Hermes was held open
  on the reading that Apple's `hermes` list entry meant Meta's JavaScript engine.
  It means Imgur's SDK. Apple DTS confirmed it on developer forums thread 759394,
  and Meta's engine ships as `hermes-engine`. This app owes no Hermes manifest.
  Section 7 of the aggregate keeps the reasoning so it is not re-opened.
- [x] **Adopt the listings and repin the test.** DONE 2026-08-15. Same item as
  the one above, recorded twice in this file. The pinned blocks of the root
  `docs/store-listing.md` carry the approved fields and the 8-caption
  `screenshot-captions` block, and `npx jest store-listing` passes 39 of 39.

- [x] **Capture the last three planned shots.** DONE 2026-08-15. See the owner
  list above for the evidence.
- [x] **Bake the remaining shots to both store sizes.** DONE 2026-08-15. All
  eight are baked to both sizes by `App/scripts/bake_screenshots.py`, which
  enforces the parchment band, Newsreader 400, no shadow, no decorative blue,
  and asserts on any em dash in a caption or sub-caption. Filenames carry the
  upload slot, `01` to `08`, so each folder sorts in listing order. Machine
  verification of all sixteen is in section 5 of
  `App/docs/store/screenshot-inventory.md`, and
  `App/__tests__/store-screenshots.test.js` re-runs the same checks on every
  `npx jest`.

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
