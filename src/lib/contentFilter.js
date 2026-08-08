// Write-time check on anything a member types for other members to read.
//
// Apple guideline 1.2's first requirement is "a method for filtering objectionable
// material from being posted to the app". Towinly already had report, block and an
// agreed EULA; this was the missing fourth item. See audit finding R7.
//
// Scope, stated plainly: this is a client-side wordlist. It stops casual abuse and
// satisfies the guideline. It is NOT moderation. Anyone determined can work around
// it, and a real system needs a server-side check the client cannot skip, plus a
// human queue. The report path (api.post('/reports')) remains the thing that catches
// what this misses.
//
// Design notes:
// - Word boundaries only, so "Scunthorpe", "class", "assess" and "Cockburn" pass.
//   A substring match here would insult the people it is meant to protect.
// - Characters commonly swapped to dodge filters are folded first (4 -> a, 0 -> o).
// - Returns the offending word so the caller can name it. Telling someone "that
//   word" without saying which one is a maze for an elder.

/** Words that may not appear in anything other members will read. */
const BLOCKED = [
  // Slurs. Deliberately short and specific; a long list produces false positives
  // that punish ordinary speech.
  'nigger', 'nigga', 'faggot', 'fag', 'tranny', 'retard', 'retarded',
  'spic', 'chink', 'kike', 'wetback', 'paki', 'coon', 'gook',
  // Explicit sexual language. Towinly puts strangers in each other's homes; this
  // is a safeguarding line, not prudishness.
  'cunt', 'whore', 'slut', 'rape', 'rapist', 'paedophile', 'pedophile',
  'porn', 'blowjob', 'cock', 'dick', 'pussy',
  // Threats.
  'kill yourself', 'kys',
];

/** Fold the usual filter-dodging substitutions before matching. */
function normalise(text) {
  return String(text ?? '')
    .toLowerCase()
    .replace(/[4@]/g, 'a')
    .replace(/[0]/g, 'o')
    // Note "!" is NOT folded to i. It is punctuation far more often than it is a
    // dodge, and folding it turned "CUNT!" into "cunti", which then failed the
    // word-boundary match and let the word through.
    .replace(/[1|]/g, 'i')
    .replace(/[3]/g, 'e')
    .replace(/[5$]/g, 's')
    .replace(/[7]/g, 't');
}

// Built once. Word-boundary anchored, so only whole words match.
const PATTERNS = BLOCKED.map((word) => ({
  word,
  re: new RegExp(`(^|[^a-z])${word.replace(/ /g, '[^a-z]+')}($|[^a-z])`, 'i'),
}));

/**
 * @param {string} text anything a member typed for other members to read
 * @returns {string|null} the blocked word that was found, or null when clean
 */
export function findObjectionable(text) {
  const haystack = normalise(text);
  if (!haystack.trim()) return null;
  const hit = PATTERNS.find(({ re }) => re.test(haystack));
  return hit ? hit.word : null;
}

/**
 * The message shown under the field. Says which word, and why, without lecturing.
 * @param {string} word
 * @returns {string}
 */
export function objectionableMessage(word) {
  return `Please take out "${word}". Towinly is read by older people who are trusting us with their homes.`;
}

/**
 * Convenience for a form: returns an error string, or an empty string when clean.
 * @param {string} text
 * @returns {string}
 */
export function objectionableError(text) {
  const word = findObjectionable(text);
  return word ? objectionableMessage(word) : '';
}
