# Console answers: every question both stores ask that does not need the account open

One document, two consoles. Field label on the left, exactly as the console
words it. Answer on the right. Paste, tick, move on.

Written 2026-08-15 for version 1.0.0, revised 2026-08-19 for version 1.1.0,
bundle `com.towinly.app`, package `com.towinly.app`. Every answer here was re-verified on 2026-08-15 against the
code in this repo, the installed dependency tree, or the live production
backend. Nothing was carried forward from an earlier document on trust.

**What this file is not.** It does not repeat the listing copy, the privacy
label rows or the screenshot plan. Those live in one file each and this sheet
points at them:

| You need | It lives in |
|---|---|
| Name, subtitle, keywords, descriptions, release notes | `docs/store-listing.md` at the project root, mirrored in `App/docs/store/listings.md` |
| Apple App Privacy and Play Data safety, row by row | `App/docs/store/privacy-labels.md` |
| Screenshots, captions, upload slots | `App/docs/store/screenshot-inventory.md` and `screenshots/final/` |
| The long-form reasoning behind the Apple answers | `App/docs/store/app-store-connect-fields.md` |
| The long-form Play track plan and the 14 day gate | `App/docs/store/play-console-parallel-track.md` |
| The order to work on enrollment day | `App/docs/store/PAY-DAY-RUNBOOK.md` |

## Legend

| Mark | Meaning |
|---|---|
| READY | Decided and proven. Paste it. |
| OWNER | Needs the account holder's real data or a real decision. Nobody may invent it. |
| ACCOUNT | Cannot be answered until the paid account or the app record exists. Section 8 lists all of these together. |

---

## 1. Apple: App Information

| Console field | Answer | State |
|---|---|---|
| Platforms | iOS. Leave macOS, tvOS and visionOS unticked. | READY |
| Name | `Towinly: Elder Care Companion` | READY |
| Primary Language | English (U.S.) | READY |
| Bundle ID | `com.towinly.app` | READY, frozen |
| SKU | `TOWINLY-IOS-1` | READY |
| User Access | Full Access | READY |
| Subtitle | `Trusted help for aging parents` | READY |
| Privacy Policy URL | `https://www.towinly.com/app/privacy` | READY, HTTP 200 on 2026-08-15 |
| Privacy Choices URL | Leave empty. Towinly manages data choices inside the app. | READY |
| Primary Category | Social Networking | READY |
| Secondary Category | Lifestyle | READY |
| Content Rights | Yes, plus the rights confirmation | READY, section 4 |
| License Agreement | Apple's Standard License Agreement | READY |
| Made for Kids | No | READY |
| Apple ID (numeric) | Generated when the record is created | ACCOUNT |

Second locale, English (U.K.), which is what the India storefront reads:

| Console field | Answer | State |
|---|---|---|
| Name | `Towinly: Senior Citizen Care` | READY |
| Subtitle | `Trusted company for parents` | READY |
| Privacy Policy URL | Same as English (U.S.) | READY |

The English (U.K.) slot also serves the United Kingdom. It replaces the U.S.
line in those storefronts rather than adding to it. Check the storefront list in
the console before saving.

**Why Social Networking is primary.** The core loop is a profile, a connection
between two named people, a private conversation, and a relationship that
changes state over time. Dating apps sit in Lifestyle on iOS, and the reviewer
notes in section 6 spend a whole block proving Towinly is not one. Filing into
the same chart argues against the notes. Full reasoning, including why Health,
Medical, Business and Utilities are all wrong for this app:
`app-store-connect-fields.md` section 2.4.

---

## 2. Apple: Age Rating, every question with its reason

Apple revised this questionnaire in 2025, so answer the wording on the screen.
The facts below are what the build does. Let App Store Connect compute the
tier and record what it returns.

### 2.1 Content questions

| Console question | Answer | Reason, one line |
|---|---|---|
| Cartoon or Fantasy Violence | None | No violence of any kind in the app. |
| Realistic Violence | None | Same. |
| Prolonged Graphic or Sadistic Realistic Violence | None | Same. |
| Sexual Content or Nudity | None | None present. Explicit words are refused at write time by `src/lib/contentFilter.js`. |
| Profanity or Crude Humor | None | Same write-time refusal. |
| Alcohol, Tobacco, or Drug Use or References | None | Not referenced anywhere in the product. |
| Mature or Suggestive Themes | None | See the bereavement note below. |
| Horror or Fear Themes | None | None present. |
| Medical or Treatment Information | None | The assistant refuses medical advice and points to a doctor or emergency services. A check-in records that somebody answered. It measures nothing. |
| Simulated Gambling | None | None present. |
| Gambling | None | None present. |
| Contests | None | Streaks are a personal habit counter with no prize. `app/game.jsx` is an on-device memory game with no wager, no currency and no leaderboard. |

### 2.2 The two questions that decide the rating

| Console question | Answer | Reason, one line |
|---|---|---|
| **Unrestricted Web Access** | **No** | The app ships no web view and no in-app browser. Proof below. |
| **User Generated Content** | **Yes** | Members write bios, help requests, private messages, reviews and Pass On entries that other members read. |

**Unrestricted web access, proved rather than asserted.** Three checks, all run
on 2026-08-15:

1. No web view or browser package is installed. A name scan over all 40 runtime
   dependencies for `webview`, `web-browser`, `browser` and `iframe` returns
   nothing. `react-native-webview` and `expo-web-browser` are both absent.
2. Every `Linking.openURL` call site in `app/` and `src/` opens a fixed
   destination: a `mailto:` from `supportMailto` in `app/support.jsx`, from
   `deletionMailto` in `app/delete-account.jsx` and from `open` in
   `src/components/feedback/CreatorCard.jsx`, the deletion page from
   `SUPPORT_PAGE.deletionUrl` in `app/support.jsx`, and the policy links in
   `src/components/legal/LegalSections.jsx`. None takes a user-typed address.
