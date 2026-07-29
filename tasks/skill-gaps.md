# Skill gaps — what Towinly needs and doesn't have

> **Status 2026-07-26:** all 14 skills below + a `skills-first` gateway (ported from DCF) are now
> **installed** — real files in `App/.claude/skills/`, symlinked into the root `.claude/skills/`
> so this workspace loads them. The "route to humans" items remain open.

Written 2026-07-26. Same exercise as the DCF workspace, applied to Towinly.
Method: inventory everything available here (25 project skills + ~120 global + the ECC plugin),
then compare it against what this specific company actually has to do.

## The finding in one line

**This project is equipped as a design and engineering studio, not as a company.**
Building the app is over-served — impeccable, ui-ux-pro-max, emil-design-eng, the motion and
_jutsu packs, superpowers, gstack, all of ECC. Everything that happens *around* the app —
keeping elders safe, screening helpers, moving money, the two store submissions, the law in two
countries, supporting a 75-year-old on the phone — has close to nothing.

DCF (a chit fund with one office) is set up with 7 departments. Towinly, which puts strangers in
elders' homes across two countries, has 2: Developers and Design, plus a partial Marketing.

---

## Tier 1 — absence here is a business risk, not an inconvenience

### 1. `trust-and-safety` — safeguarding vulnerable adults
The product's whole premise is a stranger entering an elder's home. The backend already has
`report/` and `emergency/` packages and the app suppresses attribution on safety reviews
(`todo.md` MOB-C5) — so the *mechanics* exist, but no skill encodes the **policy**: incident
taxonomy, who is called and in what order, suspension and appeal, elder-fraud and coercion
patterns, mandatory-reporting and Adult Protective Services escalation in the US, the equivalent
route in India, and what gets preserved for law enforcement.
Nearest available: `ecc:security-reviewer` (infosec), `ecc:safety-guard` (prevents destructive
ops on production — unrelated despite the name). **Coverage: 0%.**
One mishandled incident with an elder is existential for a trust brand. This is gap #1.

### 2. `background-checks` — helper screening, FCRA and India
No screening capability exists anywhere in the codebase or the skill library. In the US this is
governed by the **FCRA**: standalone disclosure, written authorisation, pre-adverse-action notice
with a copy of the report, a waiting period, then the adverse-action notice. Getting the sequence
wrong is class-action territory, independent of whether the check itself was right. India needs a
different path: police verification, and Aadhaar rules that restrict what a private company may
even collect. Also needs the re-check cadence and what disqualifies.
**Coverage: 0%.**

### 3. `marketplace-payments` — helpers "earn money", and nothing moves it
`PRODUCT.md` states helpers are "earning money and a growing Trust Score." A grep across the whole
backend and frontend for `stripe|payment|payout|escrow|billing` returns **zero matches**. There is
an investor deck with an ask, and no money rail.
Needs: Stripe Connect / Razorpay Route style split payments, hold-and-release around a completed
help, refunds, disputes and chargebacks, payout timing — plus the harder half, **worker
classification**: 1099-NEC vs employee in the US (and the state tests that keep tightening),
contractor + TDS and the GST threshold in India.
Nearest available: `ecc:customer-billing-ops` and `ecc:finance-billing-ops` — both SaaS
subscription billing, the wrong shape entirely. **Coverage: ~5%.**

### 4. `privacy-two-markets` — DPDP Act 2023 + US state privacy
Towinly holds elder location, home addresses, health-adjacent context, AI assistant transcripts,
and now **guardian powers where one person acts on another's behalf** (todo.md MOB-C1..C5). That
delegation model is exactly what privacy law cares most about, and MOB-C1 already notes the
existing promises card becomes false and "must be restated honestly."
Needs: consent architecture for delegated action, data-subject requests, retention, cross-border
transfer between the two markets.
Nearest available: `ecc:hipaa-compliance` (wrong statute, adjacent instincts), `ecc:security-review`.
**Coverage: ~10%.**

### 5. `legal-docs` — Terms, Helper Agreement, consent, liability
There is no legal skill of any kind in this project. Needed before launch: Terms of Service,
Privacy Policy, a Helper Agreement that survives the classification question above, elder and
guardian consent language, liability position and insurance requirements, dispute/arbitration
terms. The DCF workspace at least has `contract-review`, `legal-response`, `triage-nda`; here
there is nothing. **Coverage: 0%.**

