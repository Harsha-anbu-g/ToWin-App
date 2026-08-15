# Individual or organization: decide this before the 99 USD

Apple asks for the enrollment type before it takes the money, and the answer
sets the name that every elder and every worried daughter sees beside the app.
It is the one choice on enrollment day that is expensive to undo.

Everything below is traced to a repo document or to what Apple states in the
enrollment flow itself. Where a claim could not be confirmed from either, it
says so rather than sounding certain.

**Recommendation: enroll as an individual.** The reasoning and the condition
that would flip it are in section 6.

---

## 1. What each option is

### Individual, 99 USD per year

Source: `APPLE-DAY-ONE-RUNBOOK.md` section 1.

- What it asks for: an Apple Account with two factor authentication, a
  government photo ID, a payment card. That is the whole list.
- How it verifies: the Apple Developer app on an iPhone scans the ID and
  matches it to your face. The web route asks for the same documents and takes
  longer.
- What the store shows: the account holder's own legal personal name, as the
  seller and as the developer. A stranger reading the Towinly listing sees a
  person.
- Team size: one. Nobody else can be added to the developer portal.
- Time from payment to an active membership: often a day or two. The runbook
  says budget up to a week and book nothing against it.

### Organization, the same 99 USD per year

Source: `APPLE-DAY-ONE-RUNBOOK.md` section 1.

- What it asks for: a real legal entity, a D-U-N-S number for that entity, a
  public website on a domain that matches the entity, and legal authority to
  sign for it. `www.towinly.com` is live, so the website half is in hand as long
  as the entity is named to match it.
- What the store shows: the company name as the seller.
- Team size: many, with roles.
- Time: the D-U-N-S number is the long pole and it lands before the payment
  step. See section 5.

The entity test is the real gate. If there is no incorporated Towinly today,
the organization route is not a slower version of the same day. It is a
different project that starts with company formation.

---

## 2. What the choice changes

### The seller name, which is public and permanent in practice

`app-store-connect-fields.md` section 0 records this as the field that changes
what the public sees. Individual publishes the account holder's legal name.
Organization publishes the company name.

For a trust product this deserves a straight answer rather than a shrug. The
person deciding whether an elderly parent should use Towinly is often an adult
child who checks the developer name to see whether the app is real. A personal
name reads as a small operation, which Towinly is. It reads badly only when it
is a name that appears nowhere else. It reads fine when the same name is on the
website, on the support page and in the founder's story, because then it
confirms rather than confuses.

Towinly already publishes under the founder's name rather than an alias, which
`app-store-connect-fields.md` section 0 also notes. So an individual enrollment
matches what has already shipped.

**Needs confirmation from the owner:** the exact legal name as it appears on the
government photo ID. It must match the Apple Account name or enrollment goes on
a silent hold, per the runbook. This document does not guess at a legal name.

### The copyright line

`console-answers.md` item 9 and `app-store-connect-fields.md` section 6.2 both
carry `2026 <legal entity>` and mark it USER INPUT NEEDED. Apple's format is the
year of first publication and then the owner of the rights. It has to name the
same legal identity as the developer account, so it follows this decision and
cannot be settled before it.

### What the legal pages say

`src/data/legalContent.js` names Towinly throughout and names no operating
company. That is consistent with an individual enrollment today. If the seller
becomes a company later, the Terms and the Privacy Policy should name that
company as the operator, and the `legal-docs` skill already routes both
documents through counsel before launch. Keep the store seller and the paper in
step: two different answers in two places is the thing a reviewer or a family
member notices.

### The Play developer account

`play-console-parallel-track.md` phase A step 1 says choose the **Personal**
account type and step 3 says set a public developer name, a developer email and
a developer website that Play shows to users. Google and Apple ask the question
separately, so they can disagree. They should not. Pick one identity and use it
in both stores.

**Confirmed on 2026-08-15, and it changes the schedule.** Two facts, both from
Google's own help centre:

1. Google asks an organization account for a D-U-N-S number, exactly as Apple
   does, plus an organization name, address, phone and website, plus a **publicly
   displayed verified developer phone number** shown beside the app.
   (support.google.com/googleplay/android-developer/answer/10788890)
