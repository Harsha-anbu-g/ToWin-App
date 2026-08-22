# Screenshots and App Review notes

Companion to `docs/store-listing.md` (identity, descriptions, data safety,
image sizes). Every screen, route, credential and mechanic below was checked
against the shipped code on 2026-08-11. The paste-ready blocks are fenced.

This plan supersedes the six-shot table in `docs/store-listing.md`: it keeps
those shots but reorders them so the trust ladder leads, and adds chat, family
and check-in. When the captures are made, update the pinned
`screenshot-captions` block in `docs/store-listing.md` to this set and rerun
`npx jest store-listing`; that test reads `src/lib/trustStages.js` and
`app/trust/index.jsx` and fails if a caption stops matching the app.

---

## 1. Screenshot plan (both stores)

### Sizes each store requires

| Store | Slot | Size (portrait) | Count | Notes |
|---|---|---|---|---|
| App Store | iPhone 6.9" | 1320 × 2868 px (also accepts 1290 × 2796) | 1 min, 10 max. Ship 8 | One iPhone set only; App Store Connect scales it down for smaller devices. Render 1320 × 2868 so the store downscales, never upscales. |
| App Store | iPad 13" | none owed | 0 | `App/app.json` sets `ios.supportsTablet: false`. If that flag ever flips, a 2064 × 2752 set becomes required. |
| Play | Phone | 1080 × 1920 px | 2 min, 8 max. Ship the same 8 | Play refuses any image whose long side is more than twice the short side. The Apple render is 2.17:1 and will be rejected; 1080 × 1920 is 1.78:1 and passes. Two renders, one story. |
| Play | 7" / 10" tablet | optional | 0 | Leave empty for v1; the app targets phones. |
| Play | Feature graphic | 1024 × 500 | 1 | Already exists: `docs/store-images/towinly-play-feature-graphic.png`. |
| Play | Hi-res icon | 512 × 512 | 1 | Already exists: `docs/store-images/towinly-play-hi-res-icon.png`. |

Both stores want RGB with no alpha channel: 24-bit PNG or JPEG.

> **Corrected 2026-08-15 (APL-801, APL-805).** This paragraph used to end:
> "Save the finished files as `docs/store-images/screenshots/ios/01.png` …
> `08.png` and `docs/store-images/screenshots/play/01.png` … `08.png`." That
> path sits outside version control: `git rev-parse --show-toplevel` returns
> `.../ToWin App/App`, and the project root is not a repository. The finished
> files live at **`App/docs/store/screenshots/final/ios/`** and
> **`.../final/play/`**, named by upload slot,
> `01-landing-trust-ladder-ios.png` through `08-landing-welcome-ios.png`. There
> is no second copy. Each folder carries a README saying so.

### The eight shots

Stores show roughly the first three shots in search results, so the first two
carry the whole story: the trust ladder (what makes Towinly different), then
real help (what you actually get). Everything after that is proof.

| # | Job in the story | Screen | Route | Seat and precondition |
|---|---|---|---|---|
| 1 | The trust ladder | Elder Home: My Helpers cards, each with the 7-rung ladder (Connected, Messaging, Phone, Video, Socials, Met in person, Trusted) and the "Start the next step" button | `App/app/(tabs)/home.jsx` (renders `src/components/trust/MyHelpersPanel.jsx`) | Sign in as `elder`. The first Home visit of a day walks to `/checkin`; check in (or tap Not now) first so Home renders. Margaret's seeded connections sit at different rungs, so the ladder reads mid-climb, which is the point. |
| 2 | Real help | Post a request form: title field, kind-of-help chips, Normal/Urgent, details | `App/app/(tabs)/action.jsx`, elder branch (centre tab button) | Sign in as `elder`. Fill the title and pick a category chip before the shot so the form is not empty. |
| 3 | The helper side | Open requests near you, one-tap offer | `App/app/(tabs)/action.jsx`, helper branch (same route, different seat) | Sign in as `helper`. Use the centre tab; the Posted Help tab is a different screen. |
| 4 | The score is earned | Trust Score: serif 42 score, tier chip, per-person point cards with three meters | `App/app/trust/index.jsx` | Sign in as `helper`, so the copy reads 7 + 5 + 3. The elder seat splits the same 15 as 7 + 5 + 2 + 1 and would not match caption 4. |
| 5 | Safe conversation | Chat inside the app | `App/app/chat/[connectionId].jsx` (open from the Messages tab) | Either `elder` or `helper`, any seeded conversation with a few messages visible. No phone numbers appear anywhere in the shot. |
| 6 | Family can see | One parent, in full: Margaret's header with the "Checked in today" chip, her trust ladders on the Friendships tab | `App/app/family/parent/[elderId].jsx` | Sign in as `demo.sarah@towin.app`. Home is the family panel; tap Margaret's card. Capture with the check-in chip green. |
| 7 | The daily rhythm | Daily check-in: hero card, one big button, "Not now" always available | `App/app/checkin.jsx` | Sign in as `elder` on a day not yet checked in (the demo data resets itself, so this is usually true). Capture before tapping. |
| 8 | The brand close | First-launch landing story | `App/app/(auth)/landing.jsx` | Shows only while the `towin-onboarded` key is unset (`src/lib/storageKeys.js`). Use a fresh install or clear storage. Fallback: the login lockup, `App/app/(auth)/login.jsx`. |

