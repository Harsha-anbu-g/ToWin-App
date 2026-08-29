# Store screenshots: what exists, what each one is for, what is still missing

Captured 2026-08-11 from the live phone web build at `https://www.towinly.com/app`,
signed in through the three demo seats on the login screen. No Xcode, no Android
SDK and no physical phone were needed, which matters because this machine has
Command Line Tools only.

Every raw capture is **1320 x 2868**, the iPhone 6.9 inch size Apple asks for.
Play rejects anything taller than 9:16 and these are 1:2.17, so the baked Play
versions are re-fitted to 1080 x 1920 rather than cropped by hand.

## Raw captures

| File | Screen | Seat |
|---|---|---|
| `raw-01-checkin-explainer.png` | Check-in, first-time explainer sheet open | elder |
| `raw-02-checkin.png` | Daily check-in, hero card and one big button | elder |
| `raw-03-elder-home.png` | Elder home: My Helpers, boxes, posted help | elder |
| `raw-04-trust-score.png` | Trust Score, elder split | elder |
| `raw-05-messages.png` | Messages list, Helpers / Groups / Family tabs | elder |
| `raw-06-family.png` | My Family, sharing and act-for-me controls | elder |
| `raw-07-posted-help.png` | Posted Help: looking, in progress, completed | elder |
| `raw-08-pass-on.png` | What I Pass On | elder |
| `raw-09-helper-home.png` | Helper home: My Elders, trust rungs | helper |
| `raw-10-helper-offer-help.png` | Offer Help, needs within 25 km | helper |
| `raw-11-family-guardian.png` | Family panel: Margaret's card, alerts | family |
| `raw-12-landing-welcome.png` | Landing story chapter 1 | signed out |
| `raw-13-landing-trust-ladder.png` | Landing story chapter 5, the seven rungs | signed out |
| `raw-14-helper-trust-score.png` | Trust Score, HELPER split: 7 + 5 + 3 | helper |
| `raw-15-chat-thread.png` | A chat thread with Ethan Cole, no phone number in frame | elder |
| `raw-16-family-parent-checked-in.png` | Family parent page, check-in chip GREEN | family |

## Baked, ready to upload

`scripts/bake_screenshots.py` renders both store sizes from the raw files. It
enforces the house rules rather than leaving them to the eye: parchment
`#f6f4ef` band, ink `#1a1a1a` type, Newsreader 400 only, no shadow, no sky blue
in the band, and it asserts on any em dash in a caption or sub-caption before
writing a file.

**All eight are baked**, into `final/ios/` and `final/play/`. The filename
carries the **upload slot**, not the raw capture number, because the stores
show roughly the first three shots in search results and a folder that sorted
by capture number would hand them over in the wrong order.

| Slot | File stem | Raw behind it | Caption |
|---|---|---|---|
| 1 | `01-landing-trust-ladder` | `raw-13` | Seven steps, climbed together. Slow is the point. |
| 2 | `02-posted-help` | `raw-07` | Ask for a ride, shopping, cleaning or company. |
| 3 | `03-helper-offer-help` | `raw-10` | See who needs a hand near you. |
| 4 | `04-helper-trust-score` | `raw-14` | Up to 15 points from each person you help. / 7 for the trust steps. 5 for their review. 3 for your profile. |
| 5 | `05-chat-thread` | `raw-15` | Chat safely inside the app. Phone numbers are shared only when you both agree. |
| 6 | `06-family-parent-checked-in` | `raw-16` | Your family can see you're safe. |
| 7 | `07-checkin` | `raw-02` | Check in once a day. If you link a family member, they are told when you go quiet. |
| 8 | `08-landing-welcome` | `raw-12` | It takes two To Win. |

The captions live in `screenshots/manifest.json`, which the bake script and
`__tests__/store-screenshots.test.js` both read, so there is one home for the
words rather than two that can drift.

**The whole screen is fitted, never cropped.** An earlier version of the script
scaled each capture to the full canvas width and cut whatever overflowed the
bottom. That removed the tab bar from every shot, and it would have removed the
messages and the composer from the chat shot, whose content sits at the bottom
of the screen. Fitting the whole screen inside the parchment costs some width
and keeps all eight truthful and consistent.

## 5. Machine verification of the sixteen baked files