2. **Organization accounts are exempt from the 12-tester, 14-consecutive-day
   closed test.** So are personal accounts created before 13 November 2023. The
   gate applies to personal accounts opened after that date, which is what a new
   account today would be.
   (support.google.com/googleplay/android-developer/answer/14151465)

The second fact is the one with weeks on it. Every other document in this folder
treats that tester gate as the critical path for the whole launch, roughly three
to four weeks, and unavoidable. It is avoidable, at a price.

**The real trade, once both stores are on the table:**

| | Individual / Personal | Organization |
|---|---|---|
| Apple | no D-U-N-S, enrol in a day or two | D-U-N-S, domain-matched website, work email on that domain, signing authority |
| Play | 12 testers for 14 consecutive days before production | exempt from the tester gate |
| Waiting | 3 to 4 weeks of tester gate, after the accounts exist | 1 to 4+ weeks for D-U-N-S and verification, before you can pay |
| Public name | your own legal name | the company name |

So it is not "faster versus slower." It is **where the waiting sits**. Individual
front-loads nothing and back-loads three to four weeks of recruiting and holding
twelve testers. Organization front-loads an unpredictable D-U-N-S and
verification queue that must clear before Apple will even take the 99 USD, then
walks past the tester gate entirely.

Three things worth weighing before the table tempts you:

- The organization path needs a **real registered legal entity**. If one does not
  exist yet, incorporating is a much larger decision than a store listing, and it
  is not reversible on a whim either.
- The organization wait is **unbounded and invisible**. Apple's forums carry 2026
  reports of multi-week waits at the post-D-U-N-S verification step with no
  status visibility. Twelve testers for fourteen days is slow, but you can see it
  progressing and you control it.
- The tester gate is **parallelisable**. It runs while the iOS submission is in
  review, so its three to four weeks overlap with work you are doing anyway. The
  D-U-N-S wait blocks the start of everything.

That last point is why the recommendation below still holds. But the choice
should be made knowing the exemption exists, not in ignorance of it.

### Payments and worker classification, later rather than now

`console-answers.md` section on financial features records the app as having no
lending, no payments, no crypto and no banking, and no Play Billing library is
present. So nothing in the product today depends on this choice.

It matters when money starts moving. The `marketplace-payments` and `legal-docs`
skills both assume a company: a Helper Agreement is signed by an entity, the
independent contractor posture is held by an entity, and general liability and
cyber cover are bought by an entity. None of that is blocked by an individual
Apple account, and none of it is created by an organization one. Incorporating
is its own decision on its own timeline. The store seller name can follow it
afterwards through the transfer path in section 3.

---

## 3. What it does not change

Worth listing, so the decision does not get more weight than it deserves.

- **The bundle identifier and the Android package.** Both stay `com.towinly.app`.
  They are frozen and they are set in `app.json`, not in the enrollment.
- **The app record, the listing, the screenshots, the privacy answers.** Every
  field in `console-answers.md` reads the same either way.
- **Pricing.** Towinly is free with no in-app purchases, so no Paid Apps
  agreement, no bank details and no tax forms, per `app-store-connect-fields.md`
  section 0.
- **The review outcome.** Apple reviews the app against the guidelines. The
  enrollment type is not a guideline.
- **The 99 USD.** Both cost the same.

### The cost of changing your mind

`APPLE-DAY-ONE-RUNBOOK.md` section 1 records it: Apple does not treat this as a
settings toggle. Either ask Apple Developer Support to convert the account, or
create an organization account and use App Transfer to move the app across.
Both are real, both take days of back and forth, and neither should be started
mid review. An App Transfer moves the existing app across rather than starting a
second listing, which is what makes the individual route survivable.
**Needs confirmation:** whether ratings and reviews carry across the transfer.
Apple documents the behaviour on its own transfer page, and the repo does not
record it.

**Needs confirmation:** the equivalent transfer path on Google Play. The repo
does not document it, and `mobile-release-ops` only records that a package name
can never be reused, which is a different question.

