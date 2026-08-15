# Pay day: the only document you need open

The hour you pay Apple, work this page top to bottom. Every step says what to
click, what to paste, and which file in this repo holds the value. No step asks
you to decide anything: the deciding was done before the money.

Written 2026-08-15 against `main` at `daa3fd7` plus the eight stories of the
pre-payment run. It describes the finished state of the repo, not the intended
one.

**Fields live in exactly one file each.** This page points at that file and
never repeats its contents, so nothing here can drift out of step with what you
paste.

| You need | It lives in |
| --- | --- |
| Every console question and its answer | `console-answers.md` |
| Title, subtitle, keywords, descriptions | `../../../docs/store-listing.md` at the project root, guarded by `App/__tests__/store-listing.test.js` |
| The Apple App Privacy and Play Data safety answers | `privacy-labels.md` |
| The 8 upload ready images per store | `screenshots/final/ios/` and `screenshots/final/play/` |
| The three submit values and the command that writes them | `submit-config.md` |
| Individual or organization | `enrollment-decision.md` |
| Every iOS click path in more detail than this page | `APPLE-DAY-ONE-RUNBOOK.md` |
| The whole Android track | `play-console-parallel-track.md` |

Frozen, never edited on the day: bundle identifier and Android package
`com.towinly.app`, Expo slug and scheme `towinly`, version `1.0.0`, Expo SDK 54.

---

## Part 0. Before you pay

Nothing here costs Apple money. All of it is slower to do at midnight.

**0.1 Choose the enrollment type.** Read `enrollment-decision.md`. The
recommendation is individual. It sets the seller name every elder and every
adult child sees, and changing it later means a support conversion or an App
Transfer over days.

**0.2 Ready the Apple Account.** Two factor authentication on, on an address you
will control for years. It becomes the Account Holder and cannot be swapped
casually. Confirm the account name matches your government photo ID exactly. A
mismatch is the most common silent hold on enrollment.

**0.3 Know what enrollment asks for.** Individual: the Apple Account, a
government photo ID, a payment card. Organization: a legal entity, a D-U-N-S
number, a matching public domain, signing authority. Details and the D-U-N-S
path in `enrollment-decision.md` sections 1 and 5.

**0.4 Create the free Expo account.** No Apple money, no card, and it needs a
browser, so it cannot be done unattended.

```bash
cd "/Users/aghar/Documents/Projects/ToWin App/App"
eas login
eas whoami        # must print an account name. Today it prints "Not logged in"
eas init          # writes extra.eas.projectId into app.json
```

Review and commit the `app.json` diff. Full notes in `submit-config.md`
section 6.

**0.5 Send a test message to `help@towinly.com` and confirm a person reads it.**
Five public pages, both store contact fields and App Review all write there.

**0.6 Settle the PostHog question.** The production backend has
`POSTHOG_API_KEY` set, and the server sends the plain email address as the
signup event id. Three rows of both privacy forms depend on which way this goes.
The two paths are in `privacy-labels.md` section 5 item 1. Do not open either
privacy form until it is decided.

---

## Part 1. The payment

1. Open the Apple Developer app on your iPhone, or go to
   `developer.apple.com/programs/enroll`.
2. Sign in with the account from step 0.2.
3. Select the enrollment type from step 0.1. Confirm your legal name and address
   exactly as they appear on your ID.
4. Complete identity verification. The iPhone app scans the ID and matches it to
   your face and is the faster of the two routes.
5. Pay 99 USD.
6. **The same day, register with Google Play.** 25 USD once,
   `play.google.com/console`, account type Personal. Do not wait for Apple.
   Reason in Part 7.
7. Wait for the Apple activation email. Often a day or two. Budget a week and
   book nothing against it. If it sits pending with no email, it is identity
   verification rather than payment: check the Developer app for a document
   request.

---

## Part 2. The first thirty minutes after activation

**2.1 Accept the agreements.** First sign in to App Store Connect. An unaccepted
Apple Developer Program License Agreement makes later steps fail with a vague
authentication error. Towinly is free with no purchases, so no banking or tax
forms are owed.

**2.2 Register the App ID.** developer.apple.com, Certificates, Identifiers and
Profiles, Identifiers, plus, App IDs, App. Bundle ID `com.towinly.app`,
explicit. If it is taken, stop and read `submit-config.md` section 2 before
touching anything else. This is the only cheap moment to find a clash.

**2.3 Create the App Store Connect record by hand.** My Apps, plus, New App.
Platform iOS, bundle ID from the dropdown, name and primary language from the
root `docs/store-listing.md`, SKU your own string, user access Full Access.
Do not let `eas submit` create the record: the automatic path names the app from
`app.json`, which is the single word Towinly, and that is not the listing title.

