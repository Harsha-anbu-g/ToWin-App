# Google Play parallel track: everything that can be done before the account exists

Google Play, not Apple, sets the launch date. A brand new personal developer
account cannot publish to production until it has run a closed test with at
least 12 testers who stayed opted in for 14 days in a row, and then passed a
separate production access review. That is a two to three week wall that no
amount of engineering removes.

This document exists so that on the day the Play account opens, the only thing
left to do is click. Everything that does not need the account is answered
here, verified against the code.

Verified against commit `af22521`, 11 August 2026. Every claim about the
Android build comes from the merged release manifest and the repo config, not
from memory. The commands used are listed in the appendix.

**Paste from `console-answers.md`, not from here.** That sheet, added
2026-08-15, holds every answerable field for both stores with the console's own
labels, including the whole IARC questionnaire and the App content forms. This
file stays as the plan: the order, the calendar, the 12-tester gate and the
build commands. Where the two disagree, `console-answers.md` wins.

Companion documents:

- `docs/store/listings.md` sections 2 and 4 hold the Play title, short
  description, and full description for the United States and India.
- `docs/store/privacy-labels.md` holds the Data Safety answers.
- `docs/store/screenshots-and-review.md` holds the graphic assets.
- `../../../docs/store-listing.md` (repo root) holds reviewer notes and demo
  logins.

---

## 0. The calendar, counted backwards

Today is Tuesday 11 August 2026. The Apple account arrives next week. Play is
the longer road, so it starts first.

| Step | Length | Can start today? |
|---|---|---|
| Register the Play developer account, pay $25 | same day to submit, verification often 1 to 3 days and can run longer | No, needs the $25 and ID |
| Create the app record, fill App content forms | half a day | No, needs the account |
| First closed testing release goes through review | a few days for a first release on a new account | No |
| 12 testers opted in, 14 consecutive days | 14 days minimum, longer if the count breaks | The recruiting can start today |
| Apply for production access, Google reviews it | Google states up to about 7 days | No |
| Production release review | a few days on a young account | No |

Realistic earliest production date if registration happens the day the account
money is spent and nothing resets: roughly four weeks out. If the tester count
breaks once and restarts, add another 14 days. That single fact is the reason
the tester list must be over-recruited before day one.

Two dates worth writing on a wall:

- Day the closed track goes live: everything after depends on it.
- Day + 14: the earliest the production access form can be filled.

---

## 1. Money, accounts, and what is free right now

### Costs money

| Item | Cost | When |
|---|---|---|
| Google Play developer registration | $25, one time, never renewed | Before anything else Play related |
| Apple Developer Program | $99 per year | Separate track, next week |

Nothing else on the Android side costs money. There is no Play equivalent of
the annual Apple fee, no per-app fee, and no charge for tracks, testers, or the
content forms. The Google Cloud project needed for the submit service account
is free at this usage and does not require a billing account for the Google
Play Android Developer API.

### Needs an account but no money

- A Google account to own the Play Console. Use a dedicated one, not a
  personal inbox that might be lost.
- A free Expo account for EAS builds. The free tier is enough. Builds queue
  slower than paid, which is another argument for building early.
- A Google Cloud project, created free from inside Play Console when linking
  API access.

### Free and possible today, before any account or payment

1. Install the EAS CLI, log in to a free Expo account, link the project, and
   run a real production Android build. This produces a signed `.aab` file and
   locks nothing on the store side. See section 9.
2. Recruit and confirm the 12 testers, collect their exact Google account
   addresses, and fill in the tracking table in section 8.
3. Pre-write every App content answer. Sections 4 through 6 already contain
   them.
4. Confirm the listing copy and screenshots are final. They already are.
5. Decide the public developer name and the support email that Play will show.

Point 1 matters more than it looks. A first EAS Android build on a new project
surfaces credential prompts, keystore generation, and any prebuild error. Doing
that while waiting on paperwork costs nothing. Doing it on the day the account
opens costs a day.

### The freeze warning, restated

The package name `com.towinly.app` locks at the first upload to any Play track.
Internal testing counts. There is no undo, and Play never allows a package name
to be reused, even by the same developer. Read
`.claude/skills/mobile-release-ops/SKILL.md` before touching identifiers.

---

## 2. Exact Play Console setup order

Follow this order. Several steps block others, and doing them out of order
wastes days.

**Phase A, account (day 1)**

