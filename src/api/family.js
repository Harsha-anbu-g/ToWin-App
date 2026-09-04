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
 * Who stands behind each of the signed-in helper's elder friendships —
 * the family members those elders have chosen to share with, as
 * GET /family/behind-me returns them (an `entries` array keyed by
 * connectionId). Derived server-side from the elder's own sharing.
 * @returns {Promise<{entries: Array<object>}>} rejects with the axios error
 */
export async function getFamilyBehindMe() {
  const res = await api.get('/family/behind-me');
  return res?.data;
}

/**
 * The family member's view of each linked parent's journey: check-in, open
 * requests, and the friendships the parent chose to share, as GET
 * /family/journey returns it (an object with `elders`).
 * @returns {Promise<object>} rejects with the axios error
 */
export async function getFamilyJourney() {
  const res = await api.get('/family/journey');
  return res?.data;
}

/**
 * The alerts a family member sees about their linked parents (SOS, quiet
 * lately, new friendships), newest first. In-app only — nothing is sent by
 * text or email.
 * @returns {Promise<Array<object>>} rejects with the axios error
 */
export async function listFamilyAlerts() {
  const res = await api.get('/family/alerts');
  return res?.data?.alerts ?? [];
}

/**
 * Ask to link with someone as family. Nothing is shared until they accept.
 * @param {object} input
 * @param {string} input.identifier their exact Towinly username, email or phone
 * @param {string} input.relationship what the identified person is (Daughter, Son, …)
 * @param {'elder'|'family'} input.side the seat the IDENTIFIED person takes:
 *   'elder' = adding your parent, 'family' = an elder adding a family member
 * @returns {Promise<void>} rejects with the axios error
 */
export async function sendFamilyRequest({ identifier, relationship, side }) {
  if (!identifier) throw new Error('sendFamilyRequest needs an identifier');
  await api.post('/family/requests', { identifier, relationship, side });
}

/**
 * Answer a pending family link request. Accepting turns the link ACTIVE;
 * declining removes it.
 * @param {object} input
 * @param {string} input.requestId the pending request
 * @param {boolean} input.accept true to accept, false to decline
 * @returns {Promise<void>} rejects with the axios error
 */
export async function respondToFamilyRequest({ requestId, accept }) {
  if (!requestId) throw new Error('respondToFamilyRequest needs a requestId');
  await api.post(`/family/requests/${requestId}/respond`, { accept });
}

/**
 * The elder answers a family member's ask for a delegated power (acting for
 * them). A yes grants exactly that one power; a no changes nothing.
 * @param {object} input
 * @param {string} input.requestId the pending power request
 * @param {boolean} input.accept true to grant, false to refuse
 * @returns {Promise<void>} rejects with the axios error
 */
export async function respondToPowerRequest({ requestId, accept }) {
  if (!requestId) throw new Error('respondToPowerRequest needs a requestId');
  await api.post(`/family/power-requests/${requestId}/respond`, { accept });
}

/**
 * Remove a family link — an active member, or a request still waiting. The
 * other person loses all sight of the elder; either seat can call it.
 * @param {string} linkId the link (or pending request) to remove
 * @returns {Promise<void>} rejects with the axios error
 */
export async function removeFamilyLink(linkId) {
  if (!linkId) throw new Error('removeFamilyLink needs a linkId');
  await api.delete(`/family/links/${linkId}`);
}

/**
 * Make one active family member the elder's main contact — the person the
 * app names first when something needs family attention.
 * @param {string} linkId the active link to promote
 * @returns {Promise<void>} rejects with the axios error
 */
export async function makePrimaryFamilyContact(linkId) {
  if (!linkId) throw new Error('makePrimaryFamilyContact needs a linkId');
  await api.post(`/family/links/${linkId}/primary`);
}

/**
 * Open (or reopen) the private chat with a linked family member. The family
 * link is the only permission; the server checks it.
 * @param {string} otherUserId the family member to chat with
 * @returns {Promise<string>} the connection id of the chat to open; rejects
 *   with the axios error
 */
export async function openFamilyChat(otherUserId) {
  if (!otherUserId) throw new Error('openFamilyChat needs the other person’s user id');
  const res = await api.post(`/family/chat/${otherUserId}`);
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
