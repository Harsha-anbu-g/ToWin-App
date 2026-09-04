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
