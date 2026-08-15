# App Store Connect: every field, with Towinly's answer

Version 1.0.0, first submission, iOS only. Written 2026-08-11, before the Apple
Developer account exists, so that submission day is copy and paste.

Read the value out of the `answer` line, paste it into the console, tick the box
next to it here. Where a value is not settled, the row says why and what closes
it.

**Paste from `console-answers.md`, not from here.** That sheet, added
2026-08-15, is the console-day document: both stores, field label on the left,
answer on the right, every claim re-verified the day it was written. This file
stays as the long-form reasoning behind the Apple half of those answers. Where
the two disagree, `console-answers.md` wins and the difference is recorded in
its corrections section.

Companion files in this folder, which this sheet points at rather than repeats:

- `listings.md` for the name, subtitle, keywords, description and release notes.
- `privacy-labels.md` for the App Privacy questionnaire, answer by answer.
- `screenshots-and-review.md` for the screenshot plan and the first draft of the
  reviewer notes.
- `ios-content-readiness.md` for the evidence behind the policy URLs, demo seats,
  age rating and export compliance.
- `ios-build-readiness.md` for build numbers, the icon set and the EAS profiles.

## Legend

| Mark | Meaning |
|---|---|
| READY | The value is decided and proven. Paste it. |
| DECISION | Two defensible options. The recommendation is written out. Pick one. |
| USER INPUT NEEDED | Needs the account holder's real personal data. Nobody may invent it. |
| BLOCKING | Submission fails or stalls without it. |
| AFTER BUILD | Cannot be answered until the first EAS build exists. |

## Character counts

Every count in this sheet was machine-counted. The whole file was swept for em
dashes: none.

---

## 0. Before the app record can exist

These are decided at enrolment, not in App Store Connect, and two of them change
what the public sees.

| Field | Answer | State |
|---|---|---|
| Enrolment type | Individual or Organization | **USER INPUT NEEDED, DECISION** |
| Legal entity name | See below | **USER INPUT NEEDED** |
| D-U-N-S number | Only if enrolling as an Organization | USER INPUT NEEDED if Organization |
| Program fee | 99 USD per year | READY, known cost |
| Paid Apps agreement (bank details, tax forms) | **Not needed.** Towinly is free with no in-app purchases, so only the Apple Developer Program License Agreement applies, and that is accepted during enrolment. | READY |
| Legal, Technical and Marketing contacts in App Store Connect | Same person for all three at this size | USER INPUT NEEDED |

**The individual versus organization decision, in plain terms.** Enrolling as an
individual publishes the account holder's own legal name on the App Store as the
seller. Every person who opens the listing sees it. Enrolling as an organization
publishes the company name instead, costs a D-U-N-S number and some paperwork,
and takes longer. Enrolment is next week, so this is the first question to
answer.

Memory of this project says the founder's real name is used on public surfaces
rather than an email alias, so an individual enrolment showing that name is
consistent with what has already shipped. Confirm it anyway, because it is
permanent in practice and it also sets the copyright line in section 6.

---

## 1. The New App dialog (My Apps, plus button)

Everything here except the name is permanent or awkward to change.

| Field | Answer | State |
|---|---|---|
| Platforms | iOS only. Leave macOS, tvOS, visionOS unticked. | READY |
| Name | `Towinly: Elder Care Companion` (29 of 30) | READY, from `listings.md` section 1 |
| Primary Language | English (U.S.) | READY |
| Bundle ID | `com.towinly.app` | READY, frozen |
| SKU | `TOWINLY-IOS-1` | READY |
| User Access | Full Access | READY |

Notes:

- The bundle ID must already exist as an explicit App ID in the developer portal
  before this dialog will offer it. Either register it by hand, or let the first
  `eas build` register it once the Apple account is linked. It has to match
  `ios.bundleIdentifier` in `app.json` exactly. It is frozen, so never edit it.
- The SKU is internal. Users never see it, Apple never shows it, and it cannot be
  changed after creation. Any stable string works. The one above reads clearly in
  a list of future apps.
- The Apple ID (a ten digit number) is generated here. Write it down. `eas submit`
  wants it as `ascAppId`.

---

## 2. App Information

### 2.1 Localizable Information, English (U.S.)

| Field | Answer | State |
|---|---|---|
| Name | `Towinly: Elder Care Companion` | READY |
| Subtitle (30) | `Trusted help for aging parents` (30 of 30) | READY |
| Privacy Policy URL | `https://www.towinly.com/app/privacy` | READY |
| Privacy Choices URL | Leave empty | READY |

