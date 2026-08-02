// The app's web build is served same-origin with the Towinly website
// (towinly.com/app/), so both share ONE localStorage. Any key the app writes
// that the website also owns would silently corrupt the other product.
// These tests are the contract that keeps them apart.
import {
  APP_WRITTEN_KEYS,
  WEBSITE_OWNED_KEYS,
  WEBSITE_OWNED_PREFIXES,
  SHARED_SESSION_TOKEN,
  KEYS,
  aiConsentKey,
} from '../src/lib/storageKeys';

const startsWithAny = (key, prefixes) => prefixes.some((p) => key.startsWith(p));

describe('storage keys', () => {
  test('no app key is a key the website owns', () => {
    const collisions = APP_WRITTEN_KEYS.filter((k) => WEBSITE_OWNED_KEYS.includes(k));
    expect(collisions).toEqual([]);
  });

  test('no app key falls under a prefix the website owns', () => {
    const collisions = APP_WRITTEN_KEYS.filter((k) => startsWithAny(k, WEBSITE_OWNED_PREFIXES));
    expect(collisions).toEqual([]);
  });

  test('no website key falls under a prefix the app owns', () => {
    const appPrefixes = [KEYS.aiConsentPrefix];
    const collisions = WEBSITE_OWNED_KEYS.filter((k) => startsWithAny(k, appPrefixes));
    expect(collisions).toEqual([]);
  });

  test('per-user AI consent keys stay inside the app-owned prefix', () => {
    expect(aiConsentKey('42')).toBe(`${KEYS.aiConsentPrefix}42`);
    expect(aiConsentKey(undefined)).toBe(`${KEYS.aiConsentPrefix}anon`);
    expect(WEBSITE_OWNED_KEYS).not.toContain(aiConsentKey('42'));
  });

  test('the theme key is app-owned, not the website theme key', () => {
    expect(KEYS.theme).toBe('towinly-app-theme');
    expect(WEBSITE_OWNED_KEYS).toContain('towinly-theme');
    expect(APP_WRITTEN_KEYS).not.toContain('towinly-theme');
  });

  test('the legacy theme key is readable but never written', () => {
    // 'towin-theme' is the website's OWN legacy key. Reading it gives a
    // returning visitor their night-mode choice; writing it would flip the
    // desktop site from a phone.
    expect(KEYS.themeLegacyReadOnly).toBe('towin-theme');
    expect(APP_WRITTEN_KEYS).not.toContain(KEYS.themeLegacyReadOnly);
  });

  test('the website session token is the one deliberately shared key', () => {
    // The session bridge (src/lib/webSession.js) writes this on purpose so a
    // phone sign-in also signs you in on the website. It must never appear in
    // APP_WRITTEN_KEYS, which is the "must not collide" set.
    expect(SHARED_SESSION_TOKEN).toBe('token');
    expect(WEBSITE_OWNED_KEYS).toContain(SHARED_SESSION_TOKEN);
    expect(APP_WRITTEN_KEYS).not.toContain(SHARED_SESSION_TOKEN);
  });

  test('every app key is listed exactly once', () => {
    expect(new Set(APP_WRITTEN_KEYS).size).toBe(APP_WRITTEN_KEYS.length);
  });

  test('every app key is namespaced so a future website key cannot collide', () => {
    const unnamespaced = APP_WRITTEN_KEYS.filter((k) => !k.startsWith('towin'));
    expect(unnamespaced).toEqual([]);
  });
});