Read with `sips`, on 2026-08-15, after the final bake. Not eyeballed.

```
$ cd App/docs/store/screenshots/final
$ for f in ios/*.png play/*.png; do
    sips -g pixelWidth -g pixelHeight -g hasAlpha -g space "$f"; stat -f%z "$f"; done
```

| File | Size | hasAlpha | Space | Bytes |
|---|---|---|---|---|
| `ios/01-landing-trust-ladder-ios.png` | 1320 x 2868 | no | RGB | 451,174 |
| `ios/02-posted-help-ios.png` | 1320 x 2868 | no | RGB | 397,350 |
| `ios/03-helper-offer-help-ios.png` | 1320 x 2868 | no | RGB | 527,945 |
| `ios/04-helper-trust-score-ios.png` | 1320 x 2868 | no | RGB | 451,892 |
| `ios/05-chat-thread-ios.png` | 1320 x 2868 | no | RGB | 267,448 |
| `ios/06-family-parent-checked-in-ios.png` | 1320 x 2868 | no | RGB | 584,903 |
| `ios/07-checkin-ios.png` | 1320 x 2868 | no | RGB | 274,187 |
| `ios/08-landing-welcome-ios.png` | 1320 x 2868 | no | RGB | 246,553 |
| `play/01-landing-trust-ladder-play.png` | 1080 x 1920 | no | RGB | 273,268 |
| `play/02-posted-help-play.png` | 1080 x 1920 | no | RGB | 246,129 |
| `play/03-helper-offer-help-play.png` | 1080 x 1920 | no | RGB | 321,936 |
| `play/04-helper-trust-score-play.png` | 1080 x 1920 | no | RGB | 272,507 |
| `play/05-chat-thread-play.png` | 1080 x 1920 | no | RGB | 167,359 |
| `play/06-family-parent-checked-in-play.png` | 1080 x 1920 | no | RGB | 355,525 |
| `play/07-checkin-play.png` | 1080 x 1920 | no | RGB | 170,478 |
| `play/08-landing-welcome-play.png` | 1080 x 1920 | no | RGB | 151,721 |

Byte counts shift slightly on a re-bake because PNG compression is not
deterministic across Pillow versions. The dimensions, the alpha answer and the
colour space do not.

### What each store actually checks, quoted

- Apple, screenshot specifications: 1320 x 2868 portrait is one of the three
  accepted iPhone 6.9 inch sizes, and "Images can't include alpha channels or
  transparencies". Apple publishes no per-file byte cap for screenshots.
- Play, phone screenshot requirements: "JPEG or 24-bit PNG (no alpha)",
  "Minimum dimension: 320px", "Maximum dimension: 3840px", and "The maximum
  dimension of your screenshot can't be more than twice as long as the minimum
  dimension". The only 8 MB figure on that page belongs to Android XR
  screenshots, not phone ones, so no phone byte cap is claimed here.

The iOS renders are 1 to 2.172 and **would be refused by Play**. That is the
whole reason a second, squarer set exists. `store-screenshots.test.js` asserts
both facts so the two sets can never quietly converge.

### Em dash sweep

```
$ grep -c "—" App/docs/store/screenshots/manifest.json
0
```

## 6. Whether an upload could still fail

Everything a machine can check before an account exists has been checked:
dimensions, alpha, colour space, byte floor, the aspect rule each store
enforces, the caption text and the em dash. What cannot be checked here is
whether App Review reads a screenshot as a claim the build does not support.
Section 1 of this file records what each shot proves, one row per shot, so that
argument can be made from the file rather than from memory.

## The last three, captured 2026-08-15

The three planned captions that had no shot behind them now have one. Captured
from the live phone web build at `https://www.towinly.com/app`, driven by
Playwright 1.62.1 in Chromium at a 1320 x 2868 viewport, `deviceScaleFactor: 1`,
`colorScheme: 'light'`, signed in through the real demo seats. Every file was
measured with `sips` after capture, not eyeballed.