1. Sign up at `play.google.com/console` with the owning Google account. Choose
   **Personal** account type. Pay the $25.
2. Complete identity verification straight away. Google asks for a legal name,
   address, phone number, and often a government ID. Nothing else can start
   until this clears. Answer it the hour it arrives.
3. Set the public developer name, the developer email address, and the
   developer website under **Settings > Developer account > Developer page**.
   Use `help@towinly.com` and `https://www.towinly.com`. Play shows these to
   users, so do not use a private inbox.

**Phase B, the app record (day of verification)**

4. **All apps > Create app.** App name: **OWNER DECIDES**, one of the two
   candidates below (this field is the store listing title, 30 characters,
   and this step is the one place the choice is recorded; corrected
   2026-08-30, APS-13, from a bare `Towinly` that contradicted `listings.md`):
   - `Towinly` (7 of 30 characters; plain brand, wastes the index slot)
   - `Towinly: Elder Care Companion` (29 of 30; the name `listings.md`
     section 2 and the root `docs/store-listing.md` pin, carrying the search
     phrase)
   Default language English (United States), type App, free. Tick the
   declarations. This creates the record but does not yet fix the package
   name.
5. **Monetization > check nothing.** The app is free, has no in-app purchases,
   and no Play Billing library is present, verified in `package.json`.

**Phase C, App content forms (same day, all free, all answerable from this
document)**

6. **Policy > App content**, work top to bottom: privacy policy, app access,
   ads, content rating, target audience and content, data safety, news,
   COVID-19 apps, data deletion, government apps, financial features, health
   apps, advertising ID. Exact answers in sections 4 and 5.
7. **Store presence > Main store listing.** Paste from `listings.md` section 2.
   Upload the graphics from `screenshots-and-review.md`.
8. **Store presence > Store settings.** Category Lifestyle, tags for elder care
   and social, contact email `help@towinly.com`, website, and the external
   privacy policy link.

Steps 6 to 8 must be complete before a closed testing release can be rolled
out. Play blocks the rollout otherwise, and finding that out on release day
costs a day of the 14.

**Phase D, first upload and internal sanity check**

9. **Testing > Internal testing > Create new release.** Upload the `.aab` by
   hand. Add yourself and one other person. This is the moment the package name
   freezes.
10. Install from the internal track on a real Android phone. Confirm login,
    the trust ladder, chat, and the delete account page. Do not skip this. A
    broken build discovered during closed testing burns days of the 14.

Internal testing does **not** count toward the 14 day requirement. It exists
here purely to catch a bad binary cheaply.

**Phase E, closed testing, the clock**

11. **Testing > Closed testing.** Configure the track per section 6.
12. Roll out the release. Wait for the first review to pass.
13. Send the opt-in link to the testers. Section 7 has the message.
14. Track the opt-in count daily in the tracking table.

**Phase F, production**

15. After 14 consecutive days at 12 or more opted-in testers, the **Apply for
    production access** form unlocks. Fill it with real answers about the
    testing.
16. Google reviews the application, stated as up to about 7 days.
17. Only then create the production release. Start at a 10 percent staged
    rollout per `mobile-release-ops`.

---

## 3. Ground truth about the Android build

These are the facts every Play form answer rests on. All were read out of the
merged release manifest at
`android/app/build/intermediates/merged_manifest/release/processReleaseMainManifest/AndroidManifest.xml`,
which is what Google actually inspects.

**Target API level. `targetSdkVersion 36`, `minSdkVersion 24`.**

Play requires new apps to target a recent API level, and the bar rises on 31
August every year. Expo SDK 54 compiles against API 36, which is the highest
current level. This is already satisfied. No change needed, and no conflict
with the SDK 54 pin.

**The complete permission list in the shipping build:**

| Permission | Where it comes from | User sees a prompt? |
|---|---|---|
| `INTERNET` | the app talks to the backend | No, normal permission |
| `ACCESS_NETWORK_STATE` | `@react-native-community/netinfo` | No |
| `ACCESS_WIFI_STATE` | netinfo | No |
| `VIBRATE` | `expo-haptics` | No |
| `USE_BIOMETRIC`, `USE_FINGERPRINT` | `expo-secure-store` | No |
| `READ_EXTERNAL_STORAGE`, capped at `maxSdkVersion="32"` | `expo-image-picker` | Only on Android 12 and older |
| `com.towinly.app.DYNAMIC_RECEIVER_NOT_EXPORTED_PERMISSION` | AndroidX internal | No |

