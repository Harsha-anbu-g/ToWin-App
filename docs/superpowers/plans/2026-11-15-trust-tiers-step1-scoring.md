# Trust tiers, step 1: points arrive when a help is finished

> **For agentic workers:** execute in this session with superpowers:executing-plans (the owner has not asked for subagent-driven runs). Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A friendship adds to either person's trust score only after the elder ends a help between them, using the ladder step reached at that moment.

**Architecture:** One new nullable column on `connections` holds the banked step. `NeedService.complete` writes it. `TrustScoreService` counts a friendship only when it is set. A version stamp on `users` lets a small startup task recalculate every stored score exactly once.

**Tech stack:** Spring Boot 3.5, Java 21, JPA, Flyway, JUnit 5 + Mockito + AssertJ. Run from `backend/` with `./mvnw`.

**Spec:** `App/docs/superpowers/specs/2026-11-15-trust-tiers-design.md`, section 4.5.
**Where:** worktree `~/Documents/Projects/ToWin/.worktrees/trust-tiers`, branch `feat/trust-tiers`, cut from `origin/main` `b121966`. Never the shared checkout. No push without the owner's yes.

**Out of this plan:** sizing, the gate, the locked row, the family door (steps 2 to 4, own plans). The phone and website screens for this step are chunk 2 below, planned in detail after the owner sees the server numbers.

---

## Chunk 1: server

### File map

| File | Change |
|---|---|
| `backend/src/main/resources/db/migration/V65__bank_trust_step_on_finished_help.sql` | Create. Column, backfill, version stamp |
| `connection/entity/Connection.java` | Add `bankedTrustLevel` |
| `common/entity/User.java` | Add `trustScoreVersion` |
| `common/service/TrustScoreService.java` | Count a friendship only when banked; ladder points from the banked step; `CURRENT_VERSION` |
| `trust/dto/TrustScoreBreakdownResponse.java` | `CustomerCard.counted` |
| `need/service/NeedService.java` | `complete` banks the step and recalculates both people |
| `common/repository/UserRepository.java` | `findIdsByTrustScoreVersionLessThan` |
| `common/service/TrustScoreRebase.java` | Create. Startup task, runs until every user is stamped |
| `common/seed/DemoDataSeeder.java` | Demo friendships at "met in person" or above are banked |
| Tests | `TrustScoreServiceTest`, `TrustScoreServiceFamilyPointsTest`, `NeedServiceTest`, new `TrustScoreRebaseTest` |

### Task 1: the column, the backfill, the stamp

- [ ] Write `V65__bank_trust_step_on_finished_help.sql`:

```sql
-- Trust tiers step 1 (2026-11-15): a friendship counts toward the trust score only
-- after the elder has ended a help between the two people. banked_trust_level is the
-- ladder step the pair had reached when that help ended; NULL = no finished help yet.
ALTER TABLE connections ADD COLUMN banked_trust_level INTEGER;

-- Going live: the step at the time was never stored, so a pair that already has a
-- finished help banks the step it is on today (spec section 10, choice 5).
UPDATE connections c
SET banked_trust_level = c.current_trust_level
WHERE EXISTS (
    SELECT 1
    FROM needs n
    JOIN need_applications a ON a.need_id = n.id
    WHERE n.status = 'COMPLETED'
      AND a.status = 'ACCEPTED'
      AND ((n.elder_id = c.user_a AND a.helper_id = c.user_b)
        OR (n.elder_id = c.user_b AND a.helper_id = c.user_a))
);

-- Stored scores were computed under the old rule. Existing rows are stamped 3 so
-- TrustScoreRebase recalculates each once; rows created from now on start at 4.
ALTER TABLE users ADD COLUMN trust_score_version INTEGER NOT NULL DEFAULT 3;
ALTER TABLE users ALTER COLUMN trust_score_version SET DEFAULT 4;
```

- [ ] `Connection`: `@Column(name = "banked_trust_level") private TrustLevel bankedTrustLevel;` (the auto-applied `TrustLevelConverter` already maps null).
- [ ] `User`: `@Column(name = "trust_score_version", nullable = false) @Builder.Default private Integer trustScoreVersion = 4;`
- [ ] Compile: `./mvnw -q -o compile`. Expected: no errors.

### Task 2: the score counts only banked friendships (test first)

- [ ] In `TrustScoreServiceTest` add a helper `finished(customer, liveLevel, bankedLevel)` that builds a connection with both levels set, and point the existing point-earning tests at it (`rooting_isOne_atDiscovered`, `rooting_isSeven_atTrusted`, `rooting_isFive_atVerified`, `review_countsThatCustomersLatestRating`, `total_sumsAcrossCustomers_includingProfilePerCustomer`, `recalculate_storesIntegerTotalOnUser`), banked equal to live, so their numbers stay as they are.
- [ ] Add failing tests:
  - `friendshipWithNoFinishedHelp_addsNothing`: full profile, one TRUSTED connection with banked null, a 5-star review. Total is 3.0 (own profile only); the card shows rooting 0, review 0, profile 0, total 0, `counted` false, `stageIndex` 6.
  - `ladderPoints_comeFromTheBankedStep_notTheLiveStep`: live TRUSTED, banked VIDEO_CALL. Rooting is 4.
  - `recalculate_ignoresUnbankedFriendships`: one unbanked TRUSTED connection. Stored score is 0.0.
  - `recalculate_stampsTheCurrentVersion`: after `recalculate`, `trustScoreVersion` is `TrustScoreService.CURRENT_VERSION` (4).
