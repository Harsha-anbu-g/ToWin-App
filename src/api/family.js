// Family as named tools (project Rule 6): one exported function per action,
// plain inputs, plain outputs, no UI knowledge. Starts with the elder's
// Step 4 transparency read; other /family calls migrate here as they are
// touched.
import api from './client';

/**
 * Which of the signed-in elder's family members are connected with which
 * helpers — Step 4 transparency: nothing about you happens out of your
 * sight. Names and ids only, never contact details.
 * @returns {Promise<Array<{familyMemberName: string, relationship: string|null, helperUserId: string, helperName: string, inherited: boolean}>>}
 *   `inherited` is true when the reach comes from inherited standing (your
 *   shared trust) rather than an already-opened chat.
 */
export async function getFamilyTransparency() {
  const res = await api.get('/family/transparency');
  return res?.data?.connections ?? [];
}

/**
 * The signed-in person's family links from both seats, as GET /family/links
 * returns them: activeLinks (each saying whether I am the elder in it) and
 * any pending invitations.
 * @returns {Promise<object>} rejects with the axios error
 */
export async function getFamilyLinks() {
  const res = await api.get('/family/links');
  return res?.data;
}

/**
 * The family member's view of every linked elder's day — check-ins, shared
 * friendships and their trust stages — as GET /family/journey returns it.
 * @returns {Promise<{elders: Array<object>}>} rejects with the axios error
 */
export async function getFamilyJourney() {
  const res = await api.get('/family/journey');
  return res?.data;
}

/**
 * The family member's inherited standings: for each shared friendship at
 * Messaging or above, whether the standing is live, paused, or removed, and
 * the chat it opens into.
 * @returns {Promise<{standings: Array<object>}>} rejects with the axios error
 */
export async function getFamilyStandings() {
  const res = await api.get('/family/standings');
  return res?.data;
}

/**
 * Replace the WHOLE set of powers the elder delegates on one family link —
 * an absent power is turned off, matching the endpoint's replace semantics.
 * @param {object} input
 * @param {string} input.linkId   the family link the powers belong to
 * @param {string[]} input.powers every power that should stay on
 * @returns {Promise<object>} the fresh link (delegatedPowers is the record
 *   that decides); rejects with the axios error
 */
export async function setDelegatedPowers({ linkId, powers }) {
  if (!linkId) throw new Error('setDelegatedPowers needs a linkId.');
  if (!Array.isArray(powers)) throw new Error('setDelegatedPowers needs powers as an array.');
  const res = await api.put(`/family/links/${linkId}/powers`, { powers });
  return res?.data;
}

/**
 * Ask the elder for one power. Grants nothing — it puts a yes/no card in
 * front of the parent; the 7-day re-ask cooldown is enforced server-side.
 * @param {object} input
 * @param {string} input.linkId the family link to ask on
 * @param {string} input.power  the power key being asked for
 * @returns {Promise<void>} rejects with the axios error when refused
 */
export async function askForPower({ linkId, power }) {
  if (!linkId) throw new Error('askForPower needs a linkId.');
  if (!power) throw new Error('askForPower needs a power key.');
  await api.post(`/family/links/${linkId}/power-requests`, { power });
}

/**
 * Pause the family member's inherited chat on one shared friendship —
 * neither side can send messages until it is resumed.
 * @param {string} connectionId the standing's connection id
 * @returns {Promise<void>} rejects with the axios error when refused
 */
export async function pauseFamilyStanding(connectionId) {
  if (!connectionId) throw new Error('pauseFamilyStanding needs a connectionId.');
  await api.post(`/family/standings/${connectionId}/pause`);
}

/**
 * Resume a paused or removed inherited standing — the same connection comes
 * back, nothing is re-requested.
 * @param {string} connectionId the elder's friendship connection id
 * @returns {Promise<void>} rejects with the axios error when refused
 */
export async function resumeFamilyStanding(connectionId) {
  if (!connectionId) throw new Error('resumeFamilyStanding needs a connectionId.');
  await api.post(`/family/standings/${connectionId}/resume`);
}

/**
 * Remove the family member's inherited standing on one shared friendship.
 * Reversible: resumeFamilyStanding restores the same connection.
 * @param {string} connectionId the standing's connection id
 * @returns {Promise<void>} rejects with the axios error when refused
 */
export async function revokeFamilyStanding(connectionId) {
  if (!connectionId) throw new Error('revokeFamilyStanding needs a connectionId.');
  await api.post(`/family/standings/${connectionId}/revoke`);
}

/**
 * Open (or reopen) the direct chat an inherited standing allows with the
 * elder's helper — no request, no accept.
 * @param {string} standingConnectionId the standing's connection id
 * @returns {Promise<string>} the chat connection id to open; rejects with
 *   the axios error
 */
export async function openFamilyStandingChat(standingConnectionId) {
  if (!standingConnectionId) throw new Error('openFamilyStandingChat needs a standingConnectionId.');
  const res = await api.post(`/family/standings/${standingConnectionId}/chat`);
  return res?.data;
}

/**
 * Open (or reopen) the private family chat with one linked elder. The link
 * is the only permission; the server checks it.
 * @param {string} elderId the linked elder's user id
 * @returns {Promise<string>} the chat connection id to open; rejects with
 *   the axios error
 */
export async function openFamilyChat(elderId) {
  if (!elderId) throw new Error('openFamilyChat needs an elderId.');
  const res = await api.post(`/family/chat/${elderId}`);
  return res?.data;
}
