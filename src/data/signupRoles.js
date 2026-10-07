// The three ways to join Towinly, in the order the signup page lists them.
// Read by the role page (app/(auth)/register.jsx), which renders one row per
// entry, and by the form page (create-account.jsx), which names the chosen
// role back to the person. One list so the two pages cannot drift.
//
// FAM-406 (2026-07-19): FAMILY is a public signup role (web parity). The
// Google finish-setup screen stays ELDER/HELPER — the backend rejects FAMILY
// on the OAuth path.

// Read twice on the role page: as the visible question and as the header a
// screen reader lands on. One constant so a reworded question cannot leave
// the two saying different things.
import { tr } from '../i18n';
export const SIGNUP_ROLE_PROMPT = 'Who are you joining as?';

export const SIGNUP_ROLES = [
  { value: 'ELDER', get label() { return tr('Elder'); }, get desc() { return tr('Looking for friends or help'); }, get noun() { return tr('an elder'); } },
  { value: 'HELPER', get label() { return tr('Helper'); }, get desc() { return tr('Want to help others'); }, get noun() { return tr('a helper'); } },
  {
    value: 'FAMILY',
    get label() { return tr("I'm here for a family member"); },
    get desc() { return tr("You'll link to your parent inside the app after you sign up."); },
    get noun() { return tr('a family member'); },
  },
];

/**
 * Look up a signup role by its backend value. Returns undefined for anything
 * that is not one of the three, so a hand-typed or stale link never reaches
 * the form with a role the backend would refuse.
 * @param {string | string[] | undefined} value  a route param, possibly repeated
 * @returns {{ value: string, label: string, desc: string, noun: string } | undefined}
 */
export function findSignupRole(value) {
  const wanted = Array.isArray(value) ? value[0] : value;
  return SIGNUP_ROLES.find((r) => r.value === wanted);
}
