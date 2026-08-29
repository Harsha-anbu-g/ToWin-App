// Reporting a person, as a named tool (project Rule 6): one exported function
// per action, plain inputs, plain outputs, no UI knowledge. Blocking lives in
// blocks.js; the two are separate actions and a caller often wants only one.
import api from './client';

/**
 * Report a person to the Towinly team, with one reason in the person's words.
 * @param {string} reportedUserId the person being reported
 * @param {string} reason one of the offered reasons, sent as both reason and description
 * @returns {Promise<void>}
 */
export async function reportUser(reportedUserId, reason) {
  await api.post('/reports', { reportedUserId, reason, description: reason });
}
