// The account itself as named tools (project Rule 6): one exported function
// per action, plain inputs, plain outputs, no UI knowledge. These are the
// heaviest actions in the app — deleting everything, and taking a copy out —
// so the double-confirm gates stay on the screen, never in here.
import api from './client';

/**
 * Permanently delete the signed-in person's account — profile, friendships,
 * messages and requests. There is no undo on the server.
 * @returns {Promise<void>} rejects with the axios error
 */
export async function deleteMyAccount() {
  await api.delete('/account');
}

/**
 * Everything Towinly holds about the signed-in person, in one object, as
 * GET /account/export returns it. Nothing is emailed; the caller decides
 * how the copy reaches the person (download, share sheet).
 * @returns {Promise<object>} rejects with the axios error
 */
export async function exportMyData() {
  const res = await api.get('/account/export');
  return res?.data;
}
