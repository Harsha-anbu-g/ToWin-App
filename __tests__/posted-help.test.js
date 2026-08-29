// HCI-301 contract (HCI rule 3): an elder's OPEN request must always be
// removable — including one with zero applicants, which has no applicant
// expansion for a Remove button to hide inside.
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, waitFor, within } from '@testing-library/react-native';
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

test('an ASSIGNED request names the accepted helper, tappable to their profile', async () => {
  // Owner report 2026-08-17: "In Progress said helper found, but never WHO."
  api.get.mockResolvedValue({
    data: {
      content: [
        {
          id: 'n2',
          title: 'Groceries on Friday',
          status: 'ASSIGNED',
          category: 'SHOPPING',
          urgency: 'NORMAL',
          applications: [
            { helperId: 'h9', helperName: 'Daniel', status: 'ACCEPTED' },
            { helperId: 'h2', helperName: 'Marta', status: 'PENDING' },
          ],
        },
      ],
    },
  });
  const r = await wrap(<PostedHelpList />);
  // The card lives on the In Progress segment, not the default Waiting one.
  await fireEvent.press(await r.findByLabelText(/In Progress/));
  // Title-only until touched (owner call 2026-08-26): open the card. The
  // folded row already names Daniel (In Progress rows carry the helper), so
  // the opened row is his second appearance.
  await fireEvent.press(await r.findByText('Groceries on Friday'));
  await waitFor(() => expect(r.getAllByText('Daniel')).toHaveLength(2));
  // No /connections in this fixture: the standing is unknown, so the row
  // falls back to the plain sentence rather than guessing a stage.
  r.getByText('Is helping you with this. Tap to see their profile.');
  r.getByLabelText("View Daniel's profile");
  // Only the accepted helper is named on the card once the request is theirs.
  expect(r.queryByText('Marta')).toBeNull();
});

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
  const r = await wrap(<PostedHelpList />);
  await fireEvent.press(await r.findByText('Need a ride to the clinic'));
  await waitFor(() => r.getByRole('button', { name: 'Remove' }));
});

// Owner call 2026-08-26: "just title, and once click it should show other
// details like remove and view, without clicking again."
const twoOffers = () =>
  api.get.mockResolvedValue({
    data: {
      content: [
        {
          id: 'n1',
          title: 'Need a ride to the clinic',
          status: 'OPEN',
          category: 'TRANSPORTATION',
          urgency: 'NORMAL',
          applications: [
            { helperId: 'h1', helperName: 'Daniel', message: 'Happy to drive you.' },
            { helperId: 'h2', helperName: 'Marta' },
          ],
        },
      ],
    },
  });

test('a request shows its title alone until touched', async () => {
  twoOffers();
  const r = await wrap(<PostedHelpList />);

  await r.findByText('Need a ride to the clinic');
  expect(r.queryByText(/Normal/)).toBeNull(); // the meta line
  expect(r.queryByText('Daniel')).toBeNull();
  expect(r.queryByText('Marta')).toBeNull();
  expect(r.queryByRole('button', { name: 'Accept' })).toBeNull();
  expect(r.queryByRole('button', { name: 'Remove' })).toBeNull();
  // The status still reaches a screen reader through the title's own label.
  r.getByRole('button', { name: /Need a ride to the clinic\. .*Normal/, expanded: false });
});

test('one touch opens every detail — helpers with Accept, and Remove — with no View to press', async () => {
  twoOffers();
  const r = await wrap(<PostedHelpList />);

  await fireEvent.press(await r.findByText('Need a ride to the clinic'));

  r.getByText(/Normal/);
  r.getByText('Daniel');
  r.getByText('Happy to drive you.');
  r.getByText('Marta');
  expect(r.getAllByRole('button', { name: 'Accept' })).toHaveLength(2);
  r.getByRole('button', { name: 'Remove' });
  expect(r.queryByLabelText(/View helpers|Hide helpers/)).toBeNull();

  // A second touch folds it back to the title.
  await fireEvent.press(r.getByText('Need a ride to the clinic'));
  expect(r.queryByText('Daniel')).toBeNull();
  expect(r.queryByRole('button', { name: 'Remove' })).toBeNull();
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
  // ScrollView's own prop. The list now sits inside the SwipeSegments
  // wrapper, so walk down to the host that carries refreshControl. Re-read
  // it each time: `root` stays live, elements are replaced on every render.
  const hostWithRefresh = (el) => {
    if (el?.props?.refreshControl) return el;
    for (const child of el?.children ?? []) {
      if (typeof child === 'string') continue;
      const hit = hostWithRefresh(child);
      if (hit) return hit;
    }
    return null;
  };
  const spinner = () => hostWithRefresh(root).props.refreshControl.props;
  expect(spinner().refreshing).toBe(false);

  // The network drops between the pull and the refetch.
  api.get.mockRejectedValue(new Error('Network request failed'));
  await act(async () => {
    await spinner().onRefresh();
  });

  expect(spinner().refreshing).toBe(false);
});


