# Towinly store launch: start here

One entry point for every store document in this folder. Read this page first,
then open only the document you need.

- **App:** Towinly, `com.towinly.app`, version 1.1.0, Expo SDK 54 (pinned).
  Build 10 of 1.1.0 is already uploaded to App Store Connect.
- **Markets:** United States and India.
- **Verdict today:** the app itself is ready. Every remaining blocker is an
  account, a mailbox, a console form, or a decision. None of them is app code.
- **Last verified:** 2026-08-22, on branch `ralph/store-hardening`. Every number
  on this page is recomputed from the tree by
  `App/__tests__/store-docs-numbers.test.js`, so a stale figure fails the suite
  rather than waiting to be noticed.

---

## 1. The verdict in one line each

| | Verdict | What stands in the way |
|---|---|---|
| **iOS** | **Ready to build. Not ready to submit.** | Apple account is not open yet. Support URL does not exist. The app name is written two different ways in two files. |
| **Android** | **Ready to build. Not ready to submit, and it is the slower one.** | Play account is not open. The 12 tester and 14 day closed test cannot start until it is, and that clock is about three weeks. |

The single most useful fact on this page: **Android is the long pole, not iOS.**
Google makes a new personal developer account run a closed test with at least
12 testers enrolled for 14 consecutive days before it will grant production
access. One day below 12 testers restarts the run. Start the Play account the
same day as the Apple one, or Android ships three weeks after iOS.

---

## 2. What each document is

Read them in this order the first time.

