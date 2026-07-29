---
name: app-store-launch
description: Getting Towinly through App Store and Play Store review and found by users — submission requirements, privacy labels, testing gates, rejections, and ASO (store listing, screenshots, keywords) for the US and India. Use for any store submission, store metadata, review rejection, TestFlight/closed-testing setup, or store listing work.
---

# App Store launch — two stores, two markets

App-side blockers were closed once by hand (icon alpha, purpose strings, AI consent, device
block). This skill carries that knowledge forward and covers what's still ahead.

> For the **submission mechanics** (eas submit, store credentials, metadata upload), invoke
> the official `expo` plugin's `eas-app-stores` skill; this skill owns the Towinly-specific
> review strategy, gates, and ASO below.

## Apple — App Review essentials for this app

- **Guideline 4.8 (Login Services):** the moment a Google sign-in button ships, an equivalent
  privacy-respecting option (Sign in with Apple) is required. Already flagged in this repo's
  history — re-check at every auth change.
- **5.1.1 permissions:** every permission string must say *why in user terms* (the expo-image-picker
  strings already do this — keep the standard for any new permission).
- **AI content (1.2/4):** the assistant needs its consent flow (shipped) and a way to report
  problematic output — point it at the `trust-and-safety` report path.
- **Privacy nutrition labels** must match `privacy-two-markets` reality — labels are audited
  against actual network traffic; an analytics SDK added later silently invalidates them.
- Review account: provide a demo elder + helper + family login with seeded data; reviewers must
  reach guardian mode without a real family.

## Google Play — the long pole

- **Closed testing gate: 12 testers, 14 consecutive days** before production access for new
  personal dev accounts. Already identified as the ~3-week critical path — start it before
  anything else store-related.
- **Data Safety form** = the Play version of privacy labels; same source of truth.
- Target API level requirements move yearly; Expo SDK pin (54 — see `mobile-release-ops`)
  bounds which targets are reachable. Check compatibility before promising dates.

## Rejection playbook

Read the exact guideline cited; fix or contest in the resolution center with respectful,
specific argument. Metadata rejections are cheap to fix (no binary). Never resubmit unchanged.
Appeals exist and work when the reviewer misunderstood the app — explain the elder-helper model
plainly; the two-role + family structure confuses reviewers who expect a dating-app shape.

## ASO — being found

- **Title ≤30 chars** (both stores): brand + one category phrase, e.g. "Towinly — elder help & company".
  Keyword field (Apple, 100 chars): no spaces after commas, no duplicates of title words.
- **Two audiences search differently:** elders rarely search; *families* do ("help for elderly
  parent", "companion for seniors app") and helpers do ("help seniors earn"). Write the listing
  for the searcher, not the end user.
- Screenshots: first two carry the story (trust ladder + real help), captions in ≥ large text,
  parchment brand look — never dark-mode shots. Localize the India listing (see
  `localization-india`); US and India listings diverge deliberately.
- Ratings: prompt after a *confirmed good moment* (help completed + positive review given),
  never on first open; elders will not return to the store later.

## Hard rules

- Store metadata claims obey the same truth rules as the app (`background-checks`
  truth-in-labeling, `legal-docs` no-overpromising).
- Never submit without: policy URLs live, labels matching traffic, demo accounts working,
  and the version's release notes written for humans.
