// Reviews as named tools (project Rule 6): one exported function per action,
// plain inputs, plain outputs, no UI knowledge. Starts with the signed-in
// person's own reviews; other /reviews calls migrate here as they are touched.
import api from './client';

/**
 * The reviews written about the signed-in person, as GET /reviews/mine
 * returns them.
 * @returns {Promise<Array<object>>} rejects with the axios error
 */
export async function listMyReviews() {
  const res = await api.get('/reviews/mine');
  return res?.data;
}
