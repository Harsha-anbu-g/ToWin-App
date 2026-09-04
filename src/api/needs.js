// Help requests as named tools (project Rule 6): one exported function per
// action, plain inputs, plain outputs, no UI knowledge. Starts with the
// signed-in person's own posts; other /needs calls migrate here as they are
// touched.
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
 * The offers the signed-in helper has made on others' requests, as
 * GET /needs/applications returns them.
 * @returns {Promise<Array<object>>} rejects with the axios error
 */
export async function listMyApplications() {
  const res = await api.get('/needs/applications');
  return res?.data;
}
