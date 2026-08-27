// My Elders rows (owner call 2026-08-26, "do the same for the helper"): each
// elder is a name-only row; one touch opens the ladder, why it exists, and
// the family behind it together; the photo opens the profile.
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render } from '@testing-library/react-native';
import React from 'react';
import MyEldersPanel from '../src/components/trust/MyEldersPanel';
import { ToastProvider } from '../src/context/ToastContext';
import { ConfirmProvider } from '../src/context/ConfirmContext';
import { ThemeProvider } from '../src/theme/ThemeContext';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
  useFocusEffect: () => {},
}));

jest.mock('../src/api/client', () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn(), delete: jest.fn() },
  setTokenGetter: jest.fn(),
  setOnSessionExpired: jest.fn(),
  friendlyWriteError: (_e, fallback) => fallback,
}));

jest.mock('../src/context/AuthContext', () => ({
  useAuth: () => ({ user: { role: 'HELPER', userId: 'me', emailVerified: true }, booted: true }),
}));

jest.mock('../src/lib/blockList', () => ({
  getBlocked: jest.fn(async () => []),
  filterBlocked: (list) => list,
}));

import api from '../src/api/client';

const conn = (over = {}) => ({
  id: 'c1',
  otherUserId: 'elder-1',
  otherUserName: 'Margaret',
  otherUserRole: 'ELDER',
  type: 'SOCIAL',
  status: 'ACTIVE',
  currentTrustLevel: 'PHONE_CALL',
  createdAt: '2026-08-25T13:01:16',
  confirmedByMe: false,
  confirmedByOther: false,
  sharedWithFamily: true,
  ...over,
});

beforeEach(() => {
  api.get.mockImplementation((url) => {
    if (url === '/connections')
      return Promise.resolve({
        data: [conn(), conn({ id: 'c2', otherUserId: 'elder-2', otherUserName: 'George', sharedWithFamily: false, createdAt: '2026-08-12T09:00:00' })],
      });
    if (url === '/trust/my-score') return Promise.resolve({ data: { totalScore: 5, customers: [] } });
    if (url === '/family/behind-me')
      return Promise.resolve({
        data: {
          entries: [
            { connectionId: 'c1', elderUserId: 'elder-1', elderName: 'Margaret', familyUserId: 'fam-sarah', familyName: 'Sarah', relationship: 'Daughter' },
          ],
        },
      });
    if (url === '/needs/applications')
      return Promise.resolve({
        data: [{ id: 'n5', title: 'Weekly grocery run', status: 'ASSIGNED', elderId: 'elder-1', myApplicationStatus: 'ACCEPTED' }],
      });
    return Promise.resolve({ data: {} });
  });
});
afterEach(() => jest.clearAllMocks());

const wrap = (ui) =>
  render(
    <ThemeProvider>
      <QueryClientProvider
        client={new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { retry: false, gcTime: Infinity } } })}
      >
        <ToastProvider>
          <ConfirmProvider>{ui}</ConfirmProvider>
        </ToastProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );

test('a row shows the name alone until it is touched', async () => {
  const r = await wrap(<MyEldersPanel />);

  await r.findByText('Margaret');
  r.getByText('George');
  expect(r.queryByLabelText(/Trust ladder/)).toBeNull();
  expect(r.queryByText(/Stage 3 of 7/)).toBeNull();
  expect(r.queryByLabelText('Message')).toBeNull();
  expect(r.queryByText("Margaret's family")).toBeNull();
  expect(r.queryByLabelText(/Family options/)).toBeNull();
  r.getByRole('button', { name: 'Margaret. Stage 3 of 7, Phone', expanded: false });
});

test('one touch opens the ladder, the reason, and the family together', async () => {
  const r = await wrap(<MyEldersPanel />);
  const since = (iso) => new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

  await fireEvent.press(await r.findByText('Margaret'));

  r.getByRole('button', { name: 'Margaret. Stage 3 of 7, Phone', expanded: true });
  r.getByLabelText('Trust ladder: Stage 3 of 7');
  r.getByText('Stage 3 of 7 · Phone');
  await r.findByText(`Helping with “Weekly grocery run” · since ${since('2026-08-25T13:01:16')}`);
  r.getByText("Margaret's family");
  r.getByText(/Sarah/);
  r.getByLabelText('Open the family group');
  r.getByLabelText('Message');
  r.getByText('Margaret starts each trust step. You\'ll get a tap here to accept.');
  // Only the touched row opened.
  expect(r.getAllByLabelText(/Trust ladder/)).toHaveLength(1);

  // George is a plain friendship, and folds back on a second touch.
  await fireEvent.press(r.getByText('George'));
  r.getByText(`Friends · since ${since('2026-08-12T09:00:00')}`);
  await fireEvent.press(r.getByText('George'));
  expect(r.getAllByLabelText(/Trust ladder/)).toHaveLength(1);
});

test('touching the photo opens the profile, not the row', async () => {
  const r = await wrap(<MyEldersPanel />);

  await fireEvent.press(await r.findByLabelText("View George's profile"));

  expect(mockPush).toHaveBeenCalledWith('/user/elder-2');
  expect(r.queryByLabelText(/Trust ladder/)).toBeNull();
});