The privacy policy URL is the `www` host and the `/app/` path on purpose. The
older `https://www.towinly.com/privacy` page still renders a stale policy with no
third party processor section, and naming it would put an under-disclosing policy
in front of privacy review. `ios-content-readiness.md` section 1 has the rendered
proof of both pages.

Privacy Choices URL is for apps that manage data choices on a website. Towinly
manages them in the app, so it stays empty.

### 2.2 Localizable Information, English (U.K.)

App Store Connect has no English (India) locale. The India storefront reads the
English (U.K.) localization when one exists. Add that locale and paste the India
variant from `listings.md` section 3.

| Field | Answer | State |
|---|---|---|
| Name | `Towinly: Senior Citizen Care` (28 of 30) | READY |
| Subtitle (30) | `Trusted company for parents` (27 of 30) | READY |
| Privacy Policy URL | Same URL as English (U.S.) | READY |

One warning that belongs here rather than in the listings file: the English
(U.K.) slot also serves the United Kingdom and other English storefronts, so it
replaces the U.S. line in those countries rather than adding to it. The India
copy was written to read correctly in both places. Confirm the storefront list
inside the console before saving.

### 2.3 General Information

| Field | Answer | State |
|---|---|---|
| Bundle ID | `com.towinly.app` | READY |
| SKU | `TOWINLY-IOS-1` | READY |
| Apple ID | Generated by Apple. Record it. | AFTER CREATION |
| Primary Category | **Social Networking** | READY, justified below |
| Secondary Category | **Lifestyle** | READY, justified below |
| Subcategories | Games only. Not shown. | Not applicable |
| Content Rights | **Yes**, it contains, shows or accesses third party content, plus the rights confirmation | READY, reasoning below |
| Age Rating | See section 3 | READY |
| License Agreement | Apple's Standard License Agreement (the default) | DECISION, recommendation below |
| Made for Kids | **No.** Leave unticked. | READY |

### 2.4 Why Social Networking is the primary category

The primary category decides which chart the app competes on, which browse lists
it appears in, and, quietly, what a reviewer expects to see when the build opens.

**Social Networking is what the app is.** The core loop is a profile, a
connection between two named people, a private conversation, and a relationship
that changes state over time. That is the category definition. The help request
is how two people meet; the friendship is the product. Everything else in the app
(trust ladder, reviews, family view, Pass On) sits on top of a person to person
connection.

**Lifestyle as primary carries a specific risk for this product.** Dating apps
sit in Lifestyle on iOS. The reviewer notes in section 7 spend an entire section
proving Towinly is not a dating app, because "strangers meet, then meet in
person" reads as dating within the first minute. Filing the app into the same
chart as dating apps argues the opposite of the notes. Open the Lifestyle top
charts in the App Store on submission day and look before overriding this.

**Why not the other plausible ones:**

- Health & Fitness or Medical: wrong and expensive. The AI assistant is
  instructed to refuse medical advice and redirect to a doctor or to emergency
  services. A daily check in records that somebody answered, it does not measure
  anything. Filing under a health category invites the health review standard and
  a claim the product does not make.
- Business or Productivity: Towinly is not a jobs board and takes no payment in
  the app. Helpers earn trust, not wages, inside the product.
- Utilities: it would hide the app from every person who browses for care.

**Secondary category, Lifestyle.** Apple ranks charts on the primary category
only, so the secondary is a browse and discovery slot with no chart cost. It
catches the family searcher who is thinking about home and parents rather than
about social apps. It is honest for a product about company and daily life.

Play's category is a separate decision made in the Play Console and it does not
have to mirror this one. Do not copy this row across.

### 2.5 Content Rights

Apple asks: does your app contain, show, or access third party content? Answer
**Yes**, then tick the confirmation that Towinly has the necessary rights or
permission.

The honest reasoning, because Apple can ask for proof:

- Members write and upload nearly everything on screen: profile photos, bios,
  help requests, reviews, chat messages, Pass On stories and letters. Content a
  member creates is third party content in Apple's sense.
- AI answers are generated by Groq and displayed in the app after per user
  consent.
- The app renders no third party map tiles, no licensed music, no stock media and
  no imported feeds. Geocoding happens on the backend and returns a town name, so
  no OpenStreetMap tile ever reaches the device.

