# iOS submission content readiness

Verified 2026-08-11 against the live production API, the live web deployment and
the working tree at `af22521`. Everything below was checked by fetching the real
address or running the real call, not by reading config. Where something was only
read from source, the doc says so.

Scope: the five App Store Connect fields that do not need the Apple Developer
account to be finished. Companion files in this folder: `listings.md` (identity
and descriptions), `privacy-labels.md` (nutrition labels and Play Data safety),
`screenshots-and-review.md` (screenshots and the reviewer notes block).

---

## Verdict

| # | Prerequisite | State |
|---|---|---|
| 1 | Privacy policy URL | Ready. Use `https://www.towinly.com/app/privacy`. |
| 1b | Terms URL | Ready. `https://www.towinly.com/app/terms`. |
| 1c | Support URL | **BLOCKING.** No support page exists anywhere. |
| 1d | Marketing URL | Ready. `https://www.towinly.com` (optional field). |
| 2 | Demo accounts | Ready. All three log in. Two review-notes gaps below. |
| 3 | Age rating | Answers worked out below. No blockers. |
| 4 | Export compliance | Correct as configured. One post-build check. |
| 5 | In-app account deletion | Real. Apple 5.1.1(v) is satisfied. |

Blocking items: **1** (support URL). Two more are one-line fixes that should be
done before the account exists, listed under "Fix before submission".

---

## 1. Policy URLs

### What the app links to

The app does not link out to a hosted policy. `app/privacy.jsx` and
`app/terms.jsx` render `src/data/legalContent.js` in the app itself, and
`app/(auth)/register.jsx` shows the same text in a modal before the agree box.
The only outbound legal link in the whole codebase is in
`src/components/legal/LegalSections.jsx`, which opens
`DELETION_PAGE_URL` from `src/data/legalContent.js`:

```
export const DELETION_PAGE_URL = 'https://www.towinly.com/app/delete-account';
```

The same legal text is exported to the web build and served under `/app/`, so
the hosted policy and the in-app policy come from one source file and cannot
drift.

### Curl results

All over HTTPS, all with HSTS, none looping.

| URL | Status | Result |
|---|---|---|
| `https://towinly.com/app/privacy` | 308 | Redirects once to the `www` host. |
| `https://www.towinly.com/app/privacy` | 200 | Real page. |
| `https://www.towinly.com/app/terms` | 200 | Real page. |
| `https://www.towinly.com/app/delete-account` | 200 | Real page. |
| `https://www.towinly.com/privacy` | 200 | Real page, but stale. See below. |
| `https://www.towinly.com/terms` | 200 | Real page (website copy). |

Every one of these is an HTML shell that React fills in, so `curl` alone proves
nothing about the content. Each was therefore also rendered in a real headless
browser. Results:

- `/app/privacy` renders 6,951 characters of policy text. It contains the
  "Who else touches your information" section (Amazon, Twilio, OpenStreetMap,
  Groq, Railway), the "Where you live" section, the link to the deletion page,
  and the contact address `help@towinly.com`. This is the current policy.
- `/app/delete-account` renders the full deletion page including the in-app
  route, the write-to-us route and the seven-day reply promise.
- `/privacy` on the marketing site renders an **older** policy. It has no
  third-party processor section at all, and its location paragraph still says
  "If you share your location ... you can turn it off whenever you like", which
  describes a device location switch the app does not have and never had.

**Use `https://www.towinly.com/app/privacy` as the App Store Connect privacy
policy URL.** Do not use `https://www.towinly.com/privacy`. Naming the stale one
would put a policy in front of Apple that under-discloses the processors the
backend actually sends data to, which is exactly the mismatch privacy review
looks for.

The apex host answers 308 to `www` for every path. One hop is harmless, but the
store console should hold the `www` address so nothing depends on a redirect
rule staying put. `src/data/legalContent.js` already records this decision.

### Support URL: BLOCKING

App Store Connect requires a Support URL, and guideline 1.5 requires that the
address actually provide support. There is nothing to point it at today.

- The website route table (`ToWin/frontend/src/App.jsx`) has no `/support`,
  `/help` or `/contact` route.
- The landing page was rendered and searched. It has no contact email, no
  mailto link and no footer linking to the legal pages.
- The only published contact anywhere is `help@towinly.com`, which appears at
  the bottom of the legal pages and on the deletion page.

Guideline 1.2 also requires published contact information for an app with
user-generated content, so this gap costs twice.

