// Push-token registration as named tools (project Rule 6): one exported
// function per action, plain inputs, plain outputs, no UI or Expo knowledge —
// the device half (permissions, token minting) stays in lib/pushNotifications.
import api from './client';

/**
 * Register this device's push token with our server so it can ring.
 * @param {{token: string, platform: string}} device the Expo push token and 'ios' | 'android'
 * @returns {Promise<void>} rejects with an Error when token is missing
 */
export async function registerPushToken({ token, platform }) {
  if (!token) throw new Error('token is required.');
  await api.post('/notifications/token', { token, platform });
}

/**
 * Silence this device: remove its push token from our server. Needs no
 * session — holding the token is the proof — which lets an expired session
 * still quiet the phone.
 * @param {string} token the Expo push token to remove
 * @returns {Promise<void>} rejects with an Error when token is missing
 */
export async function unregisterPushToken(token) {
  if (!token) throw new Error('token is required.');
  await api.delete('/notifications/token', { data: { token } });
}