One gap worth closing before submission, not blocking: the terms in
`src/data/legalContent.js` set the rules of behaviour but never grant Towinly
permission to display what a member writes. Apple almost never asks. Every other
service this size has that clause. Adding one plain sentence to the terms makes
the Yes answer provable rather than assumed.

### 2.6 License Agreement

Recommendation: **use Apple's Standard License Agreement.**

Guideline 1.2 requires apps with user generated content to make users agree to
terms with no tolerance for objectionable content or abusive users. Towinly
satisfies that inside the app, not through the store EULA:
`app/(auth)/register.jsx` gates signup behind agreeing to the terms, and the
"How you treat people" section of those terms says harassment, threats, lies,
discrimination, impersonation and anything that puts another person at risk will
get an account closed. A reviewer can see that gate on the way in.

A custom EULA has to meet Apple's minimum terms itself. A weak one is a rejection
in its own right. The standard agreement plus the in app terms is the smaller
risk.

One thing to know rather than be surprised by: the privacy policy and terms pages
carry a visible banner reading "Draft: a lawyer has not checked this yet". No
guideline forbids it and the honesty fits the product, but the reviewer will read
it. Leave it or remove it deliberately. Do not discover it during review.

---

## 3. Age Rating

Set once in App Information, then it applies to every version. Apple revised this
questionnaire in 2025, so answer the wording on screen; the answers below are the
facts, not the exact labels.

### 3.1 Content questions: every one is None

| Category | Answer | Why |
|---|---|---|
| Cartoon or fantasy violence | None | No violence of any kind. |
| Realistic violence | None | Same. |
| Prolonged or sadistic violence | None | Same. |
| Sexual content or nudity | None | None present. Explicit words are filtered at write time by `src/lib/contentFilter.js`. |
| Profanity or crude humor | None | Filtered at write time. |
| Alcohol, tobacco or drug use | None | Not referenced anywhere. |
| Mature or suggestive themes | None | See the bereavement note below. |
| Horror or fear themes | None | None. |
| Medical or treatment information | None | The assistant refuses medical advice and redirects to a doctor or emergency services. Check ins and SOS record and alert, they do not advise. |
| Simulated gambling | None | None. |
| Real gambling | None | None. |
| Contests | None | Streaks are a personal habit counter with no prize. `app/game.jsx` is a memory game with no wager. |
| Unrestricted web access | **No** | No WebView, no in app browser, no user entered URLs. Provable from the dependency list alone. |
| Does the app show ads? | **No** | No ad SDK, no ad inventory, no IDFA. |

### 3.2 Capability questions, which is where the rating actually comes from

| Question | Answer |
|---|---|
| Chat or messaging between users? | Yes |
| Users create or share content other users see? | Yes |
| Does the app share the user's location with other users? | Approximate only, and never read from the device. A hand typed town and a rounded distance. |
| In app controls for objectionable content? | Yes: write time filter, report a person, block a person, terms agreed at signup |
| Parental controls or age assurance? | A self declared date of birth with an 18 minimum at signup. No document check. **Do not claim age verification.** |

### 3.3 Expected result, and one thing not to do

The content answers are clean, so the rating is computed from messaging and user
generated content. Expect a teen tier rather than 4+. Let App Store Connect
compute it and record whatever it returns in this file. Do not inflate a content
answer to force a higher number, and do not overstate the moderation controls to
lower one. Both are misrepresentation and both are checkable in the build.

The app's own terms are 18 and over, and `app/(auth)/register.jsx` enforces
`MIN_AGE = 18`. If Apple computes a teen tier, that is not a contradiction. The
store rating describes content suitability, the signup gate is a product rule.
Google Play does have an explicit target audience question, and the answer there
is 18 and over, per `ios-content-readiness.md`.

One judgement call recorded rather than hidden: the Pass On feature is about
death. Letters read after someone dies, a Sealed box opened by Keyholders. Apple
has no bereavement category and this is not mature or suggestive content, so None
is the honest answer. If a reviewer raises it, the answer is that the subject is
handled plainly and gently and is the point of the feature, not incidental dark
content.

---

## 4. Pricing and Availability

| Field | Answer | State |
|---|---|---|
| Price | **Free.** No price schedule, no planned price change. | READY |
| In-App Purchases | None | READY |
| Pre-Orders | No | READY |
| Availability | **United States and India only.** Every other country and region off. | READY, reasoning below |
| Distribute on the App Store | Yes | READY |
| Make available on Mac with Apple silicon | **No** | READY |
| Make available on Apple Vision Pro | **No** | READY |
| Tax Category | Leave the default | READY |
| Volume purchase for business or education | Leave unticked | READY |

