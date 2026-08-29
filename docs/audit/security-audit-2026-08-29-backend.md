# Security Audit: Towinly backend and the app-backend trust boundary (2026-08-29)

Scope: the Spring Boot API in `ToWin/backend` (the live backend, its own repo, currently at `2c82c6f` on main) and the boundary between it and the mobile app. White-box, read-only. Seven attack classes read the code in parallel; every finding was then put to two independent verifiers, each required to either build a concrete attacker request path or refute it against the code as it stands. 21 raw findings, deduped to 14 by location, 8 survived both verifiers. This document is the record the workflow's write step could not produce (it hit the account usage limit); it is reconstructed from the verified findings on disk.

Read this before acting: these are static-analysis findings, cross-checked against the code but not run against a live server. Confirm each with a real request before and after the fix. The shared recon step that briefed the finders was flagged by a safety classifier for reading the auth and JWT internals; the findings below are ordinary defensive appsec (authorization gaps, PII overexposure, location privacy, enumeration) and were re-derived from the code, but treat them as leads to verify, not proven live exploits. The backend is edited in `~/Documents/Projects/ToWin`, not in `App/`; its tests are the Spring Boot suite.

## Summary

| Severity | Count | Meaning |
|----------|-------|---------|
| CRITICAL | 0 | |
| HIGH | 2 | An elder's home can be located, and their phone number harvested, by any ordinary account. |
| MEDIUM | 5 | A block does not fully cut contact; a stranger reads social handles; the directory can be scraped. |
| LOW | 1 | Registration confirms whether an email is a member. |
| **Total** | **8** | |

The headline: the app rounds location on the device, but the server stores the raw coordinate and hands back a distance precise to 100 metres from an origin the caller chooses, so three ordinary queries locate an elder's home. This directly contradicts the App Store and Play answers, which state location is approximate only. The second HIGH lets any established helper pull elders' phone numbers in bulk by sending connection requests that are never accepted.

## Findings index

| ID | Sev | Finding | Location |
|----|-----|---------|----------|
| SEC-01 | HIGH | Location trilateration: server stores raw GPS, /discover and /needs/nearby return 100 m distances from an attacker-chosen origin | discovery/service/DiscoveryService.java:116, need/service/NeedService.java:131 |
| SEC-02 | HIGH | Elder phone number leaked on an unaccepted or ended connection (phone gate checks trust level, not ACTIVE status) | connection/service/ConnectionService.java:358, 394, 128 |
| SEC-03 | MEDIUM | Block does not close the message-read path: a blocked user still reads the thread and marks it seen | messaging/service/MessageService.java:147 |
| SEC-04 | MEDIUM | GET /needs/{id} skips the block filter and participant check | need/service/NeedService.java:318 |
| SEC-05 | MEDIUM | Blocked helper still appears in family standings and a chat can be materialized to them | family/service/FamilyStandingService.java:120 |
| SEC-06 | MEDIUM | Elder Facebook and Instagram handles handed to any stranger, bypassing the trust ladder | profile/service/ProfileService.java:180 |
| SEC-07 | MEDIUM | Unbounded discovery page size allows bulk scraping of the whole member directory | discovery/dto/DiscoveryFilter.java:11 |
| SEC-08 | LOW | Account and email enumeration on registration | auth/service/AuthService.java:67 |

---

## HIGH

### SEC-01: Location trilateration, the server defeats the on-device rounding (CWE-359)

**Location:** `discovery/service/DiscoveryService.java:116`, also `need/service/NeedService.java:131` (and the /needs/nearby path at 141/318/476).
**Endpoints:** `GET /api/discover/elders`, `GET /api/discover/helpers`, `GET /api/needs/nearby`.

**Exploit.** The caller controls the origin point: DiscoveryController binds `@ModelAttribute DiscoveryFilter`, and `resolvedLat/resolvedLng` use `filter.getLat()/getLng()` verbatim. Each row in the response carries `userId` plus `distanceKm(Math.round(distanceKm * 10.0) / 10.0)`, the true haversine distance snapped to 100 m. An ordinary authenticated attacker calls `/api/discover/elders?lat=X1&lng=Y1&radiusKm=9999` to read a target's userId and distance d1, then repeats from two more chosen origins. Three known points and three 100 m distances solve for the stored coordinate. The same oracle is on /needs/nearby per open request.

**Impact.** Stalking and burglary risk against a population known to be elderly and often living alone. The endpoint already returns name, age, photo and city; the precise distance pins the home. The on-device rounding in `coarseLocation.js` is not a control here, because the server holds and exposes the fine value. This is the finding that contradicts the store paperwork.

