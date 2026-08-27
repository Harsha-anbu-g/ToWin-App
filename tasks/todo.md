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

All demo-pending (local only, nothing committed or pushed).
