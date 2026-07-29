---
name: marketplace-payments
description: Money movement for Towinly — paying helpers, charging for help, refunds, taxes, worker classification. Use when designing or building payments, payouts, pricing of help tasks, tipping, escrow/hold-and-release, invoices, 1099/TDS questions, or when the product stops being free. Also use when investor or store materials make money claims.
---

# Marketplace payments — helpers earn, elders pay safely

`PRODUCT.md` promises helpers are "earning money." Today the codebase has **no payment rail at
all** (no stripe/payment/payout/escrow anywhere). This skill governs how one gets added.

## Architecture defaults

- **US: Stripe Connect** (Express accounts). Elder pays Towinly → platform fee retained →
  transfer to helper. Use destination charges or separate charges+transfers; never move money
  through Towinly's own operating account.
- **India: Razorpay Route** (or Cashfree) — split settlements to helper sub-accounts. UPI is the
  default instrument; card second.
- **Hold-and-release:** capture when help is booked, release to helper after the elder (or
  guardian) confirms completion or a 72h no-complaint window passes. This is the payments mirror
  of the Trust Ladder — money moves at the speed of confirmation, not booking.
- **Never build custodial escrow yourself** — holding user funds requires money-transmitter
  licensing (US, state by state) / RBI PA-PG authorization (India). The processor's split/hold
  features exist precisely so platforms don't need licenses.

## Disputes, refunds, chargebacks

- Elder-friendly refund posture: when in doubt, refund the elder and eat the fee — a disputed
  ₹500 is cheaper than a distrusting elder. Log patterns; refund abuse is handled per-helper.
- A safety incident (S1/S2 in `trust-and-safety`) freezes any pending payout to that helper.
- Chargeback evidence = the confirmation record (who confirmed completion, when) — design the
  confirmation flow so it produces this evidence naturally.

## Taxes — what the platform owes

| | US | India |
|---|---|---|
| Reporting | 1099-K via Stripe (thresholds shift — check current year); 1099-NEC only if Towinly itself pays helpers directly | **TDS u/s 194-O**: e-commerce operator deducts on gross amounts paid to sellers/providers; GST applies on Towinly's commission |
| Platform's GST/sales tax | service-by-state analysis (route to CPA) | GST registration required once commission revenue crosses threshold; 18% on platform fee |

## Worker classification — the harder half

Helpers must stay **independent contractors**, or the model breaks:

- **Do NOT:** set helpers' schedules, mandate hours, set uniforms, forbid other platforms,
  train them like staff, or pay by the hour on Towinly's clock.
- **DO:** let helpers set availability and accept/decline freely, price transparently, and keep
  the Trust Score a *reputation* signal, not a performance-management tool.
- California-style **ABC tests** are the strictest lens; design against them, not the IRS factors.
- India: contractor agreements + TDS; avoid anything resembling employer conduct (PF/ESI triggers).
- Every product feature that touches helper behaviour gets a classification sniff test — flag
  features that "manage" helpers as findings.

## Route to humans

- US marketplace/employment counsel signs off the Helper Agreement + classification posture
  **before** the first paid transaction (see `legal-docs`).
- A CPA (US) and a CA (India) own the tax registrations and thresholds.