### The words baked into the shots

Caption 1 is the real rung count from `src/lib/trustStages.js`. Caption 4 is
the real score split from `app/trust/index.jsx`. Captions 5 and 7 make the
same phone-number and check-in promises as the store description, and caption
6 is one of the four family promises rendered verbatim in
`app/family/index.jsx`. Nothing is simplified.

<!-- screenshot-captions:start -->
1. Seven steps, climbed together. Slow is the point.
2. Ask for a ride, shopping, cleaning or company.
3. See who needs a hand near you.
4. Up to 15 points from each person you help.
   7 for the trust steps. 5 for their review. 3 for your profile.
5. Chat safely inside the app. Phone numbers are shared only when you both agree.
6. Your family can see you're safe.
7. Check in once a day. If you link a family member, they are told when you go quiet.
8. It takes two To Win.
<!-- screenshot-captions:end -->

### Caption and frame rules

- Parchment `#f6f4ef` behind every caption band, ink `#1a1a1a` type, hairline
  `#e5e1d9` if a rule is needed. No drop shadows anywhere.
- Set captions in Newsreader 400, the same font file the app bundles and the
  feature graphic already uses (`docs/store-images/render.sh` shows how to
  reach it). Weight 400 only, never bold serif.
- Large type: keep every caption at or above the 17pt-equivalent floor the app
  itself holds to, scaled to the render size. Caption 4 carries two sizes: the
  first line large, the split beneath it smaller, both above the floor.
- Sky blue `#4FA3CE` is reserved for actions inside the app. Captions stay ink
  on parchment; no decorative blue in the caption band.
- **Never a dark-mode capture.** Night mode is opt-in inside the app and no
  store shot uses it.
- No em dashes in any caption, ever. Full stop, comma or colon.

### Capture rules

- **Capture from a native build, never the web build.** There are Platform.OS
  branches across the app, and one of them is a Google sign-in button that
  exists on web only (`src/components/auth/GoogleLoginButton.jsx`). A
  web-rendered shot would put that button in front of App Review, and its
  absence on native is the entire reason guideline 4.8 does not apply.
- Every shot except 8 needs the backend reachable and the demo seats alive.
  Shot 8 is the first-launch landing story and needs neither.
- Capture paths, any one of which works: iOS Simulator on a 6.9" device
  (iPhone 17 Pro Max captures 1320 × 2868 natively; needs full Xcode, this
  machine has Command Line Tools only), the owner's iPhone through Expo Go
  then scaled, or an Android emulator at 1080 × 1920.
- Before upload, verify each file: exact pixel size, no alpha channel
  (`sips -g hasAlpha`), light mode, and grep the caption band source for the
  em dash character so none slips into baked-in text.

---

## 2. App Review notes for Apple

Paste the block below into App Store Connect's "Notes" field for App Review.
It is written for a reviewer who has never seen the product.

```review-notes
WHAT TOWINLY IS

Towinly connects three kinds of people. Elders are older adults who ask for
help: a ride, shopping, cleaning, or simply company. Helpers are members who
offer that help. Family members are relatives the elder links to their own
account so someone they love can see they are safe.

TOWINLY IS NOT A DATING APP

We know an app where strangers meet can look like one at first glance, so
here is the difference in mechanics, all visible in the build:

- There is no swiping, no browsing people by photo, and no romance framing
  anywhere in the product.
- Elders and helpers meet through a posted help request, never through a
  gallery of profiles.
- Every pair climbs a seven-step trust ladder: Connected, Messaging, Phone,
  Video, Socials, Met in person, Trusted. Both people must confirm each step.
  Nobody can rush it.
- Phone numbers stay hidden until both people reach the Phone step. Meeting
  in person is step six of seven.
- Safety controls required by guideline 1.2 are all present: report a person
  from their profile, block a person from their profile (list managed under
  Profile > Blocked people), a content filter on written profiles, help
  requests and Pass On stories, and terms agreed at signup that close an
  account for harassment, threats, or putting another person at risk.
  Contact for reports: help@towinly.com.

DEMO ACCOUNTS (please review all three)

One-tap demo buttons sit below the login form, one per seat. The fields also
take a username or an email, so these can be typed instead:

- Elder: username "elder", password "12345678" (Margaret, with helpers
  already at different trust steps)
- Helper: username "helper", password "123456789" (Harsha)
- Family: username "demo.sarah@towin.app", password "DemoSarah!2026"
  (Sarah, Margaret's daughter)

The family login uses the older towin.app domain because that is how the
backend seeds it. Type it exactly; it is not a typo. The demo accounts reset
themselves a few minutes after the last change, so sample data reappearing
is expected behaviour. Production builds point at the live API.

HOW TO REACH GUARDIAN MODE (no real family needed)

The family surface is a large part of the product and is only reachable from
the family account. Sarah's seat is fully seeded, so you can review it
without creating anything:

1. Sign in as demo.sarah@towin.app. Home is the family panel and Margaret
   appears as her linked parent.
2. Tap Margaret's card. Her page has three tabs: the friendships she shares
   (with their trust ladders), how she is today (the check-in chip sits in
   the header), and what Sarah is allowed to do.
3. Margaret has already said yes to Sarah acting for her in two ways, and
   both are switched on in the demo data: managing her help requests and
   taking trust steps for her. You can post a help request on Margaret's
   behalf and advance a trust ladder without any setup.
4. To see the elder's side of the same controls, sign in as "elder", open
   the menu on Home, then My Family > Controls. The Sharing and Act for me
   switches there are the consent that gates everything Sarah can do.

THE AI ASSISTANT: CONSENT AND REPORTING

- Open any tab while signed in and tap the "Ask AI" pill with the tortoise.
- Type a question or tap a suggestion, then send. Before the FIRST question
  a consent dialog appears: "Before your first question". It names Groq, the
  outside AI service, says exactly what is shared (the question, the chat,
  first name and trust score, never contact details), warns the answers are
  machine-written and can be wrong, and offers "Not now" and "Yes, that's
  okay". "Not now" cancels and nothing is sent.
- Consent is stored per user on the device. To see the dialog again, sign in
  as a different demo account, or delete and reinstall the app.
- Every answer carries a "Report this answer" button. It opens the feedback
  form with the answer already quoted, and reports reach the team at
  help@towinly.com.
```

