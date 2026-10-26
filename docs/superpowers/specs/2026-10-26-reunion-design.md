# Reunion: an elder meets old classmates and colleagues again

Written 2026-10-26. Owner call the same day: "this one in a new page with title
called reunion, there implement this", with the seven steps pasted in. This opens
the feature freeze (Rule 0b, 2026-09-04) for exactly this section; nothing else
new is built. The idea itself is recorded in
`docs/proposals/2026-10-13-elder-reunions.md` and Notion Idea 07.

## The problem

An elder wants to see the people who knew them at twenty: the college batch, the
old office. They cannot organise it themselves. Numbers are lost, institutions
have closed, mobility and patience are short. Towinly already has the two people
who can do the work and are already trusted: a helper who has climbed the whole
Trust Ladder with the elder, and a family member the elder invited in. Today there
is no place in the app for a job that takes months and has a guest list.

## What is built

One section, "Reunion", reached from a row on the Profile tab. Every role sees it:
elders make the wish, helpers and family members organise.

The journey is seven steps, numbered and visible the way the Trust Ladder is:

| # | Step (enum) | In the app it is called | Who acts | What moves it on |
|---|---|---|---|---|
| 1 | `WISH` | Wish | elder | writing the wish (institution, years, city, names remembered) |
| 2 | `ORGANISER` | Who plans | elder | picking one organiser from the people allowed |
| 3 | `FINDING` | Finding | organiser keeps the guest list, elder may too | elder approves, once at least one guest is Coming |
| 4 | `PLAN` | The plan | organiser writes when, where, rides, food, budget | elder approves, once when and where are set |
| 5 | `DAY` | The day | organiser checks each Coming guest in | elder or organiser says the day is over |
| 6 | `SEND_OFF` | Send-off | organiser confirms each arrived guest home | elder or organiser closes, once every arrived guest is home |
| 7 | `DONE` | After | both | nothing; reviews and the story box are linked from here |

`STOPPED` is the eighth state: the elder can stop at any step before `DONE`. The
organiser can step down at any step before `DAY`; the reunion goes back to
"Who plans" and keeps its guest list.

### Who may organise (the gate)

The elder chooses, per reunion, from a list the server builds. Nobody else can be
chosen and nobody can volunteer:

- a helper whose elder-helper connection with this elder is `ACTIVE` at
  `TrustLevel.TRUSTED`, the top of the ladder. `PEER` and `FAMILY` connections do
  not count.
- a family member with an `ACTIVE` family link to this elder.

No new delegated power is added. The elder's explicit pick per reunion is the
consent, and it is narrower than a standing power: it covers this one reunion.
(The proposal sketched a `PLAN_REUNION` power; this is simpler and touches none
of the family-powers UI, tests or website.)

### Guests

A guest is a name, an optional phone, an optional note (mobility, hearing, diet,
a cousin who has the number), and a state: Remembered, Found, Reached, Coming,
Cannot come. Guests are not Towinly accounts and no profile is created for them.
Matching guests against Towinly members is not built: the profile has no school
or workplace fields yet, and the first reunions will find people the old way.

On the day, a Coming guest is checked in (arrived). At the send-off, an arrived
guest is confirmed home. The reunion can only close when every arrived guest is
home. That is the part with Towinly's name on it.

### Safety rules, enforced not advised

- **Money.** Any free text on a reunion (guest note, rides, food, budget,
  thank-you) that reads as a money ask is refused by the server with a plain
  sentence. "An old classmate who needs money" is the scam this feature must not
  open a door for. The list of phrases is short and lives in one place.
