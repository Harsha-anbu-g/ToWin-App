// What I Pass On as named tools (project Rule 6): one exported function per
// action, plain inputs, plain outputs, no UI knowledge. Starts with the
// keyholder asks feed; other /passon calls migrate here as they are touched.
import api from './client';

/**
 * The pass-on entries whose owners asked the signed-in person to hold the
 * key, as GET /passon/keyholders/asked-of-me returns them.
 * @returns {Promise<Array<object>>} rejects with the axios error
 */
export async function listKeyholderAsksForMe() {
  const res = await api.get('/passon/keyholders/asked-of-me');
  return res?.data;
}