| Document | What it is | Read it when |
|---|---|---|
| **README.md** (this file) | The map, the verdict, the one true timeline. | First, and whenever two documents disagree. |
| **ACTION-CHECKLIST.md** | Short tick list, split into owner jobs and repo jobs. | You want the whole job on one screen. See the corrections in section 5 before you work it. |
| **APPLE-DAY-ONE-RUNBOOK.md** | 934 lines, 17 numbered steps for the day the Apple account opens. Every EAS command was checked against eas-cli 21.7.0 itself. | The morning the Apple account goes live. Keep it open beside the terminal. |
| **app-store-connect-fields.md** | Every field in App Store Connect with the answer to type, plus the paste ready App Review notes at 3432 characters. | You are sitting in the console filling boxes. |
| **ios-build-readiness.md** | Proof the iOS binary compiles and is store legal. Prebuild, Hermes bundle, icon, purpose strings, encryption flag. | You want evidence the app side is done. |
| **ios-content-readiness.md** | Everything around the binary: privacy policy URL, support URL, demo accounts, age rating, account deletion. | Before you promise Apple anything in a form. |
| **PAY-DAY-RUNBOOK.md** | The single ordered page for the hour the account opens: before you pay, the payment, the first thirty minutes, the listing paste, screenshots, privacy answers, the submit, the Play track, and what is still open. Links to the owning file for every field. | On enrollment day, and nothing else open beside it. |
| **enrollment-decision.md** | Individual or organization, what each publishes as the seller name, what it does not change, the D-U-N-S path, and a recommendation with the condition that would flip it. | Before the 99 USD is spent. It is the one choice that is expensive to undo. |
| **submit-config.md** | The three values `eas submit` needs, where each one lives, the paste ready `submit.production` block, and `npm run submit:config` which writes it after validating all three. | The hour the accounts open, before the first submit. |
| **play-console-parallel-track.md** | The whole Android track, including the 14 day test, the tester roster, and the recruitment messages. | The day the Play account opens. Run it beside the Apple runbook, not after it. |
| **privacy-labels.md** | Exact answers for the Apple App Privacy questionnaire and the Play Data safety form, each traced to a line of code. | Filling either privacy form. Do not improvise these. |
| **listings.md** | Title, subtitle, keywords and descriptions for four listings: Apple US, Play US, Apple India, Play India. | Writing the listing. Note the name clash in section 5. |
| **screenshots-and-review.md** | The 8 shot plan, the sizes, the baked captions, and the App Review notes. | Capturing and rendering screenshots. |
| **screenshots/** | 16 raw captures, `raw-01` to `raw-16`, plus the 8 baked iOS shots under `final/ios/`. | Rendering the final store images. |

Two documents live outside this folder and are still load bearing:

- `../../../docs/store-listing.md` at the project root. This is the file
  `App/__tests__/store-listing.test.js` actually reads. It passes today, 39 of 39 tests.
- `../../src/data/legalContent.js`. The policy and terms users agree to, and
  the source of the contact address on every legal page.

---

## 3. The blockers, and what is left of them

**Swept 2026-08-22 (HARD-116).** This section was written as 16 open blockers
on 2026-08-12. Eight of them have closed since. Rows are kept and marked rather
than deleted, so the list still reads as the full set. What is genuinely open
today: A2, A4, and all of group B except B5.

Grouped by whether they need a paid account. Nothing in group A is waiting on
Apple or Google, so all of it can close before enrollment.

### Group A: close these now, no paid account needed

| # | Blocker | Owner |
|---|---|---|
| A1 | ~~**No Support URL exists.**~~ **CLOSED.** `https://www.towinly.com/app/support` is live and renders `app/support.jsx`. Only the console paste remains. | Done |
| A2 | **The app name is written two ways.** Settle it before the App Store Connect record is created, because renaming later needs a version review. | Human decision |
| A3 | **help@towinly.com reaches a person.** CLOSED 2026-08-15: owner confirmed delivery. Five public pages, both store contact fields and App Review all write to it. | Human, done |
| A4 | **A reviewer testing account deletion can permanently destroy a demo seat.** | Backend, or seed a spare seat |
| A5 | ~~**EAS is not set up.**~~ **CLOSED.** `app.json` carries `owner: harshavardhan_ag` and `extra.eas.projectId: 6cf0141c-c99a-4663-87df-12f271989e7b`. A fresh shell still needs `eas login`. | Done |
| A6 | ~~**The production PostHog flag is unverified.**~~ **CLOSED 2026-08-15.** It was set, the owner cleared it, the backend redeployed, and the read-back showed the key absent. The privacy forms stand as written. | Done |
| A7 | ~~**The photo permission sentence is too narrow.**~~ **CLOSED.** `app.json` `photosPermission` now names the profile picture and the optional ID photo. | Done |
| A8 | ~~**No final screenshots exist.**~~ **CLOSED 2026-08-22.** 8 shots are baked under `screenshots/final/ios/` and `final/play/`, re-captured from the current UI and guarded by `__tests__/store-screenshots.test.js`. What remains is the owner's eye on them before upload. | Repo done, human review |

### Group B: these need the paid accounts

| # | Blocker | Owner |
|---|---|---|
| B1 | Apple Developer Program enrollment, 99 USD a year. The individual-or-organization decision is made: **individual**, 2026-08-15. | Human |
| B2 | Google Play developer registration, 25 USD once, plus identity verification. Takes 1 to 3 days. | Human |
| B3 | `com.towinly.app` has never been checked for global uniqueness. Registering the App ID is the last cheap moment to find a clash. | Human, enrollment day |
| B4 | iOS signing credentials. EAS makes these on the first production build. | Human, enrollment day |
| B5 | ~~`eas.json` `submit.production` is empty.~~ **CLOSED for iOS.** It now holds `appleId`, `ascAppId 6802125342` and `appleTeamId G6RRNXL9BV`. Android still needs a service account key, so this row stays open on the Play side only. | Human, Android half |
| B6 | Console forms: App Privacy, Data safety, age rating, content ratings, target audience. | Human |
| B7 | Play closed test: 12 testers, 14 consecutive days. | Human, longest item |
| B8 | Two checks that only exist after the first build: diff the aggregated `PrivacyInfo.xcprivacy` against `privacy-labels.md`, and confirm `ITSAppUsesNonExemptEncryption` is present and false in the built Info.plist. | Repo, after first build |

---

## 4. The one timeline

Three parts. Do them in order. Nothing here is optional.

### Part A. Before enrollment, this week

Everything below is free and none of it needs Apple or Google.

1. **Decide the app name.** Pick one and use it everywhere. The store record
   takes this name once, and changing it later needs a version review. Have a
   second and third choice ready, because names can already be taken.
2. **Decide the Support URL.** The fast answer is
   `https://www.towinly.com/app/delete-account`, which is live today and names
   a contact address. The better answer is a real `/app/support` page in this
   repo, about an hour of work.
3. **Send a test message to help@towinly.com and confirm it arrives.** DONE
   2026-08-15, owner confirmed. Apple writes to this address.
4. **Run `railway variables` on the production backend and read
   `POSTHOG_API_KEY`.** If it has a value, the server records a signup event
   keyed on the plain email, and several privacy answers flip to yes. If it is
   empty, `privacy-labels.md` stands as written.
5. **Protect the demo seats.** Seed a fourth throwaway account for the deletion
   test, or warm the demo id cache when the backend starts. Then sign in to all
   three demo seats again.
6. **Install and link EAS.** `npm install -g eas-cli`, then `eas login`, then
   `eas init`, then `eas update:configure`. Run each one deliberately and commit
   the `app.json` change it makes. If you skip this, the first build writes
   those values into `app.json` by itself, mid build.
7. **Reword the photo permission sentence** in `app.json` so it covers both the
   profile picture and the optional ID photo.
8. **Prove the native build compiles.** `eas build -p ios --profile simulator`.
   This needs only a free Expo account, no Apple membership and no signing. It
   is the last app side unknown.
9. **Capture and render the screenshots.** Eight shots, two sets: 1320 x 2868
   for Apple, 1080 x 1920 for Play. Check every file for exact size, no alpha
   channel, light mode, and no em dash in any baked caption.
10. **Adopt the listing fields.** Copy the approved fields into the root
    `docs/store-listing.md` and run `npx jest store-listing` so the test guards
    the real text.

### Part B. Enrollment day

Open `APPLE-DAY-ONE-RUNBOOK.md` and `play-console-parallel-track.md` side by
side and work them together. Apple first, Play in the gaps, because Play's
clock is the one you do not control.

1. **Enroll with Apple, 99 USD.** Individual is the recommendation for a one
   week clock. An organization account needs a legal entity and a D U N S
   number, and a D U N S request alone can take weeks. Individual publishes your
   own legal name as the seller.
2. **Register with Google Play, 25 USD, the same day.** Identity verification
   takes 1 to 3 days and everything Android waits on it.
3. **Accept the Apple Developer Program License Agreement** at first sign in.
   An unaccepted agreement makes later Apple steps fail with a vague
   authentication error. Towinly is free with no purchases, so no banking or tax
   forms are needed.
4. **Register the App ID `com.towinly.app`.** If it is taken, stop and change
   `app.json`. This is the only moment that discovery is cheap.
5. **Create the App Store Connect record by hand,** using the name from step A1.
   Do not let `eas submit` create it: the automatic path names the app from
   `app.json`, which is the single word Towinly, and that would ship the wrong
   listing title.
6. **Run the first production build.** `git status` must be clean first, because
   the build copies your working directory, uncommitted edits included.
7. **Fill the console forms** from `app-store-connect-fields.md` and
   `privacy-labels.md`.
8. **Upload the first Android build by hand.** The Play API only starts working
   after one manual upload, so `eas submit` is useful from release two onward.
9. **Start recruiting Play testers immediately.** Aim for 18 people to hold 12
   slots. The 14 day clock cannot start any earlier than this.

### Part C. After

1. **First TestFlight build:** run the two checks that could not be closed on
   the desk. Open a `towinly://` deep link and confirm it routes correctly, and
   confirm the encryption flag survived into the built Info.plist.
2. **Diff the privacy manifest** from the build against `privacy-labels.md`.
   Expo assembles it from library manifests, so a library can declare something
   nobody wrote.
3. **Watch for the ITMS-91053 email** after the first upload.
4. **Hold the Play closed test for 14 unbroken days.** Count testers daily. One
   day under 12 restarts everything.
5. **Submit iOS for review.** Choose manual release so both stores can go live
   on the same day rather than three weeks apart.
6. **Release both stores together** once Play grants production access.

---

## 5. Contradictions between these documents, and how they were settled

Each one was checked against the code or the live site, not argued from the
documents.

**1. Is the photo permission sentence a problem?**
`ios-build-readiness.md` calls the purpose strings complete and minimal.
`privacy-labels.md` and `ACTION-CHECKLIST.md` say the sentence is too narrow.
Both are half right. `pickImage()` in `app/profile-edit.jsx` is shared by
`changePhoto`, which sends `PUT /profile/photo`, and `uploadId`, which sends
`POST /auth/verify-id`. One permission covers both, so no new key is needed and
the list really is complete. The sentence still says only "so you can choose a
profile picture" while the same picker also takes a government ID.
**Settled: reword the sentence, do not add a key.** Tracked as A7.

**2. What is the app called?**
The root `docs/store-listing.md` says `Towinly: Trusted Help`. This folder's
`listings.md` proposes `Towinly: Elder Care Companion` for the US and
`Towinly: Senior Citizen Care` for India. The root file is the one
`__tests__/store-listing.test.js` reads, and it passes today at 39 of 39, so the
two cannot both stay green. **Settled: a human picks one, then both files change
together and the test is re-run.** Tracked as A2.

**3. Do the legal pages show a contact address?**
`ACTION-CHECKLIST.md` and `play-console-parallel-track.md` both list a blocker
saying the Vercel project never sets `EXPO_PUBLIC_LEGAL_CONTACT_EMAIL`, so the
pages render "has not set an address to write to yet".
**This is out of date and is not a blocker.** `legalContactEmail()` in
`src/data/legalContent.js` falls back to a hard coded `help@towinly.com` when
the variable is empty, which was audit fix V5. Both pages were rendered in a
browser to confirm: `/app/privacy` returns 6,951 characters including
help@towinly.com, and `/app/delete-account` returns 2,658 characters including
help@towinly.com and the seven day reply promise. Neither contains the "has not
set an address" sentence. **Retired.**

**4. Which privacy policy URL goes in the console?**
Both pages were rendered. `https://www.towinly.com/app/privacy` carries the full
processor list, Amazon, Twilio, OpenStreetMap, Groq and Railway, plus the
contact address. `https://www.towinly.com/privacy` is a different and older
document: no contact address and no processor list, so it names none of Amazon,
Twilio, OpenStreetMap, Groq or Railway. Its location paragraph is also a
paraphrase rather than the app's own wording: it does not say the position is
rounded on the phone before it is sent, which is the one promise the location
card makes to every person who taps it.
(Corrected 2026-08-22. This paragraph used to end "The app has no device
location at all, so that page describes a switch that does not exist." That was
true when it was written and stopped being true on 2026-08-19, when
`expo-location` was installed. The verdict is unchanged, for the reasons above.)
**Settled: use `https://www.towinly.com/app/privacy`. Never the other one.**

**5. Does a Support URL already exist?**
`https://www.towinly.com/support` answers HTTP 200, which makes a quick check
look fine. It is not a page. The response is byte for byte the same shell a
nonsense address returns, and rendering it sends the browser to `/login`. A
reviewer who opened it would land on a sign in wall. There is no `/support`,
`/help` or `/contact` route in the website source.
**Settled: still blocking.** Tracked as A1.

**6. How many screenshots are captured?**
`ACTION-CHECKLIST.md` says six raw captures. There are 13, `raw-01` to
`raw-13`. None is rendered to a store size yet. **Corrected in that file.**

**7. Is eas-cli available?**
`play-console-parallel-track.md` says `which eas` returns nothing.
**That is now out of date.** `which eas` returns
`/Users/aghar/.npm-global/bin/eas`, eas-cli 21.x installed globally, and it
reports a newer 22.0.0 as available. What is still missing is the account:
`eas whoami` prints `Not logged in`, and `App/app.json` has no
`extra.eas.projectId`. **Settled: the CLI is installed, the login and
`eas init` are not done.** Tracked as A5.

---

## 6. Truth pass of 2026-08-15

Three entries above were re-checked against the code, the live site and the
production backend, and three of the 16 blockers in section 3 moved. The full
evidence for each is in `ACTION-CHECKLIST.md` section 4. Where this page and
that one disagree, the checklist is newer.

**A1, "No Support URL exists", is closed.** `App/app/support.jsx` shipped and
deployed. `https://www.towinly.com/app/support` answers 200 and renders 1,829
visible characters of real help in Chromium, starting "Get help", with
help@towinly.com as selectable text and no auth guard. Contradiction 5 above
was about `https://www.towinly.com/support` on the website, which is still not
a page. Use the `/app/support` address. Only the console paste remains.

**A7, "The photo permission sentence is too narrow", is closed.**
`app.json` `photosPermission` now names both the profile picture and the
optional ID photo. Contradiction 1 above settled the analysis correctly and the
fix landed afterwards.

**A6, "The production PostHog flag is unverified", is answered AND acted on.**
`POSTHOG_API_KEY` was set on the production backend, so the server was sending
the plaintext email address to PostHog as the signup event id. The owner cleared
the key on 2026-08-15 and the backend redeployed; the read-back showed 38
variables with the key absent. Both privacy forms stand exactly as written in
`privacy-labels.md`, and section 5 item 1 there keeps the full trace.
(Corrected 2026-08-22. This paragraph ended "Do not submit either privacy form
until the owner picks one" for a week after they had picked.)

**A8, "No final screenshots exist", is partly closed.** All eight planned shots
are baked under `App/docs/store/screenshots/final/ios/`, which clears both store
minimums. The canonical output path is that folder and not `docs/store-images/`,
because the git repository root is `App/` and the project root is not versioned.
(Corrected 2026-08-22: this said five of eight, and `ls` returns eight. What
was actually wrong with them was their age: every one showed the pre-2026-08-17
UI. All eight were re-captured the same day from `ralph/store-hardening`, and
`npx jest store-screenshots` passes 23 of 23 against the new set.)

Checked and confirmed while resolving the above:

- All three demo logins answer HTTP 200 on the production API right now: elder,
  helper, and demo.sarah@towin.app. Re-check them on submission day.
- The PostHog risk was real, not theoretical. `AuthService.capture` in the
  reference backend sent `"pending:" + request.getEmail()` as the distinct id,
  so the plain email was the identifier. `PostHogService` does nothing when the
  key is blank, which is why clearing the production variable settled it.
- `eas.json` `submit.production` now holds `appleId`, `ascAppId` and
  `appleTeamId`, and `app.json` carries `owner` and `extra.eas.projectId`.
  (Corrected 2026-08-22. Both were empty when this line was written.)

---

## 6. House rules for anything written here

- **No em dashes, ever.** Not in a document, not in a store listing, not in text
  baked into a screenshot. Use a full stop, a comma or a colon. Every file in
  this folder was swept on 2026-08-12 and all are clean.
- **Expo SDK stays at 54.** The owner's phone runs an Expo Go client that
  supports 54 only.
- **The identifiers are frozen.** `com.towinly.app`, slug and scheme `towinly`.
  Never run a repo wide replace of the word towin, because storage keys and demo
  account emails still use the older spelling on purpose.
- **`ToWin/` is read only.** It is the website reference. Read it, never write
  to it.
- **Guideline 4.8 does not apply.** The Google sign in button returns null on
  anything that is not web, so no third party login ships in the store build and
  Sign in with Apple is not required. If a reviewer raises it, reply with that
  explanation. Do not add Sign in with Apple to settle an argument.
