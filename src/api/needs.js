// Help requests as named tools (project Rule 6): one exported function per
// action, plain inputs, plain outputs, no UI knowledge. Covers the whole
// help-request lifecycle: post, browse, apply, accept, complete, remove.
import api from './client';

/**
 * The help requests the signed-in person has posted, newest first. The
 * server answers a page object; the rows sit in its `content` array.
 * @returns {Promise<{content: Array<object>}>} rejects with the axios error
 */
export async function listMyHelpRequests() {
  const res = await api.get('/needs/mine');
  return res?.data;
}

/**
 * Post a new help request. Family members pass onBehalfOfElderId to ask for
 * their parent; the server re-checks that grant before the request goes out.
 * @param {object} params
 * @param {string} params.title short title of the request (required)
 * @param {string|null} [params.description] longer detail, or null
 * @param {string} params.category e.g. 'COMPANIONSHIP', 'ERRANDS', 'OTHER'
 * @param {string} params.urgency 'NORMAL' or 'URGENT'
 * @param {string} [params.onBehalfOfElderId] elder this is posted for (family only)
 * @returns {Promise<object>} the created request; rejects with the axios error
 */
export async function postHelpRequest({ title, description, category, urgency, onBehalfOfElderId } = {}) {
  if (!title || !String(title).trim()) throw new Error('postHelpRequest needs a title');
  const body = { title, description, category, urgency };
  if (onBehalfOfElderId != null) body.onBehalfOfElderId = onBehalfOfElderId;
  const res = await api.post('/needs', body);
  return res?.data;
}

/**
 * Every open help request, with no distance attached — the browse feed for a
 * helper who has not shared a position.
 * @returns {Promise<{content: Array<object>}|Array<object>>} rejects with the axios error
 */
export async function listOpenHelpRequests() {
  const res = await api.get('/needs/open');
  return res?.data;
}

/**
 * Open help requests near a point, each row carrying a real distanceKm.
 * Coordinates should already be snapped to the coarse on-device grid.
 * @param {object} params
 * @param {number} params.lat latitude of the searcher
 * @param {number} params.lng longitude of the searcher
 * @param {number} params.radiusKm how far to look, in kilometres
 * @returns {Promise<{content: Array<object>}|Array<object>>} rejects with the axios error
 */
export async function listNearbyHelpRequests({ lat, lng, radiusKm } = {}) {
  if (lat == null || lng == null) throw new Error('listNearbyHelpRequests needs lat and lng');
  const res = await api.get('/needs/nearby', { params: { lat, lng, radiusKm } });
  return res?.data;
}

/**
 * The help requests the signed-in helper has offered on — waiting, accepted,
 * and completed alike.
 * @returns {Promise<{content: Array<object>}|Array<object>>} rejects with the axios error
 */
export async function listMyApplications() {
  const res = await api.get('/needs/applications');
  return res?.data;
}

/**
 * Offer to help on one open request.
 * @param {string} needId the request to offer on
 * @returns {Promise<object>} rejects with the axios error
 */
export async function applyToHelpRequest(needId) {
  if (!needId) throw new Error('applyToHelpRequest needs a needId');
  const res = await api.post(`/needs/${needId}/apply`);
  return res?.data;
}

/**
 * Withdraw the signed-in helper's own offer on one request.
 * @param {string} needId the request to withdraw from
 * @returns {Promise<object>} rejects with the axios error
 */
export async function withdrawApplication(needId) {
  if (!needId) throw new Error('withdrawApplication needs a needId');
  const res = await api.delete(`/needs/${needId}/apply`);
  return res?.data;
}

/**
 * Accept one helper's offer on the signed-in elder's request. The server also
 * opens the connection that carries their chat.
 * @param {object} params
 * @param {string} params.needId the request being answered
 * @param {string} params.helperId the helper whose offer is accepted
 * @returns {Promise<object>} rejects with the axios error
 */
export async function acceptHelper({ needId, helperId } = {}) {
  if (!needId || !helperId) throw new Error('acceptHelper needs a needId and a helperId');
  const res = await api.post(`/needs/${needId}/accept/${helperId}`);
  return res?.data;
}

/**
 * Mark the signed-in elder's request as completed.
 * @param {string} needId the request to complete
 * @returns {Promise<object>} rejects with the axios error
 */
export async function completeHelpRequest(needId) {
  if (!needId) throw new Error('completeHelpRequest needs a needId');
  const res = await api.post(`/needs/${needId}/complete`);
  return res?.data;
}

/**
 * Remove (close) one of the signed-in person's own help requests.
 * @param {string} needId the request to remove
 * @returns {Promise<object>} rejects with the axios error
 */
export async function removeHelpRequest(needId) {
  if (!needId) throw new Error('removeHelpRequest needs a needId');
  const res = await api.delete(`/needs/${needId}`);
  return res?.data;
}