Two ways to close it. Either is fine, the first is faster:

1. Point the Support URL at `https://www.towinly.com/app/delete-account`. It is
   already live, already public, already names `help@towinly.com`, and already
   explains how a person gets an answer and how long it takes. It is thin as a
   support page because it only covers deletion.
2. Better: add a small support page. It needs a contact address, a plain
   sentence about response time, and links to the privacy policy and terms.
   `ToWin/` is read-only, so it would live in this repo as a new route in `app/`
   and be served at `https://www.towinly.com/app/support`, the same way the
   deletion page is.

### Mailbox

`towinly.com` has MX records on Cloudflare Email Routing and a matching SPF
record. That proves mail is accepted for the domain. It does not prove
`help@towinly.com` lands in an inbox a person reads. Send a test message to it
and confirm delivery before submitting, because three public pages, the Play
Data safety deletion path and both store contact fields all depend on it.

### Robots headers on the legal pages (not blocking)

`vercel.json` intends `delete-account`, `privacy` and `terms` to be indexable
and everything else `noindex`. On the live public address that rule does not
fire:

```
https://towinly-app.vercel.app/privacy       ->  x-robots-tag: index, follow
https://towinly-app.vercel.app/app/privacy   ->  x-robots-tag: noindex
https://www.towinly.com/app/privacy          ->  x-robots-tag: noindex
```

The marketing site proxies `/app/:path*` through, so the path the header rule
sees is `/app/privacy`, and the rule's exception is anchored to a path ending in
exactly `privacy`. It never matches. Separately, `public/index.html` hard-codes
`<meta name="robots" content="noindex">` into every route of the web build, so
even a corrected header would be contradicted by the tag.

Apple does not care. Play does not require the deletion URL to be indexed
either. Fix it because the repo says it should be fixed, not because it blocks:
add `/app/` to the three-path exception in `vercel.json`, and make the meta tag
in `public/index.html` conditional or drop it in favour of the header.

---

## 2. Demo and review accounts

### The three seats, tested live

Each was posted to `https://backend-production-cef3.up.railway.app/api/auth/login`
on 2026-08-11. All three returned HTTP 200 with a token.

| Seat | Identifier | Password | Role in token | Email verified |
|---|---|---|---|---|
| Elder | `elder` | `12345678` | ELDER | yes (`ev: true`) |
| Helper | `helper` | `123456789` | HELPER | yes |
| Family | `demo.sarah@towin.app` | `DemoSarah!2026` | FAMILY | yes |

Notes that matter for review:

- The login field is `identifier` and accepts a username, an email or a phone
  number (`app/(auth)/login.jsx`, label "Username, Gmail, or phone"). The
  reviewer can type `elder` as-is. No email format is enforced.
- All three tokens carry `ev: true`, so no reviewer is stopped at an
  email-verification wall.
- The one-tap demo buttons are compiled out of the production build.
  `src/lib/appEnv.js` shows them only when `__DEV__` is true or
  `EXPO_PUBLIC_SHOW_DEMO=1`, and `eas.json` sets that flag on the `preview`
  profile only. The reviewer must type the credentials.
- The login rate limiter cannot lock a reviewer out on a correct password.
  `LoginRateLimiter` counts failures only, and `AuthService` short-circuits on a
  correct password before the check runs. The comment in `DemoAccountsCard.jsx`
  saying demo logins "bypass the rate limiter" is loose wording, not a real
  bypass. Nothing to fix.

App Store Connect has one username and one password field. Put the **elder**
seat there and list the helper and family seats in the review notes.
`screenshots-and-review.md` already carries that block.

### Guardian mode without a second real user: confirmed

Tested with Sarah's token against the production API.

- `GET /family/links` returns one ACTIVE link to Margaret, relationship
  "Daughter", with `delegatedPowers: [MANAGE_HELP_REQUESTS, ADVANCE_TRUST]` and
  one pending power request (`LEAVE_REVIEWS`). So the consent screen has both a
  granted state and a pending state to look at.
- `GET /family/journey` returns Margaret with her photo, her check-in state and
  three open needs.
- `GET /family/alerts` returns a populated feed including `SEALED_BOX_SET` and
  `KEYHOLDER_ASKED`.

A reviewer signing in as Sarah reaches the whole family surface with no setup and
no second device. Nothing needs to be created. `screenshots-and-review.md`
already documents the tap path.

### Gap A: the review notes never say where deletion lives

