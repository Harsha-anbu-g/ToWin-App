# Notes for anyone adding a test here

Three rules, each of them bought with a real defect. They are here because the
suite has been green while the product was broken, more than once.

## 1. An assertion that reads only the repo cannot tell a build artifact from a deployment

This is the expensive one.

The public account-deletion page shipped with twenty passing tests, a
rendered-content check driven through a real browser at a 320pt viewport, and a
screenshot. The page did not exist in production. Every one of those checks
compared the repo to itself: the route file was on disk, so the route file was on
disk. Meanwhile `towinly.com` serves an SPA catch-all that answers **HTTP 200 for
every path**, including paths that do not exist, so even a status-code check
passed.

If a test's subject is something a *deploy* makes true, the test cannot answer it.
Say so in the test rather than writing a local assertion that reads as if it did.

The observation itself lives in `scripts/verify-published-page.mjs`, which fetches
the page, finds the JavaScript bundle the shell loads and looks for the page's own
strings inside it. `npm run verify:published`. Its exit codes are deliberately
three: 0 published, 1 observed and not published, 2 could not observe. A caller
that treats 2 as success is doing the exact thing it exists to stop.

Related trap, found while writing it: a marker string has to be unique to the
thing you are checking. `"Delete your account"` looked like a fine marker and is
useless, because the profile screen's first confirmation says `"Delete your
account?"` and is in every bundle.

## 2. A guard whose passing condition is "found nothing" needs a positive control

A test that walks the filesystem and asserts zero hits passes identically when the
tree is clean, when the glob is wrong, when the parse failed and when the
directory does not exist. It is the same shape as a suite reporting green because
it collected no tests.

`no-em-dashes.test.js` is the pattern to copy: alongside the real assertion it
writes a probe file containing the banned pattern in a place that must be caught
and in a place that must be ignored, asserts **exactly one** hit, and deletes the
probe. That proves the scanner is looking, and looking in the right place.

## 3. Assert what renders, not what the file contains

`expect(source).toContain('Delete my account')` does not bite. A stale copy of
that string sat in a code comment in `app/(tabs)/profile.jsx`, so renaming every
button a person can see left the guard green. The mirror image is just as bad: an
`accessibilityLabel` can hold a string alive while the visible text drifts away
from it, or the other way round.

`profile-label-drift.test.js` renders the screen, opens the folded card, walks
both delete confirmations, and asserts each label against what is on screen,
checking the visible text **and** the accessibility label separately where both
exist. All five labels were proven to fail under mutation before the guard was
believed.

## And in general: mutate before you believe it

Every guard in this suite that matters was checked by breaking the thing it
guards and watching it fail. Writing the assertion and testing the assertion are
two different jobs, and the second one is where the first one gets found out. A
guard nobody has seen fail is a comment.

## Practical notes

- `render()` from `@testing-library/react-native` returns a **promise** in this
  setup. `const { getByRole } = render(...)` silently yields `undefined` for every
  query. Await it.
- Prefer one render per file over one per test. A suite that rendered per test
  took the run from 17s to 130s and timed out four unrelated files.
- Give every query client `gcTime: Infinity`. The default garbage-collection
  timer is scheduled at unmount and holds the Jest worker open.
