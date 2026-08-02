// Once phones are proxied into the app at towinly.com/app/, a URL the website
// used is a URL the app must answer. A missing route here is not a 404 on some
// forgotten page — it is a bookmark, an emailed link or a family alert landing
// on nothing, for someone who will not think to try a different address.
//
// This walks the real app/ directory rather than a hand-kept list, so a route
// deleted in a refactor fails here instead of in production.
const fs = require('fs');
const path = require('path');

const APP_DIR = path.join(__dirname, '..', 'app');

// Every route file, as the URL Expo Router will serve it at.
const routes = (() => {
  const found = new Set();
  const walk = (dir, prefix) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name.startsWith('+') || entry.name === '_layout.jsx') continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        // (groups) are organisational and contribute nothing to the URL.
        const segment = /^\(.*\)$/.test(entry.name) ? prefix : `${prefix}/${entry.name}`;
        walk(full, segment);
        continue;
      }
      if (!/\.jsx?$/.test(entry.name)) continue;
      const name = entry.name.replace(/\.jsx?$/, '');
      found.add(name === 'index' ? prefix || '/' : `${prefix}/${name}`);
    }
  };
  walk(APP_DIR, '');
  return found;
})();

// A dynamic route matches any single segment: user/[id] answers /user/42.
const resolves = (url) => {
  const wanted = url.split('/').filter(Boolean);
  for (const route of routes) {
    const parts = route.split('/').filter(Boolean);
    if (parts.length !== wanted.length) continue;
    if (parts.every((p, i) => /^\[.+\]$/.test(p) || p === wanted[i])) return true;
  }
  return false;
};

// Transcribed from the website's router (ToWin/frontend/src/App.jsx). These are
// the signed-in pages phones are redirected into the app for.
const PHONE_ROUTES_SERVED_BY_THE_APP = [
  '/login',
  '/register',
  '/dashboard',
  '/streaks',
  '/messages',
  '/messages/abc-123',
  '/trust',
  '/profile',
  '/profile/change-password',
  '/family',
  '/family-home',
  '/family-home/parent/42',
  '/user/42',
  '/game',
  '/emergency-contacts',
];

describe('every website URL a phone is sent to resolves in the app', () => {
  test.each(PHONE_ROUTES_SERVED_BY_THE_APP)('%s', (url) => {
    expect(resolves(url)).toBe(true);
  });
});

describe('the alias routes exist as their own files', () => {
  // Aliases are easy to "clean up" as duplicates; each of these is the only
  // thing standing between a website URL and a dead end.
  test.each([
    ['app/messages/[connectionId].jsx', '/chat/'],
    ['app/family-home/index.jsx', '/family'],
    ['app/family-home/parent/[elderId].jsx', '/family/parent/'],
    ['app/profile/change-password.jsx', '/change-password'],
    ['app/how-it-works.jsx', '/guide'],
  ])('%s forwards to %s', (file, target) => {
    const source = fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
    expect(source).toContain('Redirect');
    expect(source).toContain(target);
  });
});

test('the routes phones keep on the website are NOT claimed by the app', () => {
  // These stay with the marketing site on a phone — Google needs them, and
  // they are already phone-tuned. /privacy and /terms exist in the app too
  // (the store apps must show them), so only the ones that would clash with
  // the website's own job are checked here.
  expect(resolves('/how-it-works')).toBe(true); // in-app link, website still wins on phones
  expect(resolves('/verify-email')).toBe(true); // deep-linked from the app's own email
});
