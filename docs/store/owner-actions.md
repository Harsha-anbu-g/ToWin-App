# Owner actions: what only you can do

Everything in this file needs a person with credentials, a console session, a
paid account, or a decision that is not a repository's to make. Nothing here can
be done by an agent, and nothing here was done for you.

Written 2026-08-22 at the end of the store-hardening run (HARD-099 to
HARD-118), on branch `ralph/store-hardening`.

## Read this first

- **No `eas build` was run in this loop. No `eas submit` was run either.** No
  build quota was consumed and no binary was produced. Version 1.1.0 build 10,
  already in App Store Connect, is still the most recent upload.
- **Nothing was pushed to any remote.** `git log origin/main..HEAD` lists 28
  local commits, 20 of them from this run. They are yours to review and push.
- **Nothing was spent.** No enrolment, no purchase, no interactive login.
- **`ToWin/` was not written to.** It is the read-only reference and it stayed
  that way.
- Every item below names the exact text or value to enter. Where a sentence is
  quoted, paste it as written: each one is checked against the running code and
  several are pinned by tests.

---

## 1. App Store Connect: App Privacy questionnaire

Source of truth: `privacy-labels.md` section 1. Do not answer from memory.

**Data Used to Track You:** None.
**Data Not Linked to You:** None.
**Data Linked to You: 12 types**, every one App Functionality, every one Used
for Tracking: No. The twelve are Name, Email Address, Phone Number, Other User
Contact Info, Coarse Location, Emails or Text Messages, Photos or Videos,
Customer Support, Other User Content, User ID, Device ID, Other Data Types.

The count used to be recorded as eleven while the table held twelve rows. It is
now recomputed by `__tests__/store-docs-numbers.test.js`, so the number in the
document is the number of rows in the table.

**Never claim end-to-end encryption** in this questionnaire or the listing. The
Sealed box is encrypted by the backend, the app holds no key, and the privacy
policy says so.

## 2. App Store Connect: the location capability answer (HARD-101)

Section 3.2, capability questions. Type this, word for word:

> Approximate only. Two sources, both rounded. The member types a town and the
> server geocodes it, or the phone is read on one of four screens and the fix is
> snapped to a ~2 km cell before it leaves the device
> (`src/lib/coarseLocation.js`). Other members see a town name and a rounded
> distance, never a point on a map.

The old answer is struck through here so that no eye and no grep can lift it
out of this page by mistake: ~~Approximate only, and never read from the
device. A hand typed town and a rounded distance.~~ **Do not paste that one.**
It stopped being true on 2026-08-19 when `expo-location` was installed.

## 3. Age rating

A self-declared date of birth with an 18 minimum. **Do not claim age
verification.** `app/(auth)/register.jsx` sets `MIN_AGE = 18` and its submit
handler refuses a younger date of birth with "You have to be 18 or over to join
Towinly." No document check happens anywhere.

Expect a Teen tier rather than Everyone, because of open member-to-member
messaging. That is the correct outcome. Do not inflate a content answer to raise
it and do not understate the moderation controls to lower it.

## 4. App Review Notes (HARD-102)

Paste the block in `console-answers.md` between the `review-notes-v1:start` and
`review-notes-v1:end` markers. It is 3,991 characters against Apple's 4,000
limit, and `__tests__/console-answers.test.js` checks that number against the
real block on every test run.

That block is the only copy to paste. Two things in it were wrong until this
run:

- It denied the one-tap demo buttons. Old wording, struck through:
  ~~The one-tap demo buttons are compiled out of production builds on purpose,
  so do not look for them.~~ They ship on purpose (`EXPO_PUBLIC_SHOW_DEMO=1` in
  `eas.json`, an owner decision of 2026-08-16). The correct sentence is:
  "One-tap demo buttons sit below the login form, one per seat, and they ship in
  the production build on purpose. The fields also take these, typed by hand:".
- It said private messages relied on report and block rather than the word
  filter. Since HARD-113 the filter runs on the chat composer and on the family
  review too, so the sentence is now "a write time word filter on bios, help
  requests, Pass On entries, private messages and family reviews" plus "Report
  and block cover the rest."

Demo credentials, re-checked against `DemoCard.jsx` today:

| Seat | Identifier | Password |
|---|---|---|
| Elder | `elder` | `12345678` |
| Helper | `helper` | `123456789` |
| Family | `demo.sarah@towin.app` | `DemoSarah!2026` |

## 5. The store description (HARD-114)

App Store Connect Description and Play Console Full description, United States
listing, FOR HELPERS section, third bullet.

**Remove:**

> • Each person you help can earn you up to 15 points: 7 for the trust steps, 5 for their review, 3 for your profile.

**Paste:**

> • Each person you help can earn you up to 15 points: 7 for the trust steps, 5 for their review, 3 for your profile. Reviews are written on the Towinly website.

The description is 1,673 of 4,000 characters after the change. The corrected
text is already in `docs/store-listing.md` on disk; only the console needs
typing.

