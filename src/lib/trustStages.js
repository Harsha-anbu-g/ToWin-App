// One trust-stage vocabulary for the whole app.
//
// Why this file exists: the website carries TWO numbering conventions side by
// side — `stageIndex` from /family/journey and /family/standings is 0-based
// (MESSAGING = 1), while the 1-based TRUST_LEVEL_ORDER map inside the web
// TrustJourney/ElderFamilyUpdates/HelperFamilyUpdates components counts
// MESSAGING as 2. Porting both would eventually unlock family chat a step
// early or late. Mobile keeps the 0-based API numbering only, named once here,
// and every family/trust surface reads from it.
//
// Source of truth: backend common/enums/TrustLevel.java.

/** Backend TrustLevel enum name → 0-based ladder index. */
export const LEVEL_INDEX = {
  DISCOVERED: 0,
  MESSAGING: 1,
  PHONE_CALL: 2,
  VIDEO_CALL: 3,
  VERIFIED: 4,
  FIRST_MEET: 5,
  TRUSTED: 6,
};

/**
 * Short labels used on cards and ladders, indexed the same 0-based way.
 * These are the chip register: the word after "Stage 3 of 7 ·".
 */
export const SHORT_STAGES = [
  'Connected',
  'Messaging',
  'Phone',
  'Video',
  'Socials',
  'Met in person',
  'Trusted',
];

/**
 * Long labels used in sentences, indexed the same 0-based way. The sentence
 * register: "your email and phone are shown once you reach the Phone Ready
 * stage". The website carries the same two registers on one row per rung
 * (TrustJourney.jsx LEVELS: `label` and `short`), and these are the backend's
 * own words for the rung (TrustScoreService.stageLabel, FamilyJourneyService),
 * so a member reading the policy and a member reading a server-sent label see
 * the same name. HARD-110 collapsed five hand-typed copies of this list onto
 * this one; changing a word here changes what the rung MEANS, so it is pinned
 * by stage-names-single-source.test.js.
 */
export const FULL_STAGES = [
  'Just Connected',
  'Messaging',
  'Phone Ready',
  'Video Ready',
  'Social Media',
  'Ready to Meet',
  'Fully Trusted',
];

/** The step at which an elder's trust becomes reachable by their family. */
export const MESSAGING_STAGE = 1;

/** The step at which two people's phone numbers become visible to each other. */
export const PHONE_STAGE = 2;

/** The step at which the shared family-updates thread opens. */
export const FIRST_MEET_STAGE = 5;

/** The top of the ladder. */
export const TRUSTED_STAGE = 6;

/** Total rungs — the "of 7" in every "Stage N of 7" caption. */
export const STAGE_COUNT = 7;

/**
 * Resolve a 0-based stage index from whatever the server gave us.
 * Prefers an explicit numeric stageIndex, falls back to the level name, and
 * lands on 0 rather than throwing — an unknown level must read as "just
 * connected", never as fully trusted.
 *
 * @param {{ stageIndex?: number, currentTrustLevel?: string }} source
 * @returns {number} 0..6
 */
export function stageIndexOf(source) {
  const explicit = source?.stageIndex;
  if (typeof explicit === 'number' && Number.isFinite(explicit)) {
    return Math.max(0, Math.min(TRUSTED_STAGE, explicit));
  }
  return LEVEL_INDEX[source?.currentTrustLevel] ?? 0;
}

/**
 * Can this elder's family reach the helper directly? Trust inheritance opens
 * at Messaging and never below it.
 *
 * @param {{ stageIndex?: number, currentTrustLevel?: string }} source
 * @returns {boolean}
 */
export function isInheritable(source) {
  return stageIndexOf(source) >= MESSAGING_STAGE;
}
