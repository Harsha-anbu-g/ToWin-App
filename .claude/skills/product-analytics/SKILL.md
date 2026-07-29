---
name: product-analytics
description: Measurement for Towinly — event schema, two-sided funnels, retention cohorts, privacy-respecting instrumentation. Use when adding analytics or instrumentation, defining metrics or dashboards, evaluating a feature's success, or answering "is this working?" questions about the product.
---

# Product analytics — measuring a trust marketplace

Nothing is instrumented today. When analytics lands, it must fit two constraints: the metrics
of a **two-sided market** (see `marketplace-liquidity`) and the privacy stance of a **trust
brand** (see `privacy-two-markets`).

## Privacy constraints (non-negotiable)

- Self-hostable or privacy-first tooling (PostHog-style) over ad-network SDKs; **no data ever
  leaves for advertising** — that promise anchors the CCPA stance and store privacy labels
  (`app-store-launch` — adding an SDK silently invalidates submitted labels).
- Event properties carry IDs and enums, never free text (no message contents, no names).
- Analytics consent lives with the other consents; declining analytics never degrades the app.

## Event schema (start small, stay stable)

Naming: `object_action` — `signup_completed`, `request_posted`, `request_accepted`,
`connection_created`, `ladder_step_advanced` (with step index), `first_meet_reached`,
`help_completed`, `review_left`, `report_filed`, `guardian_power_granted`, `assistant_used`.
Every event: role (elder/helper/family), area code (coarse — city/pincode prefix, never precise),
app version. ~15 events well-chosen beat 200 accreted.

## The funnels that matter

- **Elder:** install → signup → first request → first response < 24h → first meet → repeat request.
  The step that predicts everything: *first response within a day* (liquidity's health gate).
- **Helper:** signup → verification cleared (`background-checks`) → first accept → first help →
  helping again in 30 days. Watch verification drop-off — it's the supply choke point.
- **Family:** invite → link → guardian power granted → weekly return. Family retention is a
  leading indicator of elder retention (the child keeps the parent engaged).
- **Trust:** connections reaching MESSAGING → FIRST_MEET → TRUSTED; time-per-step. Slow is fine
  (slow is the point); *stalled* (no activity 30 days) is churn.

## Retention and reporting

- Cohorts by signup month **and by area** — a healthy old area must not mask a failing new one.
- North-star candidate: **elders helped in the last 30 days** (not installs, not sessions —
  an elder leaving the app open is noise, an elder *helped* is the product working).
- Weekly one-pager: north star, per-side funnels, liquidity gates, safety-report rate.
  Safety-report rate rising with volume is expected; rising per-connection is an alarm →
  `trust-and-safety`.

## Anti-patterns

Session length as engagement (elders are slow readers — long sessions can be confusion, pair
with task completion) · A/B tests that gamble with trust surfaces (ladder, safety, consent
are never experiments) · dashboards nobody reads (every metric has an owner and a decision
it feeds) · precise location in any event.