**What is absent, and this is the important part:**

- ~~No `ACCESS_FINE_LOCATION` or `ACCESS_COARSE_LOCATION`. Location is a town the
  user types in.~~ **Corrected 2026-08-22.** The manifest HAS held
  `ACCESS_FINE_LOCATION` since 2026-08-19, declared by the `expo-location`
  plugin. Nothing precise is ever transmitted: every fix is snapped to a 0.02
  degree cell, roughly 2 km across, by `src/lib/coarseLocation.js` before it
  reaches the network, and the typed town still works for anyone who declines.
  The gap between the permission held and the data collected is deliberate and
  is the OPEN QUESTION at the end of `privacy-labels.md`, which recommends
  answering Play with Approximate = Yes and Precise = Yes and explaining in the
  Data safety free text. Decide that before the next Play submission.
- No `CAMERA`, no `RECORD_AUDIO`. Both are actively removed with
  `tools:node="remove"` in `android/app/src/main/AndroidManifest.xml`, backed by
  `blockedPermissions` in `app.json`.
- No `READ_CONTACTS`.
- No `POST_NOTIFICATIONS`. There is no push in v1.
- No `com.google.android.gms.permission.AD_ID`.
- No `READ_MEDIA_IMAGES` or `READ_MEDIA_VIDEO`.

**Two conclusions that save console work:**

1. **The advertising ID declaration is a clean No.** The permission is not in
   the manifest and no ad or analytics SDK is in `package.json`.
2. **No Photo and Video Permissions declaration is required.** That declaration
   is only demanded of apps requesting broad `READ_MEDIA_IMAGES` or
   `READ_MEDIA_VIDEO` access. Because `READ_EXTERNAL_STORAGE` is capped at API
   32, on Android 13 and above the profile picture flow uses the system photo
   picker and asks for no media permission at all. If a future change adds a
   media permission, this declaration comes back and the answer must change.

**Other build facts for the forms:**

- Package `com.towinly.app`, version name `1.0.0`.
- `allowBackup="false"`, with explicit backup and data extraction rules for
  secure storage.
- `expo.modules.updates.ENABLED=false`. The store binary does not contact
  Expo's update servers, so there is no code-download question to answer.
- No payment library of any kind. Checked `package.json` for billing, Stripe,
  and Razorpay. Nothing present.

---

## 4. App content answers, one by one

Every one of these is free and can be filled the hour the account verifies.

### Privacy policy

URL: `https://www.towinly.com/app/privacy`. Corrected 2026-08-15: this row used
to say "the website's `/privacy` page", and the bare
`https://www.towinly.com/privacy` is a different, older document with no
third-party processor section and a location paragraph that never says the
position is rounded on the phone before it is sent. Naming it would put an
under-disclosing policy in front of Play review. Both addresses answer 200, so a status code will not
catch the mistake. Use the `/app/` path.

It is live and reachable without logging in: HTTP 200 on 2026-08-15.

### App access

**All or some functionality is restricted.** The whole app is behind a login,
so Google needs working credentials or a reviewer sees a login wall and
rejects.

Add three instructions, one per role, copying the table from
`../../../docs/store-listing.md`:

| Role | Username | Password |
|---|---|---|
| Elder | `elder` | `12345678` |
| Helper | `helper` | `123456789` |
| Family or guardian | `demo.sarah@towin.app` | `DemoSarah!2026` |

Add the same note that the iOS submission carries: the family account email
uses the older `towin.app` domain because that is how the read-only backend
seeds it, and it is not a typo. Also say the demo accounts reset themselves a
few minutes after the last change, so reappearing sample data is expected.

Verify all three log in on the day of submission. A dead demo account is the
single cheapest rejection to avoid and the most common one to hit.

### Ads

**No, this app does not contain ads.** True and verified. No ad SDK, no ad ID
permission.

### Content rating questionnaire

Free. Found at **Policy > App content > Content rating**. Google runs the IARC
questionnaire, which produces ratings for every region at once, including the
United States (ESRB) and India (IARC generic).

Answer honestly. The questionnaire is a legal declaration, and a wrong answer
here is a policy strike later.

