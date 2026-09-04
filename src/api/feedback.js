// Feedback as a named tool (project Rule 6): one exported function per
// action, plain inputs, plain outputs, no UI knowledge. The feedback screen
// is the only caller today.
import api from './client';

/**
 * Send one piece of feedback to the Towinly team. The body goes to the
 * server exactly as given: name, email and phone may be null, message is
 * required, and any star ratings ride along as their own fields.
 * @param {object} feedback the POST /feedback body — message plus optional
 *   name, email, phone and per-question rating fields (null when unanswered)
 * @returns {Promise<void>} rejects with the axios error
 */
export async function sendFeedback(feedback) {
  if (!feedback?.message || !String(feedback.message).trim()) {
    throw new Error('sendFeedback needs a non-empty message.');
  }
  await api.post('/feedback', feedback);
}
