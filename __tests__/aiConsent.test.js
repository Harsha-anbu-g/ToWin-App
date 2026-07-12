// STORE-203 (AI consent rule): one-time Groq disclosure flag contract.
import * as SecureStore from 'expo-secure-store';
import { grantAiConsent, hasAiConsent } from '../src/lib/aiConsent';

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

test('treats an unreadable flag as no consent (re-ask, never crash)', async () => {
  SecureStore.getItemAsync.mockRejectedValueOnce(new Error('keychain unavailable'));
  expect(await hasAiConsent()).toBe(false);
});
