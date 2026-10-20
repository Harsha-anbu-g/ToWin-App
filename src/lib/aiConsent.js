// One-time Ask AI disclosure flag (STORE-203). App Store guidance (Nov 2025)
// requires a clear consent moment naming the outside AI providers before user
// data is sent to them: Groq writes the answers, OpenAI embeds the question for
// the guide search (2026-10-19). Persisted with src/lib/storage like the
// onboarding flag. The stored value is a VERSION, not a yes: bump it whenever
// the disclosure text or the list of providers changes, and everyone who agreed
// to the old wording is asked again, once, before another question leaves the
// phone. Version 1 named Groq alone; version 2 names Groq and OpenAI.
import * as Store from './storage';
// Scoped per account: consent belongs to the person, not the phone — another
// user on this device gets their own disclosure, and one account's grant
// never speaks for the next.
import { aiConsentKey as keyFor } from './storageKeys';

export const AI_CONSENT_VERSION = '2';

export async function hasAiConsent(userId) {
  try {
    return (await Store.getItemAsync(keyFor(userId))) === AI_CONSENT_VERSION;
  } catch {
    // unreadable flag — ask again; worst case the note shows twice
    return false;
  }
}

export async function grantAiConsent(userId) {
  try {
    await Store.setItemAsync(keyFor(userId), AI_CONSENT_VERSION);
  } catch {
    // persistence failed — the note may show again next time; nothing breaks
  }
}
