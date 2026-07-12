// One-time Ask AI disclosure flag (STORE-203). App Store guidance (Nov 2025)
// requires a clear consent moment naming the outside AI provider before user
// data is sent to it — ToWin's assistant replies come from Groq via the
// backend. Persisted with SecureStore like the onboarding flag.
import * as SecureStore from 'expo-secure-store';

const KEY = 'towin-ai-consent';

export async function hasAiConsent() {
  try {
    return (await SecureStore.getItemAsync(KEY)) === '1';
  } catch {
    // unreadable flag — ask again; worst case the note shows twice
    return false;
  }
}

export async function grantAiConsent() {
  try {
    await SecureStore.setItemAsync(KEY, '1');
  } catch {
    // persistence failed — the note may show again next time; nothing breaks
  }
}
