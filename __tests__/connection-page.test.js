// A helper or elder on their own page (owner call 2026-09-25: a name on Home
// opens a page like WhatsApp, not a dropdown). Locks: the route picks the seat
// by role, and the quiet actions keep their dialogs and land the person back
// on Home once the friendship is paused or ended.
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { ThemeProvider } from '../src/theme/ThemeContext';
import { ToastProvider } from '../src/context/ToastContext';
import { ConfirmProvider } from '../src/context/ConfirmContext';

const mockBack = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: mockBack, canGoBack: () => true }),
  useLocalSearchParams: () => ({ connectionId: 'c1' }),
  useFocusEffect: (effect) => require('react').useEffect(effect, [effect]),
  Redirect: () => null,
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
  friendlyWriteError: (_e, fallback) => fallback,
}));

let mockRole = 'ELDER';
jest.mock('../src/context/AuthContext', () => ({
  useAuth: () => ({ user: { role: mockRole, userId: 'me', emailVerified: true }, booted: true }),
}));

jest.mock('../src/lib/useReducedMotion', () => ({ useReducedMotion: () => true }));

import api from '../src/api/client';
import ConnectionPage from '../app/connection/[connectionId]';

const wrap = (ui) =>
  render(
    <ThemeProvider>
      <QueryClientProvider
        client={
          new QueryClient({
            defaultOptions: {
              queries: { retry: false, gcTime: Infinity },
              mutations: { retry: false, gcTime: Infinity },
            },
          })
        }
      >
        <ToastProvider>
          <ConfirmProvider>{ui}</ConfirmProvider>
        </ToastProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );

beforeEach(() => {
  mockRole = 'ELDER';
  api.get.mockImplementation(async (url) => {
    if (url === '/trust/my-score')
      return {
        data: {
          totalScore: 8,
          customers: [{ connectionId: 'c1', customerName: 'Priya Sharma', stageIndex: 2, total: 8, totalMax: 15 }],
        },
      };
    if (url === '/connections')
      return {
        data: [
          {
            id: 'c1',
            otherUserId: 'u1',
            otherUserName: 'Priya Sharma',
            status: 'ACTIVE',
            type: 'SOCIAL',
            currentTrustLevel: 'PHONE_CALL',
            createdAt: '2026-08-25T13:01:16',
            confirmedByMe: false,
            confirmedByOther: true,
            sharedWithFamily: false,
          },
        ],
      };
    return { data: {} };
  });
});
afterEach(() => jest.clearAllMocks());

test('an elder is shown the helper page: the elder starts each step', async () => {
  const r = await wrap(<ConnectionPage />);

  await r.findByRole('button', { name: 'Start the next step' });
  expect(r.queryByRole('button', { name: 'Accept the next step' })).toBeNull();
});

test('a helper is shown the elder page: the helper accepts the step the elder started', async () => {
  mockRole = 'HELPER';
  const r = await wrap(<ConnectionPage />);

  await r.findByRole('button', { name: 'Accept the next step' });
  expect(r.queryByRole('button', { name: 'Start the next step' })).toBeNull();
});

test('the page has a visible back arrow', async () => {
  const r = await wrap(<ConnectionPage />);

  await fireEvent.press(await r.findByLabelText('Back'));
  expect(mockBack).toHaveBeenCalled();
});

test('the elder asks first, pauses, and lands back on Home', async () => {
  const r = await wrap(<ConnectionPage />);

  await fireEvent.press(await r.findByRole('button', { name: 'Take a break' }));
  await r.findByText('Take a break?');
  expect(api.post).not.toHaveBeenCalled();
  // The dialog's own button shares the page button's name: it is the last one.
  const buttons = await r.findAllByRole('button', { name: 'Take a break' });
  await fireEvent.press(buttons[buttons.length - 1]);
  await waitFor(() => expect(api.post).toHaveBeenCalledWith('/trust/c1/pause'));
  await waitFor(() => expect(mockBack).toHaveBeenCalled());
});

test('declining the dialog changes nothing and stays on the page', async () => {
  const r = await wrap(<ConnectionPage />);

  await fireEvent.press(await r.findByRole('button', { name: 'Take a break' }));
  await fireEvent.press(await r.findByRole('button', { name: 'Not now' }));

  expect(api.post).not.toHaveBeenCalled();
  expect(mockBack).not.toHaveBeenCalled();
});

test('the helper accepts the elder\'s step after the dialog', async () => {
  mockRole = 'HELPER';
  const r = await wrap(<ConnectionPage />);

  await fireEvent.press(await r.findByRole('button', { name: 'Accept the next step' }));
  await fireEvent.press(await r.findByRole('button', { name: 'Accept' }));

  await waitFor(() => expect(api.post).toHaveBeenCalledWith('/trust/c1/confirm'));
  expect(mockBack).not.toHaveBeenCalled();
});

test('the helper ends the connection after the dialog and lands back on Home', async () => {
  mockRole = 'HELPER';
  const r = await wrap(<ConnectionPage />);

  await fireEvent.press(await r.findByLabelText('End'));
  await r.findByText('End this connection?');
  const ends = await r.findAllByRole('button', { name: 'End' });
  await fireEvent.press(ends[ends.length - 1]);

  await waitFor(() => expect(api.delete).toHaveBeenCalled());
  await waitFor(() => expect(mockBack).toHaveBeenCalled());
});
