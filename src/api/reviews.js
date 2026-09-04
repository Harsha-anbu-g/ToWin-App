// Reviews as named tools (project Rule 6): one exported function per action,
// plain inputs, plain outputs, no UI knowledge. Starts with the public read;
// other /reviews calls migrate here as they are touched.
import api from './client';

/**
 * The reviews written about one person, as GET /reviews/user/{id} returns
 * them.
 * @param {string} userId whose reviews to read
 * @returns {Promise<Array<object>>} rejects with the axios error
 */
export async function listUserReviews(userId) {
  if (!userId) throw new Error('userId is required.');
  const res = await api.get(`/reviews/user/${userId}`);
  return res?.data;
}
