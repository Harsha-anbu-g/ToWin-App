# Deep Audit Report: Towinly App (2026-08-11)

Seven audit dimensions ran against the working tree at `App/`: web parity, elder accessibility, correctness, security, performance, design law, and silent failures. Every finding below survived adversarial confirmation (each was re-verified against the actual code, the backend contract, or the react-native-web source before being accepted).

The raw pass produced 46 findings. After merging duplicates that different dimensions reported against the same defect, 41 open findings remain, plus one verification note confirming a previously tracked issue is fixed.

Context that matters for ranking: this app ships both to the app stores and as a web build (react-native-web) served to phones at towinly.com/app/, so web behavior is production behavior, not an afterthought. The audience is elders first.

## Summary

| Severity | Count | Meaning |
|----------|-------|---------|
| CRITICAL | 1 | A core flow is broken for a whole user class. Must fix before launch. |
| HIGH | 5 | Serious bug, safety gap, or major user harm. Fix before launch. |
| MEDIUM | 18 | Real harm to elders or a clear violation of the project's own locked rules. Fix soon. |
| LOW | 17 | Smaller quality, consistency, and edge-case issues. Batch into cleanup passes. |
| **Total open** | **41** | |

The headline: the elder Edit Profile flow is broken twice over (crash on open, guaranteed 400 on save), the block list leaks across accounts on shared devices, and the phone-web build silently loses pull-to-refresh, hit targets, and several other affordances the native app has.

## Status on 2026-08-29

A verification sweep against the tree at fd84826 (branch ralph/deep-audit-close) found that 30 of the 37 unticked findings had already been fixed by the store-hardening and later runs without the record being updated (several fixes cite the DEEP id in a code comment), and DEEP-37 was closed by an owner decision. Each ticked box below names the file and line that proves it. Six findings stayed open and went to the ralph backlog `ralph/prd.json` (DEEP-08 remainder, DEEP-24, DEEP-29 remainder, DEEP-30 remainder, DEEP-38 remainder, DEEP-40); those boxes get ticked by the story that closes them.

## Findings index

| ID | Sev | Finding | Location |
|----|-----|---------|----------|
| DEEP-01 | CRITICAL | Elder Edit Profile crashes on open | `app/profile-edit.jsx:110` |
| DEEP-02 | HIGH | Every elder profile save is rejected with 400 | `app/profile-edit.jsx:238` |
| DEEP-03 | HIGH | Block list is device-global, leaks across accounts | `src/lib/blockList.js:11` |
| DEEP-04 | HIGH | Elder-name link is a 17px target on the core vetting path | `src/components/needs/OfferHelpList.jsx:138` |
| DEEP-05 | HIGH | Website family chat links open the wrong chat | `app/messages/[connectionId].jsx:10` |
| DEEP-06 | HIGH | Icon barrel imports bundle 3,490 icons for 56 used | `app/(tabs)/_layout.jsx:12` |
| DEEP-07 | MEDIUM | Pull-to-refresh is a silent no-op on web | `src/components/ui/RefreshControl.jsx:12` |
| DEEP-08 | MEDIUM | Web drops hitSlop, tap targets shrink to 20-38pt | `src/components/ui/SegmentedControl.jsx:42` |
| DEEP-09 | MEDIUM | Inbox rows stay marked unread after reading | `app/chat/[connectionId].jsx:173` |
| DEEP-10 | MEDIUM | Home "My boxes" counts go stale for the whole session | `src/components/passon/MyBoxesCard.jsx:33` |
| DEEP-11 | MEDIUM | Photo and ID picker failures die silently | `app/profile-edit.jsx:155` |
| DEEP-12 | MEDIUM | verify-email calls a network failure an invalid link | `app/(auth)/verify-email.jsx:32` |
| DEEP-13 | MEDIUM | Pass-on page shows false empty states on fetch failure | `app/pass-on/index.jsx:221` |
| DEEP-14 | MEDIUM | Family Controls claims "no friendships" on fetch failure | `app/family/index.jsx:65` |
| DEEP-15 | MEDIUM | "Passwords match" text fails contrast at 2.93:1 and 13px | `app/(auth)/register.jsx:407` |
| DEEP-16 | MEDIUM | Role-choice cards render decision copy at 13px on both signup screens | `app/(auth)/register.jsx:271` |
| DEEP-17 | MEDIUM | Post Help chips lack single-select (radio) semantics | `app/(tabs)/action.jsx:141` |
| DEEP-18 | MEDIUM | Sealed-box kind picker: radiogroup wraps button-role chips | `src/components/passon/SealedItemForm.jsx:70` |
| DEEP-19 | MEDIUM | "Skip to Home" announced as a link, not a button | `app/game.jsx:303` |
| DEEP-20 | MEDIUM | Ask AI "Read aloud" and "Report this answer" labelled at 12px | `src/components/AskAiAssistant.jsx:400` |
| DEEP-21 | MEDIUM | Founder card text hardcoded at 14px | `src/components/feedback/CreatorCard.jsx:52` |
| DEEP-22 | MEDIUM | Ask AI sheet re-renders every bubble on each keystroke | `src/components/AskAiAssistant.jsx:328` |
| DEEP-23 | MEDIUM | Friends "Find" list defeats its own PersonRow memo | `app/friends/index.jsx:407` |
| DEEP-24 | MEDIUM | react-native-paper ships whole-library | `app/_layout.jsx:6` |
| DEEP-25 | LOW | Failed connections fetch unlocks a composer that cannot send | `app/chat/[connectionId].jsx:122` |
| DEEP-26 | LOW | Check-in card invites re-adding family already linked | `src/components/home/CheckinCard.jsx:148` |
| DEEP-27 | LOW | Friend profile offers "Add as friend" for an existing friend | `app/user/[id].jsx:75` |
| DEEP-28 | LOW | Messages Groups tab shows false empty on fetch failure | `app/(tabs)/messages.jsx:234` |
| DEEP-29 | LOW | Rejected login token bounces to Login with no message | `app/(auth)/login.jsx:79` |
| DEEP-30 | LOW | Founder contact links swallow open failures | `src/components/feedback/CreatorCard.jsx:25` |
| DEEP-31 | LOW | "Vibration feedback" switch shown on web where haptics are off | `app/(tabs)/profile.jsx:326` |
| DEEP-32 | LOW | Chat failed-send recovery instruction at 13px | `app/chat/[connectionId].jsx:338` |
| DEEP-33 | LOW | FirstTimeCard: 14px body and sans-serif bold title | `src/components/ui/FirstTimeCard.jsx:48` |
| DEEP-34 | LOW | "Change photo" pill clips its label at large OS text | `app/profile-edit.jsx:331` |
| DEEP-35 | LOW | Peekaboo cells not focusable or role-labelled on web | `src/lib/svgA11y.js:13` |
| DEEP-36 | LOW | Paused trusted elder silently moves tabs in MyEldersPanel | `src/components/trust/MyEldersPanel.jsx:406` |
| DEEP-37 | LOW | Demo credentials compiled into production bundles | `src/components/DemoAccountsCard.jsx:16` |
| DEEP-38 | LOW | profile-edit DOB and Bio inputs get inline handlers | `app/profile-edit.jsx:366` |
| DEEP-39 | LOW | Family alerts feed renders unbounded history in a ScrollView | `src/components/family/FamilyAlertsFeed.jsx:166` |
| DEEP-40 | LOW | Feedback intro callout paragraph at 14px | `app/feedback.jsx:117` |
| DEEP-41 | LOW | Ask AI sheet title breaks the Newsreader heading rule | `src/components/AskAiAssistant.jsx:228` |

---

## CRITICAL

### DEEP-01: Elder Edit Profile crashes on open (lookingFor is a String, .join() throws)

**Location:** `app/profile-edit.jsx:110` (also line 124)
**Dimension:** correctness

