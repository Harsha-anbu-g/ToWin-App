// One-time Ask AI disclosure flag (STORE-203). App Store guidance (Nov 2025)
// requires a clear consent moment naming the outside AI provider before user
// data is sent to it — ToWin's assistant replies come from Groq via the
// backend. Persisted with SecureStore like the onboarding flag.
import * as SecureStore from 'expo-secure-store';

// Scoped per account: consent belongs to the person, not the phone — another
// user on this device gets their own disclosure, and one account's grant
// never speaks for the next.
const keyFor = (userId) => `towin-ai-consent-${userId ?? 'anon'}`;

export async function hasAiConsent(userId) {
  try {
    return (await SecureStore.getItemAsync(keyFor(userId))) === '1';
  } catch {
    // unreadable flag — ask again; worst case the note shows twice
    return false;
  }
}

export async function grantAiConsent(userId) {
  try {
    await SecureStore.setItemAsync(keyFor(userId), '1');
  } catch {
    // persistence failed — the note may show again next time; nothing breaks
  }
}
