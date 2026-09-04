// Messages as named tools (project Rule 6): one exported function per
// action, plain inputs, plain outputs, no UI knowledge. Starts with the
// unread badge count; other /messages calls migrate here as they are touched.
import api from './client';

/**
 * How many conversations hold messages the signed-in person has not read.
 * The server answers a plain integer.
 * @returns {Promise<number>} rejects with the axios error
 */
export async function getUnreadMessageCount() {
  const res = await api.get('/messages/unread-count');
  return res?.data;
}
