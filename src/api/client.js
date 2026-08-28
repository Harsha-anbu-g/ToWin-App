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
// Told whenever the server answers at all — success or refusal. The offline
// gate (src/lib/useIsOffline) uses it as proof that the network path is alive,
// whatever the OS's own connectivity reading says. See probeApiReachable.
let onResponseSeen = () => {};

export const setTokenGetter = (fn) => {
  getToken = fn;
};
export const setOnSessionExpired = (fn) => {
  onSessionExpired = fn;
};
export const setOnResponseSeen = (fn) => {
  onResponseSeen = fn;
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
  (res) => {
    onResponseSeen();
    return res;
  },
  (error) => {
    // An answer of any kind — 401, 403, 500 — still proves the path is alive.
    // Only a request that never got a response (offline, DNS, timeout) says
    // nothing either way.
    if (error?.response) onResponseSeen();
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

/**
 * Reachability probe for the offline gate. Answers "can this phone reach the
 * API right now?" with one small request, because the OS's own "no internet"
 * reading can be stale (2026-08-28: a simulator that had run for days kept
 * reporting no internet after the Mac slept, while the network was fine, and
 * every screen sat empty on that word alone).
 *
 * ANY HTTP answer counts, including a refusal — the question is whether the
 * server can be reached, not whether it likes the request — so every status is
 * accepted and only a request that gets no response at all means unreachable.
 * Bare axios rather than `api`: no token goes out, so a 401 here can never be
 * mistaken for a dead session by the interceptor above.
 *
 * @param {number} [timeoutMs] how long to wait for an answer (default 5s)
 * @returns {Promise<boolean>} true when the API host answered
 */
const PROBE_PATH = '/health';
const PROBE_TIMEOUT_MS = 5_000;
export async function probeApiReachable(timeoutMs = PROBE_TIMEOUT_MS) {
  try {
    await axios.get(`${API_BASE_URL}${PROBE_PATH}`, {
      timeout: timeoutMs,
      validateStatus: () => true,
    });
    return true;
  } catch {
    return false;
  }
}

export default api;
