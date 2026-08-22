// HARD-106. Blocking said it worked while the connection was still live.
//
// doBlock awaited the device-side list, then fired the end-connection delete
// with no await and no outcome handling, then toasted "Blocked. You won't see
// this person anymore." whatever happened.
//
// That delete is the only server-side enforcement a block has.
// MessageService.java:62 rejects a send unless the connection is ACTIVE, and
// src/lib/blockList.js stores the block ON THIS DEVICE ONLY. So when the delete
// failed, the person was told they were protected, and the person they blocked
// could still message them.
//
// The rule from .claude/skills/trust-and-safety: "Blocked/suspended users
// disappear from the other party's surfaces immediately, not on next sync", and
// "Never promise an outcome." A success toast over a failed write promises an
// outcome that did not happen, to somebody who blocked a person for a reason.
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { ThemeProvider } from '../src/theme/ThemeContext';
import { ToastProvider } from '../src/context/ToastContext';
import { ConfirmProvider } from '../src/context/ConfirmContext';
import api from '../src/api/client';
import UserProfile from '../app/user/[id]';

const DONE = "Blocked. You won't see this person anymore.";
const HALF = 'Blocked on this phone. We could not end the friendship, so messages may still reach you.';

const mockStore = {};
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async (key) => mockStore[key] ?? null),
  setItemAsync: jest.fn(async (key, value) => {
    mockStore[key] = value;
  }),
  deleteItemAsync: jest.fn(async (key) => {
    delete mockStore[key];
  }),
  WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'whenUnlockedThisDeviceOnly',
}));

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: () => true }),
  useLocalSearchParams: () => ({ id: 'dale-9' }),
  useFocusEffect: (effect) => require('react').useEffect(effect, [effect]),
  Redirect: () => null,
}));

jest.mock('../src/api/client', () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn(async () => ({ data: {} })), delete: jest.fn() },
  friendlyWriteError: (_e, fallback) => fallback,
  friendlyAuthError: (_e, fallback) => fallback,
  setTokenGetter: jest.fn(),
  setOnSessionExpired: jest.fn(),
}));

jest.mock('../src/context/AuthContext', () => ({
  __esModule: true,
  AuthProvider: ({ children }) => children,
  useAuth: () => ({ user: { role: 'ELDER', userId: 'elder-1', emailVerified: true }, booted: true }),
}));

const PROFILE = { id: 'dale-9', name: 'Dale', role: 'HELPER', trustScore: 4 };
// An ACTIVE friendship is the case that matters: it is the one with a
// server-side half to get wrong.
const ACTIVE_CONNECTION = {
  id: 'conn-1',
  otherUserId: 'dale-9',
  otherUserName: 'Dale',
  status: 'ACTIVE',
  type: 'HELP',
};

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

beforeEach(() => {
  Object.keys(mockStore).forEach((key) => delete mockStore[key]);
  jest.clearAllMocks();
  api.get.mockImplementation(async (url) => {
    if (url === '/profile/dale-9') return { data: PROFILE };
    if (url === '/connections') return { data: [ACTIVE_CONNECTION] };
    return { data: [] };
  });
});

/** Open the sheet, choose Block, and say yes in the dialog. */
const blockDale = async (r) => {
  await waitFor(() => expect(r.getByRole('button', { name: 'Block this person' })).toBeTruthy());
  await fireEvent.press(r.getByRole('button', { name: 'Block this person' }));
  await waitFor(() => expect(r.getByText(/Block Dale/)).toBeTruthy());
  await fireEvent.press(r.getByRole('button', { name: 'Block', includeHiddenElements: true }));
};

test('the dialog says the block lives on this phone', async () => {
  const r = await wrap(<UserProfile />);
  await waitFor(() => expect(r.getByRole('button', { name: 'Block this person' })).toBeTruthy());
  await fireEvent.press(r.getByRole('button', { name: 'Block this person' }));

  await waitFor(() =>
    expect(
      r.getByText(/The block is saved on this phone, so it does not follow you to another device\./)
    ).toBeTruthy()
  );
});

test('a failed end-connection never claims the block worked', async () => {
  api.delete.mockRejectedValue(Object.assign(new Error('offline'), { response: undefined }));
  const r = await wrap(<UserProfile />);

  await blockDale(r);

  await waitFor(() => expect(r.getByText(HALF)).toBeTruthy());
  expect(r.queryByText(DONE)).toBeNull();
});

test('the failure offers a retry that re-asks the server', async () => {
  api.delete.mockRejectedValue(new Error('offline'));
  const r = await wrap(<UserProfile />);
  await blockDale(r);
  await waitFor(() => expect(r.getByText(HALF)).toBeTruthy());

  // The retry works: the second attempt lands, and the success sentence
  // finally appears because the connection really ended this time.
  api.delete.mockResolvedValue({ data: {} });
  await fireEvent.press(r.getByLabelText('Try again'));

  await waitFor(() => expect(r.getByText(DONE)).toBeTruthy());
});

test('the success sentence appears only when the connection really ended', async () => {
  api.delete.mockResolvedValue({ data: {} });
  const r = await wrap(<UserProfile />);

  await blockDale(r);

  await waitFor(() => expect(api.delete).toHaveBeenCalledWith('/connections/conn-1'));
  await waitFor(() => expect(r.getByText(DONE)).toBeTruthy());
  expect(r.queryByText(HALF)).toBeNull();
});

test('with no active friendship there is nothing server-side to fail', async () => {
  api.get.mockImplementation(async (url) => {
    if (url === '/profile/dale-9') return { data: PROFILE };
    return { data: [] }; // no connection at all
  });
  const r = await wrap(<UserProfile />);

  await blockDale(r);

  await waitFor(() => expect(r.getByText(DONE)).toBeTruthy());
  expect(api.delete).not.toHaveBeenCalled();
});

test('the block flow does not raise the standalone end-friendship toasts', async () => {
  // Two sentences about one tap talk over each other, and the second wins.
  api.delete.mockResolvedValue({ data: {} });
  const r = await wrap(<UserProfile />);

  await blockDale(r);

  await waitFor(() => expect(r.getByText(DONE)).toBeTruthy());
  expect(r.queryByText('Friendship ended.')).toBeNull();
});
