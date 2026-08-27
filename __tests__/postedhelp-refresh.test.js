// React-review finding "postedhelp-refresh": a mutation on Posted Help has to
// refresh EVERYTHING it changed, not only the list it was fired from.
//
// Accepting an applicant does two things on the server (NeedService.acceptHelper):
// the request flips to ASSIGNED, and an ACTIVE connection between the elder and
// that helper is created. The web dashboard reloads both for exactly this reason
// — `await Promise.all([loadNeeds(), loadConnections()])` in ElderDashboard.
// The mobile list only invalidated ['needs-mine'], so the toast promised "they
// can now message you" while Messages, My helpers and the hub badge — all of
// them readers of ['connections'] — still showed the list from before the tap.
// Tab screens stay mounted, so nothing remounted to clear it either.
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { fireEvent, render, waitFor, within } from '@testing-library/react-native';
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
  friendlyWriteError: (err, fallback) => fallback,
  setTokenGetter: jest.fn(),
  setOnSessionExpired: jest.fn(),
}));

import api from '../src/api/client';
import PostedHelpList from '../src/components/needs/PostedHelpList';

const NEED = {
  id: 'n1',
  title: 'A ride to the clinic on Thursday',
  status: 'OPEN',
  category: 'TRANSPORTATION',
  urgency: 'NORMAL',
  applications: [{ helperId: 'h1', helperName: 'Meera', message: 'Happy to drive you.' }],
};

// Stands in for the tab bar and the Messages screen: both keep a mounted
// ['connections'] query for the whole session, so if nothing invalidates that
// key after an accept, nothing ever refetches it.
function ConnectionsReader() {
  useQuery({ queryKey: ['connections'], queryFn: async () => (await api.get('/connections')).data });
  return null;
}

const wrap = (ui) =>
  render(
    <ThemeProvider>
      {/* gcTime: Infinity — the default 5-min gc timer is scheduled at unmount
          and keeps the Jest worker alive until force-exit (the teardown warning) */}
      <QueryClientProvider
        client={
          new QueryClient({
            defaultOptions: {
              queries: { retry: false, gcTime: Infinity },
              // Mutations need it too: this is the first suite here to run one,
              // and the mutation cache's own gc timer outlives the test.
              mutations: { gcTime: Infinity },
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

afterEach(() => jest.clearAllMocks());

const callsTo = (url) => api.get.mock.calls.filter(([u]) => u === url).length;

test('accepting a helper refreshes both the requests and the connections', async () => {
  api.get.mockImplementation(async (url) => {
    if (url === '/needs/mine') return { data: { content: [NEED] } };
    if (url === '/connections') return { data: [] };
    return { data: {} };
  });

  const view = await wrap(
    <>
      <PostedHelpList />
      <ConnectionsReader />
    </>
  );
  await waitFor(() => expect(callsTo('/needs/mine')).toBe(1));
  await waitFor(() => expect(callsTo('/connections')).toBe(1));

  // The elder opens the request (title-only until touched, owner call
  // 2026-08-26) and picks Meera, then says yes to the confirm gate (the
  // dialog's own Accept, not the row's).
  fireEvent.press(await view.findByText('A ride to the clinic on Thursday'));
  fireEvent.press(await view.findByLabelText('Accept'));
  const dialog = await view.findByTestId('confirm-modal');
  fireEvent.press(within(dialog).getByLabelText('Accept'));

  await waitFor(() => expect(api.post).toHaveBeenCalledWith('/needs/n1/accept/h1'));

  // The list itself reloads (this part always worked).
  await waitFor(() => expect(callsTo('/needs/mine')).toBe(2));

  // And so does the connection the accept just created — otherwise the new
  // helper is missing from Messages until something else happens to refetch.
  await waitFor(() => expect(callsTo('/connections')).toBe(2));

  // The success toast holds a 4s dismiss timer; unmounting clears it so the
  // Jest worker can exit instead of waiting it out.
  view.unmount();
});
