# Towinly store listings: United States and India

Elders rarely search app stores. The people who type into the search box are
families ("help for elderly parent", "companion for seniors") and helpers
("help seniors earn trust", "caregiver jobs"). Every field below speaks to one
of those two searchers.

Every mechanic named here ships in the app and matches the code:

- The 7-step Trust Ladder: Just Connected, Messaging, Phone Ready, Video Ready,
  Social Media, Ready to Meet, Fully Trusted (`App/src/data/landingSlides.js`).
- The Trust Score: up to 15 points per connection, 3 for the profile,
  7 for the ladder, 5 for the review. (The app's own copy says "3 for your
  profile": only one of the three profile points involves a check, the
  phone and ID verification group, so "checked profile" would overstate it.)
- Family guardian view: an elder invites up to five family members, they see
  each friendship climb its steps, they get alerts, and one switch turns
  sharing off.
- Daily check-ins: the elder checks in once a day; linked family hears when
  the elder goes quiet.

Related file: `docs/store-listing.md` at the repo root holds reviewer notes,
data safety answers, screenshot specs, and the identity fields that
`App/__tests__/store-listing.test.js` currently recounts. The fields below are
the searcher-first proposal. If adopted, copy them into that file so the test
guards them. Character counts below were machine-counted, and the whole file
was swept for em dashes: none.

---

## 1. Apple App Store, United States (English U.S.)

```store-fields
title: Towinly: Elder Care Companion
subtitle: Trusted help for aging parents
promo: Your parent asks with one tap. A helper nearby answers. You watch trust grow, step by step, from your own family account. Help is easy to find. Trust takes time.
keywords: senior,elderly,citizen,caregiver,caretaker,errands,chores,jobs,safety,family,lonely,friend,visits
```

```store-field-counts
title: 29/30
subtitle: 30/30
promo: 161/170
keywords: 97/100
full_description: 1585/4000
```

Why these fields:

- The title carries the brand plus the category phrase the searcher types.
  "Elder Care Companion" puts "elder care" and "companion" in the strongest
  index slot Apple has.
- The subtitle covers the family search "help for aging parents".
- The keyword line is single words only, comma-separated with no spaces, and
  repeats nothing from the title or subtitle (Apple indexes each word once).
  It builds "senior care", "elderly parents", "caregiver jobs", "senior
  citizen", "family safety" by recombination. "jobs" is honest: the app's own
  screen is `App/app/my-jobs.jsx`.
- The promotional text is the one field Apple lets you edit on a live version
  without review. Seasonal or city-launch lines go there.

Full description (Apple does not index it, so it sells rather than stuffs).
Paste the block between the markers; each paragraph is one unwrapped line:

<!-- apple-us-description:start -->
It takes two To Win.

Towinly brings older people and friendly helpers together, on your terms and at your pace. Families use it to find help for an elderly parent or a companion for a senior who lives alone. Helpers use it to give time, earn trust, and make a friend.

FOR FAMILIES
• Your parent asks for help with one tap: a ride, shopping, cleaning, or company.
• Helpers nearby see the request and offer a hand. Your parent chooses.
• Join from your own family account. An elder can invite up to five family members.
• Watch each friendship climb its seven steps. Get an alert when something needs attention.
• Your parent checks in once a day. If they go quiet, you get an alert in the app.
• The elder is always in charge. One switch turns family sharing on or off.

FOR HELPERS
• See who needs a hand near you and offer to help.
• Earn a Trust Score with every step you climb and every review you receive.
• Each person you help can earn you up to 15 points: 3 for your profile, 7 for the Trust Ladder, 5 for their review.
• Make real friendships.

HOW TRUST WORKS
Every member has a Trust Score, visible before an elder ever says yes. Every connection climbs the same seven steps: Just Connected, Messaging, Phone Ready, Video Ready, Social Media, Ready to Meet, Fully Trusted. Both people must agree to every step. Nothing personal, like a phone number, is shared until trust has grown. Slow is the point.

MADE FOR OLDER EYES AND HANDS
Large text, clear buttons, no clutter. Chat stays inside the app. No ads. Your data is never sold.

Help is easy to find. Trust takes time.
<!-- apple-us-description:end -->

---

## 2. Google Play, United States (English U.S.)

```store-fields
title: Towinly: Elder Care Companion
short_description: Trusted help and company for aging parents. Trust grows in 7 clear steps.
```

```store-field-counts
title: 29/30
short_description: 73/80
full_description: 1585/4000
```

- Play has no keyword field. It indexes the title, the short description, and
  the full description. The description below carries the search phrases
  naturally: "help for an elderly parent", "companion for a senior",
  "Trust Score", "seven steps".
- Play bans "best", "#1", "free", and calls to action in the title. This
  title is clean.

Full description: use the same block as section 1
(`apple-us-description:start` to `apple-us-description:end`). One text, two
consoles, no drift.

---

## 3. Apple App Store, India (entered as English U.K.)

App Store Connect has no English (India) locale. The India storefront reads
the English (U.K.) localization when one exists, and the primary language
otherwise. So this variant goes into the English (U.K.) slot. Check in App
Store Connect which other storefronts that slot takes over (the U.K. among
them) before shipping it, because it replaces the U.S. line there rather than
adding to it. The copy below reads correctly in both countries.

