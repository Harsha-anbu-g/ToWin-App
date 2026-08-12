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

## Deliberately NOT baked yet, and why

Three planned captions have no shot that honestly supports them. Baking them
anyway would put a sentence over a screen that does not show it.

- **Caption 4, "Up to 15 points from each person you help. 7 for the trust
  steps. 5 for their review. 3 for your profile."** `raw-04-trust-score.png` is
  the ELDER seat, and the elder splits the same 15 as 7 + 5 + 2 + 1. The caption
  is the helper split. Re-capture Trust Score signed in as `helper`.
- **Caption 5, "Chat safely inside the app. Phone numbers are shared only when
  you both agree."** `raw-05-messages.png` is the conversation LIST, not a
  thread. Open a seeded conversation and capture the thread itself, with no
  phone number visible anywhere in the frame.
- **Caption 6, "Your family can see you're safe."** `raw-11-family-guardian.png`
  is the family home panel and it currently reads "No check-in yet today", which
  argues against the caption. Capture `app/family/parent/[elderId].jsx` with the
  check-in chip green, as the plan says.

Chrome could not be driven for these three because the machine was saturated by
parallel work at capture time. They need one short session, not a new approach.

## Before uploading, re-check

The captures came from the build that was live on 2026-08-11, which is commit
`af22521`. The elder Edit Profile crash fix and the audit fixes are committed
after that and are not deployed yet. None of the 13 shots contain Edit Profile,
so all 13 remain accurate. Re-run the capture pass after the next deploy anyway,
and re-bake if any screen moved.
