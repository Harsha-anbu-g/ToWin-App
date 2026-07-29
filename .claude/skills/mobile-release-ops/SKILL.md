---
name: mobile-release-ops
description: Shipping and operating the Towinly app — EAS builds and submits, OTA updates, TestFlight and Play tracks, staged rollout, rollback, crash monitoring, version support. Use for any build, release, update, versioning, or production-incident task on the mobile app.
---

# Mobile release ops — EAS, rollout, rollback

> **Mechanics live in the official `expo` plugin** (eas-app-stores, eas-workflows,
> eas-update-insights, expo-upgrade, expo-dev-client…) — invoke those for how-to.
> THIS skill is the Towinly **policy layer** on top: the constraints, gates, and
> checklists below override any generic Expo guidance when they conflict.

## Hard constraints of this project

- **Expo SDK 54 ceiling.** The founder's iPhone runs an Expo Go that supports SDK 54 only.
  Never bump `expo` past 54 without re-checking that device. Any dependency bump that drags
  the SDK forward is a blocking finding, not a routine update.
- Store identifiers are `com.towin.app` (iOS + Android), slug `towin`, display name Towinly —
  the rename shipped for strings; identifier changes are a separate, deliberate migration
  (new store listings vs. update-in-place) — never change them casually.

## Channels and builds

- EAS profiles: `development` (dev client), `preview` (internal/TestFlight/closed track),
  `production`. Each maps to an EAS Update channel of the same name.
- Version discipline: `version` (user-facing) bumps per release; native build numbers
  auto-increment. Never reuse a build number on a store submission.
- Secrets live in EAS secrets, never in `app.json` or the repo (`.env*.local` is gitignored —
  keep it that way).

## OTA updates (expo-updates) — policy

- OTA is for JS-only fixes: copy, layout, logic. **Never** OTA anything that changes native
  modules, permissions, or store-reviewed behaviour (auth options, payments, data collection —
  those legitimately belong to store review; see `app-store-launch`).
- Every OTA update must be revertable: know the previous update group ID before publishing;
  rollback = republish previous bundle to the channel.
- OTA a fix to `preview`, verify on a real device, then promote — same discipline as the
  repo's build → show → approve loop.

## Rollout and monitoring

- Play: staged rollout (start 10% → 50% → 100%, gate each step on crash-free rate).
  Apple: phased release on. Halt criteria decided *before* release day, not during.
- Crash/error monitoring (`sentry-expo` when added): symbolicated builds, alert on new crash
  signatures in the first 24h of any rollout. An app for elders must be boring-stable — a
  crash an engineer shrugs at is a user who never comes back.
- Minimum supported version: the backend must tolerate the oldest live app version; when it
  can't, ship a kind in-app "please update" screen (plain words, one button) — never a dead app.

## Release checklist (every store release)

1. `npm test` green (the suite is the contract — 150+ tests).
2. impeccable/HCI review passes done for UI changes (repo rule).
3. Release notes written for humans, both markets.
4. Demo accounts still work (store reviewers use them).
5. Founder approved on device. **Never push/submit without explicit approval** (repo guardrail).
