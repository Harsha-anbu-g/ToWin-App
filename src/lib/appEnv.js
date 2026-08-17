// Build-environment gate for the public demo login accounts.
// Visible in local dev (Expo Go, where __DEV__ is true) and in any build that
// opts in via the EAS env flag EXPO_PUBLIC_SHOW_DEMO=1. The store production
// profile OPTS IN since 2026-08-16, an owner decision reversing the earlier
// audit hide: the demo seats are public by design (handed to Apple's reviewer
// in writing, shown on the website, data self-resets minutes after use), so
// one-tap try-before-you-join costs nothing and spares an elder the typing.
export function shouldShowDemoAccounts({
  dev = typeof __DEV__ !== 'undefined' && __DEV__,
  flag = process.env.EXPO_PUBLIC_SHOW_DEMO,
} = {}) {
  return dev || flag === '1';
}

export const showDemoAccounts = () => shouldShowDemoAccounts();
