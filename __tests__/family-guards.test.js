// FAM-407 role guards, locked by tests: centerActionFor('FAMILY') is null,
// so ActionScreen must redirect to Home instead of dereferencing action.key
// (imperative navigation still reaches href:null tabs), and /family is
// elder-seat only (web ElderOnly parity) — HELPER and FAMILY bounce to Home.
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render } from '@testing-library/react-native';
import { ThemeProvider } from '../src/theme/ThemeContext';
import { ToastProvider } from '../src/context/ToastContext';
import { ConfirmProvider } from '../src/context/ConfirmContext';

// Capture where <Redirect> points — the guard contract IS the href.
let mockRedirectHref = null;
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: () => true }),
  useFocusEffect: (effect) => require('react').useEffect(effect, [effect]),
  Redirect: ({ href }) => {
    mockRedirectHref = href;
    return null;
  },
}));

jest.mock('../src/api/client', () => ({
  __esModule: true,
  default: {
    post: jest.fn(async () => ({ data: {} })),
    get: jest.fn(async () => ({ data: {} })),
    delete: jest.fn(async () => ({ data: {} })),
  },
  setTokenGetter: jest.fn(),
  setOnSessionExpired: jest.fn(),
  friendlyWriteError: (err, fallback) => fallback,
}));

// Role always comes from the signed JWT in the real provider — the stub
// lets each test pin the seat under test.
let mockRole = 'FAMILY';
jest.mock('../src/context/AuthContext', () => ({
  __esModule: true,
  AuthProvider: ({ children }) => children,
  useAuth: () => ({ user: { role: mockRole, userId: 'u1', emailVerified: true }, booted: true }),
}));

// Screen reads safe-area insets; Jest has no native provider.
jest.mock('react-native-safe-area-context', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
    SafeAreaView: ({ children, ...props }) => React.createElement(View, props, children),
  };
});

import ActionScreen from '../app/(tabs)/action';
import MyFamilyScreen from '../app/family/index';

const wrap = (ui) =>
  render(
    <ThemeProvider>
      {/* gcTime: Infinity — the default 5-min gc timer is scheduled at
          unmount and keeps the Jest worker alive until force-exit. */}
      <QueryClientProvider
        client={new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } })}
      >
        <ToastProvider>
          <ConfirmProvider>{ui}</ConfirmProvider>
        </ToastProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );

beforeEach(() => {
  mockRedirectHref = null;
});
afterEach(() => jest.clearAllMocks());

test('ActionScreen: FAMILY redirects to Home — never crashes on the null center action', async () => {
  mockRole = 'FAMILY';
  const r = await wrap(<ActionScreen />);
  expect(mockRedirectHref).toBe('/(tabs)/home');
  expect(r.queryByText('Post Help')).toBeNull();
});

test('ActionScreen: elders still get the Post Help form (no redirect)', async () => {
  mockRole = 'ELDER';
  const r = await wrap(<ActionScreen />);
  expect(mockRedirectHref).toBeNull();
  r.getByText('Tell your neighbors what you need.');
});

test('/family: HELPER redirects to Home (web ElderOnly parity)', async () => {
  mockRole = 'HELPER';
  const r = await wrap(<MyFamilyScreen />);
  expect(mockRedirectHref).toBe('/(tabs)/home');
  expect(r.queryByText('How family works here')).toBeNull();
});

test('/family: FAMILY redirects to Home — the elder management surface never renders', async () => {
  mockRole = 'FAMILY';
  const r = await wrap(<MyFamilyScreen />);
  expect(mockRedirectHref).toBe('/(tabs)/home');
  expect(r.queryByText('How family works here')).toBeNull();
});

test('/family: BOTH keeps the elder seat (no redirect)', async () => {
  mockRole = 'BOTH';
  const r = await wrap(<MyFamilyScreen />);
  expect(mockRedirectHref).toBeNull();
  // FAM-504: the screen is tabbed now — the promises card lives on the
  // How-it-works tab; the tab strip itself proves the elder surface rendered.
  await fireEvent.press(r.getByText('How it works'));
  r.getByText('How family works here');
});
