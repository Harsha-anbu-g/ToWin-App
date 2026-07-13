// Build-environment gate for the public demo login accounts.
// Security/audit: the demo credentials (elder/12345678, helper/123456789) are
// fine for prototyping but must not ship in a store build. They stay visible in
// local dev (Expo Go, where __DEV__ is true) and in any build that explicitly
// opts in via the EAS env flag EXPO_PUBLIC_SHOW_DEMO=1 (set on the preview
// profile). Production leaves the flag unset, so the card is hidden there.
export function shouldShowDemoAccounts({
  dev = typeof __DEV__ !== 'undefined' && __DEV__,
  flag = process.env.EXPO_PUBLIC_SHOW_DEMO,
} = {}) {
  return dev || flag === '1';
}

export const showDemoAccounts = () => shouldShowDemoAccounts();