Free means the Paid Apps agreement, the bank account and the tax forms are all
skipped. That is the single largest piece of enrolment paperwork, and Towinly
does not have to do it.

Mac and Vision Pro are off because `app.json` sets `ios.supportsTablet: false`
and the layout is phone only. An untested large screen build earns one star
reviews from people the product was never designed for.

### Why United States and India first

1. **The listings already exist for exactly these two.** `listings.md` carries a
   U.S. variant and an India variant, each written for how that market searches:
   "elder care" and "aging parents" in one, "senior citizen" and "caretaker" in
   the other. No third country has copy, and shipping a market without copy
   written for it wastes the launch.
2. **A marketplace only works where there are members.** Both sides of Towinly
   have to exist in the same town. Spreading a small early population over fifty
   countries gives every one of them an empty app. Two markets concentrate it.
3. **Support is one mailbox read by one person.** `help@towinly.com` is the only
   published contact, and the deletion page promises a reply within seven days.
   Two countries in a language the founder speaks is what one person can answer
   inside that promise. Guideline 1.5 judges whether support is real.
4. **Leaving the EU out at launch is deliberate.** EU distribution requires a
   Digital Services Act trader declaration, and a trader's name, address and
   phone number are published to every EU user. That is a decision to make with
   the account holder awake, not a box ticked on submission night.
5. **Adding countries later needs no review.** Availability is a settings change
   on a live app. Starting narrow costs nothing and is reversible in a minute.
6. **India is a market, not a hedge.** The product answers a specific Indian
   situation: adult children in one city, parents in another. The India
   description was written around it.

---

## 5. App Privacy

Do not answer this section from memory. Every answer is a legal statement about
what the app sends, and Apple audits labels against real network traffic.

**The complete answers live in `privacy-labels.md` in this folder.** Section 1 of
that file is the Apple questionnaire, category by category, with the code path
behind every Yes.

The four things worth repeating here, because they are the ones people get wrong
at the console:

| Question | Answer |
|---|---|
| Data Used to Track You | **None.** Nothing is linked with third party data for advertising, nothing goes to a data broker, and no App Tracking Transparency prompt exists in the app. |
| Data Not Linked to You | **None.** Nothing is collected outside a signed in session. |
| Data Linked to You | Eleven data types are Yes. See `privacy-labels.md` section 1.2. Every one is App Functionality and every one is Used for Tracking: No. |
| Analytics and Diagnostics | **No** for every row, but see the pending check below. |

Two checks that must pass before this section is submitted, both from
`privacy-labels.md` section 5:

- **BLOCKING:** confirm the backend PostHog flag is off in production. If any
  analytics is live, the Usage Data rows become Yes and the answers above are
  false.
- **AFTER BUILD:** diff the aggregated `PrivacyInfo.xcprivacy` from the first EAS
  build against `privacy-labels.md` before submitting. Expo SDK 54 assembles it
  from library manifests, so a library can add a declaration nobody wrote.

Never claim end to end encryption anywhere in this questionnaire or in the
listing. The Sealed box is encrypted by the backend, the app holds no key, and
the privacy policy says so.

---

## 6. Version 1.0.0 page

### 6.1 Media

| Field | Answer | State |
|---|---|---|
| iPhone 6.9" screenshots | 8 shots, 1320 × 2868 px, RGB, no alpha channel | See `screenshots-and-review.md` section 1 |
| iPhone 6.5" screenshots | Not needed. Apple scales the 6.9" set down. | READY |
| iPad screenshots | None owed. `ios.supportsTablet` is false. | READY |
| App Previews (video) | None for 1.0 | DECISION, recommend skipping |

The eight shots, their screens and the exact demo seat each one needs are in
`screenshots-and-review.md`. First two carry the story: the trust ladder, then
real help. Never capture in night mode.

App previews are a real production job and a weak return on a first launch.
Ship the still set, add a preview when the app has usage to film.

### 6.2 Text