- **Family is told.** When the elder approves the plan, every active family
  member gets an in-app alert of type `REUNION` ("Planned a reunion with old
  friends on {when} at {where}") and emergency contacts get the same SMS the first
  meet sends. In-app only for family, as every family alert is.
- **Stranger-proof.** Only the elder and the chosen organiser can read or change
  a reunion. Everyone else gets 403.
- **Nothing moves without the elder.** Steps 3 to 4 and 4 to 5 are the elder's
  taps only. The organiser's buttons on those steps are not shown.

### What is not built (non-goals)

- A group chat. The organiser and the elder already have their chat. Guests are
  reached by phone.
- Photo upload for the group photo. The thank-you is text. Photos need consent
  from everyone in them and that flow is its own piece of work.
- Payment to the organiser. Who pays and how much is an open owner question.
- A "the day before" scheduler. The family alert fires when the plan is
  approved, which is always before the day.
- Matching guests to Towinly members (needs profile fields that do not exist).
- A reunion circle that lives on afterwards (touches Neighborhood Groups).

## Architecture

**Backend** (`com.towinly.reunion`, branch `feat/reunion` in the website
checkout, worktree `.worktrees/reunion`):

- `Reunion` entity: elder, organiser (nullable), organiserKind (`HELPER` or
  `FAMILY`), institution, years, city, note, plannedOn (text), venue, rides,
  food, budget, thankYou, step, timestamps. `ReunionGuest` entity: reunion,
  name, phone, note, state, arrivedAt, homeAt. Enums stored as VARCHAR, like
  `family_alerts.type`, so no Postgres enum types to migrate.
- Migration `V64__create_reunions.sql`. `elder_id` cascades on user delete,
  `organiser_id` sets null, guests cascade with their reunion. Account deletion
  and the demo reset need no new code paths beyond one purge line in
  `DemoDataSeeder`.
- `ReunionService` owns every rule above. `ReunionController` at
  `/api/reunions` is thin. `SosService.notifyReunionPlanned` writes the family
  alert and the SMS. `ExpoPushService.sendToUser` tells the organiser they were
  chosen and that the plan was approved, and tells the other side when the
  reunion closes.
- `FamilyAlertType.REUNION` is added (VARCHAR(20) column, no migration).

**App** (`App/`, on `main`, own files only):

- `src/api/reunions.js`: fourteen verb-first functions with the doc comments the
  MCP catalog reads. `stopReunion` and `removeReunionGuest` are destructive.
- `src/lib/reunionSteps.js`: the seven step names and explanations, guest state
  labels, `stepIndex`, `canAdvance(step, role)` mirroring the server.
- `src/components/reunion/`: `ReunionLadder` (same grammar as `TrustLadder`),
  `ReunionWishForm`, `OrganiserPicker`, `GuestList`, `PlanCard`, `ReunionRow`.
- `app/reunion/index.jsx` (title "Reunion": the list, the wish form for elders,
  a first-time card) and `app/reunion/[reunionId].jsx` (one reunion, the ladder,
  the panel for the current step, the quiet stop or step-down action).
- Profile tab: one row, "Reunion", for every role.
- `FamilyAlertsFeed`: the `REUNION` kind, framed like a first meeting.
- `src/i18n/fr.js` and `ta.js`: every new sentence.
- MCP catalog regenerated; `stopReunion` added to the destructive names.

**Website** (laptop side, same branch `feat/reunion`, owner call the same day: "also
the website in lap top"):

- `frontend/src/api/reunions.js`: the website's first named-function catalog, the
  same fifteen functions as the app, plus `reunionErrorLine` for the server's 400
  sentence.
- `frontend/src/lib/reunionSteps.js`: the app's file, unchanged.
- `frontend/src/components/reunion/`: `ReunionLadder`, `ReunionWishForm`,
  `OrganiserPicker`, `GuestList`, `PlanCard`, built on the kit (`.card`, `.field`,
  `.btn-primary`, `.btn-text`, `ConfirmDialog`, `Avatar`).
- Pages `Reunion.jsx` at `/reunion` and `ReunionDetail.jsx` at `/reunion/:reunionId`,
  both behind `PrivateRoute`. Reached from the account menu and the drawer, every seat.
- Same step rules, same copy, same French and Tamil lines. Phones on towinly.com
  still get the app build, so this is the laptop view only.

### Endpoints

| Method | Path | Who | Does |
|---|---|---|---|
| GET | `/api/reunions/mine` | any | reunions where I am the elder or the organiser |
| POST | `/api/reunions` | elder | post the wish, step becomes `ORGANISER` |
| GET | `/api/reunions/{id}` | elder, organiser | one reunion with its guests and counts |
| GET | `/api/reunions/{id}/organisers` | elder | the people allowed to organise |
| POST | `/api/reunions/{id}/organiser` | elder | choose one, step becomes `FINDING` |
| POST | `/api/reunions/{id}/guests` | elder, organiser | add a guest (Remembered) |
| PATCH | `/api/reunions/{id}/guests/{guestId}/state` | elder, organiser | set Found, Reached, Coming, Cannot come |
| DELETE | `/api/reunions/{id}/guests/{guestId}` | elder, organiser | remove a guest |
| PUT | `/api/reunions/{id}/plan` | elder, organiser | when, where, rides, food, budget |
| POST | `/api/reunions/{id}/advance` | per table above | move to the next step |
| POST | `/api/reunions/{id}/guests/{guestId}/arrived` | elder, organiser | check a Coming guest in |
| POST | `/api/reunions/{id}/guests/{guestId}/home` | elder, organiser | confirm an arrived guest home |
| POST | `/api/reunions/{id}/close` | elder, organiser | send-off done, with the thank-you |
| POST | `/api/reunions/{id}/stop` | elder | stop the reunion |
| POST | `/api/reunions/{id}/step-down` | organiser | leave; back to "Who plans" |

Errors: 403 `ForbiddenException` for the wrong person, 400
`IllegalArgumentException` for a step or guest that is not where the action needs
it and for a money ask, 404 for an unknown reunion or guest.

## HCI walk (Nielsen, binding)

1. Status: "Step N of 7 · name" and the ladder on every reunion; the guest line
   "4 remembered · 2 coming" on the list row; every button shows loading.
2. Real words: Wish, Who plans, Finding, The plan, The day, Send-off, After.
3. Control: the elder can stop at any step; the organiser can step down before
   the day; nothing moves without the elder's tap.
4. Consistency: Screen, Card, Button, Input, ActionChip, SegmentedControl from
   the kit; one filled primary per screen; the ladder reads like the Trust Ladder.
5. Error prevention: money asks are refused by the server; stop and remove ask
   once; approve buttons are hidden until the step's condition holds, with the
   reason in a line.
6. Recognition: names and notes, never ids; the organiser list shows faces and
   the reason they are allowed.
7. Flexibility: one path for the elder; the organiser's list tools sit in the
   same panel, no settings.
8. Minimalism: one step panel per screen; the rest of the ladder is a line.
9. Recovery: a failed write keeps the typed text and offers retry through the
   toast; the list and the page both have pull to refresh and a LoadError.
10. Help: a first-time card on the Reunion page in plain words.

## Testing

- Backend `ReunionServiceTest` (Mockito): the organiser gate, each step's
  condition, who may advance, the money filter, stop and step-down, the family
  alert on plan approval, close needs every arrived guest home.
- App `reunions-api.test.js`: each function hits its one endpoint with the right
  body. `reunion-steps.test.js`: `stepIndex` and `canAdvance`.
  `reunion-page.test.js`: an elder at Who plans sees the candidates; an organiser
  at Finding sees the add-guest form and no approve button; the elder sees the
  approve button only when the condition holds.
- `i18n-coverage.test.js` and the MCP snapshot test pass unchanged in shape.

## Open owner questions (unchanged from the proposal)

Who pays the organiser; helper gate at Trusted or lower; group chat; photo;
which market first; whether a reunion group lives on. None blocks this build.
