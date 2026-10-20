// STORE-203 (AI consent rule): one-time disclosure flag contract. The flag is a
// version: a changed disclosure (new provider, new wording) asks everyone again.
import * as SecureStore from 'expo-secure-store';
import { AI_CONSENT_VERSION, grantAiConsent, hasAiConsent } from '../src/lib/aiConsent';
import { aiConsentKey } from '../src/lib/storageKeys';

const mockStore = {};

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async (key) => mockStore[key] ?? null),
  setItemAsync: jest.fn(async (key, value) => {
    mockStore[key] = value;
  }),
}));

beforeEach(() => {
  Object.keys(mockStore).forEach((key) => delete mockStore[key]);
  jest.clearAllMocks();
});

test('defaults to no consent on first use', async () => {
  expect(await hasAiConsent()).toBe(false);
});

test('grantAiConsent persists so the question is asked only once', async () => {
  await grantAiConsent();
  expect(await hasAiConsent()).toBe(true);
});

test('a yes given to the old wording (version 1, Groq alone) is asked again', async () => {
  mockStore[aiConsentKey('42')] = '1';
  expect(await hasAiConsent('42')).toBe(false);
});

test('a yes is stored as the current version, per user', async () => {
  await grantAiConsent('42');
  expect(mockStore[aiConsentKey('42')]).toBe(AI_CONSENT_VERSION);
  expect(await hasAiConsent('43')).toBe(false);
});

test('treats an unreadable flag as no consent (re-ask, never crash)', async () => {
  SecureStore.getItemAsync.mockRejectedValueOnce(new Error('keychain unavailable'));
  expect(await hasAiConsent()).toBe(false);
});