3. Members can save a Facebook or Instagram URL on their own profile
   (the Facebook and Instagram fields in `app/profile-edit.jsx`), and no screen renders another
   member's URL as a tappable link. A repo sweep for `facebook` and `instagram`
   outside the edit form and the legal text returns one hit, and it is the
   founder's own link on the feedback screen.

If any of the three ever changes, this answer changes with it, and so does
guideline 1.2's filtering requirement.

### 2.3 Capability questions

| Console question | Answer | Reason, one line |
|---|---|---|
| Chat or messaging between users | Yes | One-to-one threads, `app/chat/[connectionId].jsx`. |
| Users can create or share content other users see | Yes | Bios, help requests, reviews, Pass On entries, messages. |
| App shares the user's location with other users | Approximate only | Two sources, both rounded. The member types a town and the server geocodes it, or the phone is read on one of four screens and the fix is snapped to a ~2 km cell before it leaves the device (`src/lib/coarseLocation.js`). Other members see a town name and a rounded distance, never a point on a map. |
| In-app controls for objectionable content | Yes | Report from a profile, block from a profile, a managed block list, a write-time word filter on posts and on private messages, and zero tolerance terms agreed at signup. Section 6 states exactly what the filter does and does not cover. |
| Parental controls or age assurance | A self-declared date of birth with an 18 minimum. **Do not claim age verification.** | `app/(auth)/register.jsx` sets `MIN_AGE = 18` and its submit handler refuses a younger date of birth. No document check happens. |

### 2.4 Expect a teen tier, and do not argue with it

The content answers are clean, so the rating comes from messaging and user
generated content. A teen tier is the correct outcome. Do not inflate a content
answer to raise it and do not overstate the moderation controls to lower it.
Both are misrepresentation and both are checkable inside the build.

The app's own terms are 18 and over. A teen store rating is not a
contradiction: the store rating describes content suitability, and the signup
gate is a product rule. Play asks the target audience question directly, and
the answer there is 18 and over.

One judgement call recorded rather than hidden. Pass On is about death. Letters
read after someone dies, a Sealed box opened by Keyholders. Apple has no
bereavement category, and the subject is handled plainly and gently, so None is
the honest answer on Mature or Suggestive Themes. If a reviewer raises it, that
is the answer.

---

## 3. Apple: Pricing and Availability

| Console field | Answer | State |
|---|---|---|
| Price | Free. No price schedule, no planned change. | READY |
| In-App Purchases | None | READY |
| Pre-Orders | No | READY |
| Availability | United States and India. Every other country and region off. | READY |
| Distribute on the App Store | Yes | READY |
| Make available on Mac with Apple silicon | No | READY |
| Make available on Apple Vision Pro | No | READY |
| Tax Category | Leave the default | READY |
| Volume purchase for business or education | Leave unticked | READY |

Free means the Paid Applications Agreement, the bank account and the tax forms
are all skipped. That is the largest single piece of enrollment paperwork, and
Towinly does not owe it. The evidence: none of the 40 runtime dependencies in
`App/package.json` is a purchase, subscription or billing SDK.

Mac and Vision Pro are off because `app.json` sets `ios.supportsTablet: false`
and the layout is phone only.

Two markets, because the listing copy exists for exactly these two, because a
marketplace needs both sides of it in the same town, and because one person
reads `help@towinly.com` and guideline 1.5 judges whether support is real.
Adding countries later needs no review. Full reasoning, including why the EU
waits for a Digital Services Act trader declaration:
`app-store-connect-fields.md` section 4.

---

## 4. Apple: Content rights, export compliance, advertising identifier

| Console question | Answer | State |
|---|---|---|
| Does your app contain, show, or access third-party content? | **Yes**, then tick the rights confirmation | READY |
| Export compliance | **Apple does not ask.** `app.json` sets `ITSAppUsesNonExemptEncryption: false`, so the question is skipped on every build. | READY |
| Does this app use the Advertising Identifier (IDFA)? | **No** | READY, proved below |

### 4.1 Content rights

Members write and upload nearly everything on screen: profile photos, bios,
help requests, reviews, chat messages, Pass On stories and letters. Content a
member creates is third-party content in Apple's sense. AI answers are
generated by Groq and shown after per-user consent. The app renders no
third-party map tiles, no licensed music, no stock media and no imported feeds.
Geocoding runs on the backend and returns a town name, so no map tile ever
reaches the device.

One gap worth closing before submission, and it does not block: the terms in
`src/data/legalContent.js` set the rules of behaviour and never grant Towinly
permission to display what a member writes. One plain sentence makes the Yes
answer provable instead of assumed.

### 4.2 Export compliance, already settled in the build

`ITSAppUsesNonExemptEncryption` was read out of the generated
`ios/Towinly/Info.plist` with `plutil` during the APL-803 prebuild dry run, not
out of `app.json`. It is present and false. The traffic behind that answer:
HTTPS only, Keychain through `expo-secure-store`, and one PKCE use of
`expo-crypto` on the Google sign-in path that is web-gated out of every store
build. The Sealed box is encrypted on the backend and the app holds no key. All
of it is exempt.

### 4.3 No advertising identifier, proved four ways

The answer is No on both stores. It was proved by scanning rather than assumed,
because a renamed package would slip past a glance at `package.json`. All four
checks ran on 2026-08-15 and every one returned zero. The two package-name
scans were RE-RUN on 2026-08-22 against the tree as it stands, because the
dependency count had moved: 40 runtime deps, 10 dev deps, 970 installed packages,
still 0 hits. The two native symbol scans were not re-run and their 2026-08-15
result is what the table reports.

