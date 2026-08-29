# Left-behind queue (2026-08-28 evening) Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:executing-plans to implement this plan
> in the current session (owner rule: subagent-driven loops start only on an explicit call).
> Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Close every item an agent can close from the 2026-08-28 "what is left behind" list,
across the three repos (App, website/backend, marketing), leaving only owner-only work.

**Architecture:** Five chunks in the order the owner listed them: (1) ship-ready App change set,
(2) backend + website repo, (3) marketing backlog MKT-703..708 plus the uncommitted reel,
(4) older App items (family swipe, react-review closure, SHIP-608 re-sweep), (5) housekeeping
(observation review, memory). Each task is TDD where there is code, verification last, one
commit per task, nothing pushed without the owner's word.

**Tech Stack:** React Native + Expo SDK 54 (jest, RNTL 14), Spring Boot 3.5 + Flyway + Postgres 18
(local `towin_test`), Node 22 CDP scripts + Python PIL for marketing pixels, Remotion for reels.

**Owner-only, not in this plan:** store paperwork (owner-actions.md §1-7, §9), Google Play
account, the cut-off "and remove it f" message, phone testing of build 21, MCP tokens, pushes.

---

## Chunk 1: App change set + website hygiene

### Task 1: Commit the afternoon owner-call change set (App)

**Files:** the 10 modified files on `ralph/store-hardening` (profile.jsx, action.jsx,
posted-help.jsx, PostedHelpList.jsx, FamilyHomePanel.jsx, MyEldersPanel.jsx, MyHelpersPanel.jsx,
SegmentedControl.jsx, family-guards.test.js, posted-help.test.js).

- [x] **Step 1: Full suite** `npx jest --forceExit` → 165 suites, 1369 tests, exit 0.
- [x] **Step 2: Commit** `git add <10 files>` then
  `git commit -m "feat: profile trust row wears the shield, one number per Posted Help chip, no lines under tab headings"`.

### Task 2: Website repo hygiene (`~/Documents/Projects/ToWin`)

- [x] **Step 1:** Append to `.gitignore` the three offline API-doc files the README already calls
  "local only, gitignored": `docs/architecture/towinly-api-docs.html`, `towinly-openapi.json`,
  `towinly-openapi.yaml`.
- [x] **Step 2:** `git add .gitignore family.md`; commit `docs: family feature reference; ignore the offline API docs`.
- [x] **Step 3:** Left `family-helpers.md` (an 87-line accessibility-snapshot dump) untracked; report it.

## Chunk 2: Backend

### Task 3: Inactivity cron: enum literal fails on Postgres

**Root cause:** `UserRepository.findInactiveElders` compares `u.role` against JPQL enum literals
(`com.towinly.common.enums.UserRole.ELDER`). `User.role` is `@JdbcTypeCode(SqlTypes.NAMED_ENUM)`
on a Postgres `user_role` column; Hibernate renders the literal as a cast to the Java simple name
(`::UserRole`), a type Postgres does not have. The offline `RepositoryQueryParsingTest` is green
because parsing succeeds; only execution fails, every day at 09:00, in production.

**Files:**
- Modify: `backend/src/main/java/com/towinly/common/repository/UserRepository.java`
- Create: `backend/src/test/java/com/towinly/emergency/InactivityQueryDbTest.java` (gated on `TOWINLY_DB_TESTS`)

- [x] **Step 1: Failing DB test.** JPA slice test (`@DataJpaTest`, `Replace.NONE`, env-gated like
  `MigrationsApplyDbTest`) that persists one ELDER whose `lastSeenAt` is 6 days old and calls
  `findInactiveElders(now-5d, now-7d)`. Expect the elder back.
- [x] **Step 2: Run** `TOWINLY_DB_TESTS=true SPRING_DATASOURCE_URL=jdbc:postgresql://localhost:5432/towin_test SPRING_DATASOURCE_PASSWORD=0000 ./mvnw -q test -Dtest=InactivityQueryDbTest`
  → FAIL with `type "userrole" does not exist` (or the cast error the log carries).