**2.4 Collect the three submit values.** They exist now.

| Value | Where |
| --- | --- |
| `ascAppId` | App Store Connect, your app, App Information, "Apple ID" |
| `appleTeamId` | developer.apple.com, Account, Membership details, "Team ID" |
| Play service account JSON | Play Console, Setup, API access. Six steps in `play-console-parallel-track.md` |

Then write them into `eas.json` with one command:

```bash
cd "/Users/aghar/Documents/Projects/ToWin App/App"
npm run submit:config -- \
  --asc-app-id <the numeric Apple ID> \
  --apple-team-id <the 10 character Team ID> \
  --play-key ~/.secrets/towinly-play-service-account.json \
  --apple-id <your Apple Account email> \
  --sku <the SKU from step 2.3>
```

It refuses a malformed value and leaves `eas.json` untouched. Shapes, refusals
and the hand edit equivalent: `submit-config.md` sections 3 to 5.

**2.5 Build.** `git status` must be clean first: the build copies your working
directory, uncommitted edits included.

```bash
eas build -p ios --profile production
eas build -p android --profile production
```

Back up the Android keystore the moment EAS generates it.

---

## Part 3. The listing paste

Source of truth is the root `docs/store-listing.md`. Its fields are pinned and
`App/__tests__/store-listing.test.js` guards them at 39 tests. Copy from the
pinned blocks, never from memory.

App Store Connect, your app, the version, App Information and the localization
pages:

- Name, subtitle, keywords, description, promotional text: the US block.
- Support URL: `https://www.towinly.com/app/support`
- Marketing URL: `https://www.towinly.com`
- Privacy Policy URL: `https://www.towinly.com/app/privacy`
- Category, price, territories, age rating, export compliance: `console-answers.md`.
- Copyright: `2026 <the legal identity from Part 0.1>`.

**Use `/app/privacy` and never `/privacy`.** The shorter address is an older
document that describes a location switch this app does not have.

App Review notes: paste the block between `<!-- review-notes-v1:start -->` and
`<!-- review-notes-v1:end -->` in `console-answers.md`. It is 3,967 of Apple's
4,000 characters and it carries the demo logins. Every claim in it is checkable
inside the build in under a minute, which is why a test pins it.

Before you paste the demo credentials, sign in to all three demo seats once.
They answered HTTP 200 on the production API on 2026-08-15. Re-check on the day
rather than trusting that line.

---

## Part 4. Screenshots

Eight files per store, already baked, already the right size, no alpha channel,
no em dash in any caption.

- iOS: `screenshots/final/ios/`, `1320 x 2868`. Upload all eight to the
  **iPhone 6.9 inch** slot in filename order. `01` first: the store shows
  roughly the first three in search results. No iPad set is owed while
  `app.json` keeps `ios.supportsTablet: false`.
- Play: `screenshots/final/play/`, the sibling folder. Never upload the iOS set
  to Play: at 1 to 2.17 those break Play's rule that the long side may be at
  most twice the short side.

Regenerate with `python3 scripts/bake_screenshots.py` from `App/`. Captions live
in `screenshots/manifest.json` and `__tests__/store-screenshots.test.js` fails if
a file goes missing, changes size, gains an alpha channel or drifts from the
pinned captions.

---

## Part 5. The privacy answers

Both forms, every row traced to a line of code, in `privacy-labels.md`. Do not
improvise them at the keyboard.

- Apple: App Store Connect, your app, App Privacy.
- Google: Play Console, Policy, App content, Data safety.

Three rows are blocked until step 0.6 is decided. The static privacy manifest
aggregate, 8 manifests, 4 API categories, 7 reason codes, zero tracking, is in
`privacy-manifest-aggregate.md` and no row in it contradicts the labels.

After the first upload, watch for an email titled **ITMS-91053: Missing API
declaration**. It does not block TestFlight. Add an `ios.privacyManifests` block
to `app.json` naming exactly the APIs and reasons Apple lists, then rebuild.

---

## Part 6. Submit iOS

```bash
eas submit -p ios --latest
eas submit:status
```

Processing takes from five minutes to about an hour. If nothing appears after an
hour, check your email: Apple sends processing failures by email and not to the
console. With `ascAppId` set, EAS uploads straight away and creates no
TestFlight internal group, so create one by hand once. The flag by flag detail is
`APPLE-DAY-ONE-RUNBOOK.md` part 5.

Choose **manual release** so both stores can go live on the same day.

---

## Part 7. Google Play, starting the same day