| Question area | Answer | Why |
|---|---|---|
| Category | Social networking or communication | The product is people connecting to people |
| Violence, blood, sexual content, crude humour | No | None present |
| Drugs, alcohol, tobacco | No | None present |
| Gambling, simulated gambling, real money | No | `app/game.jsx` is a local memory game with no wagering, no prizes, no currency |
| Users can interact or exchange content | **Yes** | 1:1 chat, help requests posted to a feed other members browse |
| Users can share their location with other users | **Yes**, town level | A typed town geocoded server side, or the phone read in the foreground and snapped to a ~2 km cell on the device. Members see a town and a rounded distance, never a point on a map (corrected 2026-08-22; this cell used to end "There is no GPS") |
| Personal information shared with other users | **Yes** | Name, photo, bio, and, at the Phone Ready step, phone number |
| Unrestricted access to the internet | **No** | There is no in-app browser or open web view |
| Digital purchases | No | Nothing is sold |
| User-generated content moderation | Describe the real controls: report a person from their profile, block from their profile, a managed block list at Profile > Blocked people, a write-time word filter on bios, help requests, Pass On entries, private messages and family reviews (widened 2026-08-22, HARD-113), a report button under every AI answer, and `help@towinly.com` for reports. Say plainly that the filter is a client-side wordlist and that report and block cover what it misses |

Expect a Teen level rating rather than Everyone. That is correct and expected
for an app with open user-to-user messaging. Do not try to argue it down.

### Target audience and content

This is the section the code was written for. Found at **Policy > App content >
Target audience and content**.

**Select 18 and over only. Do not tick any age band below 18.**

The evidence that backs this answer, in case Google asks:

- `app/(auth)/create-account.jsx` sets `const MIN_AGE = 18` (register.jsx
  until the 2026-08-28 sign-up split; corrected 2026-08-30, APS-11).
- Its submit handler refuses the signup with the exact words
  `You have to be ${MIN_AGE} or over to join Towinly.`
- The same file sets `MAX_AGE = 120` so a four digit year typo lands on an
  error instead of quietly passing the check.
- The field is a required, validated date of birth with the helper text
  `For example 14 May 1953. You have to be 18 or over to join.`
- The comment above the constant names this requirement directly: "Google Play
  also asks you to declare a target age and looks for a real gate behind an
  adults-only answer."
- Guarded by `__tests__/register-age-gate.test.js`.

That is a real gate, enforced before the account is created, not a checkbox on
a splash screen. Google looks for exactly this behind an adults-only
declaration.

Consequences of the 18+ answer, all of them good:

- The app is out of scope for the Families policy and the Designed for Families
  programme.
- The store listing must not use child-appealing imagery. The parchment and
  serif brand is safe.
- If anyone ever proposes lowering the age or adding a teen band, it drags in
  the whole Families policy surface. Treat that as an architectural decision,
  not a form edit.

### Data safety

Found at **Policy > App content > Data safety**. Do not improvise this form.
Every answer is already worked out and verified against real network traffic in
`docs/store/privacy-labels.md`. Copy from there field by field.

The three items most often filled in wrongly, flagged here so they are not
missed:

1. **The AI helper row.** Questions sent to the assistant go to Groq, a third
   party, with the user's first name and trust score and nothing else. It is
   consent-gated per user. Declare it as shared with a third party.
2. **Phone numbers go to Twilio** to deliver codes and trust-milestone alerts.
   That is a third party share, not internal use only.
3. **The analytics question depends on a backend variable, not the app.** Run
   `railway variables` and check `POSTHOG_API_KEY` on the production backend
   before answering. The server records a signup event keyed on the plaintext
   email when that key is set. If it is set, the honest answer is Email plus
   Analytics plus shared with a third party. If it is unset, keep it unset on
   purpose and record that decision.

Data deletion: Play requires a deletion route reachable without installing the
app. It exists at `https://www.towinly.com/app/delete-account`, built as a
public unauthenticated route in `app/delete-account.jsx`. Use that exact URL.
The bare `towinly.com/delete-account` is wrong and does not redirect.

Open item carried from `store-listing.md`, and it blocks this answer: set
`EXPO_PUBLIC_LEGAL_CONTACT_EMAIL=help@towinly.com` on the `towinly-app` Vercel
project, or the deletion page a Play reviewer opens still renders the "no
address set yet" fallback.

### The remaining declarations

| Declaration | Answer |
|---|---|
| News app | No |
| COVID-19 contact tracing or status | No |
| Government app | No |
| Financial features | None. No lending, no payments, no crypto, no banking |
| Health apps | No health features declared |
| Advertising ID | **No**, the app does not use an advertising ID. Verified, the permission is absent |

