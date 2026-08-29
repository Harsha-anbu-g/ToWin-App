# Store screenshots: what exists, what each one is for, what is still missing

**Captured 2026-08-29** from the live phone web build at
`https://www.towinly.com/app`, signed in through the three demo seats on the
login screen. No Xcode, no Android SDK and no physical phone were needed, which
matters because this machine has Command Line Tools only.

Earlier capture dates, kept so a reader can see the order things happened in:
~~Captured 2026-08-11~~ (raws 01 to 13), ~~2026-08-15~~ (raws 14 to 16, and the
phone-scale re-shoot under APL-805), ~~2026-08-22~~ (the eight the manifest
bakes from, HARD-117).

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

**~~The eight the manifest uses were RE-CAPTURED on 2026-08-22 (HARD-117.)~~**
**Superseded 2026-08-29: the eight were re-captured again under APS-01 to APS-03,
and the sixteen baked files re-made from them under APS-04. See the 2026-08-29
sections below. The 2026-08-22 account is kept for the record.**
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


### The three elder-seat shots, re-captured 2026-08-29 (APS-02)

Taken through `scripts/capture-store-shots.mjs` against
`https://www.towinly.com/app`, elder seat, live backend. The old files are in
`superseded/2026-08-29-pre-appstore-recapture/`. Nothing was deleted.

| File | Frame | Alpha | Bytes | What the frame proves |
|---|---|---|---|---|
| `raw-07-posted-help.png` | 1320 x 2868 | no | 145,946 | Three real seeded requests as plain rows, one of them "Asked by Sarah, for you", the search field above them, the chips reading Waiting 3, In Progress 1, Completed 2. The floating tab-bar capsule is in frame with its blue count badges, and the heading carries no subtitle line. |
| `raw-02-checkin.png` | 1320 x 2868 | no | 159,743 | The check-in screen with the day already done: "Checked in for today", "Sarah, David and one other can see you checked in", 7 days in a row and the week row. The first-time explainer is dismissed with a tap on "Got it" before the shot, which is what slot 1 (`raw-01`) exists to show instead. |
| `raw-15-chat-thread.png` | 1320 x 2868 | no | 131,439 | A thread at `/chat/7cb397c3-1517-4d12-a637-8187bc158c9b`, printed by the script from the address bar after the steps ran, so it cannot be the conversation list by mistake. Three seeded messages with Ethan Cole, the composer at the foot. |

**Reach the thread by tapping the row, never by its id.** The capture ran
`--route /messages --wait "Ethan Cole" --tap "Ethan Cole"`. The demo data is
reseeded, so the thread id moves: the same conversation was
`4089dde0-6bdc-4d81-ad39-41bfdaea19c0` earlier the same afternoon and
`7cb397c3-...` an hour later. A recipe that pins the id captures a 404 the
first time the seeder runs.

**The phone number sweep, run rather than asserted.** The script's
`--dump-text` writes every string visible inside the frame, filtered to leaf
elements inside `<body>` with a non-zero box intersecting the viewport, so it
reports what a person can read and nothing else. Nine strings came back:

```
EC / Ethan Cole / Saturday it is. I'll bring my board, you bring your best opening. /
3:33 PM / How lovely! Saturday at the community centre? It's nice and busy in the
afternoons. / 3:24 PM . Sent / Today / Hello Margaret! Shall we plan that first game
of chess? / 3:15 PM

$ grep -nE '[0-9][0-9 ().+-]{6,}[0-9]|[0-9]{4,}' chat-frame.txt
(no matches, exit 1)
```

The only digits in the frame are clock times of the form `3:15 PM`, which the
pattern does not reach and no reader mistakes for a telephone number.

### Hiding the Refresh control has to take its box with it

The web build draws a "Refresh" button where the phone has the pull gesture:
`src/components/ui/RefreshControl.jsx` renders it on `Platform.OS === 'web'`
only. The capture script hides it before every shot. Until 2026-08-29 it hid it
with `visibility: hidden`, which takes the control out of sight and leaves its
44 CSS px box sitting in the layout.

Measured on the live page, elder seat, 440 x 956 CSS, first ink from the top:

| Route | Refresh box | `visibility: hidden` | `display: none` |
|---|---|---|---|
| `/checkin` | top 0, height 44 | 72 | 28 |
| `/messages` | top 0, height 44 | 56 | 12 |
| `/profile` | top 0, height 44 | 64 | 20 |
| `/posted-help` | top 40, height 44 | 12 | 12 |

So three of the routes the store set draws from carried 44 CSS px of empty
white at the top that the shipped app never shows, and `/posted-help` carried
the same 44 px as a gap between its heading and its search field. Every
mechanical check passed on those frames: right size, no alpha, right weight.

The rule now lives in `scripts/lib/hide-refresh.js` and sets `display: none`,
which collapses the box. `__tests__/hide-refresh.test.js` pins it under jsdom,
including the guard that stops the climb at `<body>`: a screen still loading
can have "Refresh" as its only text, and without that guard the whole page is
what matches and the capture comes back blank.

Proof the band is gone: the re-shot `raw-02-checkin.png` and the 2026-08-22
frame both put their first ink on device row 91, and the pixel difference
between them is bounded to `(287, 91, 1038, 241)`, the greeting line and the
date. The rest of the two frames is identical.


### The helper and family shots, re-captured 2026-08-29 (APS-03)

Same script, same pinned frame. Two of the three came back byte-identical to
what was already on disk, which is a result and not churn: those frames were
already the shipped UI.

| File | Seat | Frame | Alpha | Bytes | Result |
|---|---|---|---|---|---|
| `raw-10-helper-offer-help.png` | helper | 1320 x 2868 | no | 281,338 | Replaced. The old frame carried the flat tab bar with a red Messages badge and no My Elders count. |
| `raw-14-helper-trust-score.png` | helper | 1320 x 2868 | no | 319,857 | Byte-identical, md5 `76b42efc73b7f1288bfe5f972c32c69d`. Nothing superseded. |
| `raw-16-family-parent-checked-in.png` | family | 1320 x 2868 | no | 266,767 | Byte-identical, md5 `852b7496a86acb936ffc80f1395a2f75`. Nothing superseded. |

`raw-10` changed from device row 983 down: every request line moved from
"Posted 4 hours ago by" to "Posted just now by" as the seeder reran, and the
tab bar became the floating capsule with blue count badges. The screens behind
`raw-14` and `raw-16` are pushed screens with a back arrow and no tab bar, so
the tab-bar work never touched them.

**The helper split is in frame.** `raw-14` reads "Each person you help can earn
you up to 15 points: 7 for growing trust together, 5 from their review, and 3
for your profile", then a per-person breakdown for each of the three people the
helper helps: Grace Liu 15/15 with 7/7 trust stages, 5/5 review, 3/3 profile;
David Chen 7/15 with 4/7, 0/5, 3/3; Rose Martin 4/15 with 1/7, 0/5, 3/3.

**The family frame says "Checked in today", and it was already true.** The
elder's own check-in screen read "Checked in for today, 7 days in a row" before
any capture ran, so nothing was staged to make the caption honest.

**Reaching the family parent card.** The route is
`/family/parent/<elderId>`, and the elder id moves with the seed, so it is
reached by walking there:
`--route /home --wait "Margaret" --tap "Margaret" --tap "See Margaret"`. The
parent row is a collapsible LinkRow, so the first tap opens it and the second
takes the "See Margaret" chip inside
(`src/components/family/FamilyHomePanel.jsx`). Tapping the name alone only
expands the row, and a capture taken there is the family home, not the parent
card.

**Left for the owner.** `raw-14` carries the line "Reviews are written on the
Towinly website. You cannot leave one from the app yet." APS-07 is the story
that settles that wording. Whichever pass closes APS-07 has to re-shoot
`raw-14` and re-bake slot 4, or the listing ships the old sentence.


## The 2026-08-29 re-capture and bake (APS-01 to APS-04)

The listing's eight shots were re-taken from the build live at commit `56bc83e`,
the same tip TestFlight build 25 carries, and the sixteen store files were
re-made from them with `python3 scripts/bake_screenshots.py`.

