// Connections as named tools (project Rule 6): one exported function per
// action, plain inputs, plain outputs, no UI knowledge. Screens call these
// by name; an agent driving the app can call the same functions.
import api from './client';

/**
 * Every connection the signed-in person is part of — friendships and family
 * links alike — with status, current trust level, per-side confirm flags,
 * and the other person's id and name, as GET /connections returns it.
 * @returns {Promise<Array<object>>} rejects with the axios error
 */
export async function listMyConnections() {
  const res = await api.get('/connections');
  return res?.data;
}

/**
 * Elders near the signed-in helper who could use company, closest first,
 * as GET /discover/elders returns them. The distance goes on the wire —
 * without it the backend caps the search at its own 10 km default.
 * @param {number} radiusKm how far to look, in kilometres
 * @returns {Promise<Array<object>>} rejects with the axios error
 */
export async function discoverElders(radiusKm) {
  const res = await api.get('/discover/elders', { params: { radiusKm } });
  return res?.data;
}

/**
 * Helpers near the signed-in elder, closest first, as GET /discover/helpers
 * returns them. The distance goes on the wire — without it the backend caps
 * the search at its own 10 km default.
 * @param {number} radiusKm how far to look, in kilometres
 * @returns {Promise<Array<object>>} rejects with the axios error
 */
export async function discoverHelpers(radiusKm) {
  const res = await api.get('/discover/helpers', { params: { radiusKm } });
  return res?.data;
}

/**
 * Send a friend request to one person. The server refuses a repeat request
 * or one to an existing friend.
 * @param {string} targetUserId the person to ask
 * @returns {Promise<object>} the new pending connection; rejects with the
 *   axios error (response.data.message carries the reason)
 */
export async function sendConnectionRequest(targetUserId) {
  if (!targetUserId) throw new Error('targetUserId is required.');
  const res = await api.post('/connections/request', { targetUserId });
  return res?.data;
}

/**
 * Accept or decline a friend request someone sent me.
 * @param {object} input
 * @param {string} input.connectionId the pending connection to answer
 * @param {boolean} input.accept true to become friends, false to decline
 * @returns {Promise<object>} the updated connection; rejects with the axios error
 */
export async function respondToConnectionRequest({ connectionId, accept }) {
  if (!connectionId) throw new Error('connectionId is required.');
  const res = await api.post(`/connections/${connectionId}/respond`, { accept });
  return res?.data;
}

/**
 * End one friendship for good — the server removes the connection for both
 * sides. This cannot be undone.
 * @param {string} connectionId the friendship to end
 * @returns {Promise<void>} rejects with the axios error when refused
 */
export async function endConnection(connectionId) {
  if (!connectionId) throw new Error('connectionId is required.');
  await api.delete(`/connections/${connectionId}`);
}

/**
 * The elder's per-friendship choice of whether family may see it. Sharing
 * never moves the trust score.
 * @param {object} input
 * @param {string} input.connectionId the friendship the choice is about
 * @param {boolean} input.shared true to let family see it, false to keep it private
 * @returns {Promise<object>} the fresh connection record; rejects with the axios error
 */
export async function setFamilyVisibility({ connectionId, shared }) {
  if (!connectionId) throw new Error('connectionId is required.');
  const res = await api.post(`/connections/${connectionId}/family-visibility`, { shared });
  return res?.data;
}
