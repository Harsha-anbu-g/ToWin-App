# Queue — 2026-10-19

1. [x] Towinly MCP server (owner: "do it now"; everything a person can do;
       this Mac only). Built, 36 tests, merged to main locally 2026-10-19; push waits on owner. Superpowers flow: brainstorm → spec → plan → TDD build.
       Spec: docs/superpowers/specs/2026-10-19-mcp-server-design.md
2. [x] Use superpowers + the skills the job needs (brainstorming, writing-plans,
       test-driven-development, mcp-builder, ecc:mcp-server-patterns, context7).
3. [x] Skill check: live-catalog scan shown to the owner before the build.
4. [x] Use all skills that apply (owner, mid-build): trust-and-safety and
       privacy-two-markets on the spec; security + code review, humanizer then
       stop-slop on the README, verification-before-completion at the end.

# Queue — 2026-08-26

1. [x] Messages badges: segment badges count PEOPLE waiting, not messages
       (owner call 2026-08-26: Helpers 4, not 7; WhatsApp grammar; top badges
       now add up to the Messages tab badge, which already counted people).
2. [x] My Helpers page: Trust is a button like Friends / Updates (shield icon,
       score + "trust" caption), no longer a gold pill that read as a badge.
3. [x] Updates: the list stays; only the bell badge clears on open. Retires the
       2026-08-22 new-only rule.
4. [x] My Helpers rows: name only, WhatsApp-style. Touch the name → trust
       ladder + family arrow together; touch the photo → profile.
5. [x] My Helpers rows: ONE tap opens the family section too (switch + group
       chip); the inner Family arrow is gone ("no double clicking").
6. [x] Posted Help: each request shows just its title; one tap opens every
       detail (meta, helpers with Accept, Remove / Mark completed). The inner
       View/Hide toggle is gone.
7. [x] Posted Help: an offer shows like a notification — badge on the Waiting
       segment (helpers waiting, stays until the elder answers) and on the
       folded request title.
8. [x] Posted Help: the segments show how many requests each holds (reverses
       the 2026-08-22 "remove the numbers" call).
9. [x] Posted Help: requests are hairline rows like My Helpers, not bordered
       boxes ("should not show like a tab"); reverses the 2026-07-26 card call.
10. [x] My Helpers: an open row says WHY the ladder exists (Friends, or
        "Helping with “<request>”") and since when (src/lib/trustOrigin.js).
11. [ ] "and remove it f" — arrived cut off; waiting to hear what "it" is.
12. [x] Posted Help, In Progress: folded rows carry "<helper> · Building trust
        / Trusted friend"; the opened helper row names the stage.
13. [x] Helper side, "do the same": My Elders rows (name-only, one tap opens
        ladder + reason + family), My Jobs rebuilt like Posted Help (counts,
        title rows, "<elder> · Building trust"), shared src/lib/trustStanding.js.
14. [x] Bottom bar: side inset 12 → 20 (src/lib/tabBarMetrics.js) so the
        capsule floats clear of the edges like WhatsApp.
15. [x] Family: LinkRow is a hairline row everywhere; linked parents / members
        fold to the name (one touch opens relationship, status, actions);
        requests never fold. Helper landing = My Elders, done in 13.
16. [x] Shipped 2026-08-27 ("push all to live"): 93a015c + 92202eb on
        origin/main and ralph/store-hardening; Vercel prod towinly-e7l3tqvem
        (bundle-verified); TestFlight build 17 delivered (submission finished
        04:19 UTC). August iOS quota now 15/15 — no cloud iOS build until Sept 1.
17. [x] Sign-up split in two pages (owner call 2026-08-28): register.jsx asks
        "Who are you joining as?" (three hairline rows, one touch opens the
        form); create-account.jsx is the form, reads the role from the route,
        names it back ("You're joining as an elder." + Change). registerAccount
        lives in src/api/auth.js (Rule 6).
18. [x] Create account form: no helper line under Username, Email, Date of
        birth, Password ("remove those descriptions"). May be what item 11
        was cut off from.
19. [x] Bottom bar must float clear of the phone's left/right edges, smaller,
        like WhatsApp (owner 2026-08-28). Cause: the capsule was iOS-only, and
        with the iOS quota gone the owner reviews on phone-web, which had the
        edge-to-edge bar; isFloatingTabBar is now every platform but Android.