| Check | Scope | Result |
|---|---|---|
| Package-name scan against a 40-term pattern (admob, adjust, appsflyer, branch, fbsdk, firebase, amplitude, mixpanel, segment, posthog, sentry, bugsnag, onesignal, singular, kochava, tenjin, applovin, unity-ads, ironsource, vungle, chartboost, inmobi, tapjoy, criteo, moengage, clevertap, braze, airship, leanplum, smartlook, fullstory, heap, matomo, flurry, appmetrica, tracking-transparency, idfa, advertising-id and more) | 40 runtime deps and 10 dev deps | **0 hits** |
| Same pattern over the whole installed tree | **970 installed packages** under `node_modules`, scoped packages included | **0 hits** |
| iOS symbol scan for `ASIdentifierManager`, `advertisingIdentifier`, `AppTrackingTransparency`, `ATTrackingManager` | every `.h`, `.m`, `.mm` and `.swift` under `node_modules` | **0 files** |
| Android scan for `com.google.android.gms.permission.AD_ID`, `com.google.android.gms.ads`, `AdvertisingIdClient` | every bundled `AndroidManifest.xml`, `.gradle`, `.java` and `.kt` | **0 files** |

A fifth reading agrees. Eight libraries ship a `PrivacyInfo.xcprivacy`, and
`NSPrivacyTracking` reads **false** in all eight, machine-read with
`plutil -extract`. The files are in `expo-file-system`, `expo-system-ui`,
`expo-constants`, `react-native/React/Resources`,
`react-native/ReactCommon/cxxreact`, and the RCT-Folly, boost and glog
podspecs. Full table with Apple's verbatim reason codes:
`privacy-manifest-aggregate.md`.

The app source carries no reference to IDFA, `AdvertisingId`, tracking
transparency or AdMob either. No App Tracking Transparency prompt exists,
which is correct: an app that tracks nothing must not show one.

Consequences that follow from this, and they answer three more console
questions at once: Apple's **Data Used to Track You** is None, Play's
**advertising ID** declaration is No, and Play's **ads** declaration is
"No, this app does not contain ads".

---

## 5. Apple: App Privacy, and the one answer that moved

The complete row-by-row answers live in `privacy-labels.md` section 1. Do not
answer that questionnaire from this sheet or from memory. Apple audits labels
against real network traffic.

| Console question | Answer |
|---|---|
| Data Used to Track You | None. Nothing is linked with third-party data for advertising and nothing goes to a data broker. |
| Data Not Linked to You | None. Nothing is collected outside a signed-in session. |
| Data Linked to You | 12 data types are Yes, all App Functionality, all Used for Tracking: No. See `privacy-labels.md` section 1.2. |

**RESOLVED 2026-08-15. The analytics rows are None and they may be submitted.**
`POSTHOG_API_KEY` was set on the production backend, the owner deleted it, and
the backend redeployed the same hour. The read-back showed 38 variables with the
key absent. `PostHogService` is a documented no-op with a blank key, so the
labels below stand exactly as written and no legal page changes.
`privacy-labels.md` section 5 item 1 holds the full trace and both paths.

<details>
<summary>The wording this replaced, kept so the decision can be re-read
(marked BLOCKING here until 2026-08-22, when this page was swept)</summary>

> **BLOCKING, and it changed on 2026-08-15.** `POSTHOG_API_KEY` **is set** on
> the production backend, read with `railway variable list` against the
> `backend` service of the `towin` project, production environment. The key is
> 48 characters. Values were not printed. `AuthService.capture` in the reference
> backend sends `user_signup_started` with the plaintext email address as the
> distinct id, and the `/auth/register` post in `App/app/(auth)/register.jsx` is
> what triggers it.
>
> So the analytics rows are not the None they were written as. Two honest paths,
> and the owner picks one before either form is submitted:
>
> - **Keep PostHog on.** Apple `Usage Data / Product Interaction` becomes
>   collected and linked, Play `Personal info / Email address` becomes shared
>   with an analytics third party, and Play `App activity / App interactions`
>   becomes collected. PostHog also has to join the processor list in
>   `src/data/legalContent.js`, which today names Amazon, Twilio, OpenStreetMap,
>   Groq and Railway.
> - **Clear `POSTHOG_API_KEY` on the production backend.** One owner command.
>   `PostHogService` is a documented no-op when the key is blank, so the labels
>   stand exactly as written and no legal page changes.

The owner took the second path on the day it was written. This page kept saying
BLOCKING for a week after it was closed, which is the drift this sweep exists to
stop.
</details>

Never claim end-to-end encryption in this questionnaire or in the listing. The
Sealed box is encrypted by the backend, the app holds no key, and the privacy
policy says so.

---

## 6. Apple: App Review Information

### 6.1 Contact

| Console field | Answer | State |
|---|---|---|
| First Name | | **OWNER** |
| Last Name | | **OWNER** |
| Phone Number, with country code | | **OWNER** |
| Email Address | An address read within hours, not `help@towinly.com` | **OWNER** |

A rejection or a question arrives here, and every hour of delay is an hour back
in the review queue. `help@towinly.com` stays the public support address.

### 6.2 Sign-in, verified against production on 2026-08-15

| Console field | Answer | State |
|---|---|---|
| Sign-in required | Yes | READY |
| Username | `elder` | READY, HTTP 200 today |
| Password | `12345678` | READY, HTTP 200 today |

App Store Connect has one username field and one password field. The elder seat
goes there. The other two seats go in the notes, and the notes ask the reviewer
to try all three.

**The verification, run today against
`https://backend-production-cef3.up.railway.app/api`.** Each seat was logged in
with `POST /auth/login`, then five authenticated endpoints were read with the
returned token.

