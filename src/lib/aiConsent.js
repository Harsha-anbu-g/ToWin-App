// One-time Ask AI disclosure flag (STORE-203). App Store guidance (Nov 2025)
// requires a clear consent moment naming the outside AI provider before user
// data is sent to it — Towinly's assistant replies come from Groq via the
// backend. Persisted with src/lib/storage like the onboarding flag.
import * as Store from './storage';
// Scoped per account: consent belongs to the person, not the phone — another
// user on this device gets their own disclosure, and one account's grant
// never speaks for the next.
import { aiConsentKey as keyFor } from './storageKeys';

export async function hasAiConsent(userId) {
  try {
    return (await Store.getItemAsync(keyFor(userId))) === '1';
  } catch {
    // unreadable flag — ask again; worst case the note shows twice
    return false;
  }
}

export async function grantAiConsent(userId) {
  try {
    await Store.setItemAsync(keyFor(userId), '1');
  } catch {
    // persistence failed — the note may show again next time; nothing breaks
  }
}