**Evidence.** The prefill effect runs `extraTags: (isHelper ? me.hobbies : me.lookingFor)?.join(', ') ?? ''`. The backend declares `lookingFor` as a String (`ProfileResponse.java:27`) and always sends an enum name like `"BOTH"` (`ProfileService.java:178`, entity defaults to BOTH). Optional chaining only guards null receivers, so `"BOTH".join` is undefined and the effect throws a TypeError. The website treats lookingFor as a select string, never an array. Tests pass only because fixtures mock lookingFor as an array.

**User impact.** Every ELDER or BOTH user who opens Edit Profile crashes the screen the moment `/profile/me` resolves: red screen in dev, white screen or crash in production. Elders cannot edit their profile at all.

**Suggested fix.** Treat lookingFor as the enum string it is. Keep the website's select semantics (for example a 3-option chip row bound to `form.lookingFor`), or at minimum guard with `Array.isArray(me.lookingFor)` before `.join` and repurpose extraTags for elders.

- [x] Fixed. Verified 2026-08-29: app/profile-edit.jsx:59 keeps lookingFor as the enum string (DEFAULT_LOOKING_FOR, "enum not list"); :127 and :142 prefill `me.lookingFor ?? DEFAULT_LOOKING_FOR` with no .join; :587 radio chips bind form.lookingFor.

---

## HIGH

### DEEP-02: Elder profile save sends lookingFor as an array; backend expects an enum, every save 400s

**Location:** `app/profile-edit.jsx:238`
**Dimension:** correctness

**Evidence.** The save calls `api.put('/profile/elder', { ...base, interests: toList(form.tags), lookingFor: toList(form.extraTags) })`. `ElderProfileRequest.java` declares `lookingFor` as the `LookingForType` enum. Jackson cannot deserialize a JSON array (even an empty `[]` from a blank field) into an enum, so the request is rejected with 400 before validation runs.

**User impact.** Even with DEEP-01 fixed, an elder tapping Save Changes always gets "Could not save right now. Please try again." Nothing they typed is ever persisted. Helper saves are unaffected (hobbies really is a string array).

**Suggested fix.** Send the enum string the website sends (`lookingFor: form.lookingFor || 'BOTH'`) and stop mapping the elder's free-text tags into this field. The web client sends elder tags only via `interests`.

- [x] Fixed. Verified 2026-08-29: app/profile-edit.jsx:326 sends `lookingFor: form.lookingFor`, the enum string; the elder's tags travel only in interests.

### DEEP-03: Block list is device-global: leaks across accounts and survives logout

**Location:** `src/lib/blockList.js:11`
**Dimension:** security

**Evidence.** `const KEY = KEYS.blockedUsers;` uses the single key `towin-blocked-users` (`storageKeys.js:23`) with no per-user scoping, unlike `aiConsentKey()` and `seenKey()` which append the userId (`storageKeys.js:40,47`). `AuthContext.jsx` logout (lines 47-64) deletes only the token, drafts, and query cache; the block list is never cleared. All consumers (`app/blocked.jsx:29`, `app/(tabs)/messages.jsx:225`, `app/friends/index.jsx:209`, `app/user/[id].jsx:81`, the trust panels) read the same key for whoever is signed in.

**User impact.** On a shared phone, or the web build's shared localStorage on a family computer (an explicit product scenario), the next account that signs in sees the previous elder's blocked people by name under Profile, Blocked people. They can unblock a harasser the elder blocked, silently removing the elder's protection, and the elder's blocks wrongly hide people from the new user's own feeds. For a trust platform this is a launch-blocking safety gap on shared devices.

**Suggested fix.** Scope the storage key per account like the seen and consent stores (for example `towin-blocked-<userId>` via a `blockedKey(userId)` helper, migrating any existing device-wide list to the current user), or at minimum clear `KEYS.blockedUsers` during `AuthContext.logout()`.

- [x] Fixed. Verified 2026-08-29: src/lib/storageKeys.js:42 blockedPrefix 'towin-blocked-' with blockedKey(userId); blocks also live on the server since HARD-106 (a5efb94).

### DEEP-04: Inline elder-name link is a 17px tap target and uses link role for in-app navigation

**Location:** `src/components/needs/OfferHelpList.jsx:138` (lines 136-144)
**Dimension:** elder accessibility

**Evidence.** `<Text accessibilityRole="link" suppressHighlighting onPress={() => router.push(`/user/${need.elderId}`)}>` is a Text node nested inside the 14px meta line "Posted by ...". A nested Text cannot take minHeight or hitSlop, so the tappable area is the glyph box of a 14px string, roughly 17px tall, far under the 44px floor every other control in the codebase enforces. It is also the surviving half of the open react-review "link-role" finding: in-app navigation announced as a web link.

**User impact.** A helper with tremor or low dexterity cannot reliably open the elder's profile before offering help. This inline name is the only path from a need card to the poster's profile, trust level, and reviews, which is the platform's core vetting step. VoiceOver and TalkBack users must know the links-rotor gesture to reach it at all.

**Suggested fix.** Replace the nested-Text link with a separate 44px-minimum Pressable row under the meta line (reuse the "View profile" pattern from `PostedHelpList.jsx:127`) with `accessibilityRole="button"`.

- [x] Fixed. Fixed: OfferHelpList.jsx renders the elder name as a 44pt Pressable with accessibilityRole="button" and an accessibilityHint (verified 2026-08-28).

### DEEP-05: Website /messages/:id?channel=family links open the wrong chat

**Location:** `app/messages/[connectionId].jsx:10`
**Dimension:** correctness

**Evidence.** The alias does `return <Redirect href={`/chat/${connectionId}`} />;` and reads only connectionId. The website links family updates threads as `/messages/${t.id}?channel=family` (`ToWin/frontend/src/pages/MessagesInbox.jsx:157`, `FamilyThreadLink.jsx:12`), and this alias exists precisely to catch website URLs on towinly.com/app/. The chat screen needs `channel=family` to open the FAMILY_UPDATES thread (`[connectionId].jsx:71-73`).

**User impact.** A family member following a website bookmark or emailed link to a group updates thread lands in the private MAIN chat on that connection instead. For FAMILY-role users that main thread is the elder-helper private conversation, which the server refuses them: they hit an error or empty chat dead end, exactly the failure the file's own comment says it must prevent.

**Suggested fix.** Read `channel` from `useLocalSearchParams` and forward it: `href={channel ? `/chat/${connectionId}?channel=${channel}` : `/chat/${connectionId}`}`.

- [x] Fixed. Verified 2026-08-29: app/messages/[connectionId].jsx forwards every query parameter to /chat, so ?channel=family opens the family thread.

### DEEP-06: Barrel imports of lucide-react-native bundle all 3,490 icons for the 56 actually used

**Location:** `app/(tabs)/_layout.jsx:12` (and 36 other files)
**Dimension:** performance

**Evidence.** 37 files import icons via the barrel, for example `import { FileText, MessageCircle, Plus, Search, UserRound, UsersRound } from 'lucide-react-native'`. The package entry re-exports 3,490 icon modules (14 MB of ESM). Metro does not tree-shake (there is no metro.config.js and no EXPO_UNSTABLE_TREE_SHAKING), and app.json sets web `"output": "single"`, meaning one SPA bundle. Only 56 distinct icons are used.

**User impact.** Elders on towinly.com/app/ download and parse one JS bundle inflated by several MB of dead icon code on slow cellular. On old Android phones the barrel's roughly 3,490 module factories execute on the first icon require at boot, adding measurable cold-start time and app size.

**Suggested fix.** Either enable Expo SDK 54's experimental Metro tree shaking for the export, or vendor the 56 used icons: one `src/components/icons.js` exporting local createLucideIcon-based components (the repo already hand-rolls SVG in TortoiseMark), then change the 37 import sites to import from it and add an eslint no-restricted-imports rule for `lucide-react-native`.

- [x] Fixed. Verified 2026-08-29: `grep -rl "from 'lucide-react-native'" app src` returns 0 files; src/components/icons.jsx hand-rolls every icon in use.

