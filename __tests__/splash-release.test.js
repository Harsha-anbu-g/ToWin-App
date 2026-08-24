// SplashRelease renders nothing and drops the native launch screen the moment
// the session restore lands. Kept apart from splash-hold.test.js because that
// file resets the module registry per test, which a rendered component (and
// React) cannot share.
import { render } from '@testing-library/react-native';

const mockSplash = {
  preventAutoHideAsync: jest.fn(() => Promise.resolve(true)),
  hideAsync: jest.fn(() => Promise.resolve()),
  setOptions: jest.fn(),
};
jest.mock('expo-splash-screen', () => mockSplash);

let mockAuth = { booted: false };
jest.mock('../src/context/AuthContext', () => ({ useAuth: () => mockAuth }));

const SplashRelease = require('../src/components/SplashRelease').default;

test('waits for the session restore, then lets the splash go', async () => {
  const { rerender } = await render(<SplashRelease />);
  expect(mockSplash.hideAsync).not.toHaveBeenCalled();

  mockAuth = { booted: true };
  await rerender(<SplashRelease />);
  expect(mockSplash.hideAsync).toHaveBeenCalledTimes(1);

  // Re-renders after that do not hide again.
  await rerender(<SplashRelease />);
  expect(mockSplash.hideAsync).toHaveBeenCalledTimes(1);
});
