# Store screenshot capture: one script the later stories call

Written 2026-08-29 for APS-01, under the App Store readiness run. The three
capture stories (APS-01, APS-02, APS-03) all need the same eleven-line
Playwright preamble, the same login, the same Refresh hide and the same
measurement. Writing it three times in three scratchpad files is how the
2026-08-15 desktop-scale mistake happened: the recipe lived in a document,
not in code, so one of the three passes forgot it and produced three shots
that looked like a shrunken web page.

## The problem

`docs/store/screenshot-inventory.md` pins a recipe in prose: viewport
440 x 956 CSS, `deviceScaleFactor: 3`, `colorScheme: 'light'`, hide the
web-only "Refresh" link, measure with `sips` afterwards. Prose cannot be
run. Every capture so far has been an ad-hoc script in a scratchpad that
was thrown away, so nothing in the repo enforces the recipe and nothing
catches the one failure that a listing cannot recover from: a 1320-wide
viewport, which produces a file of exactly the right dimensions and
entirely the wrong picture.

## Chosen approach

One committed CLI, `scripts/capture-store-shots.mjs`, in the shape
`scripts/verify-published-page.mjs` already argues for: a single file, a
single job, plain flags, a header comment that says why, and exit codes
that keep "could not observe" separate from "failed".

It owns four things the prose used to own:

1. **The pinned frame.** Viewport, scale and colour scheme are constants in
   the file. There is no flag to change them. The mistake the rule exists to
   prevent cannot be made through the interface.
2. **The seat.** `--seat elder|helper|family` signs in through the real
   login form. Credentials come from the environment when set, and fall back
   to the documented demo seats, so the file carries no surprise.
3. **The Refresh hide.** The narrow hide from the inventory document: the
   element whose whole text is "Refresh", then only ancestors whose whole
   text is also "Refresh". The wide version blanked three captures once.
4. **The measurement.** After writing the file the script runs `sips` on it
   and refuses to report success unless the frame is 1320 x 2868, carries no
   alpha, and weighs at least the phone-scale floor. A capture that passes
   the eye and fails the tape measure exits non-zero.

Two modes, because APS-04 needs the tape measure without a browser:

- `--verify <file>` measures an existing PNG and exits. No browser starts.
- capture mode drives a route, runs an ordered step list, writes the file,
  then verifies it exactly as `--verify` would.

The step list is four primitives, chosen because the eight shots need
exactly these and nothing more: `--wait <text>` (proves the right screen
arrived), `--tap <text>` (dismiss an explainer, open a thread), `--page
<testid>@<n>` (the landing story is a paged deck; page 5 is the trust
ladder), and `--pause <ms>`. Flags keep their command-line order, so the
steps run in the order they were typed.

## Rejected: a table of the eight shots inside the script

Driving it as `--slot 5` with all eight shots described in one file reads
tidier and is worse. The shots do not share a shape: one needs a thread id
that changes with the seeded data, one needs a real check-in performed on
the live backend first, one needs an explainer dismissed. Encoding all of
that inside the script turns a 150-line tool into a branch tree, and it
puts the per-shot knowledge somewhere the story that owns the shot cannot
see. Route and seat in, picture out; the story keeps its own setup.

## Rejected: driving the browser through the chrome-devtools MCP

It captures fine and leaves nothing behind. The next person gets the prose
recipe again, which is the problem being fixed.

## Testing

The browser half cannot run under jest, so the test covers the half that
holds the rule: measurement and refusal.

- A real phone-scale capture already in the repo passes `--verify`.
- A real desktop-scale capture, kept in `screenshots/superseded/`, fails it.
  That file is 58,589 bytes at exactly 1320 x 2868, so it is the precise
  case where dimensions alone say yes and the picture says no.
- Missing flags exit 2 with a message naming the flag.

## Files

- `scripts/capture-store-shots.mjs` (new)
- `__tests__/capture-store-shots.test.js` (new)
- `docs/store/screenshot-inventory.md` (a dated note pointing the recipe at the script)