20. [x] Posted Help: no scrollbar on the right while scrolling (owner 2026-08-28).
21. [x] Updates: the unseen wash must touch both edges of the phone (it read as
        "half of the tab"), and it clears only when THAT update is tapped, not
        when the Updates screen opens (owner 2026-08-28).
22. [x] Profile: "Log out" is the last row, below "Account and data"
        (owner 2026-08-28).
23. [x] Messages: when there is no one to message, say so and offer BOTH
        buttons, post a new help and find friends (owner 2026-08-28).
24. [x] My Helpers (and My Elders): the same empty state with both buttons
        when no one is there (owner 2026-08-28, "same for my helper").
25. [x] Centre button: "Need Help" → "Ask Help" (owner 2026-08-28: "need help
        is in general"; "Post Help" rejected as confusing next to Posted Help;
        "Add Help" lasted an hour, final call "Ask Help").
26. [x] Bottom bar: Posted Help shows a notification badge (owner 2026-08-28).
27. [x] Search field at the top of Messages, Posted Help and My Helpers (and My
        Elders for parity), like WhatsApp (owner 2026-08-28).
28. [x] Posted Help: a request posted BY a family member shows for the elder,
        for helpers, and for the family (owner 2026-08-28). The backend already
        files it under the elder (so it was on all three lists); what the app
        lacked was the website's "Asked by Sarah, for you / for Margaret" line
        on the elder's and helper's cards. Added; the family view had it.

Items 17-28: built, tests green, local-only, demo pending. The two red suites
in the full run (offline-gate, location-freshness) belong to the sibling
session's uncommitted useIsOffline.js, not to this queue.

Item 11 ("and remove it f") still needs the owner to say what "it" is
(item 18 may be it).

