// Profile reads as named tools (project Rule 6): one exported function per
// action, plain inputs, plain outputs, no UI knowledge.
import api from './client';

/**
 * The signed-in person's own profile record (name, bio, date of birth, ...).
 * @returns {Promise<object>} the profile from /profile/me
 */
export async function getMyProfile() {
  const res = await api.get('/profile/me');
  return res?.data;
}
