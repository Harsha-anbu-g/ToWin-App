# Launch action checklist

**Read `README.md` in this folder first.** It is the entry point, it holds the
consolidated timeline, and it settles the places where these documents disagree.
Three items below were corrected on 2026-08-12 after checking the code and the
live site; see README section 5.

Ordered list of everything still standing between this repo and both stores.
Two lists: what only the owner can do (money, accounts, humans), and what the
repo can close (code, config, docs). Work the lists top to bottom; the order
inside each list is dependency order. Sources: the submission assessment of
2026-08-11, `App/docs/store/listings.md`, `App/docs/store/privacy-labels.md`,
`App/docs/store/screenshots-and-review.md`.

---

## 1. Owner actions (accounts, payments, people)

- [ ] **Enroll in the Apple Developer Program, 99 USD per year.**
  Blocks launch because no App Store Connect app record can exist without it,
  and every iOS item below depends on that record.
- [ ] **Get a DUNS number first if enrolling as a company.** Apple requires a
  DUNS number for organization accounts; individual enrollment skips this but
  shows the personal name as the seller on the store. Blocks Apple enrollment
  for a company account, so decide before starting the 99 USD step.
- [ ] **Register a Google Play Console developer account, 25 USD one time.**
  Blocks launch because there is no Play listing, no closed-testing track,
  and no Data safety form without it.
- [ ] **Complete the tax, banking and identity forms in both consoles**
  (Apple agreements in App Store Connect, payments profile and identity
  verification in Play Console). Blocks launch because both consoles refuse a
  public release until agreements are accepted and identity is verified.
- [ ] **Create the App Store Connect app record and a Play service account,
  then hand over three values**: `ascAppId`, `appleTeamId`, and the Play
  service account JSON path. `App/eas.json` `submit.production` is empty
  today and `eas submit` cannot deliver builds to either console without
  them. Blocks the automated submit path for every build.
- [ ] **Run `railway variables` on the production backend and check
  `POSTHOG_API_KEY`.** If it is set, the server captures a signup event keyed
  on the plaintext email, and both privacy forms must then declare Email plus
  Analytics shared with a third party. See `App/docs/store/privacy-labels.md`
  section 5. Blocks launch because submitting the forms without this check
  risks a false privacy declaration, which is a policy strike on both stores.
- [ ] **Enter the privacy answers in both consoles** from
  `App/docs/store/privacy-labels.md` (Apple App Privacy questionnaire, Play
  Data safety form). Only the account holder can fill console forms. Blocks
  launch because neither store accepts a submission without them.
- [x] **Capture the raw store screenshots.** DONE 2026-08-11. Thirteen captures
  in `App/docs/store/screenshots/`, every one at 1320 x 2868 (Apple's iPhone 6.9
  inch size), taken from the live phone web build with real seeded data on all
  three demo seats. No Xcode, Android SDK or physical phone was needed.
- [x] **Bake the store-ready versions.** DONE. Five shots rendered to both store
  sizes under `App/docs/store/screenshots/final/ios/` and `.../play/` by
  `App/scripts/bake_screenshots.py`, which enforces the parchment band, Newsreader
  400, no shadow, no decorative blue, and asserts on any em dash. Apple needs one
  screenshot and Play needs two, so five clears both minimums now.
- [ ] **Capture the last three planned shots.** Three captions in the 8-shot plan
  have no shot that honestly supports them: the HELPER trust split for caption 4,
  a real chat thread for caption 5, and the family parent page with a green
  check-in chip for caption 6. Reasons and exact steps are in
  `App/docs/store/screenshot-inventory.md`. Does not block submission, improves it.
- [ ] **Recruit 12 testers for Google's closed test and keep them enrolled 14
  consecutive days.** Required before a personal Play account gets production
  access. Blocks the Android launch and is the longest single item, about
  three weeks including setup, so start it as soon as the Play account
  exists.
