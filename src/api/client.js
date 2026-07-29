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
    ? 'Please verify your email first — check your inbox for the link, then try again.'
    : fallback;

export default api;
