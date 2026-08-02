// Service worker — the minimum needed to be installable and to open instantly.
//
// Deliberately NOT an offline mode. Only this app's own shell and its
// content-hashed build assets are cached. Every other request (the API above
// all) is passed straight through and never stored: an elder must never be
// shown a stale help request, trust score or message thread, because a wrong
// answer here costs trust in a way a spinner never does.
//
// The app is served UNDER a path prefix on a domain it shares with the Towinly
// marketing website (towinly.com/app/). That makes containment the first
// requirement: this worker must never see, answer, or cache a marketing page.
// Two things enforce it — the registration scope, and the BASE check in every
// handler below. The base is derived from where this file itself was served
// from, so it stays correct whatever prefix the site is proxied under.
const BASE = self.location.pathname.replace(/sw\.js$/, ''); // '/app/'
const CACHE = `towinly-shell-v2${BASE}`;
const SHELL = BASE;

// Same-origin AND inside our prefix. Anything else belongs to the website.
const isOurs = (url) => url.origin === self.location.origin && url.pathname.startsWith(BASE);

// Build output is content-hashed, so a cache hit for these paths is always the
// exact file that was asked for.
const isBuildAsset = (pathname) =>
  pathname.startsWith(`${BASE}_expo/`) ||
  pathname.startsWith(`${BASE}icons/`) ||
  pathname.startsWith(`${BASE}assets/`);

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.add(SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (!isOurs(url)) return; // the API, and every marketing page: untouched

  // Pages: network first, so a new release is live immediately, with the
  // cached shell only as the no-connection fallback.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Refresh the shell from this response — under `output: "single"`
          // every route returns the same index.html, so any successful
          // navigation is a valid shell. Only plain 200s: an opaque or
          // redirected response stored here would poison the fallback.
          if (response.ok && response.type === 'basic' && !response.redirected) {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(SHELL, copy));
          }
          return response;
        })
        .catch(() => caches.match(SHELL).then((hit) => hit || Response.error()))
    );
    return;
  }

  if (!isBuildAsset(url.pathname)) return;

  event.respondWith(
    caches.match(request).then(
      (hit) =>
        hit ||
        fetch(request).then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        })
    )
  );
});