**What had moved in the app since 2026-08-22**

| Change | Shipped in | Which slots it reached |
|---|---|---|
| Posted Help requests became plain rows and gained a search field | around `7fcd0e0` | 2 |
| Subtitle lines under tab headings removed | `7fcd0e0` | 2 |
| Tab bar became the floating capsule, count badges red to blue | the tab-bar work after 2026-08-22 | 2, 3 |
| Centre button relabelled "Need Help" to "Ask Help" | same | 2 |
| The seeder reran, so request lines read "Posted just now" | data, not code | 3 |

**Which of the eight raws were actually replaced**

| Slot | Raw | Replaced | Note |
|---|---|---|---|
| 1 | `raw-13-landing-trust-ladder` | no | byte-identical (APS-01) |
| 2 | `raw-07-posted-help` | yes | cards to rows, search field, no subtitle, new tab bar |
| 3 | `raw-10-helper-offer-help` | yes | new tab bar, "Posted just now" |
| 4 | `raw-14-helper-trust-score` | no | byte-identical (APS-03) |
| 5 | `raw-15-chat-thread` | yes | re-shot; same thread, later clock times |
| 6 | `raw-16-family-parent-checked-in` | no | byte-identical (APS-03) |
| 7 | `raw-02-checkin` | yes | re-shot with the Refresh box collapsed |
| 8 | `raw-12-landing-welcome` | no | byte-identical (APS-01) |

Four of the eight were genuinely stale. Four were already the shipped UI and
came back byte for byte, which is a result and not a skipped step.

**Machine verification of the sixteen baked files, 2026-08-29**

`sips -g pixelWidth -g pixelHeight -g hasAlpha` on every output, byte size from
`stat -f%z`. Every ios file is 1320 x 2868, every play file 1080 x 1920, and no
file carries an alpha channel.

| File | Frame | Alpha | Bytes |
|---|---|---|---|
| `ios/01-landing-trust-ladder-ios.png` | 1320 x 2868 | no | 438,237 |
| `ios/02-posted-help-ios.png` | 1320 x 2868 | no | 244,819 |
| `ios/03-helper-offer-help-ios.png` | 1320 x 2868 | no | 470,651 |
| `ios/04-helper-trust-score-ios.png` | 1320 x 2868 | no | 476,996 |
| `ios/05-chat-thread-ios.png` | 1320 x 2868 | no | 244,557 |
| `ios/06-family-parent-checked-in-ios.png` | 1320 x 2868 | no | 508,418 |
| `ios/07-checkin-ios.png` | 1320 x 2868 | no | 288,177 |
| `ios/08-landing-welcome-ios.png` | 1320 x 2868 | no | 245,277 |
| `play/01-landing-trust-ladder-play.png` | 1080 x 1920 | no | 267,488 |
| `play/02-posted-help-play.png` | 1080 x 1920 | no | 150,565 |
| `play/03-helper-offer-help-play.png` | 1080 x 1920 | no | 281,883 |
| `play/04-helper-trust-score-play.png` | 1080 x 1920 | no | 282,234 |
| `play/05-chat-thread-play.png` | 1080 x 1920 | no | 154,229 |
| `play/06-family-parent-checked-in-play.png` | 1080 x 1920 | no | 306,587 |
| `play/07-checkin-play.png` | 1080 x 1920 | no | 177,374 |
| `play/08-landing-welcome-play.png` | 1080 x 1920 | no | 150,813 |

`npx jest store-screenshots` passes, 23 tests.

**One slot is knowingly not final.** Slot 4 bakes `raw-14`, and that frame
carries the sentence "Reviews are written on the Towinly website. You cannot
leave one from the app yet." APS-07 is the story that settles that wording.
When it lands, `raw-14` has to be re-shot and the bake re-run, or the listing
ships a sentence the app no longer says.

**One caption to look at before upload.** Slot 3 reads "See who needs a hand
near you" while the frame reads "Showing every open request" with a 25 km chip,
because a headless browser hands over no location and the list falls back to
everything. On a phone that has granted location the same screen names the
distance. The caption describes the feature and the frame shows its fallback.