| Field | Answer | State |
|---|---|---|
| Promotional Text (170) | `listings.md` section 1, `promo` (161 of 170) | READY |
| Description (4000) | `listings.md`, the block between `apple-us-description:start` and `:end` (1591 chars) | READY |
| Keywords (100) | `listings.md` section 1, `keywords` (97 of 100) | READY |
| Support URL | `https://www.towinly.com/app/support` | READY, corrected 2026-08-15 |
| Marketing URL | `https://www.towinly.com` | READY |
| Version | `1.0.0` | READY, matches `app.json` |
| Copyright | `2026 <legal entity>` | **USER INPUT NEEDED** |
| Routing App Coverage File | Leave empty. Towinly is not a maps app. | READY |
| Build | Select after TestFlight finishes processing | AFTER BUILD |

Promotional Text is the one field Apple lets you edit on a live version with no
review. Seasonal lines and city launches go there, never in the description.

**Copyright.** Apple's format is the year of first publication followed by the
person or entity that owns the rights, with no symbol: `2026 Example Name`. It
must name the same legal entity as the developer account, so it is decided by
section 0. If the enrolment is individual, this is the account holder's own legal
name and it is public. Marked USER INPUT NEEDED because it is a real legal
identity and this sheet will not guess at it.

**Support URL, corrected on 2026-08-15. It is built and it is live.** The
second of the two options below was taken. `https://www.towinly.com/app/support`
returns HTTP 200 and renders the support page: a contact address, a plain
sentence about response time, and links to the privacy policy and the terms.
Verified twice on 2026-08-15, by bundle content and by a real browser render at
440 x 956, and re-fetched again when `console-answers.md` was written. The
route lives in this repo at `app/support.jsx`, guarded by
`__tests__/support-page.test.js`.

The old wording said "Nothing exists today: the website has no `/support`,
`/help` or `/contact` route", and offered two ways to close the gap:

1. Fast: point Support URL at `https://www.towinly.com/app/delete-account`. It is
   live, public, names `help@towinly.com` and explains how a person gets an
   answer and how long it takes. It is thin, because it only covers deletion.
2. Better: build a small support page served at
   `https://www.towinly.com/app/support`, the same way the deletion page is.

What is left is the console paste. Still send a test message to
`help@towinly.com` and confirm a human receives it. The domain has MX records
on Cloudflare Email Routing, which proves mail is accepted, not that anyone
reads it. Three public pages, the Play data deletion path and both store
contact fields all depend on that mailbox.

### 6.3 Release notes: the field that is not there

**App Store Connect does not show "What's New in This Version" for a 1.0.** It
appears from the second version onwards. This is not a missing step. If the first
build is rejected and a second build is uploaded under the same 1.0.0, the field
is still not shown.

Google Play does show release notes on a first release. The text for it is
written and counted: `listings.md` section 6, the block between
`release-notes-v1:start` and `:end`, 383 characters against Play's 500 limit.

Hold that same text for the first iOS update. Rewrite the first line then, since
"This is the first Towinly release" stops being true.

---

## 7. App Review Information

### 7.1 Contact, so Apple can reach a human

| Field | Answer | State |
|---|---|---|
| First Name | | **USER INPUT NEEDED** |
| Last Name | | **USER INPUT NEEDED** |
| Phone Number | With country code | **USER INPUT NEEDED** |
| Email Address | | **USER INPUT NEEDED** |

Use an address the account holder reads within hours, not `help@towinly.com`.
This is where a rejection or a question arrives, and every hour of delay is an
hour of review queue. `help@towinly.com` stays the public support address.

### 7.2 Sign-in, so the reviewer can get in

| Field | Answer | State |
|---|---|---|
| Sign-in required | **Yes** | READY |
| Username | `elder` | READY, tested against production on 2026-08-11 |
| Password | `12345678` | READY, tested |

App Store Connect has one username and one password field. The elder seat goes
there and the other seats go in the notes. All three seats returned HTTP 200 with
`ev: true`, so no reviewer meets an email verification wall. The login field
accepts a username, an email or a phone number, so `elder` works as typed. The
rate limiter counts failures only and cannot lock out a correct password.

Re-test all three logins on the morning of submission. They are live accounts on
a live backend.

### 7.3 Notes, ready to paste

**Superseded on 2026-08-15. Do not paste the block below.** The version to
paste is the `review-notes-v1` block in `console-answers.md`, which is
3967 characters, guarded by `__tests__/console-answers.test.js`, and corrected
on one claim this draft got wrong.

