# Privacy Labels: Apple App Privacy and Google Play Data Safety

Exact console answers for the Towinly mobile app (`com.towinly.app`), verified
against the code at commit `af22521` (2026-08-11).

**Truth rule: every answer below matches actual network traffic in the store
binaries. Nothing is aspirational.** If the code changes, re-verify with the
commands in section 6 before touching either console form.

Companion documents: `docs/store-listing.md` (identity, reviewer notes,
data-safety summary table), `App/src/data/legalContent.js` (the policy users
agree to).

---

## 0. Ground truth: how the app talks to the network

Facts these labels rest on, each verified in code:

- **One network client.** Every request goes through the axios instance in
  `src/api/client.js` to `API_BASE_URL` (`src/api/config.js`, HTTPS Railway
  backend). A repo-wide sweep found no `fetch(`, `XMLHttpRequest`, or
  `WebSocket` call anywhere in `app/` or `src/`.
- **No analytics, attribution, crash, or tracking SDK** in
  `App/package.json` dependencies. No PostHog, Sentry, Firebase, Amplitude,
  AppsFlyer, or ad SDK of any kind.
- **One device identifier, by permission only, since 2026-08-16.** The push
  feature installed `expo-notifications` and `expo-device`. When, and only
  when, the person allows notifications, the phone mints an Expo push token
  and the app stores it server-side against the account so messages and help
  activity can ring the phone. It exists for delivery, is deleted on sign-out
  and account deletion, and transits Expo's push service (a processor named
  in the privacy policy). No advertising ID, no analytics identifier. The
  other identifier on the wire is the account JWT.
- **No GPS.** `expo-location` is not installed. Location is a town the user
  hand-types, geocoded server-side (`app/profile-edit.jsx:246`).
- **Camera and microphone are blocked**, with both permissions stripped
  from the build:
  `app.json android.blockedPermissions` and `tools:node="remove"` in
  `android/app/src/main/AndroidManifest.xml`. The Ask AI mic button only
  focuses the text field so the OS keyboard's own dictation can be used;
  audio never reaches the app (`src/components/AskAiAssistant.jsx:132`).
- **No address book access.** Emergency contacts and family-link identifiers
  are typed by hand. No contacts permission exists in the manifest.
- **expo-updates is ENABLED since 2026-08-16** (`eas update:configure` wrote
  `updates.url` into `app.json`; the first store build refused to compile
  without it, because the build profiles carry channels). Store builds check
  Expo's update servers for over-the-air JS updates; those checks send device
  and app metadata to Expo. Covered honestly: the Device ID rows below are
  already Yes and the privacy policy already names Expo as a processor.
- **Google sign-in never runs in store builds.**
  `src/components/auth/GoogleLoginButton.jsx:46` returns null when
  `Platform.OS !== 'web'`, and `src/lib/oauthFlow.js` documents that v1
  native never begins OAuth. `/auth/oauth/complete` is web-only traffic.
- **SOS is dormant.** `src/components/home/SosCard.jsx` (POST
  `/emergency/sos`) exists but is not imported by any screen;
  `app/(tabs)/home.jsx:154` documents the removal. Emergency contacts are
  still collected, and the backend texts them at trust milestones per
  `docs/store-listing.md`.
- **AI assistant is consent-gated per user.** The first question triggers a
  plain-words dialog naming Groq (`src/components/AskAiAssistant.jsx:89`),
  persisted per account (`src/lib/aiConsent.js`, key from
  `src/lib/storageKeys.js aiConsentKey`). The app sends `{message, history}`
  to `POST /assistant/chat`; the backend appends the user's first name and
  trust score to the prompt and forwards it to Groq (verified in the
  reference backend, `ToWin/backend/.../AssistantService.java:174-179`).
  Contact details are never included.
- **Encrypted in transit:** the committed base URL is HTTPS only. The
  plaintext LAN override (`EXPO_PUBLIC_API_BASE_URL`) is a dev-shell
  variable, deliberately absent from `app.json`, so it cannot ship.