One caution on the health answer. The brand line "Company isn't a luxury.
Company is healthcare." is approved for marketing and it is genuinely good, but
it must stay out of the Play listing text and out of the health declaration.
The moment a store listing makes a health claim, Play's health app policy and
its evidence requirements attach. The listing copy in `listings.md` was checked
and contains no health or medical claims. Keep it that way.

---

## 5. Country and device availability

Set under **Release > Production > Countries / regions**, and separately on the
closed track.

- Launch markets are the United States and India.
- Add every country where a tester physically is. A tester in a country the
  track does not cover cannot install, and that silently costs a slot in the 12.
  Canada matters here, per the marketing plan.
- Device exclusions: none. `minSdkVersion 24` already covers Android 7 and up,
  which is where the older, cheaper phones many of these users own actually
  sit. Do not raise it.

---

## 6. The closed testing track, configured exactly

**Testing > Closed testing.** Either use the default Alpha track or create one
named `closed-testing-12`. One track. Do not spread testers over several closed
tracks, because the requirement is measured against a single closed test.

**Testers tab**

- Choose **Email list** rather than a Google Group unless the group already
  exists. An email list is editable in place and easier to audit.
- Create a list named `towinly-closed-testers`.
- Paste the exact Google account addresses collected in section 8. Exact
  matters. An alias, a plus-address, or a work address the person does not use
  on their phone all fail silently.
- Recruit **15 to 18 people for 12 slots.** Two or three will drop out, change
  phones, or give the wrong address. Over-recruiting is the cheapest insurance
  available against a 14 day restart.
- Copy the **opt-in URL** from this tab. That link is what goes in the
  recruitment message.

**Releases tab**

- Create new release, upload the `.aab`.
- Release name: the version code. Release notes: plain, short, honest.
- Rollout 100 percent. There is no reason to stage a closed test.
- Save, then **Review release**, then **Start rollout to Closed testing**.

**Then wait.** The first release on a new account goes through review. Testers
cannot opt in until it is live, and the 14 day clock does not start until they
can. Do not send the recruitment message before the track is actually live, or
12 people will tap a dead link and lose interest.

**Countries** on the closed track must include every tester's country. Check
this before rolling out.

---

## 7. The 12 testers and the 14 consecutive days

### What Google actually measures

At least **12 testers opted in to the closed test, on every one of 14
consecutive days.** It is a rolling look-back. The Console shows the current
opted-in count on the closed testing page. Check it daily and write the number
down.

### What each tester must do

1. Give you the **exact Google account address they use on their Android
   phone.** Not a second address, not one they never sign into. Google matches
   on that account, and a mismatch means the person is simply not counted.
2. Own an **Android phone running Android 7 or newer** with the Play Store on
   it. An iPhone cannot help with this. A tablet is fine. An emulator is not
   worth the risk.
3. Open the opt-in link, tap **Become a tester**, then install Towinly from the
   Play Store link on that page.
4. **Keep it installed for the whole 14 days.** Not opted in and uninstalled.
   Installed.
5. **Stay opted in.** Do not tap "Leave the program" on the opt-in page.
6. Actually open it a few times and send back a sentence or two of feedback.
   This is not measured by the counter, but the production access application
   asks what feedback you gathered and what you changed. Real answers there are
   worth having.

### The ways the 14 days reset, and how each is prevented

| What happens | Effect | Prevention |
|---|---|---|
| The count drops below 12 on any single day | The 14 day run restarts | Recruit 15 to 18. Check the count daily |
| A tester taps "Leave the program" | Count drops | Tell them plainly in the message not to do it |
| A tester is removed from the email list, or the list is edited badly | Count drops | Never edit the list mid-run except to add. Keep a copy of it outside the Console |
| A tester gave an address they do not use on their phone | They never count at all, and you will not notice for days | Confirm each address against the phone in week one. Chase anyone who has not shown up as opted in within 48 hours |
| A tester's country is not in the track's country list | They cannot install | Set countries before rollout |
| The release is paused, halted, or the track has no live release | The test is not running | Do not touch the track once it is live |
| The app is uninstalled | Does not break the opt-in count by itself, but weakens the production access application and risks the tester drifting away | Ask them to keep it. Send one reminder at day 7 |
| A new closed track is created and testers moved | Splits the test | One track only |
| A build is uploaded that crashes on launch | Testers uninstall, then drift | Sanity test on the internal track first, step 10 |
| Counting the days from the wrong start | Applying too early, then waiting again | Day 1 is the first day the count reads 12 or more, not the day the track was created |

