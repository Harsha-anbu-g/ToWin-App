// First-launch gate for the landing story (handoff 3o): the 6 slides show
// once, then the app opens straight to Log In (logged out) or Home (logged
// in). Persisted with SecureStore like the theme flag — the app's one
// storage mechanism (AsyncStorage isn't a dependency here).
import * as SecureStore from 'expo-secure-store';

const KEY = 'towin-onboarded';

export async function hasOnboarded() {
  try {
    return (await SecureStore.getItemAsync(KEY)) === '1';
  } catch {
    // unreadable flag — treat as first launch; worst case the story replays
    return false;
  }
}

export async function markOnboarded() {
  try {
    await SecureStore.setItemAsync(KEY, '1');
  } catch {
    // persistence failed — the story may replay next launch; nothing breaks
  }
}

// Pure entry routing, unit-tested: mirrors the web's PublicRoute/PrivateRoute
// with the first-launch story in front.
export function entryRouteFor({ user, onboarded }) {
  if (!user) return onboarded ? '/(auth)/login' : '/(auth)/landing';
  if (user.role === 'ADMIN') return '/admin'; // web parity: admins never see the feeds
  if (user.emailVerified === false) return '/(auth)/verify-pending';
  return '/(tabs)/home';
}
