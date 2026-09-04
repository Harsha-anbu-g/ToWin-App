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