- [ ] Run `./mvnw -q -o test -Dtest=TrustScoreServiceTest`. Expected: the four new tests fail.
- [ ] Implement in `TrustScoreService`: `public static final int CURRENT_VERSION = 4;`. In both loops, after the `earnsTrust` check: `TrustLevel banked = c.getBankedTrustLevel();`. In `recalculate`, `if (banked == null) continue;`, then `rootingPoints(banked)`. In `getMyScoreBreakdown`, a null banked step yields a card with zeros and `counted(false)` and adds nothing to the total; otherwise as today with `rootingPoints(banked)` and `counted(true)`. `stageIndex` and `currentStageLabel` keep showing the live step. `recalculate` sets `user.setTrustScoreVersion(CURRENT_VERSION)` before saving. Update the class comment to state the rule.
- [ ] `CustomerCard`: add `private boolean counted;`.
- [ ] Run the class again. Expected: all pass. Run `-Dtest=TrustScoreServiceFamilyPointsTest` and bank its connections the same way if it fails.

### Task 3: ending a help banks the step (test first)

- [ ] In `NeedServiceTest` add failing tests:
  - `completingAHelp_banksTheStepTheyHaveReached`: ASSIGNED need, ACCEPTED application for `helper`, `findAllBetweenUsers(elder, helper)` returns one ACTIVE connection at VIDEO_CALL with banked null. After `complete`, banked is VIDEO_CALL, the connection is saved, and `trustScoreService.recalculate` is called for the helper and for the elder.
  - `completingALaterHelp_neverLowersTheBankedStep`: banked FIRST_MEET, live VIDEO_CALL stays FIRST_MEET. (Guards a restarted ladder.)
  - `completingAHelp_withNoFriendshipRow_stillCompletes`: empty list, no exception, need is COMPLETED.
- [ ] Run. Expected: fail.
- [ ] Implement in `NeedService.complete`, replacing the `ifPresent` block:

```java
applicationRepository.findByNeedId(needId).stream()
        .filter(a -> a.getStatus() == ApplicationStatus.ACCEPTED)
        .findFirst()
        .ifPresent(a -> bankTrustStep(need.getElder().getId(), a.getHelper().getId()));
```

```java
/**
 * Trust tiers step 1: a friendship starts counting toward both people's trust
 * score when the elder ends a help between them, at the ladder step they have
 * reached by then. A later help can raise the banked step, never lower it.
 */
private void bankTrustStep(UUID elderId, UUID helperId) {
    connectionRepository.findAllBetweenUsers(elderId, helperId).stream()
            .filter(c -> ConnectionType.earnsTrust(c.getType()))
            .filter(c -> c.getStatus() == ConnectionStatus.ACTIVE
                    || c.getStatus() == ConnectionStatus.PAUSED)
            .findFirst()
            .ifPresent(c -> {
                TrustLevel banked = c.getBankedTrustLevel();
                TrustLevel live = c.getCurrentTrustLevel();
                if (banked == null || live.getValue() > banked.getValue()) {
                    c.setBankedTrustLevel(live);
                    connectionRepository.save(c);
                }
            });
    trustScoreService.recalculate(helperId);
    trustScoreService.recalculate(elderId);
}
```

- [ ] Run `-Dtest=NeedServiceTest,NeedOnBehalfTest`. Expected: pass.

### Task 4: every stored score is recalculated once (test first)

- [ ] `UserRepository`: `@Query("SELECT u.id FROM User u WHERE u.trustScoreVersion < :version") List<UUID> findIdsByTrustScoreVersionLessThan(@Param("version") int version, Pageable page);`
- [ ] New `TrustScoreRebaseTest`: two stale ids on the first page, none on the second; `run` recalculates both and stops. A user whose recalculation throws is logged and the others still run, and the loop ends (no endless retry in one boot).
- [ ] New `TrustScoreRebase implements ApplicationRunner`, `@Order` after the seeders are irrelevant (it is idempotent): pages of 200 while the page is non-empty and made progress, `trustScoreService.recalculate(id)` each inside try/catch, one `log.info` with the count when it did anything.
- [ ] Run its test. Expected: pass.

### Task 5: demo accounts

- [ ] `DemoDataSeeder.ensureConnection` (the 8-argument one): an ACTIVE demo friendship at FIRST_MEET or TRUSTED is seeded as having a finished help: set `bankedTrustLevel` to the seed level on create, and on an existing row when it is null. Lower demo friendships stay unbanked so the demo shows both states.
- [ ] Run the seeder tests: `./mvnw -q -o test -Dtest='*Seeder*'`.

### Task 6: whole suite, numbers, commit

- [ ] `caffeinate -i ./mvnw -q -o test` from `backend/`. Fix every test that pinned an old score; each fix must be a banked connection or a new expected number that follows from the rule, never a loosened assertion.
- [ ] Write the before and after score of each demo account into the step report for the owner.
- [ ] Commit on `feat/trust-tiers` (own files only, no co-author line): `feat(trust): a friendship counts toward the score once a help is finished`.

## Chunk 2: screens (planned after the owner sees chunk 1)

- Phone app and website: each friendship on the Trust Score page says "Counts after a help is finished" while `counted` is false; a one-time plain note explains the new rule; the user guide and the Ask AI guide text describe it. English, French, Tamil.
- Runs through the project's UI rules: `HCI-RULES.md`, impeccable, the design skills, jest with `--forceExit`.

## Risks

- Scores drop for real members on deploy. The note in chunk 2 must ship with, or before, the server change reaches production.
- Step 2's gate reads these scores. Do not turn the gate on until the rebase has run in production.
