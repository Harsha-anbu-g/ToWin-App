// The way out of the app half of towinly.com and back to the full website.
//
// Phones are redirected from the website's signed-in pages into this app. That
// is a good default and a bad prison: someone who wants the page they know —
// a wider layout, a screen reader they have set up there, or simply the thing
// they used yesterday — must be able to say so and be believed (HCI 3, and
// Google's own separate-URLs guidance requires a link back).
//
// The cookie is what the website's redirect rule checks. It is set on Path=/
// so it is sent with every request on the domain, including the marketing
// pages the redirect fires from, and it is long-lived because a person who
// asked for the website should not have to keep asking.
import { Platform } from 'react-native';

export const WEB_PREFERENCE_COOKIE = 'towinly_web';
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

/**
 * Remember that this person prefers the full website, then leave the app.
 * A no-op on a phone build, where there is no website to go to.
 * @returns {boolean} whether the preference was recorded
 */
export function switchToFullWebsite() {
  if (Platform.OS !== 'web') return false;
  if (typeof document === 'undefined') return false;

  const secure = window.location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${WEB_PREFERENCE_COOKIE}=1; Path=/; Max-Age=${ONE_YEAR_SECONDS}; SameSite=Lax${secure}`;

  // A full page load, not a router push: we are leaving this application for
  // a different one served from the same domain.
  window.location.assign('/');
  return true;
}