Why the sentence rather than a cut: an elder and a helper cannot write a review
in the app, and the listing read as though they could. The five points are real
and the backend awards them, so deleting them would describe a 10-point score
while the app describes 15. If you would rather cut them, the alternative
wording is in `ralph-hardening/progress.txt` under HARD-114.

## 6. Screenshots (HARD-117)

**Done, and they need your eye before upload.** All eight were re-captured on
2026-08-22 from `ralph/store-hardening` and both store sizes are rendered:

- `docs/store/screenshots/final/ios/`, 8 files, 1320 x 2868
- `docs/store/screenshots/final/play/`, 8 files, 1080 x 1920

The previous set is kept in
`screenshots/superseded/2026-08-11-pre-normal-density/`. Nothing was deleted.

Open the eight and look at them. A test can prove the size, the missing alpha
channel and the captions; it cannot tell you whether a screen looks right.

If they ever need re-capturing, the recipe is in `screenshot-inventory.md` and
the steps that worked are in `ralph-hardening/progress.txt` under HARD-117:
a local CORS shim to the production backend, `expo start --web`, and Playwright
at viewport 440 x 956, deviceScaleFactor 3, colorScheme light, with the web-only
Refresh button hidden.

## 7. Legal: the items that need counsel, not an agent (HARD-111)

The privacy policy's retention section now states what the code does. Three
things remain, and none of them is a code change:

1. **The backup window is still unknown.** Nothing in the repository establishes
   how long a copy of the database can sit in a backup: a grep for "backup"
   across the backend, its Dockerfile, `railway.json`, `docker-compose.yml` and
   `SECURITY.md` returns nothing outside test directories. Railway hosts the
   database, so this is a console setting and your decision. Once decided, it
   goes in three places together: the policy's retention section, the deletion
   page's "How soon it happens", and the test that currently pins the deletion
   page's honest "we have not fixed how long".
2. **Governing law and the liability clause.** Unchanged in this run on purpose.
   A lawyer signs these; an agent drafts at most.
3. **The DRAFT banner stays.** That is your recorded decision, the file header
   says so, and `__tests__/legal-retention-claim.test.js` now pins its exact
   words so nobody removes it by accident. No guideline forbids it.

## 8. Backend: server-side blocking (HARD-106)

Not built here: `ToWin/` is read-only in this run, and the app-side half is all
the phone can honestly do. Until this lands, a block does not survive a
reinstall, does not reach a second device, and does not apply on the web build,
because the list lives in SecureStore under a per-account key on that one phone.
The app now says so in the confirm dialog rather than implying otherwise.

What the backend needs:

1. A `blocks` table: `blocker_user_id`, `blocked_user_id`, `created_at`, unique
   on the pair. Honour both directions when filtering.
2. `POST /blocks`, `DELETE /blocks/{blockedUserId}`, `GET /blocks` so a fresh
   install can hydrate.
3. Filter at the source: `/discover`, `/connections`, `MessageService.send`
   (refuse with the same 409 shape the composer lock already understands), and
   the `/needs` listings.
4. Keep ending a connection a separate call, so a block still works where there
   was never a friendship.
5. On first call after the app updates, post the device list up so nobody loses
   protection they already set.

A blocked person must never be told they were blocked, and the block must not
appear in any notification, alert or feed to them.

## 9. Still open from the older checklists

| # | Item | Why it is yours |
|---|---|---|
| A2 | The app name is written two ways | A store record takes the name once; changing it later needs a version review |
| A4 | A reviewer testing deletion can destroy a demo seat | Seed a spare seat, or warm the demo id cache on backend start |
| B1 | Apple Developer Program, 99 USD a year | Active since 2026-08-16 |
| B2 | Google Play registration, 25 USD once, plus identity verification | Not started |
| B3 | `com.towinly.app` global uniqueness | Checked at App ID registration |
| B4 | iOS signing credentials | EAS makes these on the first production build |
| B5 | `eas.json` `submit.production` Android half | The iOS half is filled: `ascAppId 6802125342`, `appleTeamId G6RRNXL9BV`. Android still needs a service account key |
| B6 | Console forms: App Privacy, Data safety, age rating, target audience | Sections 1 to 3 above |
| B7 | Play closed test: 12 testers, 14 consecutive days | The longest item. Start it the day the Play account exists |

## 10. The commands this loop did not run

Run these yourself, in this order, when you are ready. Each one costs build
quota or reaches a store.

```
cd App
eas login                     # opens a browser; the loop cannot start this
eas build --platform ios --profile production
eas submit --platform ios --profile production
```

`app.json` already carries `owner: harshavardhan_ag` and
`extra.eas.projectId: 6cf0141c-c99a-4663-87df-12f271989e7b`, so neither command
needs to write to it mid-build.

Before any of that: review the 20 local commits from this run and push them
yourself. Nothing in this loop pushed anything anywhere.