---

## 4. Individual, side by side

| | Individual | Organization |
| --- | --- | --- |
| Fee | 99 USD per year | 99 USD per year |
| Needs a legal entity | No | Yes |
| Needs a D-U-N-S number | No | Yes |
| Seller name on the store | The account holder's legal name | The company name |
| People with portal access | One | Many, with roles |
| Realistic time to active | A day or two, budget a week | The D-U-N-S wait, then enrollment |
| Reversible | Through support, or a new account plus App Transfer | Same |

---

## 5. The D-U-N-S path, if the answer is organization

Read this only if section 6 does not convince you.

1. The number is issued by Dun and Bradstreet and identifies a business. Apple
   requires it for organization enrollment.
2. Apple links its own D-U-N-S lookup and request form from the enrollment flow
   at `developer.apple.com/programs/enroll`. Start there rather than from a
   search engine, because a paid intermediary looks similar and this is free.
3. `APPLE-DAY-ONE-RUNBOOK.md` section 1 records the number as free, with a wait
   from a few days to a few weeks when the entity does not already have one.
   **Needs confirmation on the day:** Apple states its own current timing on that
   page, and it moves.
4. The whole wait lands **before** the 99 USD step, which `console-answers.md`
   item 3 also records. So an organization enrollment does not cost more money.
   It costs the calendar.
5. The entity has to exist first. A D-U-N-S request for a company that has not
   been formed goes nowhere.

---

## 6. The recommendation, and what would flip it

**Enroll as an individual.**

Three reasons, in order of weight.

1. **It is the only option that can be active in a week.** The organization
   route needs an entity, then a D-U-N-S number, then the enrollment. Any one of
   those can take longer than the whole individual path.
2. **Nobody else needs portal access.** Team size one is a real limit of the
   individual account and it costs Towinly nothing today.
3. **The name shown is already the public name.** The founder's name is what
   this project publishes under. A listing that shows it agrees with the website
   and the support page rather than contradicting them.

The price of this recommendation, stated plainly: a personal legal name and a
personal address sit on a public store listing, and moving to a company name
later means a support conversion or an App Transfer over several days.

**What would flip it to organization:**

- A Towinly legal entity already exists, or the owner is willing to form one now
  and the launch date can move by the length of the D-U-N-S wait.
- Someone other than the founder needs access to the developer portal, for
  example a contractor who will run builds.
- An investor, an institutional partner or an insurer requires the store seller
  to be the company. The `institutional-partnerships` skill is where that would
  surface first, and nothing in the repo records such a requirement today.
- The founder does not want a personal legal name and address public. This is a
  legitimate reason on its own and it does not need a business case.
- **Android is the priority market and the launch date is not.** Organization
  accounts skip Play's 12-tester, 14-consecutive-day gate entirely, per section 2
  above. If getting onto Play without recruiting and holding twelve testers for
  two weeks matters more than starting soon, that alone justifies the D-U-N-S
  wait. India is a majority-Android market, so this deserves real weight in a
  Towinly-specific way rather than being a generic consideration.

Any one of those is enough. The owner decides.

One trap to name before the decision, because it is the most common paperwork
mistake a solo founder makes here: **a registered sole proprietorship, a DBA or a
trade name does not put you on the organization path.** Apple explicitly rejects
DBAs, fictitious and trade names, and branches for organization enrollment. If
the business is a single person operating under a business name, the individual
path is the correct one, and attempting organization enrollment with it costs a
rejected application and a restart.

---

## 7. Before you click enroll

- [ ] Enrollment type chosen: individual or organization.
- [ ] The exact legal name confirmed against the government photo ID, and the
      Apple Account name corrected first if it differs.
- [ ] Two factor authentication on, on an Apple Account you will control for
      years. The account becomes the Account Holder and cannot be swapped
      casually.
- [ ] The copyright line settled as `2026 <that same legal identity>`, ready to
      paste into the field listed in `console-answers.md`.
- [ ] The same identity decided for Google Play, so the two stores do not show
      two different sellers.
