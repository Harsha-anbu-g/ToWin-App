// Trust ladder as named tools (project Rule 6): one exported function per
// user action, plain inputs, plain outputs, no UI knowledge. Screens call
// these by name; an agent driving the app can call the same functions.
import api from './client';

/**
 * The signed-in person's live trust score with the per-friendship breakdown
 * (one card per person: stage index, points earned, maximums), exactly as
 * GET /trust/my-score returns it.
 * @returns {Promise<{totalScore: number, customers: Array<object>}>} rejects
 *   with the axios error
 */
export async function getMyTrustScore() {
  const res = await api.get('/trust/my-score');
  return res?.data;
}

/**
 * Start — or, on the other seat, accept — the next trust step on one
 * friendship. The backend counts the step only once BOTH sides confirm, and
 * refuses a repeat confirm from the same side.
 * @param {string} connectionId the friendship the step belongs to
 * @returns {Promise<void>} rejects with the axios error when refused
 */
export async function confirmTrustStep(connectionId) {
  await api.post(`/trust/${connectionId}/confirm`);
}

/**
 * Pause trust steps and messages on one friendship until either side
 * resumes. Nothing is lost: the ladder keeps its rung.
 * @param {string} connectionId
 * @returns {Promise<void>} rejects with the axios error when refused
 */
export async function pauseTrustSteps(connectionId) {
  await api.post(`/trust/${connectionId}/pause`);
}

/**
 * Resume a paused friendship: trust steps and messages come back on.
 * @param {string} connectionId
 * @returns {Promise<void>} rejects with the axios error when refused
 */
export async function resumeTrustSteps(connectionId) {
  await api.post(`/trust/${connectionId}/resume`);
}
