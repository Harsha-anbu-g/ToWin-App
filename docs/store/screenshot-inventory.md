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
in the band, and it asserts on any em dash in a caption before writing a file.

Five shots are baked, into `final/ios/` and `final/play/`:

1. `13-landing-trust-ladder` : Seven steps, climbed together. Slow is the point.
2. `07-posted-help` : Ask for a ride, shopping, cleaning or company.
3. `10-helper-offer-help` : See who needs a hand near you.
4. `02-checkin` : Check in once a day. If you link a family member, they are told when you go quiet.
5. `12-landing-welcome` : It takes two To Win.

Apple needs at least one screenshot and Play at least two, so five clears both
minimums today. Eight is the plan in `screenshots-and-review.md` and is worth
finishing.

## The last three, captured 2026-08-15

The three planned captions that had no shot behind them now have one. Captured
from the live phone web build at `https://www.towinly.com/app`, driven by
Playwright 1.62.1 in Chromium at a 1320 x 2868 viewport, `deviceScaleFactor: 1`,
`colorScheme: 'light'`, signed in through the real demo seats. Every file was
measured with `sips` after capture, not eyeballed.

| File | Size | Alpha | Bytes | What proves the caption |
|---|---|---|---|---|
| `raw-14-helper-trust-score.png` | 1320 x 2868 | no | 97,003 | The HELPER seat. The page reads "up to 15 points: 7 for growing trust together, 5 from their review, and 3 for your profile", and Grace Liu's row shows Trust stages 7/7, Their review 5/5, Your profile 3/3. This is the split caption 4 claims, and it is not the elder's 7 + 5 + 2 + 1 |
| `raw-15-chat-thread.png` | 1320 x 2868 | no | 58,589 | A thread at `/chat/7fd4182c-...`, not the conversation list. Three real seeded messages between Margaret and Ethan Cole. A regex sweep of every visible string in the frame for phone-like digit runs returned none |
| `raw-16-family-parent-checked-in.png` | 1320 x 2868 | no | 107,542 | `app/family/parent/[elderId].jsx` at `/family/parent/f5b309df-...`, with the chip reading "Checked in today" in the achieved green. Measured, not assumed: 248 pixels within tolerance of `greenDeep` `#1a5c2e` sit in the chip band, bounded to x 417 to 546, y 206 to 217 |

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
`af22521`. Raws 14 to 16 came from the build live on 2026-08-15. The elder Edit Profile crash fix and the audit fixes are committed
after that and are not deployed yet. None of the 13 shots contain Edit Profile,
so all 13 remain accurate. Re-run the capture pass after the next deploy anyway,
and re-bake if any screen moved.
