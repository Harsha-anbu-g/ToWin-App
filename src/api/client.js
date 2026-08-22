// Mirrors Towinly/frontend/src/api/axios.js for mobile.
// A 401 on a request that carried a token means the session is dead (expired
// or rejected) — the injected onSessionExpired logs the user out so screens
// don't render silently empty. A 403 is different: the user IS authenticated
// but lacks an authority (e.g. unverified email hitting a gated write) — that
// must NOT log them out; calling code handles it.
// Token access is injected (setTokenGetter) so this module stays UI-free and
// unit-testable; AuthContext wires both hooks at mount.
import axios from 'axios';
import { API_BASE_URL } from './config';

let getToken = () => null;
let onSessionExpired = () => {};

export const setTokenGetter = (fn) => {
  getToken = fn;
};
export const setOnSessionExpired = (fn) => {
  onSessionExpired = fn;
};

// A hard timeout so a dead connection rejects instead of hanging forever —
// without it the SOS button (and every other pending state) can sit on
// "Sending…" with no fallback message when the network silently stalls.
const REQUEST_TIMEOUT_MS = 15_000;

const api = axios.create({ baseURL: API_BASE_URL, timeout: REQUEST_TIMEOUT_MS });

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (error) => {
    const status = error?.response?.status;
    const hadToken = !!error?.config?.headers?.Authorization;
    if (status === 401 && hadToken) onSessionExpired();
    return Promise.reject(error);
  }
);

// A gated write refused with 403 means the account isn't verified yet (e.g.
// unverified email hitting a gated endpoint). "Please try again" sends the
// user in circles — name the actual fix. Use in mutation onError handlers:
//   onError: (err) => showToast(friendlyWriteError(err, 'Could not …'), 'error')
export const friendlyWriteError = (error, fallback) =>
  error?.response?.status === 403
    ? 'Please verify your email first. Check your inbox for the link, then try again.'
    : fallback;

/**
 * The sentence to show when a sign-in style POST is refused.
 *
 * The response interceptor above re-rejects the original axios error, so an
 * offline phone, a DNS failure and the 15 second timeout all arrive with
 * `error.response` undefined. A handler that reads only the status treats all
 * three as a refusal, and the screen tells somebody their password is wrong
 * when the server never saw it. An elder then changes a password that was
 * never wrong. Same shape as `app/(auth)/forgot-password.jsx`, which has
 * always branched on the absence of a response.
 *
 * @param error the rejected axios error
 * @param refusalMessage what to say when the server really did refuse, which
 *   is 400 and 401 and nothing else
 */
export const friendlyAuthError = (error, refusalMessage) => {
  const res = error?.response;
  // Nothing came back. The credentials were never checked, so never say they
  // are wrong. Same sentence forgot-password.jsx already uses.
  if (!res) return 'Check your connection and try again.';
  if (res.status === 429) {
    return res.data?.message || 'Too many attempts. Please try again later.';
  }
  // A server fault is not a wrong password. Saying so sends the person off to
  // reset something that works.
  if (res.status >= 500) return 'Something is wrong on our side. Please try again in a minute.';
  if (res.status === 400 || res.status === 401) return refusalMessage;
  return res.data?.message || 'Something went wrong. Please try again.';
};

export default api;