---

## MEDIUM

### DEEP-07: Pull-to-refresh is a silent no-op on web

**Location:** `src/components/ui/RefreshControl.jsx:12`
**Dimension:** web parity

**Evidence.** The wrapper re-exports `RefreshControl` from 'react-native' with no web branch. react-native-web's implementation (`node_modules/react-native-web/dist/exports/RefreshControl/index.js`) destructures and discards `onRefresh`, `refreshing`, `colors`, and `tintColor`, then renders a plain View. Consumers include `Screen.jsx:121` (every screen passing `onRefresh`), `app/(tabs)/home.jsx:125` and 146, `app/(tabs)/messages.jsx:314`, `app/friends/index.jsx:301`, `PostedHelpList.jsx:371`, and `OfferHelpList.jsx:258`.

**User impact.** An elder on towinly.com/app/ pulls down on Messages, Home, or Posted Help to check for new activity and nothing happens: no spinner, no fetch (iOS Safari just rubber-bands). The app's only in-screen refresh affordance is dead on web; fresh data arrives only via 30s polls on some queries, tab-visibility refetch, or a full browser reload.

**Suggested fix.** In the shared RefreshControl wrapper (or Screen.jsx), on `Platform.OS === 'web'` render an explicit refresh affordance instead, for example a small themed "Refresh" row or header button wired to the same onRefresh, since the pull gesture cannot be implemented in react-native-web.

- [x] Fixed. Verified 2026-08-29: src/components/ui/RefreshControl.jsx renders a Refresh TextLink wired to onRefresh on web, native path untouched.

### DEEP-08: Web drops hitSlop: controls whose 44pt target depends on it are 20-38pt on web

**Location:** `src/components/ui/SegmentedControl.jsx:42` (plus 10 more sites)
**Dimension:** web parity

**Evidence.** react-native-web's Pressable and View never implement hitSlop (verified in the package's dist output). The codebase knows this (`AskAiAssistant.jsx:347` comment: "hitSlop, which React Native Web drops entirely") yet several controls rely on it: `SegmentedControl.jsx:42` (34pt segments, used on 8+ screens), `ActionChip.jsx:20` (36pt), `Button.jsx:82` (small = 38pt), `ToastContext.jsx:112` (Undo label around 20pt tall), `chat/[connectionId].jsx:427` (38pt profile row), `friends/index.jsx:375` (36pt radius pills), `(tabs)/profile.jsx:252` (36pt Edit profile), `profile-edit.jsx:329` (34pt Change photo), `AskAiAssistant.jsx:281` (30pt Read aloud chip), `(auth)/landing.jsx:363` and 372 (about 35pt Skip and Log in), `game.jsx:306` (about 40pt Skip to Home).

**User impact.** On the phone-web build the effective tap target of the app's most-used filter control (SegmentedControl), trust-panel action chips, small buttons, the toast Undo action, and the chat-header profile row is 20-38pt instead of the promised 44pt or more. An elder tapping just outside the visual pill (where the tap works in the phone app) gets nothing. The design law "touch targets >= 44px" silently fails on web.

**Suggested fix.** Give each of these controls a real 44pt-minimum box (minHeight 44 with negative margins, or padding inside the Pressable) the way Chip.jsx, ChipsField.jsx, PasswordInput.jsx, and TextLink.jsx already do ("real box, not hitSlop"), and reserve hitSlop as a native-only bonus.

- [x] Fixed. Verified 2026-08-29: every site now carries a real box and keeps hitSlop as a native bonus. `ActionChip.jsx` (comment cites DEEP-08), `SegmentedControl.jsx:120` minHeight 40, `Button.jsx:42-61` minHeight 40/46, `chat/[connectionId].jsx:454` minHeight 44, `(tabs)/profile.jsx:276-278` Edit profile, `profile-edit.jsx:461-466` Change photo, `(auth)/landing.jsx:393`, `game.jsx:313`. The last site, the toast action, closed in this run: `src/context/ToastContext.jsx:113-124` gives the Undo Pressable minHeight 40 (the sanctioned compact target), paddingHorizontal spacing[2], centred content; guarded by `__tests__/toast-action-target.test.js` (asserts minHeight >= 40, centred, hitSlop retained).

### DEEP-09: Inbox rows stay marked unread after reading: mark-seen never invalidates ['connections']

**Location:** `app/chat/[connectionId].jsx:173`
**Dimension:** correctness

**Evidence.** The seen-write only does `.then(() => queryClient.invalidateQueries({ queryKey: ['unread-count'] }))`. Inbox rows render bold text and the count pill from `conn.unreadCount` in the `['connections']` cache (`messages.jsx:151-196`), and messages.jsx has no focus refetch or poll; tab screens stay mounted (the exact staleness UX-710 fixed for PostedHelpList). The website avoids this only because its inbox remounts and refetches per navigation.

**User impact.** An elder opens Messages, taps the bold conversation with the unread badge, reads it (the tab-bar badge clears), goes back: the row is still bold with the same unread count for the rest of the session, until a pull-to-refresh or an unrelated mutation. They repeatedly reopen the thread expecting a new message that is not there.