The wrong claim, kept here so the correction is visible rather than quiet: the
bullet below tells Apple there is "a content filter on posts and messages".
There is no filter on messages. `objectionableError` from
`src/lib/contentFilter.js` has three call sites, and the chat composer is not
one of them: `app/profile-edit.jsx:236` for the bio,
`app/(tabs)/action.jsx:99` to `:101` for a help request, and
`app/pass-on/index.jsx:299` for a Pass On entry.
`app/chat/[connectionId].jsx:200` posts to `/messages/{id}/send` with no check,
and the Spring Boot backend has no filter either. A reviewer can disprove that
sentence in thirty seconds by typing a slur into a chat.

App Store Connect caps this field at 4000 characters. The draft in
`screenshots-and-review.md` is 3807 characters on its own, which leaves no room
for the account deletion path a reviewer will look for. The block below was
that draft, tightened, with the deletion section added.

<!-- review-notes-superseded-2026-08-15:start -->
WHAT TOWINLY IS

Towinly connects three kinds of people. Elders are older adults who ask for help: a ride, shopping, cleaning, or simply company. Helpers are members who offer that help. Family members are relatives the elder links to their own account so someone they love can see they are safe.

TOWINLY IS NOT A DATING APP

An app where strangers meet can look like one at first glance, so here is the difference in mechanics, all visible in the build:

- No swiping, no browsing people by photo, no romance framing anywhere.
- Elders and helpers meet through a posted help request, never through a gallery of profiles.
- Every pair climbs a seven step trust ladder: Connected, Messaging, Phone, Video, Socials, Met in person, Trusted. Both people confirm each step.
- Phone numbers stay hidden until both people reach the Phone step. Meeting in person is step six of seven.
- Guideline 1.2 controls are all present: report a person from their profile, block a person from their profile (list under Profile > Blocked people), a content filter on posts and messages, and zero tolerance terms agreed at signup. Reports reach help@towinly.com.

DEMO ACCOUNTS (please review all three)

The one tap demo buttons are compiled out of production builds on purpose. Type these into the login field, which accepts a username or an email:

