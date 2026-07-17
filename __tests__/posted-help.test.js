// HCI-301 contract (HCI rule 3): an elder's OPEN request must always be
// removable — including one with zero applicants, which has no applicant
// expansion for a Remove button to hide inside.
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, waitFor } from '@testing-library/react-native';
import { ThemeProvider } from '../src/theme/ThemeContext';
import { ToastProvider } from '../src/context/ToastContext';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: () => true }),
}));

jest.mock('../src/api/client', () => ({
  __esModule: true,
  default: {
    post: jest.fn(async () => ({ data: {} })),
    get: jest.fn(async () => ({ data: { content: [] } })),
    delete: jest.fn(async () => ({ data: {} })),
  },
  setTokenGetter: jest.fn(),
  setOnSessionExpired: jest.fn(),
}));

import api from '../src/api/client';
import PostedHelpList from '../src/components/needs/PostedHelpList';

const wrap = (ui) =>
  render(
    <ThemeProvider>
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <ToastProvider>{ui}</ToastProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );

afterEach(() => jest.clearAllMocks());

test('an OPEN request with zero applicants still offers Remove', async () => {
  api.get.mockResolvedValue({
    data: {
      content: [
        {
          id: 'n1',
          title: 'Need a ride to the clinic',
          status: 'OPEN',
          category: 'TRANSPORTATION',
          urgency: 'NORMAL',
          applications: [],
        },
      ],
    },
  });
  const { getByRole } = await wrap(<PostedHelpList />);
  await waitFor(() => getByRole('button', { name: 'Remove' }));
});
