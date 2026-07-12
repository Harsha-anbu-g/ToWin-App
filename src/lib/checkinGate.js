// Once-a-day check-in prompt gate. The daily check-in lives on its own
// screen (/checkin); Home shows My Helpers. On the first Home visit of a
// local day, if the elder hasn't checked in yet, the app walks them to the
// check-in screen ONCE — skipping it doesn't re-prompt until tomorrow.
import * as SecureStore from 'expo-secure-store';

const KEY = 'towin-checkin-prompted';

// Local calendar date — the streak day flips at the user's midnight.
export function localDay(now = new Date()) {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// Pure decision, unit-tested: prompt only when the streak is loaded, today's
// check-in hasn't happened, and we haven't already prompted today.
export function shouldPromptCheckin(streak, promptedDay, now = new Date()) {
  if (!streak || streak.alreadyCheckedIn) return false;
  return promptedDay !== localDay(now);
}

export async function getPromptedDay() {
  try {
    return await SecureStore.getItemAsync(KEY);
  } catch {
    return null;
  }
}

export async function markPromptedToday(now = new Date()) {
  try {
    await SecureStore.setItemAsync(KEY, localDay(now));
  } catch {
    // best effort — worst case the prompt shows again next open
  }
}
