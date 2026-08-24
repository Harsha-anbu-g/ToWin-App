# LOC-2: the phone's location works everywhere it matters (SHIPPED 2026-08-22)

Branch `ralph/location-everywhere`, run by the ralph loop from `ralph/prd.json`.
Full plan with every verified fact and its file and line:
`docs/superpowers/plans/2026-08-22-location-everywhere.md` (project root, outside this repo).

- [x] LOC-201 one shared hook and card (`src/lib/useDevicePosition.js`, primer moved to `src/components/location/`)
- [x] LOC-202 lock the on-behalf rule: `POST /needs` never carries coordinates
- [x] LOC-203 Post Help asks right after posting (owner call: after, never during)
- [x] LOC-204 Offer Help gets a real distance via `GET /needs/nearby` (owner call: make it real)
- [x] LOC-205 Profile Edit can use the phone, without Save wiping it afterwards
- [x] LOC-206 freshness at 24 hours, never on a timer
- [x] LOC-207 store paperwork stays true
- [x] LOC-208 verification sweep with evidence

Owner decisions locked 2026-08-22: the Offer Help distance chips become real; the
Post Help ask lands after the request is posted.

All eight committed on `ralph/location-everywhere` (`cf2dfbc..36fded9`), now carried by
`ralph/store-hardening`. Independently re-verified 2026-08-22: 148 suites, 1250 tests,
all passing with `--forceExit`, exit 0.

- [x] Pushed 2026-08-22: `origin/main` 89b3d5e -> 0c3e70c, 29 commits.
- [x] TestFlight build 12, v1.1.0, from 0c3e70c, submitted to App Store Connect.
- [ ] Walk it on the phone once Apple finishes processing: Post Help, Offer Help,
      Profile Edit, Add Friends.

- [x] The Add Friends finding is CLOSED (`ad58eaa`, pushed): a position that actually
      changed now invalidates `['discover']`. A first-arrival record does not, or every
      ordinary mount would fetch the same list twice.
      Test: `__tests__/friends-location-refresh.test.js`, three cases.

---

# Mobile port — What I Pass On (+ check-in family visibility, role landing)

Porting the Towinly website surface shipped in `088893c..f94d437` (47 commits) to the
React Native app. Backend is unchanged and already live — the app is another client of
the same `/api/passon/*` routes.

Reference: `ToWin/` at `f94d437` (read-only). Website-only commits (phone→app serving,
PostHog analytics split, CI flyway, demo seeder) are NOT ported.

## The feature in one paragraph

An elder's page of what she passes on: **Story box** (stories with an audience:
anyone / family / helpers / one person), **Letter box** (letters to one person,
readable now or held until after she is gone — released only by a human procedure),
and a **Sealed box** (encrypted things only she knows; password to reveal; keyholders
from her family list with a quorum; seven-day undo; a saved one-page copy kept with
her will). Family members see asks to hold a key and can read what was passed to them.

## Chunks — ALL BUILT 2026-08-02, 406 tests green, demo pending

- [x] **PASS-A — Libs + copy.** `src/lib/passOnLocks.js` (word-for-word port),
      `src/lib/landingPath.js` (role landing: ELDER/BOTH → check-in, FAMILY → home hub,
      ADMIN → admin), `src/lib/uploads.js` (client-side upload size gate), copy.js adds.
- [x] **PASS-B — Elder page.** `app/pass-on/index.jsx` (elder-only): three segmented
      tabs (Story box / Letter box / Sealed box), not-a-will primer, item form + card,
      audience picker, "Anyone" confirm, take-down confirm.
- [x] **PASS-C — Sealed box.** Setup 3 steps + arm (server-worded acknowledgements),
      settling card + undo, keyholder list lines, items list (names only), add form,
      inline password reveal (no-store, never held in state), delete confirm, frozen line.
- [x] **PASS-D — After letters.** WHEN picker on letters (NOW / AFTER), held chip,
      needs-keyholders gate linking to the Sealed tab.
- [x] **PASS-E — Sheet + From-page.** `app/pass-on/sheet.jsx` (one-page copy, share as
      file, mark saved), `app/passed-on/[ownerId].jsx` (stories/letters shared with me,
      letter chip, report-a-story flow with contentReference).
- [x] **PASS-F — Family side.** Keyholder ask card (asked-of-me / respond / resign) on
      the family parent screen; FamilyParent three-tab split; FamilyHome adds.
- [x] **PASS-G — Check-in + landing.** Check-in screen leads with the family it
      reassures (who sees it, plain words); check-in kept elder-only; post-login
      landing per role wired through one lib.
- [x] **PASS-H — Entry points.** "My boxes" MenuSheet row + elder home card with the
      spoken summary (`3 stories · 2 letters · your box is shut`), profile pass-on link
      on elder profiles.
- [x] **PASS-I — Words.** Terms/Privacy rewrite (legalCopy port), Register privacy
      copy, guide/Ask-AI check-in wording.
- [~] **PASS-J (suite green + lint + HCI walk done; user demo pending) — Verify.** Full jest suite green; impeccable + HCI 1→10 walk on the
      new screens; motion review; demo checklist for the user. No push without approval.

## Standing rules for this port

- All work in `App/`. `ToWin/` is read and never written.
- No hardcoded hex — tokens only (`no-stray-colors.test.js` enforces).
- One filled primary button per screen; ≥44pt targets; body ≥16px.
- Tests assert exact user-visible copy and exact API payloads.
- Copy is word-for-word from `passOnLocks.js` — the arm acknowledgements are hashed
  server-side, so the two tick sentences must come from the server, never local text.
- The reveal answer is never put in a list or component state that outlives the card.
- Build → show on device → corrections → approval → only then push.

---

# ARCHIVE — Mobile port: family, trust inheritance, guardian mode (DONE 2026-07-26)

Shipped as FAM-501..513 vs website `088893c`; kept for reference.

- Numbering trap: `stageIndex` 0-based vs `currentTrustLevel` 1-based →
  `src/lib/trustStages.js` is the one helper (MESSAGING 1, FIRST_MEET 5, TRUSTED 6).
- MOB-A family journey · MOB-B1 shared notes · MOB-B2 trust inheritance ·
  MOB-B3 transparency · MOB-C1 guardian grants · MOB-C2 MESSAGE_HELPERS ·
  MOB-C3 MANAGE_HELP_REQUESTS · MOB-C4 ADVANCE_TRUST · MOB-C5 LEAVE_REVIEWS ·
  MOB-D gating polish — all delivered, 190+ tests green.
