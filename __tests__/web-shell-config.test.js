// The app is served from towinly.com/app/, which means four separate files all
// have to agree about that prefix: app.json (what Expo bakes into asset URLs),
// public/index.html (hand-written links Expo does not rewrite), the manifest,
// and the service worker. None of them import each other, so nothing but a
// test stops one drifting — and the failure mode is a white page in
// production, not a build error.
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

const appJson = JSON.parse(read('app.json'));
const indexHtml = read('public/index.html');
const manifest = JSON.parse(read('public/manifest.json'));
const swSource = read('public/sw.js');
const tokens = require('../src/theme/tokens');

const baseUrl = appJson.expo.experiments.baseUrl;

// These files explain themselves at length, and a comment saying "never do X"
// must not read as doing X. Assertions about what the CODE does run against
// the comment-stripped source.
const withoutHtmlComments = (html) => html.replace(/<!--[\s\S]*?-->/g, '');
// Trailing comments too, but never the // inside a https:// URL.
const withoutLineComments = (js) => js.replace(/(^|[^:])\/\/.*$/gm, '$1');

describe('app.json web config', () => {
  test('exports a single page, so every deep link resolves', () => {
    // `static` writes dynamic routes literally — user/[id].html — and every
    // /user/123 deep link 404s. Confirmed in a real export.
    expect(appJson.expo.web.output).toBe('single');
  });

  test('declares the path prefix the site is proxied under', () => {
    expect(baseUrl).toBe('/app');
  });
});

describe('public/index.html', () => {
  test('is the shell Expo will actually use', () => {
    // Under `output: "single"` Expo reads public/index.html and ignores
    // app/+html.jsx entirely, so the root div has to be here.
    expect(indexHtml).toContain('id="root"');
  });

  test('has no inline script — the website CSP allows none', () => {
    // script-src is 'self' plus one pinned hash, no 'unsafe-inline'. An inline
    // script here would be blocked, or would force the website's security
    // header to change every time this shell does.
    expect(indexHtml).not.toMatch(/<script(?![^>]*\ssrc=)/i);
  });

  test('every absolute link it writes by hand sits under the prefix', () => {
    const absolute = [...indexHtml.matchAll(/(?:href|src)="(\/[^"]*)"/g)].map((m) => m[1]);
    expect(absolute.length).toBeGreaterThan(0);
    for (const url of absolute) expect(url.startsWith(`${baseUrl}/`)).toBe(true);
  });

  test('lets elders pinch-zoom', () => {
    const markup = withoutHtmlComments(indexHtml);
    expect(markup).toContain('viewport-fit=cover');
    expect(markup).not.toContain('user-scalable=no');
    expect(markup).not.toContain('maximum-scale');
  });

  test('paints the same colour the app paints, so no overscroll flash', () => {
    expect(indexHtml).toContain(tokens.light.surface);
  });

  test('keeps this half of the domain out of the index', () => {
    // The marketing pages are the ones Google should show for towinly.com.
    expect(indexHtml).toMatch(/name="robots"\s+content="noindex"/);
  });
});

describe('public/manifest.json', () => {
  test('uses relative URLs, which resolve against the manifest itself', () => {
    // The manifest is served from /app/manifest.json, so "./" IS "/app/" —
    // and it stays right if the prefix ever changes.
    const urls = [
      manifest.start_url,
      manifest.scope,
      manifest.id,
      ...manifest.icons.map((i) => i.src),
    ];
    for (const url of urls) expect(url.startsWith('./')).toBe(true);
  });

  test('an installed app opens inside the app, never on the marketing site', () => {
    expect(manifest.scope).toBe('./');
    expect(manifest.start_url).toBe('./');
  });

  test('its splash colour matches the shell, so install does not flash', () => {
    expect(manifest.background_color).toBe(tokens.light.surface);
    expect(manifest.theme_color).toBe(tokens.light.surface);
  });
});

describe('public/sw.js', () => {
  test('works out its own prefix instead of hardcoding one', () => {
    expect(swSource).toContain('self.location.pathname');
    expect(withoutLineComments(swSource)).not.toMatch(/['"`]\/app\//);
  });

  test('refuses to touch anything outside that prefix', () => {
    // Without this the worker could cache and serve marketing pages.
    expect(swSource).toContain('startsWith(BASE)');
  });

  test('caches under a versioned, prefix-scoped key', () => {
    // A shared key would let a root-scoped worker and this one collide.
    expect(swSource).toMatch(/towinly-shell-v\d+\$\{BASE\}/);
  });

  test('never stores a redirect as the offline shell', () => {
    expect(swSource).toContain('!response.redirected');
  });
});

describe('service worker registration', () => {
  test('takes its scope from the same baseUrl Expo bakes in', () => {
    const source = read('src/lib/registerServiceWorker.js');
    expect(source).toContain('process.env.EXPO_BASE_URL');
    // Deriving it from window.location would give '/app/user/' on a profile
    // page and scope the worker to one screen.
    expect(source).not.toContain('window.location.href');
  });
});
