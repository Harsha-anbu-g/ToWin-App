// Reviews as named tools (project Rule 6): one exported function per action,
// plain inputs, plain outputs, no UI knowledge. Callers translate errors.
import api from './client';

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
