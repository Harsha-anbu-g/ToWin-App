// Mirrors ToWin/frontend/src/api/axios.js for mobile.
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

const api = axios.create({ baseURL: API_BASE_URL });

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

export default api;
