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
