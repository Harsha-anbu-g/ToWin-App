// Auth actions as named tools (project Rule 6): one exported function per
// user action, plain inputs, plain outputs, no UI knowledge. Screens call
// these by name; an agent driving the app can call the same functions.
import api from './client';

/**
 * Start a Towinly signup. No account exists until the person opens the
 * emailed link, so this never returns a session — the caller sends them to
 * check their inbox.
 * @param {object} input
 * @param {string} input.username     3-20 chars, lowercase letters, digits, underscores
 * @param {string} input.email        where the confirmation link goes
 * @param {string} input.password     at least 8 characters
 * @param {'ELDER'|'HELPER'|'FAMILY'} input.role  who they are joining as
 * @param {string} input.dateOfBirth  YYYY-MM-DD; the backend refuses under-18s
 * @returns {Promise<void>} resolves once the backend has queued the email;
 *   rejects with the axios error (response.data.message carries the reason)
 */
export async function registerAccount({ username, email, password, role, dateOfBirth }) {
  await api.post('/auth/register', { username, email, password, role, dateOfBirth });
}