- [ ] **Decide on the lawyer review of the legal pages.** Both policies ship
  with a visible draft notice (`App/src/data/legalContent.js`, `DRAFT` flag,
  dated 2 Aug 2026) and open items such as governing law. Neither store
  demands lawyer sign-off, so this blocks credibility rather than review:
  the draft banner is on screen for every reviewer and every user.

## 2. Repo actions (code, config, docs)

- [ ] **Link the EAS project.** `App/app.json` has no `extra.eas.projectId`,
  so the channel fields in `App/eas.json` are inert and no store build can be
  produced. Run `eas init` (and `eas update:configure` if updates are ever
  wanted) under the owner's logged-in Expo account and commit the result.
  Blocks launch because without it there is no binary to submit.
- [ ] **Reword `photosPermission` in `App/app.json`.** The string covers only
  the profile picture, but `App/app/profile-edit.jsx` uses the same picker to
  upload a government ID to `/auth/verify-id`. Also tracked in
  `App/docs/store/privacy-labels.md` section 5. Blocks launch because Apple
  compares purpose strings with observed behavior and an underscoped string
  is a metadata rejection.
- [ ] **Enter the app privacy URL, and decide a Support URL.** Use
  `https://www.towinly.com/app/privacy` in both consoles. It was rendered on
  2026-08-12 and carries the full processor list and help@towinly.com. Do not
  use `https://www.towinly.com/privacy`: that is an older document with no
  contact address and a location paragraph describing a device setting the app
  does not have. **The Support URL now exists:** use
  `https://www.towinly.com/app/support`. It was built on 2026-08-12 as
  `App/app/support.jsx`, carries no auth guard so a signed-out reviewer lands on
  real help, names help@towinly.com as selectable text, and links onward to the
  deletion page. `__tests__/support-page.test.js` pins the route, the baseUrl
  contract and the no-overclaim rules (9 tests). It goes live at that address on
  the next deploy, so DEPLOY BEFORE typing it into App Store Connect.
  Correction: an earlier version of this item said the Vercel legal-contact env
  var was unset, so the pages showed no address. That was fixed in code
  (`src/data/legalContent.js` falls back to help@towinly.com) and is retired.
- [ ] **Diff the iOS privacy manifest on the first EAS build.**
  `App/app.json` sets no `ios.privacyManifests`; Expo SDK 54 aggregates
  library manifests at prebuild. Extract the aggregated
  `PrivacyInfo.xcprivacy` from the first iOS build artifact and diff it
  against `App/docs/store/privacy-labels.md` section 1. Blocks launch because
  a manifest that contradicts the entered labels is an App Review rejection.
- [ ] **Adopt the listings and repin the test.** If the searcher-first fields
  in `App/docs/store/listings.md` are approved, copy them into the pinned
  blocks of `docs/store-listing.md` at the project root and rerun
  `npx jest store-listing` so `App/__tests__/store-listing.test.js` guards
  the real fields. Update the pinned `screenshot-captions` block to the
  8-caption set in `App/docs/store/screenshots-and-review.md` at the same
  time. Blocks a safe console paste: unpinned copy can drift after edits.
- [ ] **Render the final screenshot files.** From the raw captures, bake the
  caption bands per the rules in `App/docs/store/screenshots-and-review.md`
  and export both sets: 1320 x 2868 for the App Store, 1080 x 1920 for Play,
  saved under `docs/store-images/screenshots/ios/` and `.../play/`. Verify
  exact pixel sizes, no alpha channel (`sips -g hasAlpha`), light mode, and
  no em dash in any baked caption. Blocks launch because wrong sizes or alpha
  channels fail at upload time.

---

When every box above is checked, the remaining path is mechanical: production
build with `eas build`, deliver with `eas submit`, paste the listing fields,
attach the screenshots, and send both submissions for review with the notes
from `App/docs/store/screenshots-and-review.md` section 2.
