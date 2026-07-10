jest.mock('expo-secure-store', () => {
  const store = new Map();
  return {
    setItemAsync: jest.fn(async (k, v) => void store.set(k, v)),
    getItemAsync: jest.fn(async (k) => store.get(k) ?? null),
    deleteItemAsync: jest.fn(async (k) => void store.delete(k)),
    __store: store,
  };
});
jest.mock('expo-crypto', () => ({
  getRandomBytesAsync: jest.fn(async () => Uint8Array.from({ length: 32 }, (_, i) => i + 1)),
  digestStringAsync: jest.fn(async () => 'fake+digest/value=='),
  CryptoDigestAlgorithm: { SHA256: 'SHA-256' },
  CryptoEncoding: { BASE64: 'base64' },
}));

import { beginOAuthFlow, consumeOAuthFlow } from '../src/lib/oauthFlow';

test('refuses an unsolicited callback (no pending flow) — login-CSRF closed', async () => {
  expect(await consumeOAuthFlow('attacker-state')).toBeNull();
});

test('accepts exactly one matching state, then never again (no replay)', async () => {
  const { state, codeChallenge } = await beginOAuthFlow();
  expect(codeChallenge).not.toMatch(/[+/=]/); // base64url, URL-safe
  const verifier = await consumeOAuthFlow(state);
  expect(typeof verifier).toBe('string');
  expect(verifier.length).toBeGreaterThan(20);
  // replay with the same state is refused — values were cleared
  expect(await consumeOAuthFlow(state)).toBeNull();
});

test('refuses a WRONG state and burns the pending flow', async () => {
  const { state } = await beginOAuthFlow();
  expect(await consumeOAuthFlow('not-the-state')).toBeNull();
  expect(await consumeOAuthFlow(state)).toBeNull(); // burned
});