The reviewer is going to look for account deletion, because 5.1.1(v) is on their
checklist. The privacy policy links to the web deletion page, and that page only
offers an email. A reviewer who follows that link first can conclude the app
sends people to a website to delete an account, which is the exact thing the
guideline forbids.

Add one line to the review notes block in `screenshots-and-review.md`:

> To delete an account inside the app: Profile tab, then "Account and data",
> then "Delete my account". Towinly asks twice and the second question is
> "Delete forever". The deletion happens in the app. The web page is only for
> people who no longer have the app installed.

### Gap B: a reviewer can delete the shared demo account and it may not come back

This is the one that can strand a review.

The demo seats restore themselves through `DemoResetCoordinator`, which
schedules `DemoDataSeeder.resetDemo()` a few minutes after any write by a demo
user. `DemoActivityInterceptor` fires that signal on any successful 2xx
POST/PUT/PATCH/DELETE. `DELETE /api/account` returns 204, so it does fire.

The problem is the id set. `DemoResetCoordinator.demoUserIds()` resolves the
protected ids lazily, by looking up each demo email, and caches the result on
first use. If the first write after a backend restart is a reviewer deleting a
demo account, the lookup runs after the row is already purged. That email
resolves to nothing, the deleted id is not in the set, `onDemoWrite` returns
early, and no restore is ever scheduled. The seat stays gone until the service
restarts.

`AccountService.deleteOwnAccount` is a real purge, so there is nothing to undo.

Handling, in order of preference:

1. Backend fix (not in this repo's write scope): warm `demoUserIds` at startup,
   or resolve it before the mutation rather than after. One line of ordering.
2. Cheap and immediate: give the reviewer a fourth, disposable seat and tell
   them to test deletion on that one. It costs one seeded account.
3. Weakest: add a line to the review notes asking them not to delete the shared
   seats. Reviewers are not obliged to read it, so do not rely on this alone.

At minimum, do 2 or 3 before the build goes to review, and re-check that all
three seats still log in immediately before submitting.

### Demo data resets

`app.demo.reset-delay-ms` defaults to 300000, so five quiet minutes after a
reviewer's last change the demo data reverts. This is good for review (every
reviewer gets the same state) but it means a reviewer's own edits vanish while
they are writing notes. The review notes already say sample data reappearing is
expected. Leave it.

---

## 3. Age rating

### What the app actually does

Established by reading the code, not by assumption:

- User-to-user messaging, user profiles with a photo and bio, help requests,
  reviews, stories and letters. All user-generated, all visible to other members.
- Moderation is present and real: `src/lib/contentFilter.js` blocks a slur and
  explicit-language wordlist at write time, `app/user/[id].jsx` posts to
  `/reports`, `app/blocked.jsx` and `src/lib/blockList.js` manage blocking, and
  `app/(auth)/register.jsx` gates signup behind agreeing to the terms.
- **No web browser of any kind.** There is no `react-native-webview`, no
  `expo-web-browser` and no `WebView` anywhere in `app/` or `src/`. The only
  `Linking.openURL` calls are a `mailto:` on the deletion page, the fixed
  deletion-page URL in the privacy policy, and the founder links on the feedback
  card. A user cannot navigate to an arbitrary address from inside the app.
- **No device location.** No `expo-location` dependency, no location permission
  in the Android manifest (checked: only INTERNET, VIBRATE, READ_EXTERNAL_STORAGE,
  plus four permissions explicitly removed), and no call site. The user types a
  town, the backend geocodes it, and other members see a town name and a rounded
  kilometre figure.
- AI: replies come from Groq through the backend. The system prompt forbids
  medical, legal and financial advice and redirects emergencies to the SOS
  button and local emergency services. Consent is asked once per account before
  the first question, naming Groq (`src/lib/aiConsent.js`,
  `src/components/AskAiAssistant.jsx`). Every answer carries a "Report this
  answer" flag.
- No in-app purchases, no ads, no gambling. `app/game.jsx` is a memory game with
  no wager and no prize.
- The app is adults-only by its own terms. `app/(auth)/register.jsx` enforces
  `MIN_AGE = 18` against a typed date of birth.

### Apple age rating questionnaire

Answer every content category **None**:

