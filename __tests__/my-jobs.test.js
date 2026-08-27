// My offers & jobs (owner call 2026-08-26, "do the same for the helper"):
// segments with their counts, title-only rows, one touch for every detail,
// and In Progress rows carrying the elder and where trust stands.
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render } from '@testing-library/react-native';
import React from 'react';
import MyJobsCard from '../src/components/home/MyJobsCard';
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

import api from '../src/api/client';

const JOBS = [
  { id: 'n1', title: 'Weekly grocery run', status: 'ASSIGNED', category: 'SHOPPING', urgency: 'NORMAL', elderId: 'elder-1', elderName: 'Margaret', myApplicationStatus: 'ACCEPTED', description: 'Saturdays, around ten.' },
  { id: 'n2', title: 'A lift to the bank', status: 'OPEN', category: 'TRANSPORTATION', urgency: 'NORMAL', elderId: 'elder-2', elderName: 'George', myApplicationStatus: 'PENDING' },
  { id: 'n3', title: 'Chess on Sundays', status: 'OPEN', category: 'COMPANIONSHIP', urgency: 'NORMAL', elderId: 'elder-1', elderName: 'Margaret', myApplicationStatus: 'PENDING' },
  { id: 'n4', title: 'Fix the porch light', status: 'ASSIGNED', category: 'OTHER', urgency: 'NORMAL', elderId: 'elder-3', elderName: 'Rose', myApplicationStatus: 'DECLINED' },
];
const CONNS = [
  { id: 'c1', otherUserId: 'elder-1', otherUserName: 'Margaret', status: 'ACTIVE', type: 'SOCIAL', currentTrustLevel: 'PHONE_CALL' },
];

beforeEach(() => {
  api.get.mockImplementation((url) => {
    if (url === '/needs/applications') return Promise.resolve({ data: JOBS });
    if (url === '/connections') return Promise.resolve({ data: CONNS });
    return Promise.resolve({ data: {} });
  });
});
afterEach(() => jest.clearAllMocks());

const wrap = (ui) =>
  render(
    <ThemeProvider>
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } })}>
        {ui}
      </QueryClientProvider>
    </ThemeProvider>
  );

test('the segments say how many offers they hold', async () => {
  const r = await wrap(<MyJobsCard />);
  await r.findByRole('tab', { name: 'Waiting, 2' });
  r.getByRole('tab', { name: 'In Progress, 1' });
  r.getByRole('tab', { name: 'Completed, 1' });
});

test('a waiting offer shows its title alone until touched, then every detail', async () => {
  const r = await wrap(<MyJobsCard />);

  await r.findByText('A lift to the bank');
  expect(r.queryByText(/Normal/)).toBeNull();
  expect(r.queryByText('George')).toBeNull();

  await fireEvent.press(r.getByText('A lift to the bank'));
  r.getByText(/Normal/);
  r.getByLabelText("View George's profile");
  // No friendship yet: the caption stays plain, and there is no chat to open.
  r.getByText('Tap to see their profile.');
  expect(r.queryByLabelText('Message')).toBeNull();
});

test('an In Progress row names the elder and where trust stands, before any touch', async () => {
  const r = await wrap(<MyJobsCard />);
  await fireEvent.press(await r.findByRole('tab', { name: 'In Progress, 1' }));

  await r.findByText('Margaret · Building trust');
  r.getByRole('button', { name: /^Weekly grocery run\. Margaret · Building trust\./ });

  await fireEvent.press(r.getByText('Weekly grocery run'));
  r.getByText('Building trust · Stage 3 of 7, Phone. Tap to see their profile.');
  r.getByText('Saturdays, around ten.');
  await fireEvent.press(r.getByLabelText('Message'));
  expect(mockPush).toHaveBeenCalledWith('/chat/c1');
});

test('a declined offer sits with the finished ones and says so plainly', async () => {
  const r = await wrap(<MyJobsCard />);
  await fireEvent.press(await r.findByRole('tab', { name: 'Completed, 1' }));
  await r.findByText('Fix the porch light');
  r.getByText('Not this time');
});