The pattern in every row is the same. The counter is unforgiving and the fix is
always redundancy plus a daily glance. Two minutes a day for fourteen days.

---

## 8. Recruitment message, copy and paste

Send this by WhatsApp, SMS, or email. Plain words, no jargon, one clear ask.
Replace the name, and paste the opt-in link only after the track is live.

> **Subject: Could you help me test my app for two weeks?**
>
> Hi [Name],
>
> I have built an app called Towinly. It helps older people find someone nearby
> they can trust for the small things: a lift, the shopping, or just company for
> an hour. Before Google will let a new app onto the Play Store, at least 12
> people have to test it for two weeks. So I am asking a few friends and family
> to help me get there.
>
> You need an Android phone for this one. If you only have an iPhone, thank you,
> and I will come back to you later.
>
> Here is the whole ask:
>
> 1. Send me the Gmail address you actually use on your Android phone. It has to
>    be that exact one or Google will not count you.
> 2. I will send you a link. Tap it, tap "Become a tester", then install Towinly
>    from the Play Store.
> 3. Leave it on your phone for two weeks. Please do not uninstall it, even if
>    you forget it is there.
> 4. Open it now and then. If anything felt confusing or slow, tell me. That is
>    the useful part.
>
> It is free. Nothing to pay, no ads, and I will never ask you for card details.
> You can use any name you like inside the app. If you want to stop at any
> point, just tell me and I will take you off the list.
>
> Two weeks of your phone quietly holding one small app. That is it.
>
> Thank you,
> Harsha

**Day 7 reminder, short:**

> Hi [Name], halfway there. Towinly still needs to be on your phone for another
> week. Please leave it installed. If you have a minute, open it and tell me one
> thing that annoyed you. Thank you for this.

**Day 14 close, short:**

> Hi [Name], that is the two weeks done. Thank you, genuinely. You can keep the
> app or remove it now, whichever you prefer. I will let you know when it is
> properly on the store.

Copy notes for anyone editing these: no em dashes, no jargon, no "not X, it's
Y" constructions, and every sentence says one thing. Anyone editing them should
keep it that way. The word "tester" is used because it is the word on the
button they will tap.

---

## 9. Tester tracking table

Keep this outside the Console, because the Console will not tell you why
someone vanished. A shared sheet or a copy of this table works.

### Roster

| # | Name | Google account on their phone | Android version | Invited | Opted in confirmed | Installed confirmed | Left? | Notes |
|---|---|---|---|---|---|---|---|---|
| 1 |  |  |  |  |  |  |  |  |
| 2 |  |  |  |  |  |  |  |  |
| 3 |  |  |  |  |  |  |  |  |
| 4 |  |  |  |  |  |  |  |  |
| 5 |  |  |  |  |  |  |  |  |
| 6 |  |  |  |  |  |  |  |  |
| 7 |  |  |  |  |  |  |  |  |
| 8 |  |  |  |  |  |  |  |  |
| 9 |  |  |  |  |  |  |  |  |
| 10 |  |  |  |  |  |  |  |  |
| 11 |  |  |  |  |  |  |  |  |
| 12 |  |  |  |  |  |  |  |  |
| 13 (spare) |  |  |  |  |  |  |  |  |
| 14 (spare) |  |  |  |  |  |  |  |  |
| 15 (spare) |  |  |  |  |  |  |  |  |
| 16 (spare) |  |  |  |  |  |  |  |  |
| 17 (spare) |  |  |  |  |  |  |  |  |
| 18 (spare) |  |  |  |  |  |  |  |  |

Rows 13 to 18 are not optional padding. They are the reason a single dropout
does not cost 14 days.

### Daily count, the only number that matters

Read it off the closed testing page once a day and write it here.

| Day | Date | Opted-in count in Console | 12 or more? | If not, what happened |
|---|---|---|---|---|
| 1 |  |  |  |  |
| 2 |  |  |  |  |
| 3 |  |  |  |  |
| 4 |  |  |  |  |
| 5 |  |  |  |  |
| 6 |  |  |  |  |
| 7 |  |  |  |  |
| 8 |  |  |  |  |
| 9 |  |  |  |  |
| 10 |  |  |  |  |
| 11 |  |  |  |  |
| 12 |  |  |  |  |
| 13 |  |  |  |  |
| 14 |  |  |  |  |

