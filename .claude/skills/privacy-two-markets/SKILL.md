---
name: privacy-two-markets
description: Privacy compliance for Towinly across India (DPDP Act 2023) and the US (state privacy laws). Use when a feature touches personal data — location, addresses, health-adjacent context, AI assistant transcripts, guardian/delegated action, consent screens, data export or deletion, retention, analytics, or cross-border data flow. Also use for privacy policy content and store privacy labels.
---

# Privacy in two markets — DPDP 2023 + US state law

Towinly holds elder locations, home addresses, health-adjacent context, AI transcripts, and
guardian powers where one person acts for another. Delegation is exactly what privacy law
watches most closely.

## India — DPDP Act 2023

- Towinly is a **Data Fiduciary**; elders/helpers are Data Principals. Consent must be free,
  specific, informed, unambiguous, and **as easy to withdraw as to give**.
- Notice in plain language — and DPDP contemplates notices in scheduled Indian languages;
  align with `localization-india` (Hindi/Tamil consent text, not English-only).
- Data Principal rights: access, correction, erasure, grievance redressal, and **nomination**
  (a person who exercises rights if the principal dies or is incapacitated — unusually relevant
  to Towinly's demographic; guardian mode should map onto it, not fight it).
- Breach: notify the Data Protection Board **and each affected user**. Separately, CERT-In
  directions require incident reporting within **6 hours** — have the contact list ready before
  launch, not during an incident.
- Publish a Grievance Officer (name + contact) — required, and elders expect a phone number.

## US — state patchwork (CCPA/CPRA and successors)

- Rights to know, delete, correct, opt out of sale/sharing. Towinly's stance should simply be
  **"we never sell or share personal data for advertising"** — state it, then honor it (no ad
  SDKs, no data brokers). That single decision removes most CCPA surface.
- Sensitive categories in play: precise geolocation, health-adjacent inferences. Minimize:
  coarse location where coarse works; never store precise home location on the helper's device.

## Guardian mode — the special case

- Each granted power (MOB-C1..C5) is a **separate consent** by the elder, revocable one tap,
  never bundled. Replace-semantics on `PUT /family/links/{id}/powers` must mean revoked = gone.
- Everything done on-behalf-of is **attributed** (`actedByName`) — the audit trail is a privacy
  feature, not just UX honesty.
- The elder always sees what family can currently do, in plain words; the promises card must
  stay true (MOB-C1's note).
- Deletion requests: elder's data deletion wins over family's wish to retain; an open safety
  investigation (per `trust-and-safety`) defers deletion — tell the requester so.

## Operating rules

- **Data map before new stores:** any new table/field holding personal data gets one line —
  what, why, retention, who reads it. No line, no merge.
- AI assistant transcripts: per-user consent (already shipped), shortest retention that works,
  never used for anything but answering the user, stated in the notice.
- Cross-border: keep Indian users' data serveable from India if required (DPDP allows transfer
  except to blacklisted countries — watch the rules as they issue).
- Retention default: delete or anonymize on account deletion + 30 days, except legal holds.

## Route to humans

Privacy policy final text, DPDP Board registrations (if "Significant Data Fiduciary" is ever
triggered), and breach counsel — a lawyer signs, this skill drafts.