```store-fields
title: Towinly: Senior Citizen Care
subtitle: Trusted company for parents
promo: Your parents ask with one tap. A helper nearby answers. You watch every new friendship earn trust, step by step, from wherever you live. Slow is the point.
keywords: caretaker,attendant,elderly,elder,carer,helper,companionship,jobs,safety,family,errands,ageing
```

```store-field-counts
title: 28/30
subtitle: 27/30
promo: 155/170
keywords: 94/100
full_description: 1675/4000
```

Why these fields:

- "Senior citizen" is the phrase the Indian market searches. It sits in the
  title, the strongest slot.
- The keyword line uses the Indian-English words for the role: "caretaker",
  "attendant", "helper", plus the British spellings "carer" and "ageing"
  since this slot also serves the U.K.
- The promo speaks to the son or daughter living in another city, the person
  most likely to install an app for their parents.

Full description, written for Indian families and helpers:

<!-- apple-in-description:start -->
It takes two To Win.

You live in one city. Your parents live in another. Small things, like shopping, a ride to the clinic, or someone to talk to over tea, take energy they do not always have.

Towinly brings senior citizens and trusted helpers together, at a pace your whole family can watch.

FOR FAMILIES
• Your mother or father asks for help with one tap: a ride, shopping, cleaning, or company.
• Helpers nearby see the request and offer a hand. Your parent chooses.
• Join from your own family account. An elder can invite up to five family members.
• Watch each friendship climb its seven steps. Get an alert when something needs attention.
• Your parent checks in once a day. If they go quiet, you get an alert in the app.
• Your parent is always in charge. One switch turns family sharing on or off.

FOR HELPERS
• See which senior citizens near you need a hand: errands, a lift, or company.
• Earn a Trust Score with every step you climb and every review you receive.
• Each person you help can earn you up to 15 points: 3 for your profile, 7 for the Trust Ladder, 5 for their review.
• Your Trust Score goes with you to every new family you meet.

HOW TRUST WORKS
Every member has a Trust Score, visible before a senior ever says yes. Every connection climbs the same seven steps: Just Connected, Messaging, Phone Ready, Video Ready, Social Media, Ready to Meet, Fully Trusted. Both people must agree to every step. A phone number is shared only when both sides say yes. Slow is the point.

MADE FOR PARENTS AND GRANDPARENTS
Large text, clear buttons, simple English. Chat stays inside the app. No ads. Data is never sold.

Help is easy to find. Trust takes time.
<!-- apple-in-description:end -->

---

## 4. Google Play, India (custom store listing, en-IN)

Play Console does this properly: create a custom store listing targeted to
India, locale English (India), under Grow > Store presence > Custom store
listings. The main listing (section 2) stays the default for every other
country.

```store-fields
title: Towinly: Senior Citizen Care
short_description: Care and company for your parents. Trust grows in 7 steps, at their pace.
```

```store-field-counts
title: 28/30
short_description: 73/80
full_description: 1675/4000
```

Full description: use the same block as section 3
(`apple-in-description:start` to `apple-in-description:end`). It already
carries the Play-indexed phrases: "senior citizens", "caretaker" intent via
"trusted helpers", "errands", "Trust Score".

---

## 5. Hindi and Tamil: where they belong later

- **Google Play** takes full listing translations. Add Hindi (hi-IN) and
  Tamil (ta-IN) translations of section 4 under the main listing's Manage
  translations, or attach them to the India custom store listing.
- **Apple** offers Hindi as an App Store Connect localization; translate
  section 3 into that slot when ready. App Store Connect has no Tamil slot,
  so Tamil reaches iPhone users through Play and inside the app only.
- Translate the meaning, never word for word, and keep the brand lines in
  English in every language: "It takes two To Win." and "Slow is the point."
  are the product's name plate.
- Do the translations with a human speaker who knows elder-respect registers
  (aap forms in Hindi, neenga forms in Tamil). Machine output alone will read
  wrong to the exact audience this app serves.

---

## 6. Release notes, version 1 (both stores, both countries)

Play caps release notes at 500 characters. This block is 383, so the same
text serves App Store Connect "What's New" and Play "Release notes", including
the en-GB and en-IN slots.

<!-- release-notes-v1:start -->
This is the first Towinly release.

Elders ask for a ride, shopping, cleaning, or company. Helpers nearby offer a hand and earn trust. Family members watch over from their own account.

Every connection climbs the 7 steps of the Trust Ladder, and both people agree to each step. Slow is the point.

If something does not work, write to help@towinly.com. A person reads every message.
<!-- release-notes-v1:end -->

---

## Field placement reference

| Field | App Store Connect | Play Console |
|---|---|---|
| title | App Name (30) | App name (30) |
| subtitle | Subtitle (30) | no equivalent |
| short_description | no equivalent | Short description (80) |
| promo | Promotional Text (170) | no equivalent |
| keywords | Keywords (100) | no keyword field; Play indexes the description |
| full description | Description (4000) | Full description (4000) |
| release notes | What's New (4000) | Release notes (500) |

Constraints honored in every block above:

- Apple keyword lines: single words, commas with no spaces, zero words
  repeated from the title or subtitle of the same locale.
- No em dashes anywhere. No "not X, it's Y" contrasts. Short sentences.
- Only shipped mechanics: 7-step Trust Ladder, 3 + 7 + 5 = 15 Trust Score,
  five-member family view, daily check-ins, in-app chat, phone number gated
  behind mutual agreement.
- Approved taglines used verbatim: "It takes two To Win.", "Help is easy to
  find. Trust takes time.", "Slow is the point."