## Evening 2026-08-28 (owner, 22:21 onward) — helper + family follow the elder
29. [x] Parity sweep, elder as the base, for the family and helper seats
        (owner: "do the same edit keep elder as base and do the same for all
        other log in like family and helper"; asked which surface: "all").
        Verified on the live phone-web build first: the bottom bar is already
        identical on all three seats; sign-up/login has no per-role branch;
        Profile differs only by each seat's own places. The real gap is the
        family hub: My Parents gets the elder hub's skeleton (22pt heading,
        search field, two segments, add-parent in the nav row's left slot).
30. [x] Helper: when the elder starts a trust step, the My Elders tab badge
        counts elders waiting for the helper's accept, and the elder's name
        row wears the same badge (owner: "the helper should get notification
        in my elders tab bottom badge so they can accept and also the badge
        in the elder's name").
31. [x] Helper: "Accept the next step" is a filled blue button (owner:
        "accept the next step should be in blue background").
32. [x] Elder: when the helper accepts a trust step, the My Helpers tab badge
        and a badge by that helper's name tell the elder (owner: "same in
        elders when helper accept the help, it should show a badge in my
        helper and the badge near the name of the helper in elder login").
33. [x] Elder: "Start the next step" is a filled blue button too (owner:
        "start the next step also in blue in elders log in").
34. [x] Subtitles: "Trust grows step by step, like roots" (My Helpers, My
        Elders), "Your requests, from posted to completed" (Posted Help), "The
        people you're watching over" (My Parents): already removed in this tree
        this afternoon for every seat; the owner still sees them because that
        edit has not shipped (owner 2026-08-28 evening, twice).

Items 29-34: built, 1369 tests green with --forceExit, eslint clean on touched
files, family hub verified on the local web build; local-only, demo pending.

# Queue — 2026-08-28 evening ("do all, use superpowers")
Plan: docs/superpowers/plans/2026-08-28-left-behind.md. Owner-only items stay with the owner.

29. [x] Commit the afternoon change set (shield trust row, one number per chip, no heading lines). 1369 tests green.
30. [x] Website repo: ignore the offline API docs, commit family.md.
31. [x] Backend: inactivity cron enum-literal fix (DB test RED → GREEN).
32. [x] Backend: server-side blocks (HARD-106): table, /api/blocks, filters in connections / discovery / needs / messaging.
33. [x] App: blocks hydrate from the server; device list uploaded once; copy stops saying "this phone only".
34. [x] Marketing: commit the founder-story reel (plain + voiced).
35. [x] MKT-707 README rewrite, counts derived from the folders.
36. [x] MKT-706 alt text: reel cover frames + any still gaps.
37. [x] MKT-705 FOUNDER-NOTE-OPTIONS.md (waits on the owner; artwork untouched).
38. [x] MKT-703 machine contrast check on every rendered PNG; fix, re-render, sync.
39. [x] MKT-708 frame audit of every scheduled reel; POST-IN-ORDER byte-compared.
40. [x] MKT-704 designer's-eye pass over the whole set.
41. [x] App: swipe between segments on My Family.
42. [x] App: close the react-review record (DEEP-04/17/18/19, focus refresh).
43. [x] App: SHIP-608 third sweep on the current tip.
44. [x] Observation-log review (188 open, never reviewed).
45. [x] Memory + recap; push list for the owner.

Items 29-45 done 2026-08-28 evening. Owner-only leftovers (unchanged): item 11 ("and remove it f"),
store paperwork in docs/store/owner-actions.md, Google Play account, MCP tokens, phone testing
of build 21. Pushes wait for the owner: App (7fcd0e0..ee5e8ba on ralph/store-hardening),
website/backend (50757b3..3dc6f79 on main; push = live deploy, do it BEFORE the next app
build so the block dialog's "every phone" sentence is true), marketing (own repo, no remote).
Sibling session had uncommitted edits in the App tree at the end (family-home.test.js,
home-hierarchy.test.js, app/(tabs)/_layout.jsx); not mine, not touched.
35. [x] Elder's badge stays "until I accept" (owner 2026-08-28, 23:xx): it now
        holds through opening the row and clears only when the elder presses
        "Start the next step" with that helper (at step 7, where nothing is
        left to start, it clears on open). Same session: a demo reset recreated
        every connection and badged every row, so the seen store now treats a
        ladder new to this phone as already seen (seedNewIds / knownOnly);
        only a level change on a known ladder is news. 1384 tests green.

## 2026-09-03 — deep-search execution queue ("do all", ultracode)
46. [x] Backend: done 2026-09-04 on security-r23-merge (16 commits, 990 tests green): rounds 2/3
        reconciled, 3 verify HIGHs fixed (username 400 restored pre-email, doubled-pair reads,
        FAMILY-row phone/review gates), SEC-07 box paging + cache key, CI triggers. PUSH PENDING.
47. [x] App: landed 2026-09-04, merge ec2d541 in the app-land worktree; README kept main's newer
        rewrite (branch never touched it); 1444 tests green.
48. [x] App: all four ports landed + verified + repaired 2026-09-04 (14 feature commits, 4 merges,
        6 repair commits incl. 3-contact cap + blank-state fix; 1495 tests green in worktree).
        SOS stays hidden (owner call pending). MERGE TO SHARED CHECKOUT + PUSH PENDING.
49. [x] App: Rule 6 extraction done 2026-09-04 — 120 inline calls to ZERO, 19 modules /
        108 named JSDoc'd functions, 88 commits, behavior-preservation review found nothing,
        1624 tests green. Local main = 5e4b328 (115 ahead of origin). PUSH PENDING.
50. [x] Docs: audit md addendum + prd-security-backend.json status notes committed (5e4b328).
51. [ ] ASO: intent-phrase store listing rebuild (docs only, claims-verified, humanizer+stop-slop).
        Recommend a fresh session with App:app-store-launch + the claims ledger; not rushed here.
52. [ ] Owner-only (listed, not doable by agent): push approvals for website security-r23-merge
        and App main (115 commits), marketing 127-slot review, Play registration, ASC console
        items, SOS decision, todo item 11's missing words.
53. [ ] Backlog from the extraction review (all small): move friendlyWriteError/friendlyAuthError
        prose helpers from src/api/client.js to src/lib; reportUser takes a named-fields object
        + validation; move discover* out of connections.js and geocodePlace out of profile.js.
54. [ ] Phone web looks like iOS (owner call 2026-09-04): pull-to-refresh, clear glass lens,
        sized switches, glass Ask AI pill + card sheet, shell CSS — built local-only, 1635
        tests green. Next: owner checks on the phone (LAN recipe in memory), then commit and
        `npx vercel deploy --prod --archive=tgz` from App/ after "push".

# Queue — 2026-09-25 (owner messages, in the order given)

55. [x] Check-in: "Take me home" pinned to the bottom of the screen (Screen `footer` prop,
        app/checkin.jsx). 37 tests green across 5 suites. Awaiting owner review; not committed.
56. [x] Home: tapping a helper's / elder's name opens a person page (app/connection/[connectionId]),
        not a dropdown. Family seat rows go to the existing /family/parent/:id. Plan approved:
        ~/.claude/plans/dazzling-orbiting-wind.md. Elder's own My Family screen left alone.
57. [x] Tab bar: remove the sliding glass bubble (lens) only; keep the frosted capsule. Do NOT delete
        tabLensGeometry.js or its test without owner OK (they become unused).
        Items 55-57 done 2026-09-25: full jest 200 suites / 1655 tests green, lint 0 errors.
        Uncommitted, unpushed, not yet seen on a device. tabLensGeometry.js + its test are now
        unused: delete only with owner OK.
58. [x] 2026-09-25 owner said yes to both follow-ups: deleted src/lib/tabLensGeometry.js and
        __tests__/tab-lens-geometry.test.js (explicit OK); My Family member rows now open
        app/family/member/[linkId].jsx (Message / Make main contact / Remove moved there via
        src/lib/useFamilyMemberActions.js). LinkRow's dead `collapsible` branch removed.

# Queue — 2026-10-19 AI roadmap (owner: "do it all in order")

Spec: docs/superpowers/specs/2026-10-19-ai-roadmap-design.md. Backend work on
branch ai/ask-ai-roadmap in a worktree of ~/Documents/Projects/ToWin. No push.

1. [x] Step 1: token accounting from Groq usage + daily token cap. Done 2026-10-19:
       5 commits on ai/ask-ai-roadmap (c4217d2 usage, 1b59344 token ceiling, d5dfa9d
       AssistantSpend, Task 4 service booking, config). Backend suite 1064 green, 74 DB skips.
2. [x] Step 2: eval set for Ask AI (evals.json, gated live runner, file test). Done
       2026-10-19: f183394 scorer, fb5a27f 36 cases, live runner commit; dry run with an
       invalid key prints a full FAIL scorecard. Backend suite 1082 green, 75 skips.
       OWNER: run TOWINLY_AI_EVALS=true GROQ_API_KEY=... ./mvnw -Dtest=AssistantEvalsTest test
3. [x] Step 3: read-only tools for Ask AI (connections, help requests, family). Done
       2026-10-19: 51bc5b3 Groq tools, 0be70fd AssistantTools, service round commit, 2 eval
       cases. Targeted 101 green (1 skipped), full suite green. Live tool use is checked
       only by the owner's eval run.
4. [x] Step 4: MCP server. Built by another session on feat/mcp-server in
       .worktrees/App-mcp-server: 11 commits to dc8e1e3 (catalog, bundle, session, tools,
       stdio entry, README), worktree clean at 20:59. Not touched by this session; the
       branch is unmerged and unpushed. Owner reviews and merges it.
5. [x] Step 5: RAG over the user guide on pgvector. Done 2026-10-19: gate passed (Railway
       Postgres 18.6, pgvector 0.8.6 available); 201 guide chunks (fcb46f3), V62 migration,
       EmbeddingClient, GuideChunkStore, GuideIndexer, GuideRetriever, prompt block; app
       consent + fr/ta + privacy labels (d4773a1); website policy. Backend suite 1124 green,
       76 skips. OWNER: set EMBEDDINGS_API_KEY on Railway (OpenAI key); run the gated
       GuideChunkStoreDbTest once on a local Postgres with pgvector; review consent copy.
6. [x] Step 6: semantic matching in discovery. Done 2026-10-19: EmbeddingText, V63 tables,
       EmbeddingStore (gated pgvector test), EmbeddingIndex (refresh on hash change, lift =
       distance - 5 km x similarity), EmbeddingBackfill (500/boot), wired into discovery,
       browse and profile/request saves (ebcfa2e). Targeted 129 green, full suite green.
