// Profile reads as named tools (project Rule 6): one exported function per
// action, plain inputs, plain outputs, no UI knowledge. Screens call these by
// name; an agent driving the app can call the same functions.
import api from './client';

/**
 * The signed-in person's own profile record (name, bio, date of birth, ...),
 * exactly as GET /profile/me returns it. Includes hasPassword, which is false
 * for a Google-signup account that has never set a password.
 * @returns {Promise<object>} the profile fields; rejects with the axios error
 */
export async function getMyProfile() {
  const res = await api.get('/profile/me');
  return res?.data;
}