Why the dating preemption leads: reviewers pattern-match "strangers meet in
person" to dating apps within the first minute, and guideline 1.2 scrutiny
follows from that first impression. The notes answer it before it is asked,
with mechanics the reviewer can verify in the build rather than assurances.

Sources for every claim in the block: the ladder and its gates
(`src/lib/trustStages.js`, phone reveal at the Phone step), report and block
(`app/user/[id].jsx`, `src/lib/blockList.js`), content filter
(`src/lib/contentFilter.js`), consent dialog wording
(`src/components/AskAiAssistant.jsx`), Sarah's seeded powers
(backend `DemoDataSeeder.java`: ACTIVE family link plus MANAGE_HELP_REQUESTS
and ADVANCE_TRUST), demo credentials (`src/components/DemoAccountsCard.jsx`
and the reviewer table in `docs/store-listing.md`).

---

## 3. Rating prompt policy

**Today the app never asks for a store rating.** There is no
`expo-store-review` in `App/package.json`, no custom rate-us dialog, and no
prompt of any kind (verified 2026-08-11). This section is the policy any
future prompt must follow; it exists so the prompt is designed once, on
purpose, and not bolted on before a release.

### The one allowed trigger

Ask only when both of these happened in the same session:

1. A help request the user took part in was just marked completed.
2. The user then left a review of 4 or 5 stars for the other person.

That moment is the only one where the product has proven its worth and the
person is already in a giving mood. Nothing else qualifies.

### Never

- Never on first open, and never during signup or onboarding.
- Never before the user has completed at least one help request.
- Never after an error, a failed request, or a session expiry.
- Never after an SOS, a missed check-in alert, or anything worry-shaped.
  A family member who just checked whether their mother is safe is not a
  person to ask for stars.
- Never in guardian mode: the person is acting for someone else.
- Never twice for the same user on the same app version.
- Never as a custom dialog. Use the operating system's own sheet
  (`expo-store-review`, which wraps SKStoreReviewController on iOS and the
  Play In-App Review API on Android) so the person can ignore it with one
  tap and the store enforces its own quotas. Apple allows at most three
  prompts per year and silently drops extra calls; design for that budget,
  do not try to spend it.
- Never a pre-prompt filter ("Enjoying Towinly?") that routes happy people
  to the store and unhappy people to feedback. Both stores treat that as
  ratings manipulation. The in-app feedback form (`app/feedback.jsx`)
  already exists for everyone, all the time.
- Never gate or unlock any feature on rating the app.

### Implementation notes for whoever builds it

- Track "asked" per user per app version in local storage, keyed the same
  per-user way as `src/lib/aiConsent.js`, so a shared family phone does not
  burn the prompt on the wrong person.
- The trigger check belongs where the review submission succeeds, after the
  success toast, never blocking it.
- Honor the trigger conditions on the elder seat exactly as on the helper
  seat: elders finish help requests too, and their rating is worth the same.

---

## Correction made on 2026-08-22 (HARD-102)

**The DEMO ACCOUNTS paragraph.**
Old wording: "The one-tap demo buttons are compiled out of production builds on
purpose. Type these into the login fields instead:"

Why it changed: `eas.json` sets `EXPO_PUBLIC_SHOW_DEMO=1` on the production
profile, so the buttons ship. `src/lib/appEnv.js` records the owner decision of
2026-08-16 behind that. The credentials below are still correct and still worth
giving a reviewer, because the field accepts them typed; what was wrong was
telling a reviewer the buttons are not on the screen they are on.
