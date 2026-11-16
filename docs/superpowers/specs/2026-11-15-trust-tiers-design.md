# Trust tiers: the trust level decides who can take which help

Date: 2026-11-15
Status: design, waiting on owner review. Nothing is built.
Owner name for it: "the credit" (a credit score for trust).
Rule 0b note: the feature set is frozen. The owner lifted the freeze for this one item by asking for the plan.

## 1. In plain words

Today any helper can offer on any help request. After this change:

1. Every request has a size: small, medium or big. The app guesses it.
2. Bigger help needs a higher trust level and real proof that elders trust the helper.
3. A friendship adds to the trust score only when the elder says a help is over.
4. A helper below the level sees a locked line with no private details.
5. Family can let in one helper who is one size below, after checking them.

## 2. Owner decisions (2026-11-15, his words where quoted)

| # | Question | Decision |
|---|---|---|
| 1 | How a request gets its size | "app guess using the ai agent" |
| 2 | A helper the elder knows well | Can take bigger help for their own elder only |
| 3 | What a helper below the level sees | A locked line, no details |
| 4 | Nobody fits | Tell the elder and keep waiting. "family can approve a lower helper" |
| 5 | The size guess | Elder sees it, can only make it stricter. Unsure means the bigger size |
| 6 | What the rule measures | Level plus real proof |
| 7 | Family interview | Dropped. "just inform the family to check them" |
| 8 | When points arrive | "you will only get the score when the help is done". Points up to the step reached, banked when the elder ends the help |
| 9 | Profile points per friendship | They wait for the first finished help too |
| 10 | Big help proof | Add "in person" in words |
| 11 | AI is down | "when the ai is down create one logic and the app will find it". The app's own rules pick the size |

Not decided: money and rewards (owner: leave it), an outside police check for big help.

## 3. Facts this design stands on

Checked against website `origin/main` at `b121966` (2026-10-27). The local checkouts are older, so re-check before building.

- `TrustScoreService`: a friendship is worth up to 15 (ladder 0 to 7, review 0 to 5, profile 0 to 3). The total is the sum over friendships, with no cap. Ladder points today are `step value + 1`, so a brand-new friendship already gives 1.
- `TrustScoreService.tierFor`: 1 Getting Started, 15 Reliable, 45 Highly Trusted, 90 Community Champion.
- `TrustLevel`: DISCOVERED 0, MESSAGING 1, PHONE_CALL 2, VIDEO_CALL 3, VERIFIED 4, FIRST_MEET 5, TRUSTED 6. `TrustService` moves one step at a time and both sides must confirm, so steps cannot be skipped.
- `NeedService.apply`: no trust check.
- `NeedService.complete`: only the elder, or a family member holding `MANAGE_HELP_REQUESTS`, can end a help. It already recalculates the helper's score.
- `Need` has title, description, category (TRANSPORTATION, CLEANING, COMPANIONSHIP, ERRANDS, OTHER), schedule, urgency, status, place. No size and no length.
- The assistant talks to the AI through `LlmClient`, with `PromptSanitizer` in front.

## 4. The rules

### 4.1 Sizes and who can offer

Starting numbers. They live in one place on the server so the owner can change them.

| Size | Examples | Level needed | Real proof needed |
|---|---|---|---|
| Small | Groceries, a bulb, cleaning | Getting Started (1+) | None |
| Medium | Doctor visit | Reliable (15+) | One elder has met them in person (step FIRST_MEET or above) |
| Big | Overnight, a 3-day trip | Highly Trusted (45+) | Two elders have met them in person and fully trust them (step TRUSTED) |

A helper may offer when one of these is true:

1. **Level and proof.** They hold the level and the proof in the table.
2. **Their own elder.** With the elder who posted: step FIRST_MEET or above opens that elder's medium help, step TRUSTED opens that elder's big help. The level does not matter here. It never opens another elder's help.
3. **Family approval.** See 4.4.

The elder still chooses among the offers and gives the final yes. The rule is checked again when the elder accepts.

### 4.2 Sizing a request

- The server sizes every request when it is posted. It never trusts a size sent by the phone or the website.
- Two readers run on the title and description: the AI (one fixed instruction, one-word answer) and the app's own built-in rules (below). The bigger answer wins.
- The built-in rules, in order, first match wins:
  1. Big: the text speaks of staying over or going away (for example overnight, night, days, trip, travel, out of town, stay with me).
  2. Medium: the text speaks of health or personal care (for example doctor, hospital, clinic, appointment, surgery, medicine, bath), or the kind of help is TRANSPORTATION or OTHER.
  3. Small: everything else (ERRANDS, CLEANING, COMPANIONSHIP with none of the words above).
  The word lists live in one file, in English, French and Tamil, so they can grow without a code change elsewhere.
- The elder's text goes through `PromptSanitizer` and the existing personal-data guard before it leaves the server. The instruction tells the AI that the text is data, never instructions.
- If the AI does not answer, the built-in rules decide alone (decision 11). The request posts at once with that size. Nothing is re-sized later and no background task is needed.
- Before posting, the elder sees one line with the size and who can offer. They can ask for a higher level. They cannot ask for a lower one.
- Requests that are already open when this goes live are sized once by the same code.

### 4.3 What a helper below the level sees

In every list and search (open, nearby, smart search, Ask AI, the MCP tools) a request the helper cannot offer on comes back as a locked item:

- Shown: the size, the level needed, how many points away the helper is, the proof still missing, and whether "Ask the family" is possible.
- Not shown: the elder's name or photo, the title, the description, the place, the distance.

