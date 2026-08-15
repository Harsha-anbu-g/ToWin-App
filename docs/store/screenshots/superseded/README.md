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
