// The way back out. Phones get redirected from the website into the app, and
// that redirect must be refusable — otherwise someone who wants the page they
// know is trapped in a product they did not choose (HCI 3).
const loadOn = (os) => {
  let loaded;
  jest.isolateModules(() => {
    jest.doMock('react-native', () => ({ Platform: { OS: os } }));
    loaded = require('../src/lib/fullWebsite');
  });
  return loaded;
};

const realWindow = global.window;
const realDocument = global.document;

const fakeBrowser = (protocol = 'https:') => {
  global.document = { cookie: '' };
  global.window = { location: { protocol, assign: jest.fn() } };
  return global.window;
};

afterEach(() => {
  global.window = realWindow;
  global.document = realDocument;
  jest.dontMock('react-native');
});

test('remembers the choice in a cookie the website can read', () => {
  fakeBrowser();
  const { switchToFullWebsite, WEB_PREFERENCE_COOKIE } = loadOn('web');

  expect(switchToFullWebsite()).toBe(true);
  expect(document.cookie).toContain(`${WEB_PREFERENCE_COOKIE}=1`);
});

test('sets the cookie on the whole domain, not just the app', () => {
  // The redirect fires on the website's own pages, so the cookie has to be
  // sent with those requests too. Path=/app would never be seen.
  fakeBrowser();
  const { switchToFullWebsite } = loadOn('web');
  switchToFullWebsite();

  expect(document.cookie).toContain('Path=/');
  expect(document.cookie).not.toContain('Path=/app');
});

test('the choice outlives the visit', () => {
  fakeBrowser();
  const { switchToFullWebsite } = loadOn('web');
  switchToFullWebsite();

  // A person who asked for the website should not have to keep asking.
  const maxAge = Number(document.cookie.match(/Max-Age=(\d+)/)[1]);
  expect(maxAge).toBeGreaterThanOrEqual(60 * 60 * 24 * 180);
});

test('is marked Secure over https and not over plain http', () => {
  fakeBrowser('https:');
  loadOn('web').switchToFullWebsite();
  expect(document.cookie).toContain('Secure');

  // A Secure cookie is simply dropped on http, which would break local dev.
  fakeBrowser('http:');
  loadOn('web').switchToFullWebsite();
  expect(document.cookie).not.toContain('Secure');
});

test('leaves with a real page load, not a router push', () => {
  // We are moving to a different application on the same domain; the app's
  // router knows nothing about the website's pages.
  const win = fakeBrowser();
  loadOn('web').switchToFullWebsite();
  expect(win.location.assign).toHaveBeenCalledWith('/');
});

test('does nothing on a phone, where there is no website to switch to', () => {
  fakeBrowser();
  const { switchToFullWebsite } = loadOn('ios');

  expect(switchToFullWebsite()).toBe(false);
  expect(document.cookie).toBe('');
  expect(window.location.assign).not.toHaveBeenCalled();
});
