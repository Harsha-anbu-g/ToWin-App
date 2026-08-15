# App Store: upload these eight, in filename order

This folder is the canonical iOS set. There is no second copy anywhere in the
repo, so there is nothing to reconcile before an upload.

Upload all eight to the **iPhone 6.9 inch** slot in App Store Connect, in
filename order: `01` first, because the store shows roughly the first three in
search results. No iPad set is owed while `app.json` keeps
`ios.supportsTablet: false`.

`1320 x 2868`, 24-bit PNG, no alpha. Never upload these to Play: at 1 to 2.17
they break Play's rule that the long side may be at most twice the short side.
The Play set is the sibling folder.

Regenerate with `python3 scripts/bake_screenshots.py` from `App/`. Captions
live in `../../manifest.json`; `__tests__/store-screenshots.test.js` fails if a
file goes missing, changes size, picks up an alpha channel, or drifts from the
pinned captions.
