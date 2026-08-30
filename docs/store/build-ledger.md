# Build ledger: which binary came from which commit

Local builds leave no EAS server record, so this file is the only durable tie
between a binary in review and a commit in this repository. One entry per
delivered build. Never delete an entry.

## iOS build 25, recorded 2026-08-30 (APS-14)

| Field | Value |
|---|---|
| App version | 1.1.0 |
| Build number | 25 |
| Bundle identifier | `com.towinly.app` |
| Built from commit | `56bc83e` |
| Build kind | LOCAL `eas build` (`--local`); no EAS server record exists |
| Archive | `~/Library/Developer/Xcode/Archives/2026-08-29/Towinly 2026-08-29 13.32.02.xcarchive`, created 2026-08-29 17:39:53 UTC |
| Signing | iPhone Distribution, team G6RRNXL9BV |
| Submission id | `01e3ae06-7d38-4518-96ca-6646b8a5c0b4`, delivered to App Store Connect 2026-08-29T17:40Z |

**How the commit was verified, not assumed.** The archive's `Info.plist`
carries the identity fields (bundle id, 1.1.0, build 25, creation time) but no
commit, and the build log kept from that session
(`eas-local-ios-25.log` in the 2026-08-29 session scratchpad) confirms the
buildNumber increment 24 to 25, the profile and the local build, but also
names no commit. So the commit was read out of the binary itself:

1. The archived `main.jsbundle` contains the string "Add parent", which
   entered the code in `fd84826`, the commit immediately before `56bc83e`.
2. It does not contain "Could not open the page. You can type", which entered
   in `a1a8c61`, six commits after `56bc83e`. That brackets the source between
   `fd84826` and `56bc83e`.
3. Every commit after `56bc83e` carries committer time 2026-08-29 15:12 EDT.
   The archive was written 13:39 EDT. Those commits did not exist when the
   build ran, so the tip at build time was `56bc83e`, committed 09:56 EDT.

`56bc83e` is also the tip `origin/main` carried when the same commit was
deployed to the phone web that day, which is why the store screenshots taken
from production show the same UI this binary ships.

**Owner action, one line, do it soon:** copy the `.xcarchive` above AND its
`dSYMs/Towinly.app.dSYM` somewhere permanent (an external disk or a cloud
folder). Xcode prunes old archives, and when this one goes, nothing ties the
binary Apple reviewed to a commit, and crash symbolication for build 25 goes
with it.