| Category | Answer | Why |
|---|---|---|
| Cartoon or fantasy violence | None | No violence of any kind. |
| Realistic violence | None | Same. |
| Prolonged or sadistic violence | None | Same. |
| Sexual content or nudity | None | None present, and explicit words are filtered at write time. |
| Profanity or crude humor | None | Filtered at write time. |
| Alcohol, tobacco or drug use | None | Not referenced. |
| Mature or suggestive themes | None | See the note below on bereavement. |
| Horror or fear themes | None | None. |
| Medical or treatment information | None | The assistant is instructed to refuse medical advice and to redirect to a doctor or emergency services. Check-ins and SOS record and alert, they do not advise. |
| Simulated gambling | None | None. |
| Real gambling | None | None. |
| Contests | None | Streaks are a personal habit counter with no prize. |
| Unrestricted web access | **No** | No WebView, no in-app browser, no user-entered URLs. This answer is defensible from the dependency list alone. |

Capability and control questions, which is where this app's rating comes from:

| Question | Answer |
|---|---|
| Does the app include chat or messaging between users? | Yes |
| Does the app allow users to create or share content other users see? | Yes |
| Does the app share the user's location with other users? | Approximate only, and never from the device. A user-typed town and a rounded distance. |
| Are there in-app controls for objectionable content? | Yes: write-time filter, report a person, block a person, terms agreed at signup. |
| Parental controls or age assurance? | A self-declared date of birth with an 18 minimum at signup. No document check. Do not claim age verification. |

Expected outcome: the content answers are all clean, so the rating is driven by
the messaging and user-generated content answers. Under Apple's current tiers
that lands above 4+. Let App Store Connect compute it and record whatever it
returns. Do not try to argue the number down, and do not overstate the
moderation controls to move it.

One judgement call to record rather than hide: the Pass On feature is about
death. Letters read after someone dies, a Sealed box opened by Keyholders.
Apple has no category for bereavement, and it is not "mature or suggestive"
content, so **None** is the honest answer to that row. If a reviewer raises it,
the answer is that the subject is handled plainly and gently and is the whole
point of the product, not incidental dark content.

### Google Play content rating (IARC)

| Question | Answer |
|---|---|
| Violence, sexual content, language, drugs, gambling | None to all. |
| Do users interact or exchange content? | Yes. Chat, profiles, reviews, stories. |
| Do users share personal information with other users? | Yes. Name, town, bio, and email and phone once a pair reaches the Phone step of the trust ladder. |
| Do users share their current physical location? | **No.** The app never reads device location. A typed town shown at city granularity is not current physical location. Record this reasoning in the answer notes so it is defensible later. |
| Digital purchases? | No. |
| Target audience | 18 and over only. This matches the terms and the signup gate, and keeps the app out of Play's Families policy. |

Two Play declarations that go with it:

- **Generative AI:** declare it. Play requires apps with generative AI features
  to provide an in-app way to report offensive AI output. Towinly has one: the
  "Report this answer" flag on every AI reply opens the feedback form with the
  answer quoted. Name that flow in the declaration.
- **Data safety:** see `privacy-labels.md` in this folder.

---

## 4. Export compliance

`app.json` sets:

```
"ios": { "infoPlist": { "ITSAppUsesNonExemptEncryption": false } }
```

**This is correct.** Every use of cryptography in the app was traced:

- HTTPS only. `extra.apiBaseUrl` is `https://backend-production-cef3.up.railway.app/api`
  and the live host answers with HSTS. TLS comes from the OS network stack.
- `expo-secure-store` (`src/lib/storage.js`) stores the token in the iOS
  Keychain with `WHEN_UNLOCKED_THIS_DEVICE_ONLY`. Keychain is OS-provided.
- `expo-crypto` is used in exactly one file, `src/lib/oauthFlow.js`, for a
  random verifier and a SHA-256 challenge. That is PKCE, which is
  authentication, and it is on the Google sign-in path that is web-gated out of
  the store build anyway.
- The Sealed box encryption is entirely server side. `SealedCryptoService` in
  the backend encrypts before the insert. The app sends plaintext over TLS and
  never holds a key. The privacy policy says this in as many words, and
  `privacy-labels.md` warns against claiming end-to-end encryption. Keep that
  consistent.

So the app uses only exempt encryption and `false` is the truthful answer. With
the key present, App Store Connect skips the export compliance question on every
build.

One check that cannot be done until the first build exists: there is no `ios/`
directory in the repo (`.gitignore` ignores `/ios` and `/android`), so the key is
injected at prebuild time from `app.json`. After the first EAS build, confirm
`ITSAppUsesNonExemptEncryption` is present and `false` in the generated
`Info.plist`. If a native `ios/` directory is ever committed, the value must be
maintained there instead, because `app.json` stops driving it.

