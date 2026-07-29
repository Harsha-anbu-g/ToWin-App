---
name: elder-support-desk
description: Phone-first support for Towinly's users — call scripts, callback flow, family-assisted onboarding, complaint handling, and escalation. Use when designing support processes, writing help content or support copy, handling a user complaint, or building any support surface. The target user has lower digital confidence and will not self-serve.
---

# Elder support desk — support IS the product here

`PRODUCT.md` defines the elder as having "lower digital confidence, larger text needs,
deliberate pace." They will not file tickets or read a help centre. For this company, support
is a phone that gets answered — and every support contact is a trust moment.

## Channel policy

- **Phone first.** A visible phone number in the app (Profile and every error state that says
  "call us"), staffed hours stated plainly; after hours, a warm voicemail promising a callback
  by a stated time — and the callback happens.
- **Callback over hold.** Elders should never wait on hold; take a number, call back.
- WhatsApp for India (`localization-india`), email for families, in-app chat is for helpers —
  never the elder's only option.
- Support speaks the brand voice: calm, patient, plain everyday words, never rushed. One thing
  at a time. It's fine for a call to take 20 minutes.

## Script library (produce and maintain these)

Signup walkthrough (elder + assisting family member versions) · password/forgot flows ·
"who is this helper?" reassurance call (explain Trust Score and ladder in plain words) ·
guardian-mode setup for a family caller · "I'm not comfortable with my helper" (warm, no blame,
routes per below) · payment/refund questions (`marketplace-payments` posture: refund generously) ·
scam-warning talk (never share OTPs, passwords, bank details — even with helpers; Towinly never
asks for them by phone).

Every script: short sentences, no jargon, confirm understanding ("shall I stay on while you
try it?"), end with "is there anything else at all?"

## Complaint handling and escalation

1. Listen fully, write it down verbatim, thank them — a complaining elder is doing Towinly a favor.
2. Classify: quality (S4) → resolve directly, log pattern. Anything touching safety, money
   taken, coercion, or fear → **`trust-and-safety` immediately** (S2 path, human callback).
   Support never adjudicates safety; it routes fast and warmly.
3. Close the loop by phone — never mark resolved without the user saying it's resolved.
4. Weekly: complaint patterns reviewed as product input (a repeated confusion is a UI bug —
   file it, cite HCI-RULES).

## Family-assisted onboarding

Expect and design for "my daughter set it up for me": joint calls are normal; verify the elder
is present and willing (guardian powers still require the elder's own consent —
`privacy-two-markets`); send the family member the guardian-mode explainer, not just the elder.

## Hard rules

- No support metric may reward shorter calls. Measure resolution and repeat-contact, not handle time.
- Support staff can see what they need, not everything (least privilege; member-list export is
  the crown jewel — see `privacy-two-markets`).
- A launch without a staffed phone line is a launch blocker — same rule as `trust-and-safety`.