If any day reads under 12, the run restarts. Start a fresh table and note the
cause in the old one, because the same cause repeats.

### Feedback log, for the production access form

| Date | Tester | What they said | What was done about it |
|---|---|---|---|
|  |  |  |  |

The production access application asks how testing was conducted and what came
out of it. Two weeks of real notes answers it in five minutes. No notes means
writing something vague, and vague applications get bounced.

---

## 10. Build and submit commands

### Prerequisites, all free, all possible today

`eas` is not installed on this machine. `which eas` returns nothing. Install it
first.

```bash
npm install -g eas-cli
eas login
eas whoami
```

### Blocker: the project is not linked to EAS yet

Verified: `app.json` has no `extra.eas.projectId`, no `owner`, and there is no
`app.config.js` or `app.config.ts`. `eas build` will therefore stop and offer to
create a project.

Before running it, decide which Expo account owns this project. That choice is
awkward to reverse. Then check whether a project already exists under that
account.

```bash
cd "/Users/aghar/Documents/Projects/ToWin App/App"
eas project:info    # if this fails, no project is linked yet
eas init            # creates or links, and writes extra.eas.projectId into app.json
```

`eas init` locks the slug. It is `towinly` and it is frozen. Do not let the CLI
change it.

### Build

```bash
cd "/Users/aghar/Documents/Projects/ToWin App/App"
eas build -p android --profile production
```

What this does and what to expect:

- The `production` profile in `eas.json` has `autoIncrement: true` and the CLI
  is set to `appVersionSource: "remote"`, so the version code is held by EAS
  and increments on every build. The `versionCode 1` sitting in
  `android/app/build.gradle` is ignored. That is correct behaviour, not a bug.
- `android/` is gitignored, confirmed with `git check-ignore`. EAS will not
  upload it, and will run its own prebuild from `app.json`. The local `android/`
  folder is a leftover from a local build and does not affect EAS.
- The default Android build type for a production profile is an **app bundle**
  (`.aab`), which is what Play requires. No config change needed.
- On the first run EAS offers to generate a new Android keystore and hold it on
  its servers. Accept.

**Back the keystore up the same day:**

```bash
eas credentials -p android
```

Choose the production build profile, then the keystore, then download it. Store
it somewhere safe and outside the repo. Once Play App Signing is enabled, which
happens automatically at the first upload, this keystore is the *upload* key
and Google holds the actual app signing key. Losing the upload key is
recoverable through a Google reset request, but it costs days.

**Before the build, run the standard release gate** from
`mobile-release-ops`: `npm test` green, demo accounts working, release notes
written, founder approved on device.

### Submit

`eas.json` currently has `"submit": { "production": {} }`, which is empty. It
needs Android credentials before `eas submit` will work.

**Plan for the first upload being manual.** Expo's own documentation notes that
the Google Play API only becomes usable after a build has been uploaded to the
Console by hand at least once. So for release one: download the `.aab` from the
EAS build page and upload it through Play Console, step 9 in section 2. From
the second release onward:

```bash
eas submit -p android --profile production --latest
```

or, with a file already downloaded:

```bash
eas submit -p android --path /path/to/towinly.aab
```

### Service account JSON, step by step

All free. None of it is possible before the Play account exists.

1. **Play Console > Setup > API access.** Link a Google Cloud project. Let Play
   create a new one if there isn't a suitable one already.
2. In that Cloud project, make sure the **Google Play Android Developer API** is
   enabled. Play usually enables it as part of the linking step. Confirm it.
3. Still on the API access page, follow the link to create a service account.
   It opens **Google Cloud Console > IAM and Admin > Service accounts**.
4. **Create service account.** Name it `eas-submit`. Grant it no Google Cloud
   roles. Its power comes from Play Console, not from Cloud IAM.
5. Open the new service account, go to **Keys > Add key > Create new key >
   JSON**, and download it. This file is a credential. Treat it like a password.
6. Return to **Play Console > Users and permissions**. The service account
   appears in the list. Grant it permissions scoped to the Towinly app only:
   - Release to testing tracks
   - Release apps to production
   - View app information and download bulk reports
   - Manage store presence, only if `eas submit` should push metadata

   Do not grant account-level Admin. A leaked key with Admin can do real damage.
