---
name: skills-first
description: MANDATORY GATEWAY for this project. Use at the VERY START of every task, request, or question — before writing code, answering, or asking clarifying questions — to force the use of the installed skills and plugins. Invoke this whenever a task begins and it is not already obvious that a more specific skill is running. It makes Claude scan the skill and plugin catalog, pick the best-matching (and most popular) one, and route through it instead of improvising.
license: MIT
---

## Purpose

This project has a large library of skills and plugins. Claude tends to answer directly instead
of using them. This skill forces the habit: **consult the catalog first, then act.**
(Ported from the DCF workspace, adapted for Towinly.)

## The rule (do this before responding to ANY task)

1. **Restate the task** in one line to yourself.
2. **Scan ALL catalogs — project, global, and plugins.** Not just this repo's skills:
   - **Project skills** (`.claude/skills/` here): the Towinly company pack (menu below) +
     the design pack (impeccable, emil-design-eng, _jutsu, review-animations…).
   - **Global skills** (`~/.claude/skills/`, ~120): the gstack suite (`gstack-*`), superpowers
     dev skills (brainstorming, writing-plans, test-driven-development, systematic-debugging…),
     design packs (ui-ux-pro-max, mobile-app-ui-design, frontend-design, high-end-visual-design…),
     documents (docx, pptx, xlsx, pdf, slides), content (social, video, emails, copywriting,
     content-strategy, brand), and utilities (claude-api, mcp-builder, webapp-testing…).
   - **Installed plugins:** `ecc:*` (300+ skills + reviewers/resolvers), `claude-mem:*`,
     `code-review`, `frontend-design`, `playwright`, `security-guidance`, and **`expo`**
     (official Expo/EAS pack — eas-app-stores, eas-workflows, eas-update-insights,
     expo-upgrade, expo-router, expo-dev-client…).
   A ~10% chance a skill/plugin fits = invoke it. Do not answer from scratch when a skill
   exists anywhere on this machine.
3. **For company/business tasks, check the Towinly company menu below first** — it maps the
   business jobs to the right specialist skill.
4. **Invoke the matching skill or plugin via the Skill tool** — actually run it, don't just
   mention it.
5. **Only if nothing matches**, proceed manually — and say which skills you checked and why
   none fit.

## The Towinly company menu — task → skill

| The task touches… | Invoke |
|---|---|
| Safety reports, incidents, suspension, elder fraud/abuse | `trust-and-safety` |
| Helper verification, screening, "verified" claims | `background-checks` |
| Payments, payouts, pricing help, taxes, contractor questions | `marketplace-payments` |
| Personal data, consent, guardian powers, deletion, retention | `privacy-two-markets` |
| ToS, privacy policy, helper agreement, consent text | `legal-docs` |
| Store submission, review rejection, listings, ASO | `app-store-launch` |
| Builds, releases, OTA updates, rollout, crashes | `mobile-release-ops` |
| Launch/growth strategy, cold start, expansion, growth metrics | `marketplace-liquidity` |
| Senior centres, NGOs, partners, community outreach | `institutional-partnerships` |
| Support processes, call scripts, complaints, help content | `elder-support-desk` |
| Hindi/Tamil, i18n, Indic fonts, India-specific flows | `localization-india` |
| Instrumentation, metrics, funnels, "is it working?" | `product-analytics` |
| Revenue model, take rate, CAC/LTV, investor numbers | `unit-economics` |
| Public statements, breach notices, press, bad news | `crisis-comms` |

Multiple rows can apply — safety, privacy, and truth-in-labeling rules override the others
when they conflict.

## Tie-breaker: prefer the most popular

When two or more skills or plugins could do the job, **pick the one with the highest GitHub
stars / install count / community adoption.** Popular = battle-tested and better maintained.
If unsure which is more popular, say so and name your pick and the runner-up. (Same rule for
plugins as for skills.) Exception: the Towinly company menu above outranks popularity — a
Towinly-specific skill always beats a generic popular one for the jobs it names.

## Scope

- **Applies to skills AND plugins equally.** A plugin command (`ecc:...`, `claude-mem:...`,
  `code-review`, gstack commands) counts as a skill for this rule.
- UI/screen work → the design stack this repo already mandates (impeccable, ui-ux-pro-max,
  mobile-app-ui-design, emil-design-eng/review-animations, HCI-RULES walk).
- Coding work → superpowers dev skills (brainstorming, test-driven-development,
  systematic-debugging, code review loop) as the repo's CLAUDE.md already requires.
- **Expo/EAS mechanics** (builds, submit, TestFlight, OTA, upgrades, router, dev client) →
  the official `expo` plugin skills first; the project's `mobile-release-ops` and
  `app-store-launch` carry the Towinly policy (SDK 54 ceiling, approval gates, truth rules)
  on top of them.
- Company/business work → the Towinly menu above.

## Precedence

User instructions in `CLAUDE.md` and direct requests always win over this skill. This skill only
forces the *habit* of checking skills/plugins first — it never overrides an explicit instruction.