| File | Size | Alpha | Bytes | What proves the caption |
|---|---|---|---|---|
| `raw-14-helper-trust-score.png` | 1320 x 2868 | no | 319,857 | The HELPER seat. The page reads "up to 15 points: 7 for growing trust together, 5 from their review, and 3 for your profile", and Grace Liu's row shows Trust stages 7/7, Their review 5/5, Your profile 3/3. This is the split caption 4 claims, and it is not the elder's 7 + 5 + 2 + 1 |
| `raw-15-chat-thread.png` | 1320 x 2868 | no | 131,624 | A thread at `/chat/34ea7adc-...`, not the conversation list. Three real seeded messages between Margaret and Ethan Cole. A regex sweep of every visible string in the frame for phone-like digit runs returned none |
| `raw-16-family-parent-checked-in.png` | 1320 x 2868 | no | 266,767 | `app/family/parent/[elderId].jsx` at `/family/parent/f5b309df-...`, with the chip reading "Checked in today" in the achieved green. Measured, not assumed: 3,847 pixels within tolerance 25 of `greenDeep` `#1a5c2e` sit in the chip band, bounded to x 104 to 501, y 484 to 522 |

### Re-captured at phone scale on 2026-08-15, under APL-805

The first pass at these three used a Playwright viewport of `1320 x 2868` at
`deviceScaleFactor: 1`. The file size was right and every mechanical check
passed, which is why it survived a `sips` pass, but 1320 CSS pixels of width
makes the app render as a **desktop-width page**: a narrow centred column, type
at a third of its phone size, and most of the frame empty. Raws 01 to 13 were
shot at `440 x 956` CSS with `deviceScaleFactor: 3`, which lands on the same
`1320 x 2868` file and looks like an iPhone.

Three shots that look like a shrunken web page next to five that look like a
phone is the tell a listing cannot recover from, so all three were re-shot at
`440 x 956` at scale 3. File size was the first signal: the phone-scale
captures are 141 KB to 303 KB against the earlier 59 KB to 108 KB, because
there is three times as much ink on the page.

The earlier files are kept, renamed, in `screenshots/superseded/` with their
own README. Nothing was deleted.

**Rule for any future capture: viewport `440 x 956`, `deviceScaleFactor: 3`,
`colorScheme: 'light'`.** Never a 1320-wide viewport, whatever the output file
measures.

**Since 2026-08-29 the rule is code, not prose.** It lives in
`scripts/capture-store-shots.mjs`, where the three numbers are constants and
there is no flag that changes them. Read the section "The capture script" at
the end of this file before shooting anything.

**The family shot needed a real state change first.** The seeded data said "No
check-in yet today", which argued against the caption. So the elder seat did an
actual check-in on the live backend before the family shot was taken: sign in as
`elder`, open `/checkin`, dismiss the first-time explainer, tap "I'm here
today". The streak moved from 7 days to 8 and the week row filled, and the
family view then read "Checked in today". The state is true because it was made
true, not because a caption says so.

### One deliberate change to the page before each shot, recorded in full

The word **"Refresh"** was hidden before every capture. It is not part of the
app being sold.

`src/components/ui/RefreshControl.jsx` line 25 branches on
`Platform.OS === 'web'`. The browser gets a visible `TextLink` reading
"Refresh"; iOS and Android get the real `RefreshControl`, which shows nothing
until it is pulled. A store screenshot taken from the web build therefore
carries a control that an iPhone buyer will never find in the app they
downloaded. Hiding it makes the shot more faithful to the product, not less.

The hide is narrow on purpose: the element whose text is exactly "Refresh" is
hidden, then only those ancestors whose entire text content is also just
"Refresh". The first attempt walked three levels up instead and hid the whole
scroll container, which produced three blank 17KB captures. They were replaced.
File size is the tell: a real capture of these screens is 58KB to 108KB.

**This applies to the older captures too.** `raw-05-messages.png` and the other
raws that came from screens with pull-to-refresh were taken on 2026-08-11, from
a build before this control existed on those screens. Any re-capture of them
must hide it the same way.

## Before uploading, re-check

Raws 01 to 13 came from the build that was live on 2026-08-11, commit
`af22521`. Raws 14 to 16 came from the build live on 2026-08-15. Sixteen raws in
total, and none of them contains Edit Profile. The eight the manifest bakes from
were replaced on 2026-08-22 from `ralph/store-hardening`.

