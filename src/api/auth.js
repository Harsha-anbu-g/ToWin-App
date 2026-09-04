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
 * Send the confirmation email again for a signup that has not been opened
 * yet. No account exists at this point, so nobody is logged in when this runs.
 * @param {object} input
 * @param {string} input.email  the address the signup used
 * @returns {Promise<void>} resolves once the backend has queued the email;
 *   rejects with the axios error (response.data.message carries the reason)
 */
export async function resendSignupEmail({ email }) {
  if (!email) throw new Error('email is required to resend the verification link.');
  await api.post('/auth/resend-verification', { email });
}

/**
 * Confirm an emailed signup link. This is what actually creates the account:
 * the backend checks the token and finishes the signup it belongs to.
 * @param {object} input
 * @param {string} input.token  the token from the /verify-email link
 * @returns {Promise<void>} resolves once verified; rejects with the axios
 *   error (no err.response at all means the server was unreachable, not a
 *   dead link — callers show the two cases differently)
 */
export async function verifyEmail({ token }) {
  if (!token) throw new Error('token is required to verify an email link.');
  await api.post('/auth/verify-email', { token });
}

/**
 * Trade a Google redirect code for a Towinly session. The codeVerifier is the
 * PKCE secret this app generated when it started the flow, so the server can
 * bind the code to this client.
 * @param {object} input
 * @param {string} input.code          the ?code= from the Google redirect
 * @param {string} input.state         the ?state= the redirect carried back
 * @param {string} input.codeVerifier  the PKCE verifier this app stored
 * @returns {Promise<object>} { status: 'READY', token } for an existing
 *   account, or { status: 'NEEDS_ONBOARDING', onboardingToken, email, name }
 *   for a new one; rejects with the axios error
 */
export async function exchangeOAuthCode({ code, state, codeVerifier }) {
  if (!code || !codeVerifier) {
    throw new Error('code and codeVerifier are required to complete a Google sign-in.');
  }
  const res = await api.post('/auth/oauth/exchange', { code, state, codeVerifier });
  return res?.data;
}

/**
 * Finish a Google signup: attach the chosen role, username, and phone to the
 * onboarding token the exchange handed back, creating the account.
 * @param {object} input
 * @param {string} input.onboardingToken  from exchangeOAuthCode's NEEDS_ONBOARDING reply
 * @param {'ELDER'|'HELPER'} input.role   who they are joining as
 * @param {string} input.username         3-20 chars, lowercase letters, digits, underscores
 * @param {string} input.phone            digits only (optional + prefix), 10-15 digits
 * @returns {Promise<object>} { token } for the new session; rejects with the
 *   axios error (response.data.message carries the reason)
 */
export async function completeOAuthSignup({ onboardingToken, role, phone, username }) {
  if (!onboardingToken) throw new Error('onboardingToken is required to finish a Google signup.');
  const res = await api.post('/auth/oauth/complete', { onboardingToken, role, phone, username });
  return res?.data;
}

/**
 * Submit a photo of a government ID for the one-time human review that earns
 * profile trust points. The ID is never shown to other members.
 * @param {object} input
 * @param {object} input.file  the upload part (uri/name/type on native, Blob on web)
 * @returns {Promise<void>} resolves once the ID is queued for review; rejects
 *   with the axios error (response.data.message carries the reason)
 */
export async function submitIdPhoto({ file }) {
  if (!file) throw new Error('file is required to submit an ID photo.');
  const fd = new FormData();
  fd.append('file', file);
  await api.post('/auth/verify-id', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
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
