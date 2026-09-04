// Reviews as named tools (project Rule 6): one exported function per action,
// plain inputs, plain outputs, no UI knowledge. Callers translate errors.
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

/**
 * Post a review of a person. Guardian mode passes onBehalfOfElderId so the
 * review is saved as the parent's, with the writer's name on it; the server
 * checks the grant.
 * @param {{revieweeId: string, rating: number, comment: string|null, onBehalfOfElderId?: string}} review
 * @returns {Promise<void>} rejects with an Error when revieweeId or rating is missing
 */
export async function postReview({ revieweeId, rating, comment, onBehalfOfElderId }) {
  if (!revieweeId) throw new Error('revieweeId is required.');
  if (!rating) throw new Error('rating is required.');
  await api.post('/reviews', { revieweeId, rating, comment, onBehalfOfElderId });
}

/**
 * The reviews written about the signed-in person, as GET /reviews/mine
 * returns them.
 * @returns {Promise<Array<object>>} rejects with the axios error
 */
export async function listMyReviews() {
  const res = await api.get('/reviews/mine');
  return res?.data;
}
