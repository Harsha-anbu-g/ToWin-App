// The family behind a friendship (FAM-512), locked by tests: the helper sees
// exactly the people who can already reach them, nested under the elder they
// belong to (web 2026-07-26), with the chat only where the coordination
// connection exists — and the updates-thread link only on shared friendships.
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render } from '@testing-library/react-native';
import React from 'react';
import MyEldersPanel from '../src/components/trust/MyEldersPanel';
import { ToastProvider } from '../src/context/ToastContext';
import { ConfirmProvider } from '../src/context/ConfirmContext';
import { ThemeProvider } from '../src/theme/ThemeContext';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn() }),
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
  type: 'HELP',
  status: 'ACTIVE',
  currentTrustLevel: 'MESSAGING',
  confirmedByMe: false,
  confirmedByOther: false,
  sharedWithFamily: false,
  ...over,
});

function stub({ connections = [conn()], entries = [] } = {}) {
  api.get.mockImplementation((url) => {
    if (url === '/connections') return Promise.resolve({ data: connections });
    if (url === '/trust/my-score') return Promise.resolve({ data: { totalScore: 5, customers: [] } });
    if (url === '/family/behind-me') return Promise.resolve({ data: { entries } });
    return Promise.resolve({ data: {} });
  });
}

function wrap(ui) {
  const qc = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity },
      mutations: { retry: false, gcTime: Infinity },
    },
  });
  return render(
    <ThemeProvider>
      <QueryClientProvider client={qc}>
        <ToastProvider>
          <ConfirmProvider>{ui}</ConfirmProvider>
        </ToastProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

afterEach(() => jest.clearAllMocks());

const sarah = {
  connectionId: 'c1',
  elderUserId: 'elder-1',
  elderName: 'Margaret',
  familyUserId: 'fam-sarah',
  familyName: 'Sarah',
  familyPhotoUrl: null,
  relationship: 'Daughter',
  chatConnectionId: null,
};

test('family rows nest under the elder they stand behind, with the relationship', async () => {
  stub({ entries: [sarah] });
  const r = await wrap(<MyEldersPanel />);

  // Folded by default (owner call 2026-08-17): the arrow reveals the family.
  await fireEvent.press(await r.findByLabelText(/Family options/));
  await r.findByText("Margaret's family");
  r.getByText(/Sarah/);
  r.getByText(/, Margaret's daughter/);
  r.getByText('Can see how this friendship is going and may message you.');
  // No coordination connection yet → no Message chip on the family row.
  expect(r.queryByText('You can message each other while this friendship stays shared.')).toBeNull();
});

test('the chat appears only with the FAMILY coordination connection', async () => {
  stub({
    connections: [
      conn(),
      conn({ id: 'fc1', otherUserId: 'fam-sarah', otherUserName: 'Sarah', type: 'FAMILY' }),
    ],
    entries: [sarah],
  });
  const r = await wrap(<MyEldersPanel />);

  await fireEvent.press(await r.findByLabelText(/Family options/));
  await r.findByText("Margaret's family");
  r.getByText('You can message each other while this friendship stays shared.');
});

test('an elder friendship with nobody behind it shows no family section', async () => {
  stub();
  const r = await wrap(<MyEldersPanel />);
  await r.findByText('Margaret');
  expect(r.queryByText("Margaret's family")).toBeNull();
});

test('the updates-thread link rides only on shared friendships', async () => {
  stub({ connections: [conn({ sharedWithFamily: true })] });
  const r = await wrap(<MyEldersPanel />);
  await r.findByText('Margaret');
  await fireEvent.press(await r.findByLabelText(/Family options/));
  r.getByLabelText('Open the family group');
});
