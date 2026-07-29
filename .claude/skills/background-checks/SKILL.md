---
name: background-checks
description: Helper screening for Towinly — US (FCRA) and India. Use when designing or building helper verification, identity checks, criminal-record checks, screening policy, re-check cadence, or any onboarding step that gates who may help an elder. Also use when writing copy about "verified helpers" — the claim must match what is actually checked.
---

# Background checks — helper screening in two markets

Screening gates helper supply, and the legal *sequence* matters as much as the check itself.
Getting the US sequence wrong is class-action territory regardless of the result.

## US — the FCRA sequence (exact order, no merging steps)

1. **Standalone disclosure** — its own document, nothing else on it (no liability waiver, no
   extra consents). Courts have punished "cluttered" disclosures heavily.
2. **Written authorization** from the helper.
3. Run the check through a vendor (Checkr, Sterling — they handle compliant delivery).
4. If the result may cause rejection: **pre-adverse action notice** + a copy of the report +
   the CFPB "Summary of Your Rights Under the FCRA".
5. **Wait a reasonable period** (5 business days is the customary floor) so they can dispute.
6. **Adverse action notice** — names the CRA, states the CRA didn't make the decision, and
   explains the right to dispute and to a free copy.

State/city overlays exist ("ban-the-box", NYC Fair Chance Act, California ICRAA). The vendor
handles most of this — never build raw check flows in-house.

## India — different path entirely

- **No FCRA equivalent.** Screening is consent-based under **DPDP Act 2023**: collect explicit,
  informed consent; collect only what's needed; state retention.
- **Aadhaar:** private companies cannot demand Aadhaar authentication as a condition of service
  (Puttaswamy, Aadhaar Act as read down). Offline Aadhaar XML / DigiLocker with consent is the
  acceptable route for identity. Never store full Aadhaar numbers — mask to last 4.
- **Criminal records:** no clean national database. Use Police Clearance Certificates (elder-care
  norm) and vendor court-record searches (AuthBridge, SpringVerify, OnGrid, IDfy).
- Identity + address + court-record + reference checks is the realistic Indian stack.

## Policy decisions to encode (defaults; founder can override)

| Question | Default |
|---|---|
| What blocks a helper outright | violent crime, sexual offences, elder/dependent abuse, theft/fraud convictions |
| Individualized assessment | required in the US for anything else (nature, time elapsed, relevance) — blanket bans invite discrimination claims |
| Re-check cadence | annually, plus on any S2+ safety report |
| Before first check clears | helper may browse but not message or meet elders — the Trust Ladder starts after clearance |
| Who sees results | named admin only; store pass/fail + date, not the report itself |

## Truth-in-labeling rule

The app may only claim what is true per market: if India launch ships with ID + PCC but no court
search, the badge says "ID verified", not "background checked". Copy and screening scope must be
reviewed together — flag any mismatch as a blocking finding.

## Route to humans

- Vendor selection and the disclosure/authorization documents: US counsel reviews before first use.
- This skill designs the flow and policy; it does not adjudicate an individual's record — a named
  human makes individual decisions, logged, per `trust-and-safety`.