---

## Tier 2 — shipping the app and finding the first users

### 6. `app-store-launch` — two stores, two markets
Store readiness was closed once by hand (icon alpha, purpose strings, consent), but nothing
carries the knowledge forward: App Review Guidelines, privacy nutrition labels and Play Data
Safety, age rating, **Google's 12-tester / 14-day closed-testing gate** (already identified as the
~3-week long pole), rejection appeals, and store listing + **ASO** — screenshots, keywords, and
title in both markets. Note DCF deliberately deleted its `aso` skill; Towinly is the project that
actually needs one.
Nearest available: `gstack-ios-qa` / `gstack-ios-design-review` (device QA), `ecc:ios-icon-gen`.
**Coverage: ~10%.**

### 7. `mobile-release-ops` — EAS, TestFlight, rollout, rollback
Needs: build channels and profiles, TestFlight groups, staged rollout percentages, OTA update
policy and rollback, crash/error monitoring, minimum-supported-version enforcement — and the
Expo SDK 54 ceiling that the founder's own device imposes.
Nearest available: `ecc:deployment-patterns`, `ecc:react-native-patterns`, `gstack-ship`,
`gstack-canary` — all web-deploy shaped. **Coverage: ~30%.**

### 8. `marketplace-liquidity` — the cold-start problem
No helpers means no elders and vice versa. Needs: launch one geography at a time, seed the short
side first, density thresholds before opening a city, and the metrics that matter for a two-sided
market (match rate, time-to-first-help, repeat rate per side) rather than installs.
Nearest available: `ecc:marketing-agent`, `ecc:product-lens`, `growth-log` — generic, B2B/SaaS
assumptions baked in. **Coverage: ~15%.**

### 9. `institutional-partnerships` — Towinly's real distribution
Elders are not reached by Instagram ads. They are reached through senior centres, faith groups,
libraries, AARP-type bodies, home-care agencies; in India through RWAs, senior-living operators
and NGOs. This is partnership work with a safety story attached, and it needs its own playbook.
Nearest available: `ecc:investor-outreach`, `ecc:lead-intelligence` — B2B sales motions.
**Coverage: ~10%.**

### 10. `elder-support-desk` — phone-first support
The target user is defined in `PRODUCT.md` as having "lower digital confidence." They will not
self-serve through a help centre. Needs: phone and callback support, family-assisted onboarding,
a script library in plain words, complaint handling, and escalation into the safety process above.
DCF's pack carries `ticket-triage`, `ticket-deflector`, `handle-complaint`; this project has no
support skill at all. **Coverage: 0%.**

---

## Tier 3 — company scaffolding

### 11. `localization-india`
The deck names India as the home market and the app is English-only. Needs i18n architecture
(before more screens are written, not after), Hindi/Tamil copy that is written rather than
translated, script typography and line-breaking, WhatsApp-first communication, and UPI.
**Coverage: 0%.**

### 12. `product-analytics`
No event schema, activation funnel, or cohort/retention instrumentation — and for a two-sided
market the metric set is unusual. Nearest: `ecc:dashboard-builder`, `ecc:benchmark`.
**Coverage: ~15%.**

### 13. `unit-economics`
The deck has an ask; nothing models take rate, CAC per side, payback, or runway. **Coverage: ~10%.**

### 14. `crisis-comms`
What Towinly says publicly, and to families, when something goes wrong with an elder — drafted
before it is needed, not during. Nearest: `internal-comms` (internal audience only).
**Coverage: ~5%.**

---

## Four gaps no skill can close

These need people, and the skills should route to them rather than improvise:

- a US employment/marketplace lawyer for the helper classification and the Terms
- an insurance broker for in-home services liability
- a background-check vendor with an FCRA-compliant flow (Checkr, Sterling, or the India equivalent)
- a human reachable on the phone when a safety report comes in

## Suggested build order

1. `trust-and-safety` — the product is trust; there is currently no written process for the day it fails.
2. `background-checks` — gates helper supply, and the legal sequence must be right the first time.
3. `legal-docs` + `privacy-two-markets` — both block store submission and both touch guardian mode.
4. `app-store-launch` — the next concrete milestone.
5. `marketplace-payments` — the moment the product stops being free, all of Tier 1 §3 lands at once.
6. `elder-support-desk` and `institutional-partnerships` — the first real users arrive through these.
