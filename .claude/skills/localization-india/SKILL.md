---
name: localization-india
description: Preparing Towinly for its India market — i18n architecture, Hindi/Tamil copy written (not translated), Indic script typography, WhatsApp-first communication, UPI. Use when adding user-facing strings (i18n readiness), planning the India launch, writing Hindi or Tamil content, choosing fonts for Indic scripts, or designing India-specific flows.
---

# Localization — India is the home market, the app is English-only

The investor deck names India as the home market. Every hardcoded English string written today
is migration debt. This skill makes new work i18n-ready now and defines the India adaptation.

## Architecture (do now, cheap; later, expensive)

- New user-facing strings go through a string layer (i18next + expo-localization when wired;
  until then, keep strings in `content`/constants modules — never inline in JSX).
- No string concatenation for sentences (word order differs across languages); use templates
  with named placeholders. No text baked into images.
- Language is a **user choice in the app** (like the website's EN/TA toggle) — never
  OS-locale-forced. Elders share phones with children; the phone's language ≠ the user's.
- Dates, numbers: locale-aware; India uses lakh/crore grouping (₹1,00,000) — the DCF repo's
  scheme tables are the reference for how Indian users read amounts.

## Language content rules

- **Written, not translated.** Hindi/Tamil copy is authored in that language's plain everyday
  register (the DCF workspace's Tamil-first voice rules are the model). Machine-translated
  English reads as disrespect to exactly the user Towinly must charm.
- The brand voice survives translation: calm, patient, plain words. The tagline "It takes two
  To Win" is transcreated (meaning-preserving), not word-translated — founder approves it.
- A native speaker proofreads everything public — same rule as DCF's Tamil proofread blocker.

## Typography — the Newsreader problem

- **Newsreader has no Devanagari or Tamil glyphs.** Pair per script: Noto Serif Devanagari /
  Noto Serif Tamil for headings, Noto Sans equivalents for body — matched to the parchment
  theme's weight-400 serenity. Never let the system fall back to a default Indic font silently.
- Indic scripts run taller (matras above/below the line): line-height needs +15–20% vs Latin;
  re-test every fixed-height component. Tamil words run long — buttons and tabs must wrap or
  scale, never truncate.
- Elder-first sizing applies per script: ≥16px *rendered* legibility, checked with real Indic
  text, not Latin placeholders.

## India-specific product adaptations

- **WhatsApp-first:** notifications elders actually see are WhatsApp messages, not push. Family
  sharing, partner outreach (`institutional-partnerships`), and support (`elder-support-desk`)
  all run on WhatsApp in India.
- **UPI** is the payment instrument (`marketplace-payments`: Razorpay route).
- NRI guardian case: adult child in the US managing a parent in India — guardian mode across
  timezones/currencies is a first-class India scenario, not an edge case.
- DPDP notices in the user's language (`privacy-two-markets`).

## Flag on sight

New inline English strings in JSX · fixed-height text containers · fonts without Indic
coverage · English-only consent or legal text bound for India · date/number formatting
without locale.
