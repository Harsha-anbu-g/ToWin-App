---
name: trust-and-safety
description: Towinly's safety policy skill — safeguarding elders and handling incidents. Use whenever a task touches safety reports, the report/ or emergency/ backend packages, helper suspension, elder fraud or coercion, abuse concerns, incident response, moderation decisions, or any feature where a helper is alone with an elder. Also use when writing safety-related UI copy or policy pages.
---

# Trust & Safety — safeguarding vulnerable adults

Towinly's premise is a stranger entering an elder's home. The backend has the mechanics
(`report/`, `emergency/`, safety reviews with suppressed attribution). This skill encodes the
**policy** those mechanics serve. One mishandled incident is existential for a trust brand.

## Incident taxonomy (classify first, always)

| Severity | Examples | Clock |
|---|---|---|
| **S1 — danger now** | violence, medical emergency, elder missing, active threat | Minutes. Emergency services first (US 911, India 112), platform second. |
| **S2 — harm alleged** | theft, financial exploitation, abuse or neglect allegation, coercion | Same day. Suspend helper access pending review. Human calls the elder. |
| **S3 — serious concern** | boundary violations, repeated no-shows to a dependent elder, intoxication, aggressive selling | 48h. Investigate, warn or restrict. |
| **S4 — quality** | rudeness, lateness, disputes about a help task | Normal support flow (`elder-support-desk`). |

Financial exploitation is the signature elder crime. Treat any report involving money, gifts,
"loans", passwords, OTPs, or documents as S2 minimum — never as a quality dispute.

## Response sequence for S1–S2

1. **Safety of the person first** — emergency services if danger is current.
2. **Freeze** — suspend the helper account (block messaging + new connections; do NOT delete).
3. **Preserve** — snapshot messages, connection history, trust-ladder record, reviews, timestamps.
   Never edit or delete anything that could be evidence, even at the subject's request (privacy
   deletion requests during an open investigation are deferred — note it in `privacy-two-markets`).
4. **A human calls the elder** (or their family/guardian contact) — phone, not push notification.
5. **Report where required:**
   - **US:** elder abuse/neglect/exploitation → Adult Protective Services in the elder's state
     (eldercare locator 1-800-677-1116). Some states impose mandatory reporting; when in doubt, report.
   - **India:** Elder Helpline **14567**, police **112**; Maintenance & Welfare of Parents and
     Senior Citizens Act 2007 is the framing statute.
6. **Write it down** — every incident gets a timestamped log: who reported, classification,
   actions, who was called, outcome. This log is what protects Towinly later.

## Suspension and appeal

- Suspension pending investigation is **not** a finding of guilt — say so in the notice.
- The suspended person gets: what rule is in question (not the reporter's identity), how to
  respond, and a decision timeline (target 7 days).
- Permanent removal decisions are made by a named human, never automated, and are logged.
- Reporter identity is never revealed. The app already suppresses attribution on safety reviews
  (MOB-C5) — keep that invariant everywhere.

## Product invariants this skill defends in code review

- A safety report can be filed from any screen where the other party is visible.
- Reporting never requires the elder to type a long text (big buttons, plain words, phone option).
- Guardian mode: family can report on behalf of the elder; the elder is never notified that
  family filed a report about a helper (protects against coercion scenarios).
- Blocked/suspended users disappear from the other party's surfaces immediately, not on next sync.

## Hard guardrails

- **Never promise an outcome** ("he will be banned") — promise a process and a callback.
- **Never handle an S1/S2 with an automated message alone.** A human voice is the product here.
- **Never delete evidence.** Freeze, preserve, then decide.
- This skill routes, it does not replace: a reachable on-call human for safety reports is a
  launch prerequisite. If none exists yet, flag it as a blocker on any launch-related task.
