// Auth actions as named tools (project Rule 6): one exported function per
// user action, plain inputs, plain outputs, no UI knowledge. Screens call
// these by name; an agent driving the app can call the same functions.
import api from './client';

/**
 * Log in to a Towinly account. The identifier may be a username, email, or
 * phone number — the backend resolves it. Demo seats use the same call.
 * @param {object} input
 * @param {string} input.identifier  username, email, or phone number
 * @param {string} input.password    the account password
 * @returns {Promise<{token: string}>} the login payload; `token` is the signed
 *   JWT the device stores. Rejects with the axios error (response.data.message
 *   carries the reason).
 */
export async function logIn({ identifier, password }) {
  if (!identifier || !password) throw new Error('logIn needs an identifier and a password');
  const res = await api.post('/auth/login', { identifier, password });
  return res?.data;
}

/**
 * Ask for a password-reset email. The backend answers the same whether or not
 * the address has an account, so a resolved call never proves one exists.
 * @param {object} input
 * @param {string} input.email  where the reset link goes
 * @returns {Promise<void>} resolves once the request is accepted; rejects with
 *   the axios error
 */
export async function requestPasswordReset({ email }) {
  if (!email) throw new Error('requestPasswordReset needs an email');
  await api.post('/auth/forgot-password', { email });
}

/**
 * Set a new password using the token from the emailed reset link.
 * @param {object} input
 * @param {string} input.token        the reset token off the link's query string
 * @param {string} input.newPassword  at least 8 characters
 * @returns {Promise<void>} resolves once the password is changed; rejects with
 *   the axios error (the server refuses invalid or expired tokens)
 */
export async function resetPassword({ token, newPassword }) {
  if (!token || !newPassword) throw new Error('resetPassword needs a token and a new password');
  await api.post('/auth/reset-password', { token, newPassword });
}

/**
 * Send the signed-in account's email-verification link again. Used from the
 * verify-pending gate when the first email never arrived.
 * @returns {Promise<void>} resolves once the email is queued; rejects with the
 *   axios error (response.data.message carries the reason)
 */
export async function resendVerificationEmail() {
  await api.post('/auth/resend-verification');
}

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

/**
 * Set the first password on a Google-signup account that has none yet
 * (profile hasPassword === false). No current password exists, so none is
 * sent. Signing in with Google keeps working afterwards.
 * @param {object} input
 * @param {string} input.newPassword  at least 8 characters
 * @returns {Promise<void>} resolves once the password is set; rejects with
 *   the axios error (response.data.message carries the reason)
 */
export async function setPassword({ newPassword }) {
  await api.post('/auth/set-password', { newPassword });
}

/**
 * Change the signed-in account's password. The backend checks the current
 * one before accepting the new one.
 * @param {object} input
 * @param {string} input.currentPassword  the password used today
 * @param {string} input.newPassword      at least 8 characters
 * @returns {Promise<void>} resolves once changed; rejects with the axios
 *   error (response.data.message carries the reason)
 */
export async function changePassword({ currentPassword, newPassword }) {
  await api.post('/auth/change-password', { currentPassword, newPassword });
}