Play is the long pole. Google makes a new **personal** developer account run a
closed test with at least **12 testers enrolled for 14 consecutive days** before
it grants production access. One day below 12 restarts the run. Started on pay
day it runs beside the iOS work and costs nothing extra. Started after iOS
ships, it adds about three weeks to the end.

**The gate is escapable, and you should know that before you register.**
Organization accounts are exempt from it entirely, as are personal accounts
created before 13 November 2023
(support.google.com/googleplay/android-developer/answer/14151465). Play
organization accounts want a D-U-N-S number, a company address and a publicly
displayed verified phone number, so the waiting moves rather than disappearing.
The full trade is in `enrollment-decision.md` section 2. Decide it there, before
you click Personal on the sign-up page, because the account type is not something
you flip afterwards.

Full detail in `play-console-parallel-track.md`. The order that matters:

1. **Day 1.** Register, 25 USD, account type Personal. Complete identity
   verification the hour it is asked for. It takes 1 to 3 days and everything
   Android waits on it.
2. **Day 1.** Set the public developer name, email and website under Settings,
   Developer account, Developer page. Use `help@towinly.com` and
   `https://www.towinly.com`. Keep this identity the same as the Apple seller
   name from Part 0.1.
3. **Day 1.** Write to 18 people to hold 12 tester slots. The clock cannot start
   earlier than the roster.
4. **Verification day.** Create the app record, free, no in-app purchases, no
   Play Billing. Fill the App content forms from `console-answers.md`.
5. **First upload by hand.** The Google Play API only starts working after one
   manual upload through the console, so `eas submit -p android` is useful from
   release two onward.
6. **Then 14 unbroken days.** Count testers daily.
7. Release both stores together once Play grants production access.

---

## Part 8. Still open after this run

Honest list. Everything else in the eight pre-payment stories is closed with
evidence in `ralph/progress.txt`.

| Open | Who | Rough time |
| --- | --- | --- |
| Choose individual or organization | Owner | Minutes, after reading `enrollment-decision.md` |
| Decide the PostHog path, then unblock three privacy rows | Owner, then repo | An hour, longer if the backend changes |
| Prove `help@towinly.com` reaches a person | Owner | Minutes |
| Free Expo account, `eas login`, `eas init` | Owner, then a commit | Ten minutes, needs a browser |
| Apple enrollment | Owner | Payment is minutes. Activation often a day or two, budget a week |
| D-U-N-S number, only if organization | Owner | Free. Recorded as a few days to a few weeks. Lands before the payment |
| Play registration and identity verification | Owner | 25 USD, then 1 to 3 days |
| Register the App ID and create the app record | Owner | Twenty minutes, after activation |
| The three submit values, then `npm run submit:config` | Owner, then one command | Fifteen minutes |
| First production builds, iOS and Android | Owner | EAS queue time, then signing on first run |
| A reviewer deleting a demo seat can destroy it | Backend, or seed a spare seat | Not started |
| 12 testers, 14 consecutive days | Owner | Three weeks on a personal account, and it cannot be shortened. An organization account skips it: see `enrollment-decision.md` section 2 |
| Lawyer review of the policy and terms | Owner | Not started, tracked in `ACTION-CHECKLIST.md` |
| Two checks that need a real build: the deep link and the encryption flag in the built Info.plist | Repo, after the first build | Minutes each |
| Apple review time | Apple | Not recorded in this repo. Do not plan against a number you have not seen |

---

## Verified at the end of the run, 2026-08-15

Re-checked rather than copied forward, because an owner redeploy can flip a live
page between one iteration and the next.

| Check | Result |
| --- | --- |
| `https://www.towinly.com/app/support` | HTTP 200, and "Get help" and "Write to us" are both present in the deployed bundle `entry-926de61279975bf29cc53cb327675faa.js` |
| `https://www.towinly.com/app/privacy` | HTTP 200, and "Twilio sends the text messages" and "Your information is kept on servers in the United States" are both present in the same bundle |
| `npx jest` | 117 suites, 886 tests, all passing |
| `npx eslint` on every file this run changed | exit 0, no output |
| `eas whoami` | Not logged in. `eas-cli/21.7.0 darwin-arm64` |
| `eas.json` | `submit.production` is `{}`, with no invented identifier in it |

**A 200 on its own is not evidence here.** `towinly.com` serves an SPA catch all,
so every path under `/app` answers 200 with the same 2,751 byte shell, including
paths that do not exist. The honest check is whether the page's own strings are
in the JavaScript bundle the shell loads, which is what
`scripts/verify-published-page.mjs` does and what the table above reports.

```bash
node scripts/verify-published-page.mjs https://www.towinly.com/app/support \
  --expect "Get help" --expect "Write to us"
```