**Suggested fix.** Coarsen server-side: round every stored coordinate to the 0.02 degree cell in `ProfileService.updateLocation` and `NeedService.postNeed` before persisting, and return the distance in wide bands (`<2 km`, `2-5 km`, `5-10 km`) rather than a 100 m float. Additionally reject or ignore a caller-supplied `filter.lat/lng` that differs materially from the caller's own stored, coarsened position, so the origin cannot be swept.

- [ ] Fixed

### SEC-02: Elder phone number leaked on an unaccepted connection request (CWE-639)

**Location:** `connection/service/ConnectionService.java:358` and `:394`, with the head-start at `:128`.
**Endpoints:** `POST /api/connections/request`, `GET /api/connections`.

**Exploit.** `toResponse` gates the counterparty phone on trust LEVEL only, never on status: `phoneUnlocked = currentTrustLevel.getValue() >= PHONE_CALL.getValue()` (358), `.otherUserPhone(phoneUnlocked ? other.getPhone() : null)` (394). `sendRequest` gives the sender a score-based head start (`senderScore >= 51` starts at PHONE_CALL, 128-129), builds the connection as PENDING at that level, and returns `toResponse(saved, senderId)`. So any established helper whose own trustScore is 51 or more sends a request to a target and reads the target's phone in the response, with no acceptance and no mutual ladder progression. Ended and declined connections keep leaking too, because status is ignored.

**Impact.** Bulk harvesting of elders' phone numbers by any semi-trusted helper, with no consent. The phone is exactly the PII the trust journey exists to protect, and elder phone numbers feed scam and robocall targeting.

**Suggested fix.** Require ACTIVE status for phone disclosure: `phoneUnlocked = connection.getStatus() == ConnectionStatus.ACTIVE && currentTrustLevel >= PHONE_CALL`. Do not apply the score head-start's phone visibility to PENDING, DECLINED or ENDED connections.

- [ ] Fixed

---

## MEDIUM

### SEC-03: Block does not close the message-read path (CWE-863, HARD-106 gap)

**Location:** `messaging/service/MessageService.java:147`.
**Endpoints:** `GET /api/messages/{connectionId}`, `POST /api/messages/{connectionId}/seen`.

**Exploit.** HARD-106 hides the connection and refuses new sends (`requireNoBlock`, 268), but `getHistory` and `markSeen` authorize only through `getAuthorizedConnection`, which returns the connection for any participant with no block check (150-164). A blocked party who still holds the connectionId from before the block calls `GET /api/messages/{connectionId}?channel=MAIN` and receives the full prior history and can stamp it seen; a blocked family member can still read the FAMILY_UPDATES branch.

**Impact.** The block is incomplete: the blocked party still pulls the conversation and its seen-state by direct id. Lower than the phone leak because no new content flows once sends are refused, but it defeats the expectation that a block cuts the connection both ways.

**Suggested fix.** In `getAuthorizedConnection`, after the participant and family gate, `if (blockService.isHidden(conn.getUserA().getId(), conn.getUserB().getId())) throw new IllegalStateException(BlockService.CHAT_CLOSED);`, and the same for the FAMILY_UPDATES branch, so reads and seen-stamps are refused across a block exactly as sends are.

- [ ] Fixed

### SEC-04: GET /needs/{id} skips the block filter and participant check (CWE-639)

**Location:** `need/service/NeedService.java:318`.
**Endpoint:** `GET /api/needs/{needId}`.

**Exploit.** `getOne(callerId, needId)` returns title, description, elderName and status to any authenticated caller holding the id, computing only `isOwner`. It never calls `blockService.isHidden(callerId, need.getElder().getId())`, unlike every other need read path (getAllOpen:117, browseNearby:137, applicants:438). A blocked helper who already has the needId from the open feed keeps reading the elder's request content and live status across the block, and the id grants read to needs the caller was never party to.

**Impact.** A block does not sever the blocked party's read access to the elder's often sensitive help-request content. Inconsistent with the HARD-106 model enforced everywhere else.

**Suggested fix.** In `getOne`, after loading the need, `if (blockService.isHidden(callerId, need.getElder().getId())) throw new IllegalStateException(BlockService.NOT_AVAILABLE);`, and treat a non-participant non-owner caller consistently with the feed filter.

- [ ] Fixed

### SEC-05: Blocked helper still appears in family standings (CWE-284)

**Location:** `family/service/FamilyStandingService.java:120` (also 62, 75, 160).
**Endpoints:** `GET /api/family/standings`, `POST /api/family/standings/{connectionId}/chat`.

