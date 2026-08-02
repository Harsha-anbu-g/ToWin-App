// How the app half of towinly.com is hosted. JSON cannot carry comments, so
// the reasoning behind each line lives here, next to an assertion that keeps it
// true.
//
// Shape of the deployment: this project is deployed on its own and the website
// proxies /app/:path* into it, STRIPPING the prefix — so a browser request for
// towinly.com/app/_expo/static/x.js arrives here as /_expo/static/x.js. Every
// path below is therefore written without the /app prefix, while everything
// inside the built HTML keeps it (that is what experiments.baseUrl is for).
const fs = require('fs');
const path = require('path');

const config = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'vercel.json'), 'utf8'));

const headersFor = (source) => {
  const entry = config.headers.find((h) => h.source === source);
  return Object.fromEntries((entry?.headers ?? []).map((h) => [h.key, h.value]));
};

test('deep links resolve — one page, served for every path', () => {
  // Without this, a hard refresh on /user/42 asks Vercel for a file that does
  // not exist. It must be LAST: Vercel stops at the first matching rewrite.
  expect(config.rewrites.at(-1)).toEqual({ source: '/(.*)', destination: '/index.html' });
});

test('the project also answers its own /app/ URLs, so it is testable alone', () => {
  // Through towinly.com the prefix is stripped before the request arrives, so
  // assets land on /_expo/... and the filesystem serves them directly. Opened
  // at its own *.vercel.app address nothing strips anything, and the built HTML
  // asks for /app/_expo/... — without these the page loads and every asset
  // 404s, which is the state you cannot debug from a phone.
  const sources = config.rewrites.map((r) => r.source);
  for (const prefix of ['/app/_expo/:path*', '/app/assets/:path*', '/app/icons/:path*']) {
    expect(sources).toContain(prefix);
  }
  // Only real files are un-prefixed. Page routes must fall through to the SPA
  // catch-all instead, or /app/login would rewrite to a /login file that does
  // not exist — Vercel does not re-run rewrites on the result.
  const unprefixed = config.rewrites.filter((r) => r.source.startsWith('/app/'));
  for (const rule of unprefixed) {
    expect(rule.destination).toBe(rule.source.replace('/app', ''));
  }
});

test('builds the same export the verification steps run', () => {
  expect(config.buildCommand).toContain('expo export');
  expect(config.buildCommand).toContain('--platform web');
  expect(config.outputDirectory).toBe('dist');
});

test('the raw *.vercel.app address is never indexed', () => {
  // Only towinly.com should appear in search results. Two copies of the same
  // product competing for the same queries helps nobody.
  expect(headersFor('/(.*)')['X-Robots-Tag']).toBe('noindex');
});

test('content-hashed bundles are cached forever', () => {
  // Their names change when their contents do, so there is nothing to
  // invalidate — and this is what keeps the Hobby plan's origin transfer from
  // being spent re-sending a 4.8 MB bundle to every visitor.
  const cache = headersFor('/_expo/static/(.*)')['Cache-Control'];
  expect(cache).toContain('immutable');
  expect(cache).toContain('max-age=31536000');
});

test('the shell and the service worker are never cached', () => {
  // These two are how a new release reaches people. A cached sw.js can pin an
  // old build in place for as long as the CDN keeps it.
  for (const source of ['/index.html', '/sw.js']) {
    expect(headersFor(source)['Cache-Control']).toContain('max-age=0');
  }
});

test('sets no Content-Security-Policy — the website owns that header', () => {
  // Both halves are served from towinly.com, and the browser applies the
  // header it receives with the page. A second policy declared here would be
  // either dead weight or a silent conflict.
  const declared = config.headers.flatMap((h) => h.headers.map((x) => x.key));
  expect(declared).not.toContain('Content-Security-Policy');
});
