# Google Play: upload these eight, in filename order

This folder is the canonical Play set. There is no second copy anywhere in the
repo, so there is nothing to reconcile before an upload.

Upload all eight to the **Phone** screenshot slot in Play Console, in filename
order: `01` first, because the store shows roughly the first three in search
results. Play needs two at a minimum; eight is the maximum it accepts. No
tablet set is owed for v1.

`1080 x 1920`, 24-bit PNG, no alpha, 9:16. Play refuses any image whose long
side is more than twice its short side, which is why this set exists separately
from the taller iOS one in the sibling folder.

Regenerate with `python3 scripts/bake_screenshots.py` from `App/`. Captions
live in `../../manifest.json`; `__tests__/store-screenshots.test.js` fails if a
file goes missing, changes size, picks up an alpha channel, or drifts from the
pinned captions.