---

## 5. In-app account deletion

Apple 5.1.1(v) is satisfied. Here is the truth on both paths, because they are
different things and the file named in the brief is the one that does not delete.

### The in-app path: real deletion

`app/(tabs)/profile.jsx` holds it, folded behind an "Account and data" row so a
mis-tap cannot reach it.

```
const deleteAccount = useMutation({
  mutationFn: () => api.delete('/account'),
  onSuccess: async () => { showToast('Your account has been deleted.', 'info'); await logout(); },
  ...
});
```

Two confirmations in sequence. The first says it permanently removes profile,
friendships, messages and requests and cannot be undone, with "Keep my account"
as the way out. The second asks "Are you absolutely sure?" and its confirm
button reads "Delete forever". Nothing is sent until the second answer.

The backend endpoint is `AccountController.deleteAccount`, mapped to
`DELETE /api/account`, documented as GDPR Article 17. The identity comes from the
JWT, so a user can only delete themselves. It calls
`AccountService.deleteOwnAccount`, which calls `purgeUserData`. This is a real
purge, not a soft flag and not a support ticket.

The same screen has "Send me a copy of my data", which calls
`GET /account/export` and hands the body to `saveMyDataCopy`, so the export
actually reaches the person instead of claiming an email that never arrives.

### The web page: email only, and that is the correct design

`app/delete-account.jsx` does **not** delete anything. Its one button calls
`Linking.openURL(deletionMailto(email))`, which opens a pre-filled message to
`help@towinly.com`. It never calls the API.

That is fine, and it is deliberate. This page exists for Google Play's Data
safety form, which requires a web address where somebody who no longer has the
app can ask for deletion. Play accepts a request form or an email route. The
page states the in-app route first and the write-to-us route second, promises a
reply within seven days, and says a person does the deletion by hand.

Apple's requirement is met by the in-app path, not this page. The risk is only
that a reviewer meets the page before the button, which is why Gap A above
matters.

### One edge case, worth knowing before a reviewer finds it

`deleteOwnAccount` refuses when `releaseGate.isReleased(userId)` is true, which
means the person's Sealed box has already been released to their Keyholders
after a verified death. The refusal message names an address to write to. This
is unreachable in review (it requires a completed death-verification process),
and refusing is the defensible position because those words are already in
somebody else's hands. Note it so nobody is surprised: there is exactly one
account state where in-app deletion says no.

---

## Fix before submission

Ordered by cost.

1. **BLOCKING. Decide the Support URL.** Either point it at
   `https://www.towinly.com/app/delete-account` today, or add an `/app/support`
   route in this repo with a contact address and a response-time sentence. The
   second is the better answer and is maybe an hour of work.
2. **Send a test email to `help@towinly.com` and confirm it arrives.** Five
   published surfaces depend on that mailbox.
3. **Add the in-app deletion path to the review notes** in
   `screenshots-and-review.md`. Wording is in Gap A above.
4. **Protect the demo seats from the deletion test.** Seed a fourth throwaway
   account for it, or warm the demo id cache at backend startup. Then re-verify
   all three logins right before submitting.
5. Non-blocking. Fix the `/app/` prefix in the `vercel.json` robots exception and
   the hard-coded `noindex` in `public/index.html`, so the three legal pages are
   indexable as the config already intends.
6. Non-blocking. Bring the marketing site's `/privacy` up to date with the app's
   policy, or link it through to `/app/privacy`. Two live documents that disagree
   about which companies receive user data is a liability even though the store
   console will only ever hold the correct one.
7. Housekeeping. `listings.md` and `screenshots-and-review.md` both point at
   `docs/store-listing.md`, which does not exist. The file they mean is
   `docs/store/listings.md`.

## Evidence

- Live logins and family API calls: production API, 2026-08-11.
- Rendered page checks: headless browser against `www.towinly.com`, 2026-08-11.
- Header checks: `curl -I` against both `www.towinly.com` and the app's own
  Vercel domain, 2026-08-11.
- Test suites re-run green: `delete-account-page`, `legal-contact-parity`,
  `legal-deletion-claim`, `store-listing`, `web-shell-config`. 91 tests passed.
- Backend read from `ToWin/backend`, which is reference only and was not
  modified.