**Exploit.** Every other listing subtracts blocks via `blockService.hiddenFor()/isHidden()`, but the family-standing surface injects no BlockService and checks nothing. After a helper H blocks family member F, F still sees H (name, photo, trust stage) in `/api/family/standings`, and `materializeChat` (160) still creates and returns an ACTIVE FAMILY connection to H. Message send is still refused, so no text is delivered, but the presence and the connection object leak.

**Impact.** A blocked helper stays visible and connectable on the blocker's family surface, contradicting the block guarantee and revealing that the blocked party is still active.

**Suggested fix.** In `toStanding`, `standingsFor`, `familyBehind` and `materializeChat`, drop any (familyUser, helper) pair where `blockService.isHidden(familyUserId, helperUserId)`, mirroring `ConnectionService.getMyConnections` and `DiscoveryService`.

- [ ] Fixed

### SEC-06: Elder social-media handles handed to any stranger (CWE-285)

**Location:** `profile/service/ProfileService.java:180` (elder), `:198` (helper).
**Endpoint:** `GET /api/profile/{id}`.

**Exploit.** `buildProfileResponse` correctly gates email, phone and dateOfBirth on `isSelf`, and phone again behind PHONE_CALL on the connections endpoint. But `facebookUrl` and `instagramUrl` are set unconditionally (180-181, 198-199), regardless of isSelf, trust level or whether any connection exists. Any authenticated attacker sends `GET /api/profile/<victimUuid>` and reads the victim's Facebook and Instagram, plus gender, occupation, age and city.

**Impact.** De-anonymization and cross-platform tracking of an elder by anyone with an account, before any trust is built. This is the linkage the trust ladder withholds until the VERIFIED step.

**Suggested fix.** Gate `facebookUrl/instagramUrl` (and reconsider occupation and gender) the way phone is gated: return them only when isSelf, or when an ACTIVE connection between caller and target has reached at least VERIFIED. Null them otherwise.

- [ ] Fixed

### SEC-07: Unbounded discovery page size allows directory scraping (CWE-770)

**Location:** `discovery/dto/DiscoveryFilter.java:11`, applied at `DiscoveryService.java:63`.
**Endpoints:** `GET /api/discover/elders`, `GET /api/discover/helpers`.

**Exploit.** `DiscoveryFilter.size` is a plain int bound from the query with no cap, applied as `.limit(filter.getSize())` over an in-memory list. `GET /api/discover/elders?size=100000&radiusKm=100000` returns every elder in one response with name, age, city, bio, interests and photo. One account harvests the whole directory in a few calls, and the in-memory rank-then-limit is a memory-pressure vector.

**Impact.** Mass PII scraping of a vulnerable-user directory by any registered attacker.

**Suggested fix.** Clamp `size` to a small maximum (for example 50) server-side, bound `radiusKm`, and page from the repository rather than after loading and sorting all active profiles in memory.

- [ ] Fixed

---

## LOW

### SEC-08: Account and email enumeration on registration (CWE-204)

**Location:** `auth/service/AuthService.java:67` and `:70`.
**Endpoint:** `POST /api/auth/register`.

**Exploit.** Register answers with distinct, attributable errors: `"Username already taken"` (67) and `"Email already registered"` (70). An `Email already registered` response confirms the address belongs to a real account. Login and forgot-password are anti-enumeration; this path is not. The family request path returns a similar tell.

**Impact.** Lets an attacker confirm which people from an email list are Towinly members, a precursor to phishing known elders.

**Suggested fix.** Return a generic success from register regardless of existence (the account is only created on the email-link click, so a duplicate can be resolved silently and an "account already exists" notice sent to the real owner's inbox instead of to the caller).

---

## Refuted, do not re-raise

- OAuthService.java:74 ("OAuth complete links Google to an existing account by email"): the verifiers found the linking is the intended account-merge behaviour and is gated by a verified Google email, not an attacker-controlled value.
- The five other raw findings that did not survive both verifiers were duplicates of SEC-01 (the same location oracle reported by different attack classes) and are folded into it.

## Remediation order

1. SEC-01 first: it is the elder-safety headline and it makes the store privacy answers untrue. Coarsen on write and band the distance; this one change closes every duplicate.
2. SEC-02 next: one predicate (`status == ACTIVE`) closes the phone leak on three code paths.
3. Batch SEC-03, SEC-04, SEC-05 together: all three are the same missing `blockService.isHidden` call on a read path, and share test scaffolding.
4. SEC-06 and SEC-07 in one profile-and-discovery pass.
5. SEC-08 last.

Every fix needs a Spring Boot test that fails before and passes after, and none may weaken the on-device rounding or the public demo seats.