**The eight the manifest uses were RE-CAPTURED on 2026-08-22 (HARD-117.)**
They had gone stale twice over: the owner's normal-density redesign of
2026-08-17 (`e1e56bf`) removed the elder oversizing, changed the type ramp and
moved the cards to white, and the location run changed four more screens after
that. Every capture predated both.

The eight now on disk came from this branch, through the pinned recipe, against
the production backend and the three real demo seats. The other eight raws
(01, 03, 04, 05, 06, 08, 09, 11) are NOT re-captured: nothing bakes from them,
they are reference material, and they still show the old UI. Treat them as
historical until something needs them.

Nothing was deleted. The eight previous raws and all sixteen previous baked
files moved to `screenshots/superseded/2026-08-11-pre-normal-density/`.

(The paragraph this replaced ended "None of the 13 shots contain Edit Profile,
so all 13 remain accurate." It was written when there were thirteen, and it
stayed after the count reached sixteen and after the UI changed under all of
them.)


## The capture script, added 2026-08-29 (APS-01)

Every capture pass until now wrote its own throwaway driver from the prose
above. That is how the desktop-scale mistake happened: the recipe was a
sentence, and a sentence cannot be run. It is now
`scripts/capture-store-shots.mjs`.

```
node scripts/capture-store-shots.mjs --route <path> --out <file.png> \
     [--seat elder|helper|family] [--wait "text"] [--tap "text"] \
     [--page <testid>@<n>] [--pause <ms>]

node scripts/capture-store-shots.mjs --verify <file.png>
```

What it owns, so no pass can forget it:

- The frame. `440 x 956` CSS at scale 3, light. Constants, no flag. Passing
  `--viewport` exits 2 and says why.
- The seat. It signs in through the real login form. Passwords come from the
  environment when set and fall back to the documented demo seats.
- The Refresh hide, in the narrow form this file describes: the element whose
  whole text is "Refresh", then only ancestors whose whole text is also
  "Refresh".
- The tape measure. After writing a file it runs `sips` on it and refuses to
  report success unless the frame is 1320 x 2868, alpha is no, and the file
  weighs at least 120,000 bytes.

The weight floor is measured, not guessed. Every desktop-scale file kept in
`screenshots/superseded/` weighs 58,589 to 107,542 bytes. Every phone-scale raw
on disk weighs 131,624 to 460,063. The floor sits in the gap. That single
number is what separates a picture of a phone from a picture of a desktop page
when both files measure 1320 x 2868.

`--verify` runs the same tape measure with no browser, which is how the bake
step checks a set it did not shoot. `__tests__/capture-store-shots.test.js`
holds it to that, using the real 58,589-byte desktop-scale file as the case
that must fail.

Exit codes are three, not two: 0 holds, 1 does not hold, 2 could not observe.
A caller that reads 2 as success is doing the thing the script exists to stop.

### What the 2026-08-29 re-capture of the two landing shots found

The two signed-out shots, `raw-12-landing-welcome.png` and
`raw-13-landing-trust-ladder.png`, were re-shot from
`https://www.towinly.com/app` through the script above. **Both came back
byte-identical to the files committed on 2026-08-22.**

```
raw-12-landing-welcome.png       md5 bca29bfeb85fe0f645fefb67b51fcdf4   139,437 bytes
raw-13-landing-trust-ladder.png  md5 b602bf45f173e1c6d4cff09b6c993a35   260,309 bytes
```

Both md5s match `git show HEAD:<path>`, and `git status` reports the two paths
clean after the fresh files were written over them.

That is a result, not a skipped step. The four UI changes since 2026-08-22
were the floating tab-bar capsule, the deleted subtitle lines under the tab
headings, the regrammared Posted Help chips and the shield on the Profile
trust row. All four live behind the sign-in. These two frames are the landing
story, which has no tab bar and no tab heading, so none of the four could
reach them. Nothing was moved to `superseded/`, because nothing was replaced.

The deployment was checked before drawing that conclusion, so that "identical"
could not mean "stale deploy":

```
$ node scripts/verify-published-page.mjs https://www.towinly.com/app --expect "Add parent"
  bundle    : entry-1ff4769d21ed117712ea4159c1e2e7e0.js (3303KB)
  present: "Add parent"
PUBLISHED.
```

`Add parent` entered the codebase in `fd84826` on 2026-08-29, the commit before
the tip, so the bundle serving these captures is the shipped UI.