- **On-device only, never uploaded:** auth JWT in the OS keychain
  (`src/lib/storage.js`, ThisDeviceOnly), block list
  (`src/lib/blockList.js`), seen-badge state (`src/lib/seenIds.js`), theme,
  haptics, onboarding and AI-consent flags (`src/lib/storageKeys.js`). The
  memory game (`app/game.jsx`) makes no network calls.

---

## 1. Apple App Privacy (nutrition labels)

App Store Connect: App Privacy questionnaire.

### 1.1 Data Used to Track You

**None.** The app links nothing with third-party data for advertising or
measurement and shares nothing with data brokers. No App Tracking
Transparency prompt is needed and none exists in the app.

### 1.2 Data Linked to You

Every collected type below is tied to the signed-in account (all requests
carry the account JWT), so every "Collected: Yes" answer is **Linked to
identity: Yes** and **Used for tracking: No**. Purpose is **App
Functionality** for all types unless a second purpose is listed.

| Apple category | Data type | Collected? | Purpose(s) | Notes |
|---|---|---|---|---|
| Contact Info | Name | **Yes** | App Functionality | Profile name, shown to members. First name also goes to Groq with AI questions, after per-user consent. |
| Contact Info | Email Address | **Yes** | App Functionality, Account Management (declare as App Functionality; Apple has no separate account purpose) | Signup, login, verification email. |
| Contact Info | Phone Number | **Yes** (optional) | App Functionality | Profile field; delivered to Twilio for SMS codes; revealed to a connection only at the Phone Ready trust step. |
| Contact Info | Physical Address | No | | Only a town is collected; declared under Coarse Location. |
| Contact Info | Other User Contact Info | **Yes** | App Functionality | Third-party data the user types: emergency contact name, phone, relationship (`app/emergency-contacts.jsx`), and the elder's username or email in a family link request (`src/components/family/AddParentForm.jsx:48`). |
| Health & Fitness | all | No | | |
| Financial Info | all | No | | |
| Location | Precise Location | No | | No GPS permission exists. |
| Location | Coarse Location | **Yes** (optional) | App Functionality | Hand-typed town, geocoded server-side via OpenStreetMap; town-level coordinates and city stored, city shown to members. |
| Sensitive Info | Sensitive Info | No | | Apple's definition (race, sexual orientation, religion, biometrics, etc.) matches nothing collected. DOB and gender are declared under Other Data Types. |
| Contacts | Contacts | No | | The address book is never read. |
| User Content | Emails or Text Messages | **Yes** | App Functionality | Private member chat (`/messages/{id}/send`), family chat, and the AI chat transcript. The AI transcript, with first name and trust score, goes to Groq after explicit per-user consent. |
| User Content | Photos or Videos | **Yes** (optional) | App Functionality | Profile photo (`PUT /profile/photo`) and the optional government ID photo (`POST /auth/verify-id`, +3 trust points, staff review only, stored in AWS S3). Both picked from the photo library, never the camera. |
| User Content | Audio Data | No | | Mic blocked; OS keyboard dictation never reaches the app. |
| User Content | Gameplay Content | No | | `app/game.jsx` is fully on-device. |
| User Content | Customer Support | **Yes** | App Functionality | Feedback form: message, seven optional 1 to 5 ratings, optional name and email (`app/feedback.jsx:83`). Reported AI answers arrive here too. |
| User Content | Other User Content | **Yes** | App Functionality | Bio, interests or skills, hobbies or looking-for, help requests (`/needs`), reviews (`/reviews`), abuse reports (`/reports`), Pass On stories, letters, sheet answers and Sealed box items (`/passon/*`). Sealed items travel over HTTPS like everything else; at-rest sealing is backend behavior, so do not claim end-to-end encryption anywhere. |
| Browsing History | all | No | | |
| Search History | all | No | | No in-app search history is stored; the geocode query is the location field above. |
| Identifiers | User ID | **Yes** | App Functionality | Username (public), backend account id, session JWT. |
| Identifiers | Device ID | **Yes** | App Functionality | The Expo push token, minted only after the person allows notifications, stored against the account so the phone can ring for messages and help activity. Linked to identity, not used for tracking. Added 2026-08-16 with the push feature. |
| Purchases | all | No | | No payments in the app. |
| Usage Data | Product Interaction / Advertising / Other | **No** | | No client analytics SDK, and the server PostHog path is dead: the owner cleared `POSTHOG_API_KEY` from production on 2026-08-15 and the backend redeployed without it (section 5 item 1). |
| Diagnostics | Crash / Performance / Other | No | | No crash or performance SDK. |
| Environment Scanning / Body / Surroundings | all | No | | |
| Other Data | Other Data Types | **Yes** | App Functionality | Date of birth (18+ age gate at signup, `app/(auth)/register.jsx`), gender, occupation, languages, Facebook and Instagram profile URLs (`app/profile-edit.jsx`), trust ladder actions (`/trust/*`), streak check-ins (`/streaks/checkin`). Trust score goes to Groq with AI questions, after consent. |

