// Registers the service worker from JavaScript rather than an inline <script>
// in the HTML shell.
//
// That is not a style preference. The Towinly website sets one strict
// Content-Security-Policy for the whole domain, and its script-src has no
// 'unsafe-inline' — only 'self' and one pinned hash. Anything inline in the
// app's shell would be blocked by the browser, and "just add another hash"
// means the website's security header has to change every time this app's
// shell does. Registering from the bundle keeps that header untouched.
//
// Skipped in development: a service worker there serves a stale bundle back and
// makes edits look like they never applied.
import { Platform } from 'react-native';

/**
 * The path prefix the app is served under, always with a trailing slash.
 * Expo inlines app.json's `experiments.baseUrl` here at build time, so this
 * cannot drift from the real deployment. It must NOT be derived from
 * window.location: on /app/user/123 that would give '/app/user/' and register
 * a worker scoped to one profile page.
 */
export const basePath = () => {
  const configured = process.env.EXPO_BASE_URL ?? '';
  if (!configured) return '/';
  return configured.endsWith('/') ? configured : `${configured}/`;
};

/**
 * @returns {boolean} whether registration was attempted
 */
export function registerServiceWorker() {
  if (Platform.OS !== 'web') return false;
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return false;

  const { hostname } = window.location;
  if (hostname === 'localhost' || hostname === '127.0.0.1') return false;

  // Scope is stated explicitly so the worker can never claim a page outside the
  // app — the marketing site shares this origin.
  const base = basePath();
  navigator.serviceWorker.register(`${base}sw.js`, { scope: base }).catch(() => {
    // No service worker → the app still works, it just isn't installable.
  });
  return true;
}
