// HCI-301 contract (HCI rule 3): an elder's OPEN request must always be
// removable — including one with zero applicants, which has no applicant
// expansion for a Remove button to hide inside.
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, waitFor } from '@testing-library/react-native';
import { ThemeProvider } from '../src/theme/ThemeContext';
import { ToastProvider } from '../src/context/ToastContext';
import { ConfirmProvider } from '../src/context/ConfirmContext';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: () => true }),
  useFocusEffect: () => {},
}));

jest.mock('../src/context/AuthContext', () => ({
  useAuth: () => ({ user: { role: 'ELDER', userId: 'me', emailVerified: true }, booted: true }),
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
      {/* gcTime: Infinity — the default 5-min gc timer is scheduled at unmount
          and keeps the Jest worker alive until force-exit (the teardown warning) */}
      <QueryClientProvider
        client={new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } })}
      >
        <ToastProvider>
          <ConfirmProvider>{ui}</ConfirmProvider>
        </ToastProvider>
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

// SHIP-606, finding 3. The July review asked for try/finally around onRefresh
// so a refresh that fails on poor WiFi cannot leave the spinner turning. This
// asserts the property the elder actually experiences — the spinner stops —
// rather than the shape of the code, so it stays true however the refresh is
// written. HCI heuristic 1: the one gesture whose whole job is to report
// status must never end up reporting "still working" forever.
test('a refresh that fails still stops the spinner', async () => {
  api.get.mockResolvedValue({ data: { content: [] } });
  const { root } = await wrap(<PostedHelpList />);
  await waitFor(() => expect(api.get).toHaveBeenCalled());
  // RNTL 14 dropped the UNSAFE_ queries, so the spinner is read off the host
  // ScrollView's own prop. Re-read it each time: `root` stays live, the
  // element on it is replaced on every render.
  const spinner = () => root.props.refreshControl.props;
  expect(spinner().refreshing).toBe(false);

  // The network drops between the pull and the refetch.
  api.get.mockRejectedValue(new Error('Network request failed'));
  await act(async () => {
    await spinner().onRefresh();
  });

  expect(spinner().refreshing).toBe(false);
});