**Suggested fix.** After the seen POST commits, also invalidate `['connections']` (or setQueryData to zero that connection's unreadCount), or add the UX-710 focus-refetch pattern to messages.jsx.

- [x] Fixed. Verified 2026-08-29: app/chat/[connectionId].jsx:193 invalidates ['connections'] after the seen POST commits, with the comment naming this finding.

### DEEP-10: Home "My boxes" counts go stale forever: ['passon-boxes-summary'] is never invalidated

**Location:** `src/components/passon/MyBoxesCard.jsx:33`
**Dimension:** correctness

**Evidence.** grep shows `['passon-boxes-summary']` referenced only here. `pass-on/index.jsx` reload() invalidates only `['passon-mine','passon-setup','passon-keyholders','passon-sealed']` (line 267), and home.jsx's elder onRefresh key list (lines 105-113) omits it too. The card's own comment says "a wrong count on this card is worse than no card".

**User impact.** An elder writes her first story or arms her Sealed box, returns Home: the card still says the old counts ("0 stories ... your box is not set up") for the whole session. Even pull-to-refresh on Home does not fix it. Only backgrounding the app or restarting refreshes it.

**Suggested fix.** Add `['passon-boxes-summary']` to pass-on/index.jsx reload() and to home.jsx's elder refresh keys, or derive the card from the same `['passon-mine']` and `['passon-setup']` queries instead of a private key.

- [x] Fixed. Verified 2026-08-29: src/components/passon/MyBoxesCard.jsx:37 and :42 read ['passon-mine'] and ['passon-setup']; 'passon-boxes-summary' has 0 references.

### DEEP-11: Photo and ID pickers: rejection from pickImage is unhandled, tap dies silently

**Location:** `app/profile-edit.jsx:155` (also line 178)
**Dimension:** silent failures

**Evidence.** In changePhoto, `const asset = await pickImage();` sits outside the try/catch, which only wraps the upload. The same pattern exists in uploadId at line 178. pickImage calls `requestMediaLibraryPermissionsAsync` and `launchImageLibraryAsync`, which can reject (for example Android's "Different ImagePicker is already in use" on a double-tap; the button is only disabled during upload, not during picking). The rejection escapes the async onPress with no handler.

**User impact.** An elder taps "Change photo" or "Upload an ID photo" (double-taps are common), the promise rejects, and nothing happens: no picker, no toast, no error. The button looks broken with zero explanation, and ID verification (+3 trust) can appear impossible.

**Suggested fix.** Wrap the whole body of changePhoto and uploadId in try/catch (or catch inside pickImage) and toast "Could not open your photos. Please try again." Also guard re-entry with a picking flag so a double-tap is ignored.

- [x] Fixed. Verified 2026-08-29: app/profile-edit.jsx:216-240 pickImage owns try/catch/finally, a pickingRef re-entry guard and the toast "Could not open your photos. Please try again.".

### DEEP-12: verify-email reports a network failure as "link invalid, sign up again"

**Location:** `app/(auth)/verify-email.jsx:32`
**Dimension:** silent failures

**Evidence.** `.catch(() => setState('error'))` collapses every failure into one state whose copy is "This link is invalid or has expired. Please sign up again to get a fresh one." A timeout (the api client aborts at 15s) or an offline device takes the same path as a genuinely bad token. forgot-password.jsx (lines 34-42) already distinguishes `err.response` present versus absent, so the codebase standard exists.

**User impact.** An elder opening the emailed link on flaky wifi is told their link is dead and instructed to register again, when retrying the same link would have worked. No retry is offered, and the advised recovery (re-signup) is the most laborious possible action.

**Suggested fix.** In the catch, check err.response: absent means show "Check your connection" with a Try again button that re-posts the token; present (4xx) keeps the invalid-link copy.

- [x] Fixed. Verified 2026-08-29: app/(auth)/verify-email.jsx:30 `err?.response ? 'error' : 'offline'`; :82 Try again button re-posts the token.

### DEEP-13: Pass-on page: links, connections, and keyholders fetch failures masquerade as empty data

**Location:** `app/pass-on/index.jsx:221` (also lines 226, 236)
**Dimension:** silent failures

**Evidence.** The queries for `['family-links']` (line 221), `['connections']` (line 226) and `['passon-keyholders']` (line 236) destructure only `data`, with no isError or refetch, unlike `['passon-mine']` and `['passon-setup']` in the same file, which the comment says must never masquerade (UX-706). On failure `people`, `family`, and `keys` become empty arrays (lines 259-263): PersonPicker shows LETTERS.noneToWriteTo, SealedSetup shows SETUP.who.tooFew, SealedKeyholders lists nobody.

**User impact.** On a dropped fetch, an elder with a linked daughter opens the letter form and is told she has no one to write to. The Sealed-box setup tells her she needs at least 3 family members when she has 5. Her keyholder list shows nobody holding a key. This is exactly the false-empty this page guards against elsewhere.

**Suggested fix.** Take isError and refetch from the three queries and render LoadError (bare) in the letter form's person slot, the setup step-1 area, and the keyholders card instead of the empty-state copy.

- [x] Fixed. Verified 2026-08-29: app/pass-on/index.jsx:225-245 take isError and refetch on family-links, connections and passon-keyholders.

### DEEP-14: My Family Controls tab claims "no friendships yet" when /connections failed

**Location:** `app/family/index.jsx:65`
**Dimension:** silent failures

**Evidence.** The `['connections']` query has no isError handling; `connections` folds to an empty array (line 69). The Sharing tab then renders "You have no friendships yet. Once you do, you choose here which ones your family can see." (lines 530-537), and sharedCount and actingCount read 0. The family-links query in the same file does handle isError with LoadError (line 246).

**User impact.** An elder with active friendships opens Controls on a dropped connection and is told she has no friendships. Every sharing switch vanishes with no error and no retry, so she may believe her shared friendships were removed.

**Suggested fix.** Destructure isError and refetch from the connections query and show LoadError in the Sharing tab (and suppress sharedCount) instead of the no-friendships empty state.

- [x] Fixed. Verified 2026-08-29: app/family/index.jsx:69 connectionsFailed; :78 comment records the false-empty rule for the Sharing tab.

### DEEP-15: "Passwords match" confirmation text fails contrast at 2.93:1 and 13px

**Location:** `app/(auth)/register.jsx:407`
**Dimension:** elder accessibility

**Evidence.** `<Text style={{ fontSize: text.xs, color: MATCH_GREEN ... }}>Passwords match</Text>` where MATCH_GREEN is #5FA670 (`src/theme/parity.js:6`). Measured against the white register page: 2.93:1 (2.66:1 on parchment). WCAG AA needs 4.5:1 for 13px text, and the repo's own rule is machine-checked 4.5:1 on meaningful text, but parity.js colors are not covered by contrast-tokens.test.js (grep confirms no test references MATCH_GREEN).

**User impact.** A low-vision elder creating an account cannot read the one positive confirmation that both password fields agree. In sunlight or with mild cataracts the 13px, 2.9:1 green line is effectively invisible, so they submit unsure whether the passwords matched.

**Suggested fix.** Use t.greenDeep (#1a5c2e, 8.9:1 on white) at text.sm 16, or darken MATCH_GREEN until it clears 4.5:1, and add it to the contrast test suite.

- [x] Fixed. Verified 2026-08-29: app/(auth)/create-account.jsx:377 renders the line in greenDeep at body size; the comment records the 2.93:1 measurement.

### DEEP-16: Role-choice cards render decision copy at 13px on both signup screens (merged finding)

**Location:** `app/(auth)/register.jsx:271` and `app/(auth)/finish-setup.jsx:177` (also `finish-setup.jsx:143`)
**Dimension:** design law, elder accessibility

**Evidence.** Both screens render the role descriptions at `fontSize: text.xs` (13): "Looking for friends or help", "You'll link to your parent inside the app after you sign up." The comment above register's version says "this copy decides an identity; it must clear 4.5:1 (rulebook)": the color was fixed for AA but the size stayed 13, under both the 16px body floor and the project's own raised 14px important-secondary floor (tokens.js type.meta comment). On top of that, finish-setup renders the ROLE_PROMPT question ("First, who are you joining as?") at a literal 14 with weight 600 (line 143), while register renders the same prompt at 16 with weight 700 (register.jsx:228), so the twin screens have drifted.

**User impact.** An elder choosing who they are joining as reads the only text explaining the three roles at 13px, on both the normal signup path and the Google finish-setup path. Misreading it means signing up under the wrong identity (for example FAMILY versus ELDER), which changes their entire tab shell and requires support to undo.

**Suggested fix.** Raise the description lines to type.meta (14) at minimum, ideally type.body (16) since the copy is read, not scanned. Make the ROLE_PROMPT text.sm (16) with matching weight on both screens so the twins cannot drift. Fix both files together; they share the ROLE_PROMPT pattern.

- [x] Fixed. Verified 2026-08-29: app/(auth)/register.jsx:72-76 role label and description at type.body; finish-setup.jsx:168 ROLE_PROMPT at type.body weight 700 and :203 role labels at type.body.

### DEEP-17: Post Help category and urgency chips lack single-select (radio) semantics

**Location:** `app/(tabs)/action.jsx:141` (lines 139-149 and 161-165)
**Dimension:** elder accessibility

**Evidence.** "Kind of help" and "How soon?" are mutually exclusive choices rendered as Chip (role button, state.selected) inside plain Views; the FieldLabel Text (line 30) is not programmatically associated. The app's own convention for one-of-N choices is a labelled radiogroup with aria-checked radios (`register.jsx:237`, `FamilyNeedsForParent.jsx:271`). The same pattern exists on `profile-edit.jsx:403-412` (Sex chips).

**User impact.** An elder using VoiceOver on the core Post Help flow hears "Company, button" ... "Rides, button" with no cue that these answer the question "Kind of help", that exactly one applies, or which is currently chosen relative to the set. This is the same defect the register role cards were explicitly fixed for.

**Suggested fix.** Wrap each chip row in `accessibilityRole="radiogroup"` with an accessibilityLabel matching the visible FieldLabel, and render the chips with radio role and aria-checked (same fix as DEEP-18).

- [x] Fixed. Fixed: action.jsx wraps "Kind of help" and "How soon?" in labelled radiogroups with radio chips and aria-checked (verified 2026-08-28).

### DEEP-18: Sealed-box kind picker: radiogroup contains button-role Chips, not radios

**Location:** `src/components/passon/SealedItemForm.jsx:70` (lines 69-82)
**Dimension:** elder accessibility

**Evidence.** `<View accessibilityRole="radiogroup" accessibilityLabel={SEALED_ITEMS.kindPrompt}>` wraps `<Chip>` items, but Chip (`src/components/ui/Chip.jsx:21-23`) hardcodes `accessibilityRole="button"` plus `accessibilityState={{selected}}`. This is the surviving instance of the open "radiogroup" review finding; every other picker (register.jsx:237, PersonPicker, RadioCards, SealedSetup:253, FamilyNeedsForParent:271) uses role radio with aria-checked children.

**User impact.** TalkBack and VoiceOver announce a radio group that contains no radios: an elder hears "button" with no "1 of 4" position and no mutually-exclusive cue while labelling a sealed item (a bank detail, a passphrase). On the web build the ARIA tree is invalid (radiogroup requires role radio children), so browser screen readers may skip the group semantics entirely.

**Suggested fix.** Either render RadioCards here, or give Chip an optional role prop and pass `accessibilityRole="radio"` plus aria-checked from this call site.

- [x] Fixed. Fixed: SealedItemForm.jsx chips carry accessibilityRole="radio" and aria-checked inside the radiogroup (verified 2026-08-28).

### DEEP-19: "Skip to Home" uses accessibilityRole="link" for in-app navigation

**Location:** `app/game.jsx:303` (lines 302-316)
**Dimension:** elder accessibility

**Evidence.** `<Pressable accessibilityRole="link" accessibilityLabel="Skip to Home" onPress={toHome}>` where toHome is `router.replace('/(tabs)/home')` (line 203). This is the remaining confirmed instance of the open review "link-role" finding; the login and register sites were fixed with TextLink (role button), this one was not. On react-native-web it renders an anchor with no href; on iOS, VoiceOver announces "link", implying it leaves the app.

**User impact.** A screen-reader user on the Peekaboo screen hears "Skip to Home, link" and expects a browser page to open rather than a tab switch. On the towinly.com/app web build the anchor has no href, so open-in-new-tab and link semantics are broken.

**Suggested fix.** Use `accessibilityRole="button"`, or replace with the shared TextLink component, which also fixes the 14px underlined label this screen's own checkin.jsx comment warns against.

- [x] Fixed. Fixed: game.jsx "Skip to Home" is a Pressable with accessibilityRole="button" (verified 2026-08-28).

### DEEP-20: Ask AI answer actions "Read aloud" and "Report this answer" labelled at 12px

**Location:** `src/components/AskAiAssistant.jsx:400` (also lines 376 and 298)
**Dimension:** elder accessibility

**Evidence.** The two per-answer action labels (and the greeting chip at line 298) are styled with `fontSize: type.caption` (12). tokens.js:302-306 documents the repo's own floor: meta (14) is the minimum for actionable or meaningful secondary text such as chip labels; caption 12 is for non-actionable captions. These are the only controls to hear an answer aloud and to flag harmful AI output (the Google Play AI-content requirement).

**User impact.** The exact audience the Read-aloud chip exists for, low-vision elders, gets the smallest text in the app on that control. The mandatory "Report this answer" affordance is equally easy to miss, undermining the safety valve the AI consent dialog promises ("Every answer has a Report this answer button").

**Suggested fix.** Raise both labels (and the greeting chip) to type.meta 14 with the fontScaleCaps.body multiplier; the 44px boxes already have room.

- [x] Fixed. Verified 2026-08-29: src/components/AskAiAssistant.jsx:111, :201 and :228 set Read aloud and Report this answer at type.meta.

### DEEP-21: Founder card text on the feedback screen is hardcoded at 14px (merged finding)

**Location:** `src/components/feedback/CreatorCard.jsx:52` (also lines 42, 49, 73)
**Dimension:** design law, elder accessibility

**Evidence.** Line 49 sets "This isn't a university project. Towinly is my future startup." at a literal fontSize 14 weight 600, and line 52 sets the multi-sentence pitch ("I'm building something real, and your feedback is what shapes it...") at fontSize 14. Line 42 carries more 14px copy and line 73 sets the seven 44px contact-row link labels (email, WhatsApp, LinkedIn and more) at fontSize 14. All are multi-line running text or tappable link labels, under the locked body floor (tokens.js type.body: "elder rule: running text never below 16"), and all bypass the type tokens.

**User impact.** Elders on the Share Feedback screen (explicitly invited to contact the founder) read the pitch and the contact addresses at 14px, measurably harder than every other paragraph in the app, which sits at 16-18px. A mis-read email or phone label leads to failed contact attempts.

**Suggested fix.** Move the two paragraphs (lines 49, 52) to type.body (16). The credential line (42) and contact labels (73) should use the tokens rather than literals, at type.meta 14 minimum, ideally 16 for the tappable contact labels since they carry addresses that must be read exactly.

- [x] Fixed. Verified 2026-08-29: src/components/feedback/CreatorCard.jsx:69 and :72 paragraphs at type.body, :95 contact labels at type.body, :57-63 credential lines on type.meta tokens.

### DEEP-22: Ask AI sheet re-renders every chat bubble on each composer keystroke

**Location:** `src/components/AskAiAssistant.jsx:328`
**Dimension:** performance

**Evidence.** `input` state (line 57) lives in the same component as the messages FlatList; `onChangeText={setInput}` (line 450) re-renders the whole sheet per keystroke, and `renderItem={({ item }) => (...)}` at line 328 is an inline closure whose identity changes every render, so VirtualizedList re-renders every mounted bubble cell (each with 2 Pressables) on every keystroke. The file already documents this exact lag class at lines 60-62 ("index keys... visible lag on older phones after a few exchanges") but fixed only key stability, not renderItem identity, unlike `app/chat/[connectionId].jsx:312` which does the useCallback pattern correctly.

**User impact.** After a few Q&A exchanges, an elder typing a question on a low-end Android re-renders roughly 6-10 bubble subtrees per keystroke inside a Modal: visible keyboard latency in the app's flagship assistive feature.

**Suggested fix.** Wrap renderItem in useCallback with stable deps (the theme object is stable; route speak and reportAnswer through refs or useCallback), extract a memoized MessageBubble row, and hoist the static ListEmptyComponent, mirroring the chat thread's UX-708 latest-ref pattern.

- [x] Fixed. Verified 2026-08-29: src/components/AskAiAssistant.jsx:389-392 renderItem in useCallback over a memoized MessageBubble; intro and footer hoisted with useMemo.

### DEEP-23: Friends "Find" list defeats its own PersonRow memo

**Location:** `app/friends/index.jsx:407` (lines 407-442)
**Dimension:** performance

**Evidence.** PersonRow is memoized at line 59 with the comment "Memoized so a list-level render doesn't re-render every card (UX-705)", but the find-tab FlatList's renderItem is an inline closure and passes a freshly created `trailing` JSX element and an inline onPress arrow per render, so the memo comparison always fails. The invites list (renderPendingRow, line 279) got the useCallback treatment; the find list, the largest (discover "returns everyone nearby", line 26), did not.

**User impact.** Every radius-pill tap, pull-to-refresh tick, connections or blocked query update, or Connect-request pending flip re-renders all mounted person cards (windowSize default is about 21 screens). In a dense area on an old Android this drops frames on the primary discovery surface for elders.

**Suggested fix.** Move status and pending computation into props: useCallback renderItem (deps: statusOf inputs, request.isPending and variables, confirm), pass primitives (status, sendingId) to PersonRow and build the trailing chip inside the memoized component, as renderPendingRow already does.

- [x] Fixed. Verified 2026-08-29: app/friends/index.jsx:440 renderFindRow in useCallback, :611 renderItem={renderFindRow}; statusOf memoized at :346.

### DEEP-24: react-native-paper ships whole-library (no production babel plugin in repo)

**Location:** `app/_layout.jsx:6`
**Dimension:** performance

**Evidence.** `import { MD3DarkTheme, MD3LightTheme, PaperProvider } from 'react-native-paper'` plus TextInput (`src/components/ui/Input.jsx:9`) and Card (`src/components/ui/Card.jsx:4`) are the only Paper usages, but the repo has no babel.config.js at all, so the documented `react-native-paper/babel` production plugin that rewrites imports to per-module paths is not applied. The package index re-exports every component (a roughly 5.4 MB lib).

**User impact.** The full Paper component set is bundled into both the native app and the single-file web bundle for the sake of 3 components: a larger download for phone-web elders and more modules executed at startup on low-end Androids.

**Suggested fix.** Add babel.config.js with babel-preset-expo and `env: { production: { plugins: ['react-native-paper/babel'] } }` (per Paper's Getting Started docs), then verify the bundle diff with `npx expo export` before and after.

- [ ] Fixed

---

## LOW

### DEEP-25: Chat: /connections failure defeats the paused/locked guard and opens the composer

**Location:** `app/chat/[connectionId].jsx:122`
**Dimension:** silent failures

**Evidence.** `const connUnknown = !conn && connsLoading;` treats only the loading case as "state unknown". The connections query (lines 114-117) has no isError branch, so when it fails (deep link, cold cache) conn is undefined, connUnknown is false, trustLocked is false, and the open composer renders (line 584 onward) instead of the paused or locked panel the file promises ("say it in place instead of letting a send fail"). The header also shows "Chat" with a dead profile tap.

**User impact.** On a failed connections fetch, a person in a PAUSED or below-Messaging friendship sees a normal composer; their send then bounces off the server into a "Didn't send. Tap to try again" bubble that can never succeed, with no explanation that messages are paused or locked.

**Suggested fix.** Treat the connections query's isError as unknown too (`connUnknown = !conn && (connsLoading || connsError)`) and keep the footer hidden, or show a small retry row for the connection state.

- [x] Fixed. Verified 2026-08-29: app/chat/[connectionId].jsx:133 `connUnknown = !conn && (connsLoading || connsError)`; :539 retry row for a failed connections fetch.

### DEEP-26: Check-in card invites re-adding family when the family-links fetch failed

**Location:** `src/components/home/CheckinCard.jsx:148`
**Dimension:** silent failures

**Evidence.** The `['family-links']` query has no error handling; on failure familyNames is an empty array and FamilyNote renders the no-family branch: "Add your family - and they will see you checked in." (lines 37-54). The comment concedes "A failure leaves the list empty, which shows the invitation instead", but the rendered claim is affirmatively false, not merely absent.

**User impact.** An elder whose daughter is already linked sees, on a flaky network, a prompt to add her family, implying the link is gone and inviting a duplicate family request. After checking in, the confirmation line about who saw it also silently disappears.

**Suggested fix.** On isError render the neutral checked-in line without the "Add your family" link (absence is honest; an invitation is a claim), for example skip FamilyNote entirely when the query errored.

- [x] Fixed. Verified 2026-08-29: src/components/home/CheckinCard.jsx:146 familyFailed guards the Add your family line.

### DEEP-27: Friend profile shows "Add as friend" for an existing friend when /connections failed

**Location:** `app/user/[id].jsx:75`
**Dimension:** silent failures

**Evidence.** The `['connections']` query has no isError branch; on failure `conn` is undefined so the action card falls through to the "Add as friend" primary (lines 274-281) and the Message button and End-friendship control disappear. The profile query in the same file handles isError carefully (lines 172-179).

**User impact.** On a failed connections fetch an elder viewing an ACTIVE friend loses the Message button and is offered "Add as friend"; tapping it fires a request the server refuses, producing a confusing "Could not send the request" toast about a friendship that already exists.

**Suggested fix.** Take isError from the connections query and, while connection state is unknown or failed, render a neutral placeholder (or LoadError bare with retry) in the action slot instead of defaulting to "Add as friend".

- [x] Fixed. Verified 2026-08-29: app/user/[id].jsx:87-96 connsFailed with the comment on the missing-answer rule; no Add as friend while unknown.

### DEEP-28: Messages Groups tab shows "No group chats yet" when /family/journey failed

**Location:** `app/(tabs)/messages.jsx:234` (lines 230-239)
**Dimension:** silent failures

**Evidence.** The queryFn catches all errors and returns `{ elders: [] }`, so isError is never true for the journey feed. groupThreads folds to only own-side threads; for a family member (whose threads come exclusively from the journey) the Groups tab renders EMPTY_TAB_COPY.groups: "No group chats yet. When a friendship is shared with family, its updates will show here."

**User impact.** A family member whose parent shares friendships opens Groups on a dropped fetch and is told no group chats exist: their SOS-adjacent updates threads silently vanish with no retry and no error, contradicting the inbox's own LoadError rule for the main list.

**Suggested fix.** Let the query error normally (drop the inner catch) and, when it fails, show LoadError (bare) inside the Groups tab only, keeping the person tabs functional.

- [x] Fixed. Verified 2026-08-29: app/(tabs)/messages.jsx:455 LoadError for your group chats with refetchJourney; the inner catch is gone.

### DEEP-29: login() return value ignored: a bad token bounces to Login with no message

**Location:** `app/(auth)/login.jsx:79` (also `DemoAccountsCard.jsx:33`, `finish-setup.jsx:79`)
**Dimension:** silent failures

**Evidence.** finishLogin does `await login(data.token); router.replace('/')`. AuthContext.login returns false when userFromToken rejects the token (missing or malformed, or exp already behind a device clock set far ahead: `payload.exp * 1000 < Date.now()`, AuthContext.jsx line 28). Neither login.jsx, DemoAccountsCard.jsx, nor finish-setup.jsx checks the result; the index route then redirects the logged-out user straight back to Login.

**User impact.** With a mis-set device clock (or a malformed 200 response), the user types correct credentials, the spinner ends, and they land back on the Login screen with no error: a silent loop with no lead on the cause.

**Suggested fix.** Check the result before navigating in all three call sites: `if (!(await login(data.token))) { setError('Could not sign you in on this device. Please check your phone\'s date and time.'); return; }`.

- [x] Fixed. Verified 2026-08-29: all four call sites check the login() result before navigating, and the sentence lives in one exported constant `SIGN_IN_DEVICE_ERROR` (`src/lib/copy.js:67-68`) so the four cannot drift. Sites: `app/(auth)/login.jsx:83-86`, `app/(auth)/finish-setup.jsx:96-99`, `src/components/DemoAccountsCard.jsx:44-47`, and the last holdout `app/(auth)/oauth-callback.jsx:52-60` (the Google exchange now stops and explains instead of bouncing to Login). Proven by `__tests__/oauth-callback-login-result.test.js` (3 tests: exact shared sentence, rejected token explains without navigating, good token still lands on `/`) plus the existing DEEP-29 suites `auth.test.js` and `auth-followthrough.test.js`.

### DEEP-30: Founder contact links swallow open failures: mailto tap can do nothing

**Location:** `src/components/feedback/CreatorCard.jsx:25` (also `LegalSections.jsx:32`)
**Dimension:** silent failures

**Evidence.** `const open = (href) => href && Linking.openURL(href).catch(() => {});`. On native, openURL rejects when no handler exists (for example mailto: on a phone or tablet with no mail app configured). The rejection is swallowed with an empty catch. delete-account.jsx (lines 58-70) handles this exact case with an on-page message plus a toast; LegalSections.jsx line 32 has the same silent catch on the deletion-page link.

**User impact.** An elder taps the email row on the feedback screen to reach a human and nothing at all happens: no mail app, no toast, no fallback address guidance. On the legal screen, the tap to the account-deletion page can fail equally silently.

**Suggested fix.** In the catch, toast the fallback (for example "Write to agharsha.anbu@gmail.com from your mail app"), mirroring delete-account.jsx's noMailApp handling; do the same for LegalSections' link.

- [x] Fixed. Verified 2026-08-29: the founder-card half was already closed at `src/components/feedback/CreatorCard.jsx:36` (catch toasts the mail address or a type-it-yourself line). The LegalSections half closed in this run: `src/components/legal/LegalSections.jsx:42-43` catches the rejected openURL and toasts `LEGAL_LINK_FALLBACK(url)` from `src/data/legalContent.js:82-83`, "Could not open the page. You can type <the address> into your browser." Pinned by `__tests__/legal-link-fallback.test.js` (3 tests: sentence names the address, appears on a rejected open, absent on a quiet open).

### DEEP-31: "Vibration feedback" switch is shown on web where haptics are hard-disabled

**Location:** `app/(tabs)/profile.jsx:326` (lines 324-340)
**Dimension:** web parity

**Evidence.** profile.jsx renders the "Vibration feedback" Row unconditionally with a toggling Switch, but `src/lib/haptics.js:59` gates every haptic with `if (!enabled || Platform.OS === 'web') return;`. expo-haptics has no web implementation, so on the web build the setting controls nothing. The night-mode row directly above it does work on web, making the dead switch read as broken.

**User impact.** An elder on towinly.com/app/ opens Profile, toggles "Vibration feedback" on and off and feels no difference ever; the switch persists a preference with no effect on this platform, violating HCI honesty (a control that does nothing) and inviting "the app is broken" support calls.

**Suggested fix.** Hide the row on web: wrap it in `Platform.OS !== 'web'` (or a capability check exported from haptics.js, such as `hapticsSupported`), mirroring how GoogleLoginButton renders null off-web.

- [x] Fixed. Verified 2026-08-29: app/(tabs)/profile.jsx:380 hides the Vibration feedback row on web.

### DEEP-32: Chat failed-send recovery instruction rendered at 13px

**Location:** `app/chat/[connectionId].jsx:338` (copy at line 348)
**Dimension:** elder accessibility

**Evidence.** The bubble caption style is `fontSize: 13` and carries "Didn't send. Tap to try again." when a send fails: the sole visual instruction for recovering an unsent message. The repo's type ramp puts actionable secondary text at 14 or more (tokens.js meta floor) and running text at 16 or more.

**User impact.** An elder on poor WiFi whose message failed gets the recovery instruction in the smallest text in the thread. If they cannot read it they may believe the message sent (it stays on screen as a bubble) and wait for a reply that never comes.

**Suggested fix.** Render the failed-state caption at type.meta (14) or type.body (16) while leaving the normal timestamp at 13.

- [x] Fixed. Verified 2026-08-29: app/chat/[connectionId].jsx:376-379 failed caption at type.meta, the timestamp stays 13.

### DEEP-33: FirstTimeCard: 14px body text and a sans-serif bold title (merged finding)

**Location:** `src/components/ui/FirstTimeCard.jsx:48` and `:54`
**Dimension:** elder accessibility, design law

**Evidence.** Two defects in the same card. Line 54: the body Text uses `fontSize: type.meta` (14) for multi-sentence reading copy (for example checkin.jsx:56: "One tap on 'I'm here today' tells your trusted people you're okay. Skipping a day is fine..."), under the locked rule "body 16, running text never below 16" (tokens.js:302). Line 48: the title carries `accessibilityRole="header"` but renders in the system font at weight 600, while the locked type ramp assigns card titles to Newsreader via type.cardTitle (19).

**User impact.** The one card that teaches an elder what a feature is (their first encounter with it) is set in 14px grey, so the users most likely to need the explanation are least able to read it. Visually, the very first cards a new user sees break the heading grammar the rest of the app follows.

**Suggested fix.** Body Text to type.body (16) with lineHeight around 22. Title to fontFamily.display at type.cardTitle (19) with no fontWeight.

- [x] Fixed. Verified 2026-08-29: src/components/ui/FirstTimeCard.jsx:50 title in fontFamily.display at type.cardTitle, :58 body at type.body lineHeight 22.

### DEEP-34: "Change photo" pill uses fixed height, clipping its label at large OS text

**Location:** `app/profile-edit.jsx:331` (label at line 343)
**Dimension:** elder accessibility

**Evidence.** The Pressable style is `height: 34` (fixed) with an uncapped `fontSize: 14` label (no maxFontSizeMultiplier). The codebase's own convention, stated in sibling components (profile.jsx:254: "minHeight, not height - the label has to grow at 200% text scale"; PeekabooRow, PostedHelpList), is minHeight for exactly this reason.

**User impact.** With iOS or Android large accessibility text (150-200%), the "Change photo" / "Uploading..." label scales past 34px and clips or overflows the fixed pill. The primary way an elder adds a profile photo becomes unreadable at the text sizes elders actually use.

**Suggested fix.** Change `height: 34` to `minHeight: 34` (hitSlop already tops the target to 46px effective on native) and cap the label with fontScaleCaps.body.

- [x] Fixed. Verified 2026-08-29: app/profile-edit.jsx:461-466 minHeight 44 with the comment; label capped with fontScaleCaps.body.

### DEEP-35: Peekaboo shell cells are not focusable or role-labelled on the web build

**Location:** `src/lib/svgA11y.js:13` (consumed by `app/game.jsx:111-115`)
**Dimension:** elder accessibility, web parity

**Evidence.** On web, svgButtonA11y returns only `{ accessible: true, accessibilityLabel }`, deliberately dropping `accessibilityRole="button"` because react-native-web swaps the SVG tag for a `<button>` that paints nothing (documented 2026-08-02). Result: the 12 tappable polygons in game.jsx render on web with aria-label but no role, no tabindex, and no keyboard activation.

**User impact.** On towinly.com/app the memory game is unplayable for keyboard and screen-reader users: cells never appear in the tab order and are not announced as actionable, while the same cells are full buttons in the native build.

**Suggested fix.** On web, overlay invisible focusable Pressables (position absolute over each hex), or add role button plus tabIndex plus onKeyDown via react-native-web's dataSet and aria props on the Polygon instead of swapping the tag.

- [x] Fixed. Verified 2026-08-29: src/lib/svgA11y.js web branch adds tabIndex 0 and Enter/Space activation, comment cites this finding.

### DEEP-36: Paused trusted elder silently moves tabs in MyEldersPanel

**Location:** `src/components/trust/MyEldersPanel.jsx:406` (counts at lines 367-368)
**Dimension:** correctness

**Evidence.** Paused cards render only when `seg === 'building'` and the segment counts exclude paused entirely, while MyHelpersPanel deliberately splits paused by currentTrustLevel and includes them in counts (lines 263-270, 286-287) because "a trusted friend must not vanish from Trusted Friends into the other tab". The pause toast promises nothing is lost.

**User impact.** A helper pauses a TRUSTED elder: the elder disappears from "Trusted Elders" (the count drops, an empty state may show) and reappears as a paused card under "Building Trust". The helper believes the trust standing was lost, contradicting the pause promise, and may not find the Resume card.

**Suggested fix.** Mirror MyHelpersPanel: split paused connections by `currentTrustLevel === 'TRUSTED'`, render them in their own segment, and include them in both segment counts.

- [x] Fixed. Verified 2026-08-29: src/components/trust/MyEldersPanel.jsx:334-342 splits paused by currentTrustLevel and counts them in both segments.

### DEEP-37: Demo account credentials compiled into production bundles despite "never ship" gate

**Location:** `src/components/DemoAccountsCard.jsx:16` (lines 15-19; duplicate in `src/components/auth/DemoCard.jsx:12-15`)
**Dimension:** security

**Evidence.** DemoAccountsCard hardcodes identifier and password pairs (elder/12345678, helper/123456789, demo.sarah@towin.app/DemoSarah!2026). login.jsx:11 and register.jsx import the component unconditionally; showDemoAccounts() (appEnv.js) gates only the render (login.jsx:240, register.jsx:517), so the credential strings ship in every store and production JS bundle. login.jsx:239 comments "hidden in store builds so the shared credentials never ship (audit)", which the code does not achieve. The same creds also sit in the dead, never-imported DemoCard.jsx.

**User impact.** Anyone unpacking the store binary or the public web bundle recovers working credentials for accounts that, per the code comments, bypass the per-IP login rate limiter, giving unthrottled authenticated access to the production API under demo seats. Largely mitigated because the same demo accounts are deliberately public on the website login page.

**Suggested fix.** Move the credential literals behind the same env gate that controls rendering (for example read them from EXPO_PUBLIC_* vars set only on dev and preview profiles, or lazy-require a module excluded from production builds), and delete the unused DemoCard.jsx duplicate (with owner permission, per the no-delete rule).

- [x] Closed by owner decision 2026-08-16 (src/lib/appEnv.js header): the demo seats are public by design and eas.json's production profile sets EXPO_PUBLIC_SHOW_DEMO=1, so the credentials ship on purpose. Still owner-only: the dead duplicate src/components/auth/DemoCard.jsx (0 importers) needs a yes before it can be deleted (verified 2026-08-29).

### DEEP-38: profile-edit DOB and Bio inputs get inline onChangeText, re-rendering two Paper fields on every keystroke

**Location:** `app/profile-edit.jsx:366` (also line 380; same class in `app/change-password.jsx:61/77/93` and `app/(auth)/reset-password.jsx:100/116`)
**Dimension:** performance

**Evidence.** The file establishes stable per-field handlers precisely because "each animates a floating label - the source of typing lag on slow phones" (lines 267-270), and Input is memoized. But Date of birth (line 366) and Bio (line 380) receive inline onChangeText closures recreated on every render, so both Paper inputs (one multiline) re-render on every keystroke in any of the form's 12+ fields.

**User impact.** Typing a name or city on an old Android reconciles two extra floating-label Paper TextInputs per keystroke on the app's heaviest form: a direct regression against the lag fix the file's own comment records.

**Suggested fix.** Route these through stable useCallback handlers that also clear their error state (for example `setDob = useCallback((v) => { fieldHandlers.dateOfBirth(v); setDobError(''); }, [])`; clearing unconditionally is safe), and apply the same to change-password and reset-password.

- [x] Fixed. Verified 2026-08-29: profile-edit.jsx was fixed earlier (fieldHandlers useMemo at `app/profile-edit.jsx:373`, stable setDateOfBirth at :386, setBio at :393; no inline onChangeText left). This story closed the remainder: `app/change-password.jsx:35-46` (onCurrent/onNext/onConfirm, useCallback [] deps) and `app/(auth)/reset-password.jsx:33-40` (onPw/onConfirm), each clearing only its own field error via functional setFieldErrors, byte-identical behaviour to the old inline closures. `grep 'onChangeText={('` over both files returns nothing. Probe: `__tests__/password-forms-stable-handlers.test.js` records every props object Input receives and asserts one handler identity per field across a keystroke (RED against the inline handlers: 2 identities; GREEN after: 1).

### DEEP-39: Family alerts feed renders full unbounded history inside the Home tab ScrollView

**Location:** `src/components/family/FamilyAlertsFeed.jsx:166`
**Dimension:** performance

**Evidence.** `{(alerts ?? []).map((a, i, list) => <AlertRow .../>)}` renders the backend's complete alert history ("newest first, full history, no read state", per the header comment) with no slice, pagination, or virtualization, nested inside home.jsx's plain ScrollView (FamilyHomePanel is mounted there, `app/(tabs)/home.jsx:130`). Each row also runs `list.findIndex(...)`, making the showExplain pass O(n squared).

**User impact.** A family account a year in (recurring INACTIVITY alerts per quiet spell, check-in milestones) mounts hundreds of alert rows every time the Home tab first renders: slow tab load and heavy layout on the old phones family elders hand down, growing without bound.

**Suggested fix.** Slice display to the latest 20 or so with a "Show older alerts" expander (or move the feed to its own FlatList screen); precompute first-of-kind indices once with a Set instead of findIndex per row.

- [x] Fixed. Verified 2026-08-29: src/components/family/FamilyAlertsFeed.jsx:129 slice(0, NEWEST_SHOWN) with a show-all switch; :133 first-of-kind computed in one pass.

### DEEP-40: Feedback intro callout paragraph at 14px where siblings use 16px

**Location:** `app/feedback.jsx:117`
**Dimension:** design law

**Evidence.** The blueWash callout renders a two-sentence reading paragraph ("We read every message. What you write here shapes what gets built next...") at type.meta (14). The equivalent NoteBox callouts on the landing story (`app/(auth)/landing.jsx:83`) set the same kind of copy at type.body (16).

**User impact.** The first thing a user reads on the feedback screen wraps to about 3 lines at 14px: inconsistent with every other callout paragraph and under the 16px body floor for running text.

**Suggested fix.** Change fontSize to type.body and lineHeight to about 22, matching the landing NoteBox.

- [ ] Fixed

### DEEP-41: Ask AI sheet title breaks the Newsreader heading rule

**Location:** `src/components/AskAiAssistant.jsx:228`
**Dimension:** design law

**Evidence.** `<Text ref={headerRef} accessibilityRole="header" style={{ fontSize: type.body, fontWeight: '600', color: t.ink }}>Ask AI</Text>`: a Text explicitly declared a heading, rendered in the system font at weight 600. Design law: headings are Newsreader serif, weight 400 only. Every other `accessibilityRole="header"` in the app uses fontFamily.display without a fontWeight.

**User impact.** The full-screen Ask AI sheet opens with a bold sans title while every other screen title in the app is serif. Screen-reader focus lands on this heading first, and visually the sheet reads as off-brand chrome.

**Suggested fix.** Either style it as a real heading (fontFamily.display, size around 19, no fontWeight) or keep the sans label styling and drop the header role in favor of the sheet's content headings.

- [x] Fixed. Verified 2026-08-29: src/components/AskAiAssistant.jsx:504-508 header in fontFamily.display at type.cardTitle with no fontWeight.

---

## Verified as already fixed (no action)

### PostedHelpList stale-on-refocus (UX-710) is FIXED in this tree

**Location:** `src/components/needs/PostedHelpList.jsx:236`

The previously open react-review finding ("PostedHelpList does not refresh in some flow") is addressed: a useFocusEffect refetch (lines 235-244, a firstFocus ref skips the mount) now refetches `['needs-mine']` every time the tab regains focus. my-requests.jsx is a redirect to the tab, mutations invalidate correctly, and the tab-layout badge shares the same key so posting from the Action tab also refreshes it. The auditor could not reproduce a remaining broken flow beyond the app-wide no-polling design (new applicants appear only on refocus or pull, matching the website).

Action: close the tracked finding in the react-review backlog. Optionally apply the same focus-refetch pattern to messages.jsx, which is DEEP-09's suggested fix.

---

## Suggested fix order

1. **Before anything else:** DEEP-01 and DEEP-02 together (one PR restores the entire elder Edit Profile flow), then DEEP-03 (block-list scoping) and DEEP-05 (one-line channel param forward).
2. **Web-parity batch:** DEEP-07, DEEP-08, DEEP-31, DEEP-35 in one pass, since all stem from react-native-web dropping props, then re-verify on towinly.com/app/.
3. **Silent-failure batch:** DEEP-11 through DEEP-14 and DEEP-25 through DEEP-30 share one pattern (missing isError handling); a single sweep adding LoadError and retry rows covers most of them.
4. **Typography and semantics batch:** DEEP-15 through DEEP-21, DEEP-32 through DEEP-34, DEEP-40, DEEP-41; mechanical token swaps plus the shared radio-chip fix (DEEP-17 and DEEP-18 share one Chip change).
5. **Performance batch:** DEEP-06 and DEEP-24 (bundle size, verify with `npx expo export` diffs), then DEEP-22, DEEP-23, DEEP-38, DEEP-39 (render hygiene).
6. DEEP-04, DEEP-19, DEEP-36, DEEP-37 slot in wherever their files are next touched.

Reminder from the standing repo rules: no file deletions without owner permission (this affects DEEP-37's dead DemoCard.jsx), all fixes need tests, and Impeccable runs on every UI file touched.
