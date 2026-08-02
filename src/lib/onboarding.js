// First-launch gate for the landing story (handoff 3o): the 6 slides show
// once, then the app opens straight to Log In (logged out) or Home (logged
// in). Persisted with src/lib/storage like the theme flag — the app's one
// storage mechanism (AsyncStorage isn't a dependency here).
import * as Store from './storage';
import { KEYS } from './storageKeys';

const KEY = KEYS.onboarded;

export async function hasOnboarded() {
  try {
    return (await Store.getItemAsync(KEY)) === '1';
  } catch {
    // unreadable flag — treat as first launch; worst case the story replays
    return false;
  }
}

export async function markOnboarded() {
  try {
    await Store.setItemAsync(KEY, '1');
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
  // Web landingPath.js parity: elders (and BOTH, who are elders too) land on
  // the daily check-in — the one thing Towinly asks of them each day, and what
  // tells their family they are alright. Nobody else has a check-in.
  if (user.role === 'ELDER' || user.role === 'BOTH') return '/checkin';
  return '/(tabs)/home';
}