| Seat | Login | Role | Name | Connections | Unread messages | Trust Score | Family links |
|---|---|---|---|---|---|---|---|
| `elder` / `12345678` | **HTTP 200**, 0.32s | ELDER | Margaret | **7** | **5** | **38.0**, tier Reliable | **3 active**: Sarah (Daughter), David (Son), Ruth (Sister) |
| `helper` / `123456789` | **HTTP 200**, 0.25s | HELPER | Harsha | **5** | **3** | **29.0**, tier Reliable | none, correct for a helper |
| `demo.sarah@towin.app` / `DemoSarah!2026` | **HTTP 200**, 0.27s | FAMILY | Sarah | **2** | **2** | 1.0, tier Getting Started | **1 active**: Margaret |

Trust progress is seeded across the ladder rather than parked at one step, which
is what makes the screens worth reviewing:

- Margaret's four helper connections read **Fully Trusted** (two of them),
  **Ready to Meet**, and **Phone Ready**. Their rungs are 7/7, 7/7, 6/7 and 3/7.
- Harsha's connection with Grace Liu is a complete **15 of 15**: rungs 7/7,
  review 5/5, profile 3/3. His other two are Video Ready at 4/7 and Connected at
  1/7.
- Sarah's seat is deliberately thin on profile points, which is honest: she is a
  family member, not a helper.

Every one of `/profile/me`, `/connections`, `/trust/my-score`,
`/messages/unread-count` and `/family/links` returned HTTP 200 on all three
seats. Fifteen requests, fifteen 200s.

### 6.3 What would break the review seat, and it is not hypothetical

Apple needs a seat that keeps working for the whole review, and a reviewer who
cannot sign in is a guaranteed rejection. Four ways it breaks, most likely
first:

1. **A reviewer deletes a demo account while testing deletion.** Guideline
   5.1.1(v) puts account deletion on their checklist, so they will look for it.
   `DemoResetCoordinator.onDemoWrite` only schedules the restoring reset when
   the user id is already inside a lazily-resolved protected set
   (`DemoResetCoordinator.java:75` and the `demoUserIds()` block at line 93).
   That set is built from `findByEmail` on first use. A delete that lands before
   the first lookup leaves the id outside the set, no reset is ever scheduled,
   and the seat is gone for the next reviewer. **Fix it before submitting**, one
   of three ways: warm the demo id set at backend startup, seed a fourth
   disposable seat and name it in the notes, or, weakest, ask the reviewer in
   the notes not to delete the three. Reviewers are not obliged to read notes.
2. **The backend is down or asleep.** Every seat is a live account on a live
   Railway backend. Re-test all three on submission morning and again before
   pressing Release.
3. **A password change.** These are real accounts. Nobody should touch them
   between submission and approval.
4. **The demo reset restoring an older baseline.** Data resets a few minutes
   after the last change, which is why the notes warn that sample data
   reappearing is expected. It also means a reviewer's own edits do not persist,
   and that is fine.

Re-run the whole verification in one command: see section 9.

### 6.4 Notes, ready to paste

App Store Connect caps this field at 4000 characters. The block below is 3991,
machine-counted.

**One claim was corrected on 2026-08-15 before this block was written.** The
earlier draft told Apple there was "a content filter on posts and messages".
The filter did not run on messages. `objectionableError` from
`src/lib/contentFilter.js` had exactly three call sites: the bio field in
`app/profile-edit.jsx`, the help request title, description and other category
in `app/(tabs)/action.jsx`, and the Pass On title and body in
`app/pass-on/index.jsx`. `app/chat/[connectionId].jsx` sent straight to
`POST /messages/{id}/send` with no check. A reviewer could have disproved the
old sentence in thirty seconds by typing a slur into a chat.

**Corrected again on 2026-08-22, this time because the app changed (HARD-113).**
The filter now runs on the private message composer
(`app/chat/[connectionId].jsx`, `handleSend`) and on the comment a family
member writes about a helper for their parent
(`src/components/family/FamilyReviewForParent.jsx`, `submit`). Both refuse
before the POST, keep the typed words on screen, and show the same sentence the
help form shows. ~~`objectionableError` now has call sites in five files; grep
for it to count them.~~ Nothing else changed: it is still a client-side
wordlist, it is still not moderation, and the Spring Boot backend still has no
filter of its own, so report and block remain the answer to whatever it misses.
The block below says exactly that.

**Corrected again on 2026-08-29 (APS-05).** One write path was still open: the
help request a family member composes for their parent
(`src/components/family/FamilyNeedsForParent.jsx`, `postNeed`). It posts free
text to the same `/needs` endpoint the parent's own composer posts to, and the
backend has no wordlist, so a request typed there went out unchecked. It runs
the same call on both the title and the description now, with the same sentence
in the same place under the field. `objectionableError` has call sites in
**six** files; grep for it to count them. The list of surfaces above did not
change, because a request a guardian writes was always a help request.

<!-- review-notes-v1:start -->
WHAT TOWINLY IS

Towinly connects elders who ask for help (a ride, shopping, cleaning, company), helpers who offer it, and family members an elder links to their account, so someone they love can see they are safe.

START HERE

Sign in as "elder" / "12345678". Home shows Margaret's helpers and how far trust has grown with each. Tap a helper to open the seven step ladder. That screen is the product.

THE TRUST LADDER IN THREE SENTENCES

Every pair of members climbs the same seven steps: Connected, Messaging, Phone, Video, Socials, Met in person, Trusted. Both people confirm a step before it counts, and nothing unlocks early: phone numbers stay hidden until both sides reach Phone, and meeting in person is step six of seven. A Trust Score adds to 15 per person helped: 7 for growing trust together, 5 from their review, and 3 for a filled-in profile.