7. **Store the JSON outside the repository.** For example
   `~/.secrets/towinly-play-service-account.json`, then `chmod 600` it. Never
   commit it, never put it in `App/`, never paste it into a chat.
8. Give EAS the key. The safer of the two options is to upload it to EAS so it
   is never referenced by a path in a tracked file:

   ```bash
   eas credentials -p android
   # choose the production profile, then Google Service Account Key, then upload
   ```

   The alternative is a path in `eas.json`, which only works if the file lives
   outside the repo and every machine has it at the same relative path:

   ```json
   "submit": {
     "production": {
       "android": {
         "serviceAccountKeyPath": "../../secrets/towinly-play-service-account.json",
         "track": "internal",
         "releaseStatus": "draft"
       }
     }
   }
   ```

   Starting with `track: "internal"` and `releaseStatus: "draft"` means a
   mistyped command cannot push anything to real users. Change the track
   deliberately, per release.

9. Test the whole chain on the internal track before it matters:
   `eas submit -p android --profile production --latest`, then confirm the
   build appears in Play Console.

### Repo config items that need a decision before the first build

These are recorded, not changed, because each is a decision rather than a fix:

| Item | Where | State |
|---|---|---|
| `extra.eas.projectId` | `app.json` | Missing. Written by `eas init`. Decide the owning Expo account first |
| `owner` | `app.json` | Missing. Set it if the project should belong to an org rather than a personal account |
| `submit.production.android` | `eas.json` | Empty. Filled per step 8 above once the service account key exists |
| Vercel `EXPO_PUBLIC_LEGAL_CONTACT_EMAIL` | `towinly-app` project | Still unset. Blocks the deletion page a Play reviewer will open |

---

## 11. What to do this week, in order

While waiting on the Apple account and before spending the Play $25:

1. Install `eas-cli`, decide the owning Expo account, run `eas init`, and get a
   production Android build out. Free, and it de-risks the day everything else
   unblocks.
2. Back up the keystore the moment it is generated.
3. Write the recruitment message from section 8 to 18 people. Collect the exact
   Google addresses into the section 9 table. Do not send a link yet, because
   there is nothing to link to.
4. Set `EXPO_PUBLIC_LEGAL_CONTACT_EMAIL` on the Vercel `towinly-app` project and
   confirm `https://www.towinly.com/app/delete-account` renders the real support
   address.
5. Run `railway variables` and settle the `POSTHOG_API_KEY` question so the Data
   Safety analytics answer is decided rather than guessed.
6. Confirm the three demo logins still work.

Then, the day the $25 is spent, phases A through F in section 2 run without
anyone having to think.

---

## Appendix: how the facts in this document were verified

Read-only commands, run on 11 August 2026 at commit `af22521`:

```bash
# Final permission set, target and min SDK, as Google will see them
python3 -c "import re; s=open('android/app/build/intermediates/merged_manifest/release/processReleaseMainManifest/AndroidManifest.xml').read(); [print(m.group(0)) for m in re.finditer(r'<uses-(permission|sdk)[^>]*>', s)]"

# Version code and name in the merged manifest
grep -o 'versionCode="[^"]*"\|versionName="[^"]*"' android/app/build/intermediates/merged_manifest/release/processReleaseMainManifest/AndroidManifest.xml

# Expo's default target SDK for this SDK version
grep -n "targetSdkVersion" node_modules/expo-modules-core/android/ExpoModulesCorePlugin.gradle

# android/ is not uploaded to EAS
git check-ignore -v android

# EAS project linkage
grep -n "projectId\|owner" app.json ; ls app.config.* 2>/dev/null

# No payment or billing library
node -e "console.log(Object.keys(require('./package.json').dependencies).join('\n'))"

# The age gate (create-account.jsx since the 2026-08-28 sign-up split;
# command corrected 2026-08-30, APS-11: the old register.jsx target now
# returns nothing because the form moved)
grep -n "MIN_AGE\|MAX_AGE\|18 or over" "app/(auth)/create-account.jsx"

# EAS CLI presence
which eas
```

Findings recorded above, in order: `targetSdkVersion 36` and `minSdkVersion
24`; seven permissions, none of them sensitive, with `READ_EXTERNAL_STORAGE`
capped at API 32; no advertising ID; `android/` gitignored; no
`extra.eas.projectId`; no billing library; `MIN_AGE = 18` enforced at signup;
`eas` not installed.

This file was swept for em dashes before saving. There are none.
