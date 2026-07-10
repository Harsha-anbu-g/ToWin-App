// OAuth flow binding — closes login-CSRF on the deep-link callback.
// The initiation side (Google button, release phase) calls beginOAuthFlow()
// and puts `state` + a PKCE code_challenge in the outbound URL. The callback
// calls consumeOAuthFlow(stateFromDeepLink): it returns the code_verifier ONLY
// when a pending flow exists and the state matches — and always deletes the
// stored values so a link can never be replayed. With no pending flow (all of
// v1, where the app never starts OAuth), every unsolicited deep link is refused.
import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';

const STATE_KEY = 'towin-oauth-state';
const VERIFIER_KEY = 'towin-oauth-verifier';

const toBase64Url = (bytes) =>
  btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

async function randomToken() {
  const bytes = await Crypto.getRandomBytesAsync(32);
  return toBase64Url(bytes);
}

export async function beginOAuthFlow() {
  const state = await randomToken();
  const codeVerifier = await randomToken();
  await SecureStore.setItemAsync(STATE_KEY, state);
  await SecureStore.setItemAsync(VERIFIER_KEY, codeVerifier);
  const digest = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, codeVerifier, {
    encoding: Crypto.CryptoEncoding.BASE64,
  });
  const codeChallenge = digest.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return { state, codeChallenge };
}

// Returns the code_verifier when `state` matches the pending flow; null otherwise.
// The pending flow is cleared on EVERY call (no replays, matched or not).
export async function consumeOAuthFlow(state) {
  let stored = null;
  let verifier = null;
  try {
    stored = await SecureStore.getItemAsync(STATE_KEY);
    verifier = await SecureStore.getItemAsync(VERIFIER_KEY);
  } catch {
    return null;
  }
  try {
    await SecureStore.deleteItemAsync(STATE_KEY);
    await SecureStore.deleteItemAsync(VERIFIER_KEY);
  } catch {
    // best effort — values may already be gone
  }
  if (!stored || !verifier || !state || state !== stored) return null;
  return verifier;
}
