// Connections as named tools (project Rule 6): one exported function per
// action, plain inputs, plain outputs, no UI knowledge. Screens call these
// by name; an agent driving the app can call the same functions.
import api from './client';

/**
 * Every connection the signed-in person is part of — friendships and family
 * links alike — with status, current trust level, per-side confirm flags,
 * and the other person's id and name, as GET /connections returns it.
 * @returns {Promise<Array<object>>} rejects with the axios error
 */
export async function listMyConnections() {
  const res = await api.get('/connections');
  return res?.data;
}

/**
 * End one connection for good — the friendship (or family chat) closes for
 * both people. Blocking uses this too: the row leaves both inboxes.
 * @param {string} connectionId the connection to end
 * @returns {Promise<void>} rejects with the axios error when refused
 */
export async function endConnection(connectionId) {
  if (!connectionId) throw new Error('endConnection needs a connectionId');
  await api.delete(`/connections/${connectionId}`);
}
