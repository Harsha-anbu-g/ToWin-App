// Every persisted key the app owns, in one place.
//
// Why this file exists: on phones the app writes to the OS keychain, which no
// other product can see. On the web build the app is served from
// towinly.com/app/ — SAME ORIGIN as the Towinly website — so both share one
// localStorage. A key collision there is not a style problem: the website's
// theme key flipping from a phone, or its token being overwritten, is a real
// user-visible fault on a different product.
//
// The rule: every key the app WRITES must be absent from WEBSITE_OWNED_KEYS
// and outside WEBSITE_OWNED_PREFIXES. __tests__/storage-keys.test.js enforces
// it. Add a key here first, then use it.

/** Keys the app reads and writes. */
export const KEYS = {
  authToken: 'towin-token',
  // Renamed away from 'towin-theme', which is the website's legacy theme key —
  // a night-mode toggle on the phone used to flip the desktop site.
  theme: 'towinly-app-theme',
  haptics: 'towin-haptics',
  checkinPrompted: 'towin-checkin-prompted',
  checkinExplained: 'towin-checkin-explained',
  blockedUsers: 'towin-blocked-users',
  onboarded: 'towin-onboarded',
  oauthState: 'towin-oauth-state',
  oauthVerifier: 'towin-oauth-verifier',
  // Per-user, so it is a prefix rather than a key — see aiConsentKey().
  aiConsentPrefix: 'towin-ai-consent-',
  // READ-ONLY fallback. Returning visitors who set night mode on the old
  // website still have this; we honour it once and then write KEYS.theme.
  // Writing it is forbidden — see the test.
  themeLegacyReadOnly: 'towin-theme',
};

/** @param {string|undefined|null} userId */
export const aiConsentKey = (userId) => `${KEYS.aiConsentPrefix}${userId ?? 'anon'}`;

/**
 * Every key the app writes. The disjointness contract is asserted against
 * this list, so a key that is only ever read (themeLegacyReadOnly) is absent
 * on purpose, and so is SHARED_SESSION_TOKEN.
 */
export const APP_WRITTEN_KEYS = [
  KEYS.authToken,
  KEYS.theme,
  KEYS.haptics,
  KEYS.checkinPrompted,
  KEYS.checkinExplained,
  KEYS.blockedUsers,
  KEYS.onboarded,
  KEYS.oauthState,
  KEYS.oauthVerifier,
  aiConsentKey('example'),
];

/**
 * The website's JWT key (ToWin/frontend/src/context/AuthContext.jsx:33).
 * The ONE key both products write on purpose: src/lib/webSession.js keeps it
 * in step with KEYS.authToken so signing in or out on a phone does the same
 * on the website. Deliberately shared, therefore excluded from the collision
 * contract above.
 */
export const SHARED_SESSION_TOKEN = 'token';

/**
 * Keys owned by the Towinly website, transcribed from its source. Kept here
 * so the collision test has something to check against; if the website adds a
 * key, add it here too.
 *   token                          — AuthContext.jsx
 *   towinly-theme / towin-theme    — ThemeContext.jsx (current / legacy)
 *   towinly_beta_banner_dismissed  — BetaBanner.jsx
 *   cookieConsent                  — CookieConsent.jsx
 */
export const WEBSITE_OWNED_KEYS = [
  SHARED_SESSION_TOKEN,
  'towinly-theme',
  KEYS.themeLegacyReadOnly,
  'towinly_beta_banner_dismissed',
  'cookieConsent',
];

/** Website keys built at runtime — lib/useSeenIds.js: `towinly_seen_<user>_<category>`. */
export const WEBSITE_OWNED_PREFIXES = ['towinly_seen_'];