- [x] **Step 3: Fix.** Bind the roles as a parameter:
  ```java
  @Query("""
      SELECT u FROM User u
      WHERE u.role IN :roles
        AND u.isActive = true
        AND ((u.lastSeenAt IS NOT NULL AND u.lastSeenAt < :cutoff)
             OR (u.lastSeenAt IS NULL AND u.createdAt < :cutoff))
        AND (u.inactivityAlertedAt IS NULL OR u.inactivityAlertedAt < :alertCutoff)
      """)
  List<User> findInactiveElders(@Param("roles") Collection<UserRole> roles,
                                @Param("cutoff") LocalDateTime cutoff,
                                @Param("alertCutoff") LocalDateTime alertCutoff);

  default List<User> findInactiveElders(LocalDateTime cutoff, LocalDateTime alertCutoff) {
      return findInactiveElders(List.of(UserRole.ELDER, UserRole.BOTH), cutoff, alertCutoff);
  }
  ```
- [x] **Step 4: Run** the DB test → PASS; `./mvnw -q test -Dtest=InactivityCheckServiceTest,RepositoryQueryParsingTest` → PASS.
- [x] **Step 5: Commit** `fix: inactivity cron binds the elder roles as a parameter, the enum literal cast to a type Postgres lacks`.

### Task 4: Server-side blocks (HARD-106, backend)

**Files:**
- Create: `backend/src/main/resources/db/migration/V58__create_user_blocks_table.sql`
- Create: `backend/src/main/java/com/towinly/block/entity/UserBlock.java`
- Create: `backend/src/main/java/com/towinly/block/repository/UserBlockRepository.java`
- Create: `backend/src/main/java/com/towinly/block/service/BlockService.java`
- Create: `backend/src/main/java/com/towinly/block/dto/BlockRequest.java`, `BlockSyncRequest.java`, `BlockResponse.java`
- Create: `backend/src/main/java/com/towinly/block/controller/BlockController.java`
- Modify: `ConnectionService` (getMyConnections, sendRequest), `DiscoveryService` (both lists),
  `MessageService.send`, `NeedService` (getAllOpen, browseNearby, apply)
- Tests: `BlockServiceTest`, plus one case each in `ConnectionServiceTest`, `DiscoveryServiceTest`,
  `MessageServiceTest`, `NeedServiceTest`; add `UserBlockRepository` to `RepositoryQueryParsingTest`.

Migration:
```sql
CREATE TABLE user_blocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    blocker_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    blocked_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_user_blocks_pair UNIQUE (blocker_user_id, blocked_user_id),
    CONSTRAINT ck_user_blocks_not_self CHECK (blocker_user_id <> blocked_user_id)
);
CREATE INDEX idx_user_blocks_blocker ON user_blocks(blocker_user_id);
CREATE INDEX idx_user_blocks_blocked ON user_blocks(blocked_user_id);
```

Service surface (the tool catalog):
- `block(blockerId, blockedId)` idempotent; self → IllegalArgumentException.
- `unblock(blockerId, blockedId)` idempotent.
- `listBlocked(blockerId)` → `List<BlockResponse{userId,name,createdAt}>` (names via DisplayNameResolver).
- `sync(blockerId, List<UUID> ids)` → inserts the missing ones, returns the full list (device hydration).
- `hiddenFor(userId)` → `Set<UUID>` of everyone hidden from this user, BOTH directions.
- `isHidden(a, b)` → true when either blocked the other.

Filtering (never tells the blocked person): connections list drops rows whose other party is
hidden; discovery drops hidden profiles; open/nearby needs drop hidden elders; `send`,
`sendRequest` and `apply` refuse with `IllegalStateException` (→ the existing 409 shape) using
neutral words: "This chat is closed right now." / "This request isn't available right now."