Opening that request by its id returns the same locked item. One policy class decides this for every path, so no list can leak what another hides.

### 4.4 The family door

- Open only when the elder has a family member holding `MANAGE_HELP_REQUESTS`, and only to a helper who qualifies for the size just below (medium-qualified for big help, small-qualified for medium help).
- The helper taps "Ask the family". The server stores the offer as waiting for family. The elder does not see it yet.
- The family member gets a note that names the helper and says: check this helper yourself before you approve. There is no interview step in the app.
- Approve: the offer becomes a normal offer, marked "Approved by <family member>". The helper can now read the request. Decline: the helper is told "Not this time" and nothing else.
- One family-approved helper per request at a time.

### 4.5 The scoring change

- A friendship adds nothing to either person's score until a help between those two people is finished.
- When the elder ends a help, the server banks the ladder step the pair has reached. Ladder points for that friendship are the banked step (`value + 1`), not the live step. Steps climbed later count at the next finished help.
- Profile points and the elder's family point count for a friendship only once it has a banked step. A member's own profile points still count once, as today, so nobody starts at zero.
- A friendship that ended and starts again starts from nothing: the ladder restarts at the bottom (existing rule) and the banked points go with it. A paused friendship keeps both. As a backstop the score counts a friendship only while its banked step is not above its live step.
- Review points are unchanged.
- Both people's scores are recalculated when a help ends (today only the helper's is).
- Ladder unlocks (phone number, letters, family standings) follow the live step and do not change.

Example, helper with a full profile, one elder:

| What has happened | Points from that elder |
|---|---|
| Added as a friend, no help finished | 0 |
| Help ended at the video call step | 7 (4 ladder + 3 profile) |
| Help ended after all 7 steps, 5 stars | 15 (7 + 3 + 5) |

Stars cannot arrive earlier: `ReviewService` only allows a review once the pair is fully trusted. That rule is unchanged.

Going live: friendships that already have a finished help bank their current step, because the step at the time was never stored. All other friendships count 0. Every score is recalculated once. Scores will drop for most people, so the app shows a short note explaining the new rule the first time each person opens it.

## 5. Where it lives

Server (website repo, `~/Documents/Projects/ToWin`, not `website-ref`):

- `Need`: add `size`, `minLevel` (the elder's stricter choice), `sizedBy` (AI or rules, for checking guesses later).
- `Connection`: add `bankedTrustLevel`, empty until the first finished help.
- New `NeedSizer`: the AI reader plus the built-in rules. The rules are a plain function with no outside calls, so they work when the AI is down.
- New `NeedAccessPolicy`: the only place that answers "can this helper see it" and "can this helper offer". Used by apply, accept, every list, get-by-id, the assistant tools.
- `NeedService`: size on post, enforce on apply and accept, bank the step on complete, the family door.
- `TrustScoreService`: count a friendship only when it has a banked step.
- New endpoints: preview the size, ask the family, family answers.
- One switch (`TRUST_TIERS_ENABLED`) so the gate can be turned on after the scoring change has settled.

Phone app and website (each action is one named function in the API layer, per Rule 6):

- `previewHelpRequestSize`, `postHelpRequest` (gains `minLevel`), `askFamilyToApprove`, `respondToFamilyApproval`. List functions return locked items.
- Post screen: the size line and "ask for a higher level".
- Offer Help list: the locked row.
- Posted Help: on medium and big requests, one line saying fewer helpers can offer and pointing to a known helper or family.
- Family: the approval note.
- Trust Score page: what each level opens, and "counts after a help is finished" on each friendship.
- Every new line in English, French and Tamil.
- The MCP tools rebuild from the function comments.

## 6. When things go wrong

| Case | What happens |
|---|---|
| AI does not answer | The built-in rules pick the size; the request posts as normal |
| Elder's text tries to steer the AI | Word check still applies; red-team cases in the evals |
| Helper's level drops after offering | Checked again at accept; the elder sees a plain reason |
| Elder takes the family power back | The door closes at once; waiting family offers are cancelled |
| Elder has no family linked | No "Ask the family" button; the request waits |
| Helper offers on a locked request by id | Refused with the same words as the locked line |

## 7. Tests

- Server: the full table of who can offer (level, proof, own elder, family door) as one test matrix; the scoring change with the example table above; the built-in rules case by case, and sizing with the AI off; no list or search returns private fields for a locked request.
- Evals: sizing cases for each size, plus text written to trick the size down.
- App and website: the size line, the locked row, the family note, the first-open score note.
- Before and after score for the demo accounts, shown to the owner before going live.

## 8. Order of work

1. Scoring change, the one-time recalculation and the note. Server and screens.
2. Sizing and the gate on the server, behind the switch. Website screens.
3. Phone app screens. Needs a new store build.
4. The family door.

Each step is shown to the owner before the next starts. Nothing is pushed without his yes.

## 9. Left out on purpose

- Money and rewards.
- An outside police check for big help. Recommended later for the top size.
- New level names or new level numbers.
- Any change to what the ladder steps unlock.
- Admin screens for this.

## 10. Choices made by Claude for the owner to confirm

1. The numbers in 4.1.
2. The built-in rules in 4.2: which words mean big, which mean medium, and that a ride (TRANSPORTATION) and "other" count as medium when the text gives no clue.
3. "One level below" means: qualifies for the size just below.
4. Friends who climb the ladder without any help request earn no points from it.
5. Going live, old friendships with a finished help bank the step they are on today.
6. Request text is sent to the AI service for sizing, so the privacy page gains one line.