### 1.3 Data Not Linked to You

**None.** Nothing is collected outside the signed-in session.

### 1.4 Privacy links and manifest

- Privacy policy URL: use `https://www.towinly.com/app/privacy` (it renders
  the help@towinly.com contact line; the bare `/privacy` page currently does
  not, see the open gap in the submission notes).
- `app.json` sets no `ios.privacyManifests`. Expo SDK 54 aggregates library
  manifests at prebuild. On the first EAS iOS build, diff the aggregated
  `PrivacyInfo.xcprivacy` against this file before submitting.

---

## 2. Google Play Data Safety form

Play Console: App content > Data safety.

### 2.1 Overview answers

| Question | Answer |
|---|---|
| Does your app collect or share any of the required user data types? | **Yes** |
| Is all of the user data collected by your app encrypted in transit? | **Yes** (HTTPS only; the dev LAN override cannot ship, `src/api/config.js`) |
| Do you provide a way for users to request that their data is deleted? | **Yes**: in-app (Profile > Account and data > Delete my account, `DELETE /account`) and the web path `https://www.towinly.com/app/delete-account` |
| Data deletion note | Users can also export everything first (Send me a copy of my data, `GET /account/export`, handed over on the spot, nothing emailed) |
| Committed to the Families policy? | No. Target audience 18+, age gate at signup. |
| Independent security review? | No |

### 2.2 Data types

"Shared" uses Play's definition: transfer to a third party. Twilio (SMS
delivery), AWS S3 (file storage), OpenStreetMap Nominatim (geocoding a bare
town string), Railway (hosting) act as service providers processing on
Towinly's behalf, which Play does not count as sharing. **Groq is declared
as sharing**: the AI transcript plus first name and trust score leave
Towinly's processing boundary, and honesty beats arguing the exemption. The
in-app consent dialog says "shared with Groq" in so many words.