- [x] **Step 1:** `BlockServiceTest` (Mockito, mirrors `ConnectionServiceTest`): self-block refused;
  block twice stores once; hiddenFor returns both directions; sync inserts only the new ids.
- [x] **Step 2:** Run → compile failure (class missing). Create entity, repo, service, DTOs, migration.
- [x] **Step 3:** Run → PASS. Commit `feat: user blocks table, service and /api/blocks`.
- [x] **Step 4:** Filter tests, one per service, RED → GREEN, one commit:
  `feat: blocks hide people from connections, discovery, needs and messaging, both directions`.
- [x] **Step 5:** DB gate: `MigrationsApplyDbTest` + `ApplicationContextLoadsDbTest` against `towin_test` → PASS.
- [x] **Step 6:** Full `./mvnw -q test` → PASS, state the number.

### Task 5: App hydrates blocks from the server (HARD-106, phone half)

**Files:**
- Create: `App/src/api/blocks.js` (`listBlockedPeople`, `blockPerson`, `unblockPerson`, `syncBlockedPeople`)
- Modify: `App/src/lib/blockList.js` (server first, device cache second, one-time upload of the
  device list), `App/app/user/[id].jsx` (copy no longer says "on this phone"), `App/app/blocked.jsx`
  (unblock failure toast), `App/__tests__/blockList.test.js`, `block-tells-the-truth.test.js`.

Design: `getBlocked(userId)` → `GET /blocks`; on success, if the device list holds ids the server
lacks, `POST /blocks/sync` once and merge; persist the merged list as the device cache. On a
network failure return the cache. `blockUser` persists locally first (protection now), then
`POST /blocks`; a failed POST is retried by the next sync. `unblockUser` sends `DELETE` first and
only then removes locally, so a failed delete cannot silently resurrect.

- [x] **Step 1:** RED tests: server list wins; device-only ids get uploaded once; offline falls back to cache; unblock refuses when the server refuses.
- [x] **Step 2:** Implement `src/api/blocks.js` + `blockList.js` → GREEN.
- [x] **Step 3:** Update copy: HALF_DONE sentence and the confirm dialog stop claiming "this phone only".
- [x] **Step 4:** `npx jest blockList block-tells --forceExit` → PASS; commit `feat: blocks live on the server; the phone keeps a cache and uploads what it already held`.

## Chunk 3: Marketing (`marketing/`, own repo)

### Task 6: Commit the founder-story reel
- [x] `git add REELS-CAPTIONS.txt remotion-reels/src/Root.tsx remotion-reels/src/ReelFounderStory.tsx remotion-reels/src/ReelFounderStoryVoiced.tsx remotion-reels/public/vo video/towinly-reel-founder-story.mp4 video/towinly-reel-founder-story-voiced.mp4`
  → commit `feat: founder story reel, plain and voiced, made with Remotion`.

### Task 7: MKT-707 README rewrite
- [x] Derive counts by listing the folders (posts PNGs, carousel slides, scheduled reels in POST-IN-ORDER).
- [x] Rewrite `README.md`: structure, the real pipeline (serve → shot-batch → render-frames + encode-mp4 → sync-post-in-order, and why sync exists), the background rule (full-height warm wash, no cool tint, never end a gradient before 100%), reference tree is `ToWin/`. Every path checked with `test -e`.
- [x] humanizer + stop-slop passes on the prose; `grep -c '—' README.md` = 0. Commit.

### Task 8: MKT-706 alt text gaps
- [x] Extract one late frame per scheduled reel (`swift tools/extract-frames.swift <mp4> <dir> 9.6 9.7 1`), look at each, write a cover-frame description under a new `## Reel cover frames` section in `instagram/captions.md`, and add the same text under `COVER FRAME` in each reel's `POST-IN-ORDER/*-CAPTION.txt`.
- [x] Check every still has an entry (42 PNGs incl. carousel). Fill gaps. stop-slop pass; `grep -c '—'` = 0. Commit.

