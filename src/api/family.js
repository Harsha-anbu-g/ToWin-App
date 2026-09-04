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
