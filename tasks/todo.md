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
