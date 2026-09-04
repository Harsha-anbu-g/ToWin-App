// "What I pass on" as named tools (project Rule 6): one exported function per
// action, plain inputs, plain outputs, no UI knowledge. Wire shapes mirror the
// website's pass-on pages exactly; callers translate errors themselves.
import api from './client';

/**
 * The signed-in elder's own pass-on writing: stories, letters, and the rest of
 * the /passon/mine summary, exactly as the server shapes it.
 * @returns {Promise<{stories: Array, letters: Array}>}
 */
export async function listMyPassOnItems() {
  const res = await api.get('/passon/mine');
  return res?.data;
}

/**
 * The signed-in elder's sealed-box setup: whether the box is armed, the
 * keyholders, and the approval threshold.
 * @returns {Promise<{armed: boolean}>}
 */
export async function getPassOnSetup() {
  const res = await api.get('/passon/setup');
  return res?.data;
}

/**
 * Keyholder invitations waiting for the signed-in person's yes or no.
 * @returns {Promise<Array<{id: string, ownerName: string, approvalsNeeded: number, keyholderCount: number}>>}
 */
export async function listKeyholderAsksOfMe() {
  const res = await api.get('/passon/keyholders/asked-of-me');
  return res?.data;
}

/**
 * Answer one keyholder invitation: accept or decline holding a key.
 * @param {{askId: string, accept: boolean}} answer which ask, and the answer
 * @returns {Promise<void>} rejects with an Error when askId is missing
 */
export async function respondToKeyholderAsk({ askId, accept }) {
  if (!askId) throw new Error('askId is required.');
  await api.post(`/passon/keyholders/${askId}/respond`, { accept });
}

/**
 * One elder's passed-on page as this visitor may read it — the server decides
 * visibility, this function only carries the answer.
 * @param {string} ownerId the elder whose writing is being read
 * @returns {Promise<{ownerName: string, items: Array}>} rejects with an Error when ownerId is missing
 */
export async function getPassedOnFrom(ownerId) {
  if (!ownerId) throw new Error('ownerId is required.');
  const res = await api.get(`/passon/from/${ownerId}`);
  return res?.data;
}
