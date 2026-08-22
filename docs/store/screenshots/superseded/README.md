# Superseded captures, kept for the record

These three were captured on 2026-08-15 with a Playwright viewport of
`1320 x 2868` at `deviceScaleFactor: 1`. That is 1320 CSS pixels wide, which
makes the app render as a desktop-width page: a narrow centred column, small
type, and most of the frame empty. The files are the right pixel size and pass
every mechanical check, which is why the mistake survived a `sips` pass.

Raws 01 to 13 were captured the other way, `440 x 956` CSS at
`deviceScaleFactor: 3`. That lands on the same `1320 x 2868` file and looks
like an iPhone. Mixing the two in one listing is the tell.

They were re-captured at phone scale on 2026-08-15 under APL-805 and the new
files carry the original names in the parent folder. Nothing here is deleted;
these stay as the evidence of what changed and why.

| File | Bytes | Why it was replaced |
|---|---|---|
| `raw-14-helper-trust-score-desktop-scale.png` | 97,003 | Desktop-width render |
| `raw-15-chat-thread-desktop-scale.png` | 58,589 | Desktop-width render |
| `raw-16-family-parent-checked-in-desktop-scale.png` | 107,542 | Desktop-width render |

File size was the first tell: a phone-scale capture of these screens runs
141 KB to 303 KB, roughly three times these.

---

## 2026-08-11 set, superseded on 2026-08-22 (HARD-117)

`2026-08-11-pre-normal-density/` holds the eight raws the store manifest bakes
from, plus all sixteen baked files (eight iOS, eight Play), as they stood before
this date.

Why they were replaced: every one of them shows the UI as it was before the
owner's normal-density redesign of 2026-08-17 (`e1e56bf`), which removed the
elder oversizing, changed the type ramp and moved the cards from parchment to
white. Four of the eight screens changed again in the location run that followed.
A store screenshot that does not match the app is a Guideline 2.3 accurate
metadata problem, and it is the first thing a reviewer sees.

The replacements came from `ralph/store-hardening` through the pinned recipe in
`screenshot-inventory.md`: viewport 440 x 956, deviceScaleFactor 3, colorScheme
light, the web Refresh control hidden, against the production backend and the
three real demo seats.

Nothing here is deleted. These files are the record of what the listing would
have shown.