- Elder: "elder" / "12345678" (Margaret, helpers at different trust steps)
- Helper: "helper" / "123456789" (Harsha)
- Family: "demo.sarah@towin.app" / "DemoSarah!2026" (Sarah, Margaret's daughter)

The family login uses the older towin.app domain because that is how the backend seeds it. Type it exactly. Demo data resets a few minutes after the last change, so sample data reappearing is expected.

DELETING AN ACCOUNT

Deletion happens inside the app: Profile tab, then "Account and data", then "Delete my account". Towinly asks twice and the second question is "Delete forever". The web page linked from the privacy policy is only for people who no longer have the app installed.

Please test deletion on this spare seat rather than the three above, because they are shared with the next reviewer: <<SPARE SEAT: USER INPUT NEEDED>>

HOW TO REACH GUARDIAN MODE (no real family needed)

The family surface is only reachable from a family account, and Sarah's seat is fully seeded.

1. Sign in as demo.sarah@towin.app. Home is the family panel and Margaret appears as her linked parent.
2. Tap Margaret's card. Her page has three tabs: the friendships she shares with their trust ladders, how she is today, and what Sarah is allowed to do.
3. Margaret has already allowed Sarah to manage her help requests and to take trust steps for her, so both work with no setup. The elder's side of those switches is under Home menu > My Family > Controls on the "elder" seat.

THE AI ASSISTANT: CONSENT AND REPORTING

Tap the "Ask AI" pill with the tortoise on any tab. Before the FIRST question a consent dialog appears. It names Groq, the outside AI service, says what is shared (the question, the chat, first name and trust score, never contact details), warns that answers are machine written and can be wrong, and offers "Not now" and "Yes, that's okay". "Not now" sends nothing. Consent is stored per user on the device, so a different demo account shows the dialog again. Every answer carries "Report this answer", which opens the feedback form with the answer quoted. Reports reach help@towinly.com.
<!-- review-notes-superseded-2026-08-15:end -->

**Before pasting, resolve the spare seat placeholder.** A reviewer will test
account deletion, because guideline 5.1.1(v) is on their checklist. If they test
it on a shared demo seat, that seat can disappear for good:
`DemoResetCoordinator` resolves the protected demo ids lazily and caches them on
first use, so a delete that runs before the first lookup leaves the id outside
the protected set and no restore is ever scheduled. `ios-content-readiness.md`
Gap B has the full trace.

Three ways out, best first:

1. Backend fix, outside this repo's write scope: warm the demo id set at startup,
   or resolve it before the mutation rather than after.
2. Seed a fourth disposable account and name it in the placeholder above. Costs
   one row.
3. Weakest: delete that paragraph and replace it with a single line asking the
   reviewer not to delete the demo accounts. Reviewers are not obliged to read
   notes, so this alone is a gamble.

Do at least one of these before the build goes to review, and re-check the three
seats immediately before submitting.

| Field | Answer | State |
|---|---|---|
| Notes | The `review-notes-v1` block in `console-answers.md`, once the spare seat is resolved | READY on resolution |
| Attachment | Optional. Leave empty. | READY |

The attachment field takes a document for the reviewer. Skip it. Reviewers read
the Notes field reliably and open attachments unreliably, so anything that
matters belongs in the text.

---

## 8. Release control

### 8.1 Manually or automatically: release manually

| Field | Answer | State |
|---|---|---|
| Version Release | **Manually release this version** | READY, reasoning below |
| Phased Release for Automatic Updates | Has no effect on a 1.0. Leave it on. | READY |

Apple offers three: release automatically on approval, release manually, or
release automatically after a date you pick.

**Choose manual for the first launch.** The reasons are specific to this launch,
not general caution:

1. **Approval lands at an hour nobody chose.** Apple approves when the queue
   reaches you, including the middle of the night. Automatic release means the
   first real elders and helpers arrive on a live backend while everyone is
   asleep. The first hour of a trust product is the one hour worth watching.
2. **The two stores are on different clocks.** Google Play's closed testing gate
   is 12 testers for 14 consecutive days before production access, and it is the
   long pole for the Android side. Manual release on iOS is what lets both stores
   go live on the same day rather than three weeks apart.
3. **Marketing is written and waiting.** The Instagram captions already say the
   app is on the way. A press button that fires at a chosen moment is worth more
   than one that fires at random.
4. **It buys a last health check.** Before pressing Release: the API answers, the
   demo seats still log in, `help@towinly.com` receives mail, and the policy URLs
   return 200. All four are outside the build and all four can break after
   approval.

The cost of manual is one button. An approved version waits in Pending Developer
Release until it is pressed.

Automatically after a date is the compromise. Use it only if a launch date is
already fixed and the account holder cannot be at a computer that day. It has the
same risk as automatic if the review runs long, because Apple releases as soon as
approval and the date have both passed.

### 8.2 Phased release, stated plainly

Phased release rolls an update out to existing users over seven days. Version
1.0.0 has no existing users, so the setting does nothing at launch. Leaving it on
means it is already correct at 1.0.1, when it does matter: a bad update reaches
one percent of users on day one instead of all of them, and the rollout can be
paused. There is no reason to turn it off.

---

## 9. Questions asked at the moment of submission

| Question | Answer | Why |
|---|---|---|
| Does this app use the Advertising Identifier (IDFA)? | **No** | No ad SDK, no attribution SDK, no analytics SDK anywhere in the dependency list. |
| Export compliance | **Not asked.** `app.json` sets `ITSAppUsesNonExemptEncryption: false`, so App Store Connect skips the question on every build. | READY |
| Content rights, asked again | Yes, with the confirmation. Same answer as section 2.5. | READY |

The export compliance answer is truthful and was traced call by call: HTTPS only,
Keychain through `expo-secure-store`, and one PKCE use of `expo-crypto` on the
Google sign in path that is web gated out of the store build. The Sealed box is
encrypted server side and the app never holds a key. All of that is exempt.

AFTER BUILD: confirm `ITSAppUsesNonExemptEncryption` is present and false in the
generated `Info.plist` of the first EAS build. There is no `ios/` directory in
the repo, so the key is injected at prebuild from `app.json`. If a native `ios/`
directory is ever committed, the value has to be maintained there instead.

---

## 10. TestFlight, if external testers are used

App Store Connect asks for a separate set of fields under TestFlight. Internal
testers (up to 100 people on the team) need none of this. External testers need
Beta App Review, which is lighter than App Review but is a real review.

| Field | Answer | State |
|---|---|---|
| Beta App Description | Reuse the Description from section 6.2 | READY |
| Feedback Email | Same address as the review contact | **USER INPUT NEEDED** |
| Marketing URL | `https://www.towinly.com` | READY |
| Privacy Policy URL | `https://www.towinly.com/app/privacy` | READY |
| Beta App Review Information | Same demo seats and notes as section 7 | READY |
| What to Test | One or two lines naming the screens to try | Write per build |
| Export compliance for TestFlight | Skipped, same plist key | READY |

---

## 11. Fields Towinly answers with nothing

Listed so nobody hunts for a missing step.

| Field | Why it is empty |
|---|---|
| In-App Purchases and Subscriptions | No payments in the app. |
| Game Center | Not a game. `app/game.jsx` is an on-device memory game with no leaderboard. |
| App Clips | None. |
| Apple Watch app | None. |
| Push notification certificates | `ios.entitlements` is empty. No push in 1.0. |
| Associated Domains | None. Universal links are not used. |
| Sign in with Apple | Not required. The Google button returns null when `Platform.OS !== 'web'`, so no third party login ships in the store build and guideline 4.8 does not apply. |
| Routing App Coverage File | Not a maps app. |
| Custom Product Pages | A later optimisation, not a launch field. |
| Pre-Orders | Not used. |
| Nutrition label for third party SDKs | No data collecting SDK is bundled in the app. The backend processors (Groq, Twilio, AWS, OpenStreetMap, Railway) are declared in the privacy policy and in `privacy-labels.md` section 4, not as SDKs. |

---

## 12. What is still open, in one list

| # | Item | Owner | Blocking? |
|---|---|---|---|
| 1 | ~~Support URL: pick the deletion page or build `/app/support`~~ CLOSED 2026-08-15. `/app/support` is live and returns 200. | Console paste only | No |
| 2 | Send a test email to `help@towinly.com` and confirm a human gets it | Account holder | **Yes** |
| 3 | Spare demo seat for deletion testing, or the backend id fix | Backend | **Yes**, for review safety |
| 4 | ~~Confirm the backend PostHog flag is off in production~~ ANSWERED 2026-08-15: `POSTHOG_API_KEY` **is set**. Now a decision, not a check. Keep it and declare Email plus Analytics shared on both forms, or clear the variable. `console-answers.md` section 5. | Account holder | **Yes**, the privacy labels depend on it |
| 5 | Individual or organization enrolment, which sets the copyright line | Account holder | **Yes** |
| 6 | Add a content licence sentence to the terms | This repo | No, recommended |
| 7 | Decide whether the "Draft: a lawyer has not checked this yet" banner stays | Account holder | No, decide before review |
| 8 | Diff `PrivacyInfo.xcprivacy` against `privacy-labels.md` | AFTER BUILD | Yes, before submitting |
| 9 | Confirm `ITSAppUsesNonExemptEncryption` in the built `Info.plist` | AFTER BUILD | Yes, before submitting |
| 10 | Re-test all demo logins on submission morning | Account holder | Yes |

## 13. USER INPUT NEEDED, in one list

Nothing below may be guessed or filled in from an old document. Every one is real
personal or legal data.

| Field | Where it appears | Public? |
|---|---|---|
| Enrolment type: individual or organization | Apple Developer enrolment | Sets the seller name |
| Legal entity name | Enrolment, and the copyright line in section 6.2 | **Yes, public** |
| D-U-N-S number | Only for organization enrolment | No |
| Postal address | Enrolment, and a DSA trader declaration if the EU is ever added | Public in the EU only |
| App Review contact: first name | Section 7.1 | No |
| App Review contact: last name | Section 7.1 | No |
| App Review contact: phone with country code | Section 7.1 | No |
| App Review contact: email | Section 7.1 and TestFlight feedback | No |
| Legal, Technical and Marketing contacts | App Store Connect account settings | No |
| Spare demo seat credentials | The reviewer notes in section 7.3 | Reviewer only |

---

## Change log

- 2026-08-11: written. Categories chosen and argued, availability argued, release
  strategy set to manual, reviewer notes rewritten to fit the 4000 character
  field with the account deletion path added.
- 2026-08-15: three corrections, all evidence-led.
  1. The Support URL row said BLOCKING and the prose said no support route
     existed. `https://www.towinly.com/app/support` returns 200 and renders the
     page. Only the console paste is left.
  2. The reviewer-notes block was superseded. It told Apple the content filter
     covered messages, which the three call sites of `objectionableError`
     disprove. The pasteable version now lives in `console-answers.md` and is
     guarded by a test that fails if that sentence ever comes back.
  3. `console-answers.md` was added as the console-day sheet for both stores.
     This file is now the reasoning behind the Apple half of it.
