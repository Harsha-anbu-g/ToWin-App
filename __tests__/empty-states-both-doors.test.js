// Owner calls 2026-08-28: "in messages also tell when there is no one — post
// a new help or find friends, both button", then "same for my helper also
// when no one is there". An empty inbox and an empty hub each name the
// condition and offer BOTH doors: the role's own verb (worded exactly as the
// centre button, roles.js) and the way to find people. Family accounts have
// no discovery surface and nothing to post, so they get neither door.
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { ThemeProvider } from '../src/theme/ThemeContext';
import { ToastProvider } from '../src/context/ToastContext';
import { ConfirmProvider } from '../src/context/ConfirmContext';

const mockPush = jest.fn();
let mockRole = 'ELDER';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn(), back: jest.fn(), canGoBack: () => true }),
  useLocalSearchParams: () => ({}),
  useFocusEffect: (effect) => require('react').useEffect(effect, [effect]),
  Redirect: () => null,
  Link: ({ children }) => children,
}));

jest.mock('../src/api/client', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(async () => ({ data: {} })),
    put: jest.fn(),
    delete: jest.fn(async () => ({ data: {} })),
  },
  friendlyWriteError: (_e, fallback) => fallback,
  friendlyAuthError: (_e, fallback) => fallback,
  setTokenGetter: jest.fn(),
  setOnSessionExpired: jest.fn(),
}));

jest.mock('../src/context/AuthContext', () => ({
  __esModule: true,
  AuthProvider: ({ children }) => children,
  useAuth: () => ({
    user: { role: mockRole, userId: 'me', emailVerified: true },
    booted: true,
    logout: jest.fn(),
  }),
}));

jest.mock('../src/lib/useReducedMotion', () => ({ useReducedMotion: () => true }));

import api from '../src/api/client';
import Messages from '../app/(tabs)/messages';
import MyHelpersPanel from '../src/components/trust/MyHelpersPanel';
import MyEldersPanel from '../src/components/trust/MyEldersPanel';

const wrap = (ui) =>
  render(
    <ThemeProvider>
      <QueryClientProvider
        client={new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } })}
      >
        <ToastProvider>
          <ConfirmProvider>{ui}</ConfirmProvider>
        </ToastProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );

// Nobody anywhere: every source this account can read answers empty.
const nobody = async (url) => {
  if (url === '/trust/my-score') return { data: { totalScore: 0, customers: [] } };
  if (url === '/needs/mine') return { data: { content: [] } };
  return { data: [] };
};

beforeEach(() => {
  mockRole = 'ELDER';
  jest.clearAllMocks();
  api.get.mockImplementation(nobody);
});

describe('Messages with no one to talk to', () => {
  test('an elder is told, and offered Ask Help and Find friends', async () => {
    const r = await wrap(<Messages />);
    await r.findByText('No conversations yet');

    await fireEvent.press(r.getByRole('button', { name: 'Ask Help' }));
    expect(mockPush).toHaveBeenCalledWith('/(tabs)/action');

    await fireEvent.press(r.getByRole('button', { name: 'Find friends' }));
    expect(mockPush).toHaveBeenCalledWith('/friends');
  });

  test("a helper's first door is Offer Help, the centre button's own words", async () => {
    mockRole = 'HELPER';
    const r = await wrap(<Messages />);
    await r.findByText('No conversations yet');

    await fireEvent.press(r.getByRole('button', { name: 'Offer Help' }));
    expect(mockPush).toHaveBeenCalledWith('/(tabs)/action');
    r.getByRole('button', { name: 'Find friends' });
    expect(r.queryByRole('button', { name: 'Ask Help' })).toBeNull();
  });

  test('a family account gets the sentence and neither door', async () => {
    mockRole = 'FAMILY';
    const r = await wrap(<Messages />);
    await r.findByText('No conversations yet');

    expect(r.queryByRole('button', { name: 'Ask Help' })).toBeNull();
    expect(r.queryByRole('button', { name: 'Offer Help' })).toBeNull();
    expect(r.queryByRole('button', { name: 'Find friends' })).toBeNull();
  });
});

describe('the hub with no one in it', () => {
  test('My Helpers offers Ask Help and Find friends', async () => {
    const r = await wrap(<MyHelpersPanel />);
    await waitFor(() => expect(r.getByRole('button', { name: 'Ask Help' })).toBeTruthy());

    await fireEvent.press(r.getByRole('button', { name: 'Ask Help' }));
    expect(mockPush).toHaveBeenCalledWith('/(tabs)/action');
    await fireEvent.press(r.getByRole('button', { name: 'Find friends' }));
    expect(mockPush).toHaveBeenCalledWith('/friends');
  });

  test('My Elders offers Offer Help and Find elders', async () => {
    mockRole = 'HELPER';
    const r = await wrap(<MyEldersPanel />);
    await waitFor(() => expect(r.getByRole('button', { name: 'Offer Help' })).toBeTruthy());

    await fireEvent.press(r.getByRole('button', { name: 'Offer Help' }));
    expect(mockPush).toHaveBeenCalledWith('/(tabs)/action');
    await fireEvent.press(r.getByRole('button', { name: 'Find elders' }));
    expect(mockPush).toHaveBeenCalledWith('/friends');
  });
});
