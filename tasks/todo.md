# Mobile port — family, trust inheritance, guardian mode

Porting the Towinly website surface shipped in `deffabc..1190066` (29 commits) to the
React Native app. Decision (2026-07-20, founder): **exact parity with the website** —
all 13 features including guardian mode.

Reference: `Towinly/` at `1190066` (read-only). Backend is unchanged and already live.

## Numbering trap — pin this first

The website carries two trust-step conventions side by side:

- `stageIndex` from `/family/journey` and `/family/standings` is **0-based**
  (`DISCOVERED 0, MESSAGING 1 … FIRST_MEET 5, TRUSTED 6`)
- `currentTrustLevel` string maps in `TrustJourney.jsx` are **1-based**
  (`DISCOVERED 1 … TRUSTED 7`)

Mobile uses **one** helper (`src/lib/trustStages.js`) with the 0-based API values and
named constants `MESSAGING_STAGE = 1`, `FIRST_MEET_STAGE = 5`, `TRUSTED_STAGE = 6`.
A test locks the unlock boundary so family chat can never open a step early.

## Chunks

- [ ] **MOB-A — Family journey (read).** `GET /family/journey`. Per parent: check-in
      chip, open-request count, shared helper cards with read-only trust bar, helper
      name → `/user/{id}`, "Their open help requests". FamilyHome section tabs
      (My Parents / Add Parent / News, News carries alert count).
- [ ] **MOB-B1 — Shared notes thread.** `MessageChannel.FAMILY_UPDATES`. Chat screen
      takes a channel param; speaker names above bubbles; never seen-stamped; never
      counted in unread. Inbox entries + doorway buttons on elder/helper/family cards.
- [ ] **MOB-B2 — Trust inheritance.** `GET /family/standings` + chat/pause/resume/revoke.
      Unlocks at `MESSAGING`. `standingsLoaded` flag so a failed fetch never reads as
      "removed". Chat opens the returned FAMILY connection id.
- [ ] **MOB-B3 — Elder transparency.** `GET /family/transparency` line on elder helper
      cards ("Your daughter Sarah and Tom are talking").
- [ ] **MOB-C1 — Guardian grants.** Four switches per active family link on My Family.
      `PUT /family/links/{id}/powers` — **replace semantics**, omitted = revoked.
      **Rewrites the existing promises card**, which today says family "can never post
      or act for you" — that becomes false and must be restated honestly.
- [ ] **MOB-C2 — MESSAGE_HELPERS.** Write to a helper in the parent's MAIN thread;
      gold "Writing for <Parent>" header line; `actedByName` on bubbles; no seen-stamp.
- [ ] **MOB-C3 — MANAGE_HELP_REQUESTS.** Ask-for-help form with `onBehalfOfElderId`;
      two-step close confirm; "Asked by Sarah, for Margaret" on all three seats.
- [ ] **MOB-C4 — ADVANCE_TRUST.** Move the next step for the parent; hidden at TRUSTED.
- [ ] **MOB-C5 — LEAVE_REVIEWS.** 5-star + comment, TRUSTED only, `onBehalfOfElderId`;
      attribution shown on the helper's profile (suppressed on safety reviews).
- [ ] **MOB-D — Gating polish.** FAMILY sees no Trust Score anywhere; `ConnectionType.FAMILY`
      helper card shows the explanatory line and no ladder; display names never an email.
- [ ] **Review passes.** impeccable audit + polish, HCI 1→10 walk, motion review, `npm test`.

## Standing rules for this port

- All work in `App/`. `Towinly/` is read and never written.
- No hardcoded hex — tokens only (`no-stray-colors.test.js` enforces).
- Rows, not boxes, for lists (`FamilyRows.jsx` primitives).
- One filled primary button per screen; ≥44pt targets.
- Tests assert exact user-visible copy and exact API payloads.
- Build → show on device → corrections → approval → only then push.
