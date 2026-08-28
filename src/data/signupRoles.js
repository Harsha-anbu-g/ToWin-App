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
export const SIGNUP_ROLE_PROMPT = 'Who are you joining as?';

export const SIGNUP_ROLES = [
  { value: 'ELDER', label: 'Elder', desc: 'Looking for friends or help', noun: 'an elder' },
  { value: 'HELPER', label: 'Helper', desc: 'Want to help others', noun: 'a helper' },
  {
    value: 'FAMILY',
    label: "I'm here for a family member",
    desc: "You'll link to your parent inside the app after you sign up.",
    noun: 'a family member',
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