### Task 9: MKT-705 founder-note options
- [x] Write `marketing/FOUNDER-NOTE-OPTIONS.md`: 2–3 options, every fact from HARSHA-STORY.md, real name, no invented quote; humanizer then stop-slop. Artwork untouched. progress.txt: "waits on the owner". Commit.

### Task 10: MKT-703 machine contrast check
- [x] `tools/contrast-boxes.mjs`: CDP over each HTML source (same shell as shot-batch), emit `{post, boxes:[{x,y,w,h,fontPx,weight,text}]}` for every visible text node.
- [x] `tools/contrast-check.py` (PIL+numpy): for each box in the rendered PNG, ink = the 0.5% of pixels farthest in luminance from the box's dominant colour, background = that dominant colour; ratio per WCAG; large text = ≥24px or ≥18.66px bold → 3:1 else 4.5:1. Table to stdout.
- [x] Run across all 42 PNGs; fix every FAIL in its HTML; re-render (`node tools/shot-batch.mjs`), re-check, `node tools/sync-post-in-order.mjs`. Results table + accepted exceptions into `ralph-marketing/progress.txt`. Commit.

### Task 11: MKT-708 reel frames really carry the fix
- [x] `tools/frame-audit.py`: for each scheduled reel, frames at 1.0/5.5/9.8/11.3 s; flag any pixel run in the cool-blue family (`b > r+8 && b >= g && sat < 0.25`, area > 0.2%) and any horizontal seam (row-mean jump > 12 on the left 40 px strip). Look at every flagged frame; look at the 9.8–11.3 frames for the closing logo (dash cleanup, one turtle).
- [x] `cmp` each POST-IN-ORDER mp4 against its `video/` source. Record in progress.txt. Commit.

### Task 12: MKT-704 designer's-eye pass over the set
- [x] Contact sheets (PIL montage) of the 42 stills and the reel covers. Invoke `impeccable` (audit) and `gstack-design-review` on the set; plus a measured drift table from Task 10's boxes: headline px, left margin, footer y per post.
- [x] Fix real drift in the HTML, re-render, sync. Findings with fixed / kept verdicts in progress.txt. Commit.

## Chunk 4: App, older items

### Task 13: Swipe between segments on My Family
- [x] RED: `__tests__/my-family-swipe.test.js` — a horizontal swipe on the Controls pane moves `tab` to `members` (mirror the SwipeSegments gesture test in posted-help.test.js).
- [x] Wrap the three top-level panes in `<SwipeSegments keys={['controls','members','how']} value={tab} onChange={setTab}>` and the two Controls panes in `<SwipeSegments keys={['watching','acting']} …>`. GREEN. Commit.

### Task 14: React-review findings: close the record
- [x] Verify in code: DEEP-04 (elder-name link), DEEP-17 (Post Help radiogroup), DEEP-18 (sealed-box radios), DEEP-19 (Skip to Home is a button), PostedHelpList focus refresh (test exists). Write the verdicts into `docs/audit/audit-2026-08-11-deep.md` "Fixed" boxes for those ids; update memory `react-review-open-findings`.

### Task 15: SHIP-608 third sweep (current tip)
- [x] Run checks 1 (`npx expo config --type introspect`), 4 (full jest, number), 5 (em-dash / beta greps), 6 (three demo seats against live Railway: `/auth/login`, `/connections`, `/trust/my-score`). Name 2 (prebuild --clean rewrites package.json scripts in the working tree; run only in a worktree) and 3 (MobSF not running on :8000) as NOT RUN with the reason.
- [x] Append "Third sweep, 2026-08-28" to `docs/audit/2026-08-07-presubmission-verification.md`. Commit.

## Chunk 5: Housekeeping
- [x] Task 16: task-observer review of the 188 OPEN observations (load `references/weekly-review.md`; group, act only on additive fixes, stage the rest for the owner).
- [x] Task 17: memory + `tasks/todo.md` updated; final recap with what is committed where, what needs the owner, and the push list.