| Play category | Data type | Collected? | Shared? | Optional? | Purpose(s) |
|---|---|---|---|---|---|
| Personal info | Name | **Yes** | **Yes** (first name to Groq, only with the user's one-time consent, only when they use Ask AI) | Optional | App functionality |
| Personal info | Email address | **Yes** | **No** (resolved 2026-08-15: the owner cleared the production PostHog key and the backend redeployed, so the plaintext-email signup event no longer leaves the server; section 5 item 1) | Required | App functionality, Account management |
| Personal info | User IDs | **Yes** | No | Required | App functionality, Account management |
| Personal info | Address | No | | | |
| Personal info | Phone number | **Yes** | No (Twilio delivers SMS as a service provider) | Optional | App functionality |
| Personal info | Race/ethnicity, political, religious, sexual orientation | No | | | |
| Personal info | Other info | **Yes** | **Yes** (trust score to Groq, same consent gate) | DOB required, rest optional | App functionality. Covers: date of birth, gender, occupation, languages, social media URLs, trust score. |
| Financial info | all | No | | | |
| Health and fitness | all | No | | | |
| Messages | Emails / SMS | No | | | |
| Messages | Other in-app messages | **Yes** | **Yes** (the Ask AI transcript to Groq after consent; member-to-member chat is never shared) | Optional | App functionality |
| Photos and videos | Photos | **Yes** | No (S3 stores; staff review the ID; members see only the profile photo) | Optional | App functionality; the ID photo also: Fraud prevention, security, and compliance |
| Photos and videos | Videos | No | | | |
| Audio | all | No | | | Mic permission removed from the manifest. |
| Files and docs | all | No | | | |
| Calendar | all | No | | | |
| Contacts | Contacts | **Yes** | No (Twilio texts them as a service provider) | Optional | App functionality. Hand-typed emergency contacts (name, phone, relationship) and the family-link identifier. No address book permission exists; say so in the free-text box. |
| App activity | App interactions | **No** | | | No client analytics SDK, and the server `user_signup_started` / `user_signed_up` events stopped on 2026-08-15 when the owner cleared the production key. Section 5 item 1. |
| App activity | In-app search history | No | | | |
| App activity | Installed apps | No | | | |
| App activity | Other user-generated content | **Yes** | No | Optional | App functionality. Bio, help requests, reviews, feedback, reports, Pass On stories, letters and Sealed items. |
| App activity | Other actions | **Yes** | No | Optional | App functionality. Trust ladder confirmations and pauses, streak check-ins. |
| Web browsing | all | No | | | |
| App info and performance | Crash logs / Diagnostics / Other | No | | | |
| Device or other IDs | Device or other IDs | **Yes** | No | Optional | App functionality: the Expo push token, only after the person allows notifications. Expo delivers as a processor; that is not "sharing" in Play's sense. Added 2026-08-16 with the push feature. |

### 2.3 Free-text notes worth entering in the console

- Emergency contacts and the family-link identifier are about a third party,
  typed by the account holder; the app never reads the device address book.
- AI questions are answered by Groq, an outside AI provider. Nothing goes to
  Groq before a per-account consent dialog that names Groq; the user can
  decline and the question is not sent.
- The government ID photo is optional, reviewed by staff for a one-time
  identity check, never shown to other members.

---

## 3. Mapping table: data type -> code -> label answer

The invalidation map. Any PR that touches one of these files or adds a new
network call must re-check the row (and section 6).

| Data | Where in code (collection point -> endpoint) | Apple label | Play label | Shared with a third party? |
|---|---|---|---|---|
| Username, email, password, DOB, role | `app/(auth)/register.jsx:192` -> `POST /auth/register` | Identifiers > User ID; Contact Info > Email; Other Data (DOB) | Personal info: User IDs, Email, Other info | No |
| Profile name, bio, interests/skills, hobbies/looking-for, languages, occupation, gender, Facebook/Instagram URLs | `app/profile-edit.jsx` -> `PUT /profile/elder` or `/profile/helper` | Contact Info > Name; User Content > Other; Other Data | Personal info: Name, Other info; App activity: Other UGC | No |
| Profile photo | `app/profile-edit.jsx:144-166` (expo-image-picker) -> `PUT /profile/photo` multipart | User Content > Photos or Videos | Photos and videos: Photos | No (AWS S3 stores it) |
| Government ID photo | `app/profile-edit.jsx:176-189` -> `POST /auth/verify-id` multipart | User Content > Photos or Videos | Photos: Photos (+ Fraud prevention purpose) | No (S3 + staff review) |
| Phone number | `app/profile-edit.jsx:242` -> `PUT /profile/phone` | Contact Info > Phone Number | Personal info: Phone number | No (Twilio = service provider) |
| Town / coarse location | `app/profile-edit.jsx:246-247` -> `GET /geocode/search` + `PUT /profile/location` | Location > Coarse Location | Location: Approximate location | No (server geocodes the bare town via OSM Nominatim) |
| Private messages | `app/chat/*`, `app/messages/*` -> `POST /messages/{id}/send` | User Content > Emails or Text Messages | Messages: Other in-app messages | No |
| AI questions + chat history (+ first name, trust score added server-side) | `src/components/AskAiAssistant.jsx:149` -> `POST /assistant/chat`; consent `src/lib/aiConsent.js`; backend enrichment `ToWin/backend/.../AssistantService.java:174-179` | User Content > Emails or Text Messages; Contact Info > Name; Other Data (trust score) | Messages: Other in-app messages; Personal info: Name, Other info | **Yes: Groq**, only after per-user consent |
| Emergency contacts (third party) | `app/emergency-contacts.jsx:64` -> `POST /emergency/contacts` | Contact Info > Other User Contact Info | Contacts | No (Twilio texts them). SOS button is dormant: `SosCard.jsx` unmounted. |
| Family link request (elder's username/email, relationship) | `src/components/family/AddParentForm.jsx:48` -> `POST /family/requests` | Contact Info > Other User Contact Info | Contacts | No |
| Help requests | needs screens -> `POST /needs` | User Content > Other | App activity: Other UGC | No |
| Reviews | `src/components/family/FamilyReviewForParent.jsx:67` and elder flows -> `POST /reviews` | User Content > Other | App activity: Other UGC | No |
| Feedback + reported AI answers | `app/feedback.jsx:83` -> `POST /feedback` (optional name/email, message, 7 ratings) | User Content > Customer Support | App activity: Other UGC | No |
| Abuse reports | `app/user/[id].jsx:116`, `app/passed-on/[ownerId].jsx:57` -> `POST /reports` | User Content > Other | App activity: Other UGC | No |
| Pass On stories, letters, sheet, Sealed items | `app/pass-on/*` -> `/passon/*` | User Content > Other | App activity: Other UGC | No. HTTPS in transit; sealing at rest is backend behavior, never claim E2E. |
| Trust ladder actions | trust screens -> `POST /trust/{id}/confirm|pause|resume` | Other Data > Other Data Types | App activity: Other actions | No |
| Streak check-ins | `app/checkin.jsx`, `app/streaks.jsx` -> `POST /streaks/checkin` | Other Data > Other Data Types | App activity: Other actions | No |
| Session JWT | `src/lib/storage.js` (keychain, ThisDeviceOnly) | Not a collected type; the credential for everything above | Not a collected type | Never leaves the device except as the auth header |
| Block list, seen-state, theme, haptics, consent flags | `src/lib/blockList.js`, `src/lib/seenIds.js`, `src/lib/storageKeys.js` | Not collected (on-device only) | Not collected | No |

---

## 4. Third-party recipients

| Recipient | What reaches it | When | Role |
|---|---|---|---|
| **Groq** | AI question, recent chat history, first name, trust score. Never contact details. | Only after the user's one-time consent dialog naming Groq, and only when they ask the assistant something | Declared as **sharing** on Play; covered under collected categories on Apple |
| Twilio | Phone number (verification codes); emergency contact numbers (milestone/quiet-period texts; SOS texts only if the SOS button ever returns) | SMS delivery | Service provider |
| AWS S3 | Profile photo, government ID photo | Upload | Service provider (storage) |
| OpenStreetMap Nominatim | The bare town string the user typed | Server-side geocoding | Utility lookup; no account data attached by the app |
| Railway | Hosts the backend all traffic goes to | Always | Hosting provider |

No ads. No data brokers. No sale of personal data.

---

## 5. Pending checks before the forms are submitted

1. **Backend PostHog flag. ANSWERED 2026-08-15, and the answer is yes.**
   `railway variable list --project 7c8febeb-a2ff-4ab3-8275-8038c3cd529d
   --service backend --environment production --json` returned 39 variables and
   `POSTHOG_API_KEY` is set, 48 characters. Values were not printed.

   Traced through the code:
   `ToWin/backend/.../auth/service/AuthService.java:92` calls
   `postHogService.capture("pending:" + request.getEmail(),
   "user_signup_started", Map.of("role", ...))`. **The distinct id is the
   plaintext email address**, so the address itself reaches PostHog, a US
   third-party analytics processor. The mobile app triggers it:
   `App/app/(auth)/register.jsx:192` posts `/auth/register`, mapped at
   `AuthController.java:24`. The second event, `user_signed_up` at
   `AuthService.java:173`, keys on the user UUID, so only the first carries an
   address.

   **DECIDED AND DONE 2026-08-15: the owner chose the second path.**
   `POSTHOG_API_KEY` was deleted from the production backend (verified by a
   read-back: 38 variables remain, the key absent) and the backend was
   redeployed the same hour so the running server dropped it from memory.
   `PostHogService` is a documented no-op with a blank key
   (`PostHogService.java:22-26`), so the labels stand exactly as written and
   no legal page changes. The three rows below are resolved to **No** /
   **not shared**. The two paths are kept for the record:
   - **Keep PostHog on.** Then Apple `Usage Data / Product Interaction` becomes
     collected and linked, `Identifiers / User ID` stays yes, Play
     `Personal info / Email address` becomes **shared** with an analytics third
     party, and Play `App activity / App interactions` becomes collected. Add
     PostHog to the processor list in `src/data/legalContent.js`, which today
     names Amazon, Twilio, OpenStreetMap, Groq and Railway but not PostHog.
   - **Clear `POSTHOG_API_KEY` on the production backend.** One owner command.
     `PostHogService` is a documented no-op when the key is blank
     (`PostHogService.java:22-26`), so the labels below stand exactly as
     written and no legal page changes.

   The three rows this decides are marked **PostHog-blocked** below. Do not
   submit them until the decision is made. Console answers are tracked in
   `app-store-connect-fields.md`.
2. **iOS privacy manifest.** Diff the aggregated `PrivacyInfo.xcprivacy` in
   the first EAS iOS build artifact against section 1.
3. **Photo purpose string.** `app.json` `photosPermission` names only the
   profile picture; the same picker uploads the government ID. Reword before
   Apple review so the string covers both uses.

---

## 6. What future changes invalidate

Adding any of these requires updating both console forms and this file
first:

| Change | Labels it breaks |
|---|---|
| Any analytics/attribution/crash SDK (PostHog client, Sentry, Firebase, etc.) | Apple Usage Data / Diagnostics; Play App interactions / Crash logs; possibly Device IDs and Tracking |
| Enabling EAS Update (`updates.url` + `ENABLED=true`) | HAPPENED 2026-08-16 (`eas update:configure`, needed by the build). Covered: the Device ID rows are already Yes and the policy already names Expo as a processor. |
| Push notifications (`expo-notifications`) | HAPPENED 2026-08-16, handled: Device ID rows above flipped to Yes, policy names Expo, manifest re-pinned at 11 |
| `expo-location` or any GPS use | Location answers change from typed-town to device location; Android location permission appears |
| Unblocking camera or microphone (e.g. real voice input in Ask AI) | Audio Data / Photos-from-camera; both purpose strings and blocked-permissions lists |
| Google sign-in in native builds (`GoogleLoginButton` gate removed) | Google account data collected; also triggers Apple 4.8 (Sign in with Apple) |
| Re-mounting `SosCard` | No label change (contacts already declared) but reviewer-visible SMS behavior returns; update reviewer notes |
| New form fields or endpoints | Add a row to section 3 before shipping |
| In-app purchases or payments | Financial Info / Purchases on both stores |

Re-verification one-liner (run from `App/`), then diff against section 3:

```bash
grep -rhoE "api\.(get|post|put|patch|delete)\(\s*[\`'\"][^\`'\"]+" app/ src/ \
  --include="*.jsx" --include="*.js" | grep -v __tests__ | sed "s/[\`'\"]//g" | sort -u
```

Plus: `package.json` dependency diff, `app.json` plugins/permissions diff,
and `android/app/src/main/AndroidManifest.xml` permission list.
