---
name: legal-docs
description: Towinly's legal document skill — Terms of Service, Privacy Policy, Helper Agreement, guardian consent, liability and insurance posture. Use when drafting or reviewing any legal or policy text, consent language, arbitration/dispute terms, store-required policy URLs, or when a feature changes what users agree to (guardian powers, payments, AI assistant).
---

# Legal docs — the paper that lets the product exist

No legal document exists in this repo today. Both stores require a privacy policy URL at
submission; payments and guardian mode require much more. This skill drafts; a lawyer signs.

## The document set (launch order)

1. **Privacy Policy** — plain-language, elder-readable, covering both markets
   (see `privacy-two-markets`). Required for both store submissions. Include the India
   Grievance Officer block and a phone contact.
2. **Terms of Service** — accounts, acceptable use, the Trust Ladder is not a guarantee,
   termination (cross-ref `trust-and-safety` suspension process), disclaimers, limitation of
   liability, arbitration (US) with small-claims and opt-out carve-outs; India: courts +
   governing law clause.
3. **Helper Agreement** — independent-contractor terms that survive the classification tests in
   `marketplace-payments`: helper controls availability and acceptance, may work elsewhere,
   provides services to elders (not to Towinly), tax responsibility their own.
4. **Guardian consent** — the elder's grant of each family power, in the elder's own plain
   words, revocable; matches exactly what `PUT /family/links/{id}/powers` can do. The app's
   promises card and this document must never diverge.
5. **AI assistant disclosure** — what the assistant is, that it can be wrong, what happens to
   transcripts, per-user consent (already implemented app-side — paper must match).

## Non-negotiable content rules

- **Elder-readable.** Short sentences, everyday words, ≥16px when rendered in-app. A 75-year-old
  should understand what they agreed to. Legalese goes in the lawyer's annex, not the user's face.
- **The safety disclaimer must be honest, not hidden:** Towinly screens helpers (say exactly what
  the screening covers per `background-checks` truth-in-labeling) but cannot guarantee conduct.
  Burying this creates liability; stating it plainly builds trust.
- **Never promise what the code doesn't do.** Every claim in these documents is checkable against
  the codebase; run that check whenever either side changes.
- Version and date every document; keep prior versions; in-app acceptance is logged with version.

## Liability & insurance posture (decide before launch)

- General liability + cyber for the company; require or provide coverage context for in-home
  help (an insurance broker prices this — care-marketplace comparables exist).
- Incidents route through `trust-and-safety`; nothing in the ToS may contradict that process.

## Route to humans

A US marketplace lawyer reviews 1–3 before launch; an Indian counsel localizes 1–2 and the
guardian consent. Budget line, not optional. This skill produces strong drafts and keeps
paper and product in sync — it does not replace signature by counsel.
