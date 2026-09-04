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

/**
 * Report one passed-on story or letter, naming the exact item so an admin is
 * told what was written, not only who wrote it.
 * @param {{reportedUserId: string, contentId: string, reason: string, description: string}} report
 *   the writer, the item, and the visitor's reason in their own words
 * @returns {Promise<void>} rejects with an Error when the writer or item is missing
 */
export async function reportPassOnStory({ reportedUserId, contentId, reason, description }) {
  if (!reportedUserId) throw new Error('reportedUserId is required.');
  if (!contentId) throw new Error('contentId is required.');
  await api.post('/reports', {
    reportedUserId,
    contentType: 'PASSON_ITEM',
    contentId,
    reason,
    description,
  });
}