TOWINLY IS NOT A DATING APP

The difference is in the mechanics, all of it visible in the build:

- No swiping, no romance framing, and no gallery of profiles to browse. Elders and helpers meet through a posted help request.
- Guideline 1.2 controls: report a person from their profile, block them from their profile, a block list at Profile > Blocked people, a write time word filter on bios, help requests, Pass On entries, private messages and family reviews, and terms agreed at signup that close an account for harassment, threats, lies, discrimination or impersonation. Report and block cover the rest. Reports reach help@towinly.com.

WHY THE APP ASKS FOR PHOTOS

One permission, two uses, both optional. A single picker on Edit profile raises the photo library prompt: a profile picture, and a photo of an identity document if the member chooses to verify who they are. Camera and microphone are removed from the binary.

WHY THE APP ASKS FOR LOCATION

Optional and foreground only. A card explains it before the system prompt, on the four screens where distance matters. The app rounds every fix to a 2 km cell on the phone, so the server gets an area, never a street. Say no and the app runs on the town you type.

DEMO ACCOUNTS (please review all three)

One tap demo buttons sit below the login form. The field also takes a username or an email:

- Elder: "elder" / "12345678" (Margaret, four helpers at four different steps)
- Helper: "helper" / "123456789" (Harsha, one connection at a full 15 of 15)
- Family: "demo.sarah@towin.app" / "DemoSarah!2026" (Sarah, Margaret's daughter)

The family login uses the older towin.app domain, which is how the backend seeds it, so type it exactly. Demo data resets a few minutes after the last change, so reappearing sample data is expected.

DELETING AN ACCOUNT

Deletion happens in the app: Profile tab, then "Account and data", then "Delete my account". Towinly asks twice and the second question is "Delete forever".

Please test deletion on this spare seat, not the three above, which the next reviewer also uses: <<SPARE SEAT>>

HOW TO REACH GUARDIAN MODE (no real family needed)

1. Sign in as demo.sarah@towin.app. Home is the family panel, with Margaret as her linked parent.
2. Tap Margaret's card. Three tabs: the friendships she shares with their trust ladders, how she is today, and what Sarah may do.
3. Margaret has already allowed Sarah to manage her help requests and take trust steps for her, so both work with no setup. The elder's side is under Home menu > My Family > Controls.

THE AI ASSISTANT: CONSENT AND REPORTING

Tap the "Ask AI" pill on any tab. Before the FIRST question a consent dialog appears. It names Groq, the outside AI service, says what is shared (the question, the chat, first name and trust score, never contact details), warns that answers are machine written and can be wrong, and offers "Not now" and "Yes, that's okay". "Not now" sends nothing. Consent is per user, so another demo account sees the dialog again. Every answer carries "Report this answer", which opens the feedback form with it quoted. Reports reach help@towinly.com.
<!-- review-notes-v1:end -->

**Resolve `<<SPARE SEAT>>` before pasting.** Section 6.3 item 1 says why and
gives the three ways out.

| Console field | Answer | State |
|---|---|---|
| Notes | The block above, once the spare seat is resolved | READY on resolution |
| Attachment | Leave empty | READY |

---

## 7. Apple: version 1.1.0 page and release control

| Console field | Answer | State |
|---|---|---|
| iPhone 6.9" screenshots | The eight files in `screenshots/final/ios/`, named `01` to `08` in upload order | READY |
| iPhone 6.5" screenshots | None owed. Apple scales the 6.9" set down. | READY |
| iPad screenshots | None owed. `ios.supportsTablet` is false. | READY |
| App Previews | None for 1.0 | READY |
| Promotional Text | `listings.md` section 1, `promo` | READY |
| Description | `listings.md`, the `apple-us-description` block | READY |
| Keywords | `listings.md` section 1, `keywords` | READY |
| Support URL | `https://www.towinly.com/app/support` | READY, HTTP 200 on 2026-08-15 |
| Marketing URL | `https://www.towinly.com` | READY |
| Version | `1.1.0`, matching `app.json` (bumped 2026-08-19: device location adds a native module, and `runtimeVersion` follows `appVersion`, so an OTA must never reach a 1.0.0 binary) | READY |
| Copyright | `2026 Harshavardhan Anbuchezhian Gowri`. Individual enrollment, and the name was confirmed against the government photo ID on 2026-08-15. Paste as written. | READY |
| Routing App Coverage File | Leave empty | READY |
| Build | Select after TestFlight processing finishes | ACCOUNT |
| Version Release | **Manually release this version** | READY |
| Phased Release for Automatic Updates | Leave it on. It does nothing on a 1.0 and is already correct at 1.0.1. | READY |

There is no "What's New in This Version" field on a 1.0. It appears from the
second version onwards. Play does show release notes on a first release, and
that text is written and counted in `listings.md` section 6.

Manual release, because approval lands at an hour nobody chose, because the two
stores run on different clocks and manual is what lets them go live the same
day, and because it buys a last health check on the four things that live
outside the build: the API answers, the demo seats sign in, `help@towinly.com`
receives mail, and the policy URLs return 200. Full reasoning:
`app-store-connect-fields.md` section 8.

Live URL check re-run on 2026-08-15, all following redirects:

| URL | Status |
|---|---|
| `https://www.towinly.com/app/support` | **200** |
| `https://www.towinly.com/app/privacy` | **200** |
| `https://www.towinly.com/app/terms` | **200** |
| `https://www.towinly.com/app/delete-account` | **200** |

Do not use `https://www.towinly.com/privacy`. It answers 200 as well, and it
serves an older document with no contact address and a location paragraph that
never says the position is rounded on the phone before it is sent.

---

## 8. Google Play: the same questions, the Play wording

Play's forms live under **Policy > App content** and **Store presence**. Every
answer below is free and can be filled the hour the account verifies.

### 8.1 App content

| Console field | Answer | State |
|---|---|---|
| Privacy policy | `https://www.towinly.com/app/privacy` | READY |
| App access | **All or some functionality is restricted.** Add the three demo seats from section 6.2 with the towin.app note and the reset note. | READY |
| Ads | **No, this app does not contain ads.** | READY, section 4.3 |
| Content rating | Run the IARC questionnaire. Answers in 8.2. | READY |
| Target audience and content | **18 and over only.** Tick no band below 18. | READY |
| Data safety | From `privacy-labels.md`, and read the PostHog box in section 5 first. | READY on the PostHog decision |
| News app | No | READY |
| COVID-19 contact tracing or status | No | READY |
| Data deletion | `https://www.towinly.com/app/delete-account`, plus the in-app path | READY, HTTP 200 today |
| Government apps | No | READY |
| Financial features | None. No lending, no payments, no crypto, no banking. | READY |
| Health apps | No health features declared | READY |
| Advertising ID | **No.** The permission is absent from the merged manifest and no ad SDK exists in 970 installed packages. | READY, section 4.3 |

The 18-and-over answer is backed by a real gate, which is what Google looks
for: `app/(auth)/register.jsx` sets `MIN_AGE = 18` and its submit handler refuses the
signup with `You have to be 18 or over to join Towinly.`, and `MAX_AGE = 120`
means a four-digit typo lands on an error instead of passing.
`__tests__/register-age-gate.test.js` guards it.

One caution on the health answer. "Company isn't a luxury. Company is
healthcare." is an approved brand line and it stays out of the Play listing and
out of the health declaration. A health claim in a store listing attaches Play's
health app policy and its evidence requirements.

### 8.2 Content rating: the IARC questionnaire

Play runs IARC once and it produces ratings for every region at the same time,
including ESRB for the United States. This is a legal declaration, so answer it
the way the build behaves.

| Question area | Answer | Reason, one line |
|---|---|---|
| Category | Social networking or communication | The product is people connecting to people. |
| Violence, blood, sexual content, crude humour | No | None present, and explicit words are refused at write time on posts and in private messages. |
| Drugs, alcohol, tobacco | No | Not referenced anywhere. |
| Gambling, simulated gambling, real money | No | `app/game.jsx` is a local memory game with no wager, no prize and no currency. |
| Users can interact or exchange content | **Yes** | One-to-one chat, plus help requests other members browse. |
| Users can share their location with other users | **Yes, town level** | A typed town geocoded on the server, or the phone read in the foreground and snapped to a ~2 km cell on the device. Either way other members see a town and a rounded distance, never a point on a map. |
| Personal information shared with other users | **Yes** | Name, photo, bio, and a phone number once both sides reach the Phone step. |
| Unrestricted access to the internet | **No** | No web view, no in-app browser, no user-typed URL is ever opened. Proof in section 2.2. |
| Digital purchases | No | Nothing is sold in the app. |
| User-generated content moderation | Describe the real controls | Report from a profile, block from a profile, a managed block list at Profile > Blocked people, a report button under every AI answer, a write-time word filter on bios, help requests, Pass On entries, private messages and family reviews, and `help@towinly.com` for reports. Say plainly that the filter is a client-side wordlist and that report and block cover what it misses. |

Expect a Teen level rating rather than Everyone. That is correct for an app
with open member-to-member messaging. Do not argue it down.

### 8.3 Store settings and availability

| Console field | Answer | State |
|---|---|---|
| App name | `Towinly` | READY |
| Default language | English (United States) | READY |
| App or game | App | READY |
| Free or paid | **Free**, and this cannot be changed to paid later | READY |
| Category | Lifestyle | READY |
| Tags | Elder care and social tags | READY |
| Contact email | `help@towinly.com` | READY |
| Website | `https://www.towinly.com` | READY |
| External privacy policy | `https://www.towinly.com/app/privacy` | READY |
| Countries and regions | United States and India, **plus every country a tester physically lives in** | READY |
| Device exclusions | None. `minSdkVersion 24` covers Android 7 and up, which is where the cheaper phones many of these users own actually sit. | READY |
| Developer page name, email, website | Set under Settings > Developer account. Play shows these to users. | **OWNER** |

The tester-country row is the one that quietly costs a slot in the 12. A tester
in a country the track does not cover cannot install, and nobody notices for
days. Canada matters here, per the marketing plan.

Play's category does not have to mirror Apple's, and it does not. Apple ranks
charts on the primary category and Lifestyle there sits beside dating apps.
Play's Lifestyle carries no such neighbour problem.

---

## 9. Re-run every check in this document

Read-only. Nothing here writes, spends or logs in. Run from `App/`.

```bash
# Demo seats: login status, then five authenticated reads per seat
API=https://backend-production-cef3.up.railway.app/api
for pair in "elder:12345678" "helper:123456789" "demo.sarah@towin.app:DemoSarah!2026"; do
  ID="${pair%%:*}"; PW="${pair#*:}"
  curl -s -o "login-$ID.json" -w "$ID login HTTP %{http_code}\n" \
    -X POST "$API/auth/login" -H 'Content-Type: application/json' \
    --data "{\"identifier\":\"$ID\",\"password\":\"$PW\"}"
  TOK=$(python3 -c "import json;print(json.load(open('login-$ID.json'))['token'])")
  for EP in /profile/me /connections /trust/my-score /messages/unread-count /family/links; do
    curl -s -o /dev/null -w "  $EP HTTP %{http_code}\n" "$API$EP" -H "Authorization: Bearer $TOK"
  done
done

# Live pages
for U in /app/support /app/privacy /app/terms /app/delete-account; do
  curl -s -o /dev/null -w "$U HTTP %{http_code}\n" -L "https://www.towinly.com$U"
done

# No ad, attribution or analytics SDK anywhere in the installed tree
node -e "
const fs=require('fs');
const pat=/admob|adjust\b|appsflyer|react-native-branch|fbsdk|facebook-sdk|amplitude|mixpanel|@segment|posthog|@sentry|bugsnag|onesignal|singular-sdk|kochava|tenjin|applovin|unity-ads|ironsource|vungle|chartboost|inmobi|tapjoy|criteo|moengage|clevertap|braze|airship|leanplum|smartlook|fullstory|heap-|matomo|flurry|appmetrica|tracking-transparency|idfa|advertising-id/i;
function walk(d,x){let o=[];for(const e of fs.readdirSync(d,{withFileTypes:true})){if(!e.isDirectory())continue;const n=e.name;if(n.startsWith('@')&&x===0){o=o.concat(walk(d+'/'+n,1).map(y=>n+'/'+y));continue;}o.push(n);}return o;}
const all=walk('node_modules',0);
console.log('packages scanned:',all.length,'| hits:',all.filter(n=>pat.test(n)).join(', ')||'NONE');
"

# No IDFA symbol, no Android ad id
grep -rl "ASIdentifierManager\|advertisingIdentifier\|AppTrackingTransparency\|ATTrackingManager" \
  node_modules --include="*.h" --include="*.m" --include="*.mm" --include="*.swift" || echo "iOS IDFA symbols: NONE"
grep -rl "com.google.android.gms.permission.AD_ID\|com.google.android.gms.ads\|AdvertisingIdClient" \
  node_modules --include="AndroidManifest.xml" --include="*.gradle" --include="*.java" --include="*.kt" \
  || echo "Android ad id: NONE"

# Tracking flag in every bundled privacy manifest
for f in $(find node_modules -name PrivacyInfo.xcprivacy); do
  echo "$(plutil -extract NSPrivacyTracking raw "$f")  $f"
done

# No web view, no in-app browser
node -e "console.log(Object.keys(require('./package.json').dependencies).filter(n=>/webview|web-browser|browser|iframe/i.test(n)).join(', ')||'web view packages: NONE')"

# Where the write-time content filter actually runs
grep -rn "objectionableError" app src --include="*.jsx" --include="*.js" | grep -v __tests__
```

---

## 10. What genuinely needs the account open

Everything above this line is answerable today. Everything below needs a paid
account, a console session, or the owner's own legal data. Nothing here is an
open question. Each one is a paste or a click.

**Swept 2026-08-22 (HARD-116).** Seven of the twenty had already been done and
this list had not caught up: items 4, 5, 6, 16, 17, 18 and 20. Each now carries
what closed it and where the value lives. Rows are marked done rather than
removed, so the list still reads as the full set of things a submission needs.

**Needs the Apple account, in order:**

| # | Item | Why it waits |
|---|---|---|
| 1 | Enrollment type: individual or organization | DECIDED 2026-08-15: **individual**. Seller name is the owner's legal personal name. Record in `enrollment-decision.md`. |
| 2 | Legal entity name, postal address | Real legal identity. Never guessed. |
| 3 | D-U-N-S number | Only for an organization enrollment, and the wait lands entirely before the payment step. |
| 4 | Register `com.towinly.app` as an explicit App ID | **DONE.** The App Store Connect record exists, so the App ID does too. |
| 5 | Create the app record | **DONE.** `ascAppId` is `6802125342`, in `eas.json` `submit.production.ios`. |
| 6 | Team ID, ten characters, from Membership | **DONE.** `appleTeamId` is `G6RRNXL9BV`, in `eas.json` `submit.production.ios`. |
| 7 | App Review contact: first name, last name, phone with country code, email | Section 6.1. |
| 8 | Legal, Technical and Marketing contacts | Account settings. The same person at this size. |
| 9 | Copyright line, `2026 <owner's legal name>` | Item 1 is decided: individual. Only the exact spelling against the photo ID remains. |
| 10 | Select the build after TestFlight processing | There is no build until EAS produces one. |

**Needs the Play account:**

| # | Item | Why it waits |
|---|---|---|
| 11 | Play developer registration, 25 USD once, plus identity verification | Nothing else on Play starts until this clears. |
| 12 | Public developer name, developer email, developer website | Play shows these to users. |
| 13 | Create the app record and upload the first `.aab` by hand | The package name freezes at this upload, on any track, including internal. |
| 14 | Service account JSON for `eas submit` | Created in a Google Cloud project linked from Play Console > Setup > API access. |
| 15 | The closed test: 12 testers, 14 consecutive days, then production access | The long pole. Start it the day the Play account exists, not after iOS is finished. |

**Needs neither account, and still needs the owner:**

| # | Item | Why |
|---|---|---|
| 16 | A free Expo account, then `eas login` and `eas init` | **DONE.** `app.json` carries `owner: harshavardhan_ag` and `extra.eas.projectId: 6cf0141c-c99a-4663-87df-12f271989e7b`. A fresh shell still needs `eas login` before any build command. |
| 17 | Send a test message to `help@towinly.com` and confirm a person receives it | **DONE 2026-08-15**, owner confirmed delivery. Five public pages, both store contact fields and App Review all write there. |
| 18 | The PostHog decision in section 5 | **DONE 2026-08-15.** The key was cleared on the production backend and the backend redeployed. The privacy forms stand as written. |
| 19 | A spare demo seat for deletion testing, or the backend fix in section 6.3 | Protects the three review seats. |
| 20 | Decide whether the "Draft: a lawyer has not checked this yet" banner stays | **DECIDED: it stays.** A documented owner decision, recorded in the header of `src/data/legalContent.js` and pinned by `__tests__/legal-retention-claim.test.js`. No guideline forbids it. |

---

## Corrections made on 2026-08-15

History kept, so a future reader can see what moved and why.

**1. The reviewer notes claimed a content filter on messages.**
Old wording: "a content filter on posts and messages".
Why it changed: `objectionableError` had three call sites and none of them was
the chat composer. `app/chat/[connectionId].jsx` posted to
`/messages/{id}/send` with no check, and the Spring Boot backend has no filter
either. The wording then named the three places the filter ran and said that
messages relied on report and block. A reviewer could test that in thirty
seconds.

**1b. Superseded on 2026-08-22: the app was changed instead (HARD-113).**
Wording replaced: "Private messages rely on report and block rather than on the
word filter."
Why it changed: the filter now runs in the chat composer and on the family
review comment, so the sentence it replaced had become the untrue one. The
notes name the surfaces the filter covers and say report and block cover what
it misses. `App/__tests__/content-filter-surfaces.test.js` holds both halves: a
refused message never reaches the server, an ordinary one still sends.

**1c. Extended on 2026-08-29 (APS-05).** The guardian's help-request composer
was the last write path with no check on it. It has the same one now, and the
same test file covers it: a title or a description carrying a blocked word
never reaches the server, the typed words stay on screen, and an ordinary
request still goes out on the parent's behalf. ~~Five surfaces~~ six.

**2. The Support URL was recorded as blocking with nothing built.**
Old wording, in `app-store-connect-fields.md` section 6.2: "Nothing exists
today: the website has no `/support`, `/help` or `/contact` route".
Why it changed: `https://www.towinly.com/app/support` returns 200 and renders
the support page. It was verified twice on 2026-08-15, by bundle content and by
a real browser render, and re-fetched again for this document.

**3. The advertising identifier answer rested on reading `package.json`.**
Old wording: "No ad SDK, no attribution SDK, no analytics SDK anywhere in the
dependency list."
Why it changed: the answer was right and the proof was thin. It now rests on
970 scanned packages, a native symbol scan on both platforms, and
`NSPrivacyTracking` read out of all eight bundled privacy manifests.

**4. The demo seats were last tested on 2026-08-11.**
Why it changed: a four-day-old login test proves nothing about a live backend.
All three were re-tested today, with the seeded connection counts, unread
message counts and trust progress recorded as numbers rather than as an
adjective.

This file was swept for em dashes before saving. There are none.

---

## Corrections made on 2026-08-22 (LOC-207)

Three answers on this page said the app reads no location. That was true when
they were written and stopped being true on 2026-08-19, when `expo-location`
was installed. Filing a store answer that denies a permission the binary holds
is the kind of gap a reviewer finds, so all three are corrected here and the old
wording is kept.

**1. Section 2.3, "App shares the user's location with other users".**
Old wording: "The member types a town, the server geocodes it, and other members
see a town name and a rounded distance. No device location is ever read:
`expo-location` is not installed."
Why it changed: `expo-location ~19.0.8` is in `App/package.json` and the app
reads the phone on four screens. The verdict does not move. It is still
Approximate only, because every fix is snapped to a 0.02 degree cell by
`src/lib/coarseLocation.js` before it can reach the network, and what another
member sees is still a town name and a rounded distance.

**2. Section 7, the App Review notes, "There is no location permission: the town
is typed by hand."**
Old wording: exactly that sentence, at the end of the photos paragraph.
Why it changed: the same reason. A reviewer reading that line and then seeing
the location prompt on the second screen of the app would be right to question
everything else on the page. It is replaced by a short paragraph of its own that
says what the permission is for, when it is asked, and what is kept.

**3. Section 8.2, the IARC questionnaire, "Users can share their location with
other users".**
Old wording: "A typed town, geocoded on the server, shown as a town and a
rounded distance. No GPS: `expo-location` is not installed."
Why it changed: the same reason. The answer stays **Yes, town level**, which is
what a ~2 km cell amounts to, and IARC's question is about what other users see.

**What did NOT change, and is still true.** Coarse or approximate location,
collected for app functionality, linked to the account, and NOT used for
tracking. Foreground only: `app.json` blocks every background and always
variant, and `App/__tests__/location-freshness.test.js` fails the build on
`watchPositionAsync`, `startLocationUpdatesAsync`, `startGeofencingAsync`,
`requestBackgroundPermissionsAsync` or `setInterval` anywhere under `app/` or
`src/`. The cell numbers were re-read from `coarseLocation.js` on 2026-08-22 and
are recorded in `privacy-labels.md`.

**4. The paste-ready reviewer notes had no room for any of this.**
The block between the `review-notes-v1` markers is an App Review field with a
hard 4000 character limit, and it stood at 3953 before this pass. Adding a
location paragraph meant making room, so seven sentences elsewhere in the block
were tightened with no claim removed: the opening description of the three kinds
of member, "all of it visible in the build", the demo-button line, guardian step
3, the spare-seat line, the Ask AI pill line, and the consent-is-per-user line.
The block now states its own length, 3998, and
`App/__tests__/console-answers.test.js` checks that number against the real
block and fails if either drifts. Every phrase that test pins is untouched: the
demo credentials, the seven trust steps, the 7 + 5 + 3 = 15 score, START HERE,
WHY THE APP ASKS FOR PHOTOS, and the filter sentence, which on 2026-08-22
became "word filter on bios, help requests, Pass On entries, private messages
and family reviews" plus "Report and block cover the rest".

This section was swept for em dashes before saving. There are none.