// Owner call 2026-08-26: "show the number at the top in the heading, how many
// it has". Owner report 2026-08-28: the Waiting chip read "3 1" — its request
// count next to the offers badge added on 08-26 — "two numbers". One number
// per chip now; offers stay on the tab badge and on each request's title.
test('the segments say how many requests they hold, one number each', async () => {
  api.get.mockResolvedValue({
    data: {
      content: [
        { id: 'n1', title: 'Need a ride to the clinic', status: 'OPEN', category: 'TRANSPORTATION', urgency: 'NORMAL',
          applications: [{ helperId: 'h1', helperName: 'Daniel' }, { helperId: 'h2', helperName: 'Marta' }] },
        { id: 'n2', title: 'Groceries this Friday', status: 'OPEN', category: 'SHOPPING', urgency: 'NORMAL', applications: [] },
        { id: 'n3', title: 'Fix the porch light', status: 'ASSIGNED', category: 'HOUSEHOLD', urgency: 'NORMAL',
          applications: [{ helperId: 'h3', helperName: 'Ravi', status: 'ACCEPTED' }] },
        { id: 'n4', title: 'Pharmacy run', status: 'COMPLETED', category: 'SHOPPING', urgency: 'NORMAL', applications: [] },
      ],
    },
  });
  const r = await wrap(<PostedHelpList />);

  // Two waiting, one in progress, one done. The two helpers waiting on an
  // answer are NOT a second number on the Waiting chip.
  await r.findByRole('tab', { name: 'Waiting, 2' });
  r.getByRole('tab', { name: 'In Progress, 1' });
  r.getByRole('tab', { name: 'Completed, 1' });
  expect(r.queryByRole('tab', { name: /offers/ })).toBeNull();
});

test('a folded request with offers wears their count on its title', async () => {
  twoOffers();
  const r = await wrap(<PostedHelpList />);

  // The count is on the folded title and in its spoken label; the helpers
  // themselves stay folded until the title is touched.
  const title = await r.findByRole('button', { name: /^Need a ride to the clinic\. 2 helpers want to help\./ });
  expect(title).toBeTruthy();
  expect(r.queryByText('Daniel')).toBeNull();
  // The pill is hidden from assistive tech (the label above speaks it). The
  // Waiting chip says "2" too (two requests), so look inside the title only.
  within(title).getByText('2', { includeHiddenElements: true });
});


// Owner call 2026-08-26: "in In Progress put building trust and the helper name".
test('an In Progress row names its helper and where trust stands, before any touch', async () => {
  api.get.mockImplementation(async (url) => {
    if (url === '/needs/mine')
      return {
        data: {
          content: [
            { id: 'n2', title: 'Groceries on Friday', status: 'ASSIGNED', category: 'SHOPPING', urgency: 'NORMAL',
              applications: [{ helperId: 'h9', helperName: 'Daniel', status: 'ACCEPTED' }] },
            { id: 'n3', title: 'A lift to the bank', status: 'ASSIGNED', category: 'TRANSPORTATION', urgency: 'NORMAL',
              applications: [{ helperId: 'h7', helperName: 'Tom Walker', status: 'ACCEPTED' }] },
          ],
        },
      };
    if (url === '/connections')
      return {
        data: [
          { id: 'c9', otherUserId: 'h9', otherUserName: 'Daniel', status: 'ACTIVE', currentTrustLevel: 'PHONE_CALL' },
          { id: 'c7', otherUserId: 'h7', otherUserName: 'Tom Walker', status: 'ACTIVE', currentTrustLevel: 'TRUSTED' },
        ],
      };
    return { data: {} };
  });
  const r = await wrap(<PostedHelpList />);
  await fireEvent.press(await r.findByLabelText(/In Progress/));

  // Folded: the name and the standing ride under the title.
  await r.findByText('Daniel · Building trust');
  r.getByText('Tom Walker · Trusted friend');
  r.getByRole('button', { name: /^Groceries on Friday\. Daniel · Building trust\./ });

  // Opened: the stage itself.
  await fireEvent.press(r.getByText('Groceries on Friday'));
  r.getByText(/^Building trust · Stage \d of 7, .*\. Tap to see their profile\.$/);
});
