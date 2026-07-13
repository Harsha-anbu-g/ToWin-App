// Demo accounts must be hidden in a production build and visible in dev/preview.
import { shouldShowDemoAccounts } from '../src/lib/appEnv';

test('hidden in a production build (no dev, no flag)', () => {
  expect(shouldShowDemoAccounts({ dev: false, flag: undefined })).toBe(false);
});

test('visible in local dev', () => {
  expect(shouldShowDemoAccounts({ dev: true, flag: undefined })).toBe(true);
});

test('visible in a build that opts in with EXPO_PUBLIC_SHOW_DEMO=1', () => {
  expect(shouldShowDemoAccounts({ dev: false, flag: '1' })).toBe(true);
});

test('any other flag value stays hidden', () => {
  expect(shouldShowDemoAccounts({ dev: false, flag: '0' })).toBe(false);
  expect(shouldShowDemoAccounts({ dev: false, flag: 'true' })).toBe(false);
});
