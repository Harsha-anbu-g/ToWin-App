// Family Home (FAM-402), locked by tests: web-exact copy, the side:'elder'
// request payload, the family-side (!iAmElder) filter, and that the FAMILY
// role's home never touches streaks or friend discovery.
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { ThemeProvider } from '../src/theme/ThemeContext';
import { ToastProvider } from '../src/context/ToastContext';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: () => true }),
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
  friendlyWriteError: (err, fallback) => fallback,
}));

// Role always comes from the signed JWT in the real provider — the stub pins
// the FAMILY seat so Home takes the family branch.
jest.mock('../src/context/AuthContext', () => ({
  __esModule: true,
  AuthProvider: ({ children }) => children,
  useAuth: () => ({ user: { role: 'FAMILY', userId: 'fam-1', emailVerified: true }, booted: true }),
}));

// The drawer exercises safe-area insets and its own nav — not under test here.
jest.mock('../src/components/home/MenuSheet', () => () => null);

import api from '../src/api/client';
import HomeScreen from '../app/(tabs)/home';
import FamilyAlertsFeed from '../src/components/family/FamilyAlertsFeed';
import FamilyHomePanel from '../src/components/family/FamilyHomePanel';

const wrap = (ui) =>
  render(
    <ThemeProvider>
      {/* gcTime: Infinity — the default 5-min gc timer is scheduled at unmount
          and keeps the Jest worker alive until force-exit (the teardown
          warning). Mutations need it too: these tests actually run mutations
          (accept/cancel/send), unlike screens.test.js. */}
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
        <ToastProvider>{ui}</ToastProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );

// FamilyLinkResponse fixtures (API contract: JSON key is exactly `iAmElder`).
const parentLink = {
  id: 'a1', otherUserId: 'e1', otherUserName: 'margaret', relationship: 'Daughter',
  isPrimary: false, status: 'ACTIVE', initiatedByMe: true, iAmElder: false,
  createdAt: '2026-07-01T10:00:00',
};
// The caller-as-ELDER side of a BOTH user's links — must never render here.
const elderSideLink = {
  id: 'z1', otherUserId: 'x1', otherUserName: 'shadow', relationship: null,
  isPrimary: false, status: 'ACTIVE', initiatedByMe: false, iAmElder: true,
  createdAt: '2026-07-01T10:00:00',
};
const incomingReq = {
  id: 'in1', otherUserId: 'e2', otherUserName: 'arthur', relationship: 'Niece',
  isPrimary: false, status: 'PENDING', initiatedByMe: false, iAmElder: false,
  createdAt: '2026-07-15T09:00:00',
};
const outgoingReq = {
  id: 'out1', otherUserId: 'e3', otherUserName: 'rose', relationship: null,
  isPrimary: false, status: 'PENDING', initiatedByMe: true, iAmElder: false,
  createdAt: '2026-07-16T09:00:00',
};
const fullLinks = {
  activeLinks: [parentLink, elderSideLink],
  incomingRequests: [incomingReq],
  outgoingRequests: [outgoingReq],
};
const emptyLinks = { activeLinks: [], incomingRequests: [], outgoingRequests: [] };
const sosAlert = {
  id: 'al1', elderId: 'e1', elderName: 'Margaret Reyes', type: 'SOS',
  body: 'Pressed the SOS button and may need help right away.',
  createdAt: '2026-07-17T12:00:00',
};
// A second linked parent — the feed interleaves alerts newest-first, so each
// row must say WHOSE alert it is (FAM-407).
const quietAlert = {
  id: 'al2', elderId: 'e9', elderName: 'Arthur Chen', type: 'INACTIVITY',
  body: 'Has not been active on Towinly for 5 days.',
  createdAt: '2026-07-16T12:00:00',
};

const stubGet = (links, alerts) =>
  api.get.mockImplementation(async (url) => {
    if (url === '/family/links') return { data: links };
    if (url === '/family/alerts') return { data: { alerts } };
    if (url === '/trust/my-score') return { data: { totalScore: 3 } };
    return { data: {} };
  });

afterEach(() => jest.clearAllMocks());

test('FAMILY home: My Parents panel renders; no streak fetch; Add parent sits where the elder\'s Friends button does, never Add friends', async () => {
  stubGet(emptyLinks, []);
  const { findByText, getByLabelText, getByRole, queryByLabelText } = await wrap(<HomeScreen />);
  await findByText('My Parents');
  // The elder hub's skeleton (owner call 2026-08-28): the add-a-person action
  // lives in the nav row's left slot, and it opens the form in the page.
  expect(queryByLabelText('Add friends')).toBeNull();
  expect(api.get).not.toHaveBeenCalledWith('/streaks/me');
  await fireEvent.press(getByLabelText('Add parent'));
  getByRole('button', { name: 'Send request' });
});

test('load: parents, requests, and alerts render web-exact — elder-side links never show', async () => {
  stubGet(fullLinks, [sosAlert, quietAlert]);
  const r = await wrap(<FamilyHomePanel />);

  await r.findByText('margaret');
  // A linked parent folds to the name (owner call 2026-08-26): open it.
  await fireEvent.press(r.getByText('margaret'));
  r.getByText("You're their daughter");
  r.getByText('Linked');

  // Requests live under their own segment (the elder hub's pair, 2026-08-28);
  // the chip wears how many are waiting on my yes.
  await fireEvent.press(r.getByRole('tab', { name: 'Requests, 1 waiting' }));
  r.getByText('They added you as family');
  r.getByText("wants you as their family here (as their niece). It's your choice.");
  r.getByText('Requests you sent');
  r.getByText('Waiting for rose to accept. Only they can say yes. You can cancel any time.');

  await r.findByText('Urgent help');
  r.getByText('Pressed the SOS button and may need help right away.');
  r.getByText('They pressed their SOS button and asked for urgent help. A call right now matters.');

  // Each row names the parent (FAM-407) — with two linked parents the reader
  // must know WHOSE alert this is; backend bodies carry no subject.
  r.getByText('Margaret Reyes');
  r.getByText('Arthur Chen');
  r.getByText('Quiet lately');
  r.getByText('Has not been active on Towinly for 5 days.');

  // The FAMILY seat filter: the caller-as-elder side of links stays hidden.
  expect(r.queryByText('shadow')).toBeNull();
});

// FAM-407: alerts are in-app only ("nothing is sent by text or email"), so
// the feed is the SOLE SOS channel — it polls at the 30s unread-count
// convention (app/(tabs)/_layout.jsx) instead of waiting for a manual refresh.
test('family-alerts polls every 30s while the feed is mounted', async () => {
  stubGet(emptyLinks, []);
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  });
  const r = await render(
    <ThemeProvider>
      <QueryClientProvider client={client}>
        <ToastProvider>
          <FamilyAlertsFeed />
        </ToastProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );

  await r.findByText('No alerts right now');
  const query = client.getQueryCache().find({ queryKey: ['family-alerts'] });
  expect(query.options.refetchInterval).toBe(30_000);
});

test('accept and decline post the respond payloads and toast the web copy', async () => {
  stubGet(fullLinks, []);
  const r = await wrap(<FamilyHomePanel />);
  await r.findByText('margaret');
  await fireEvent.press(r.getByRole('tab', { name: 'Requests, 1 waiting' }));
  await r.findByText('They added you as family');

  await fireEvent.press(r.getByRole('button', { name: 'Accept' }));
  expect(api.post).toHaveBeenCalledWith('/family/requests/in1/respond', { accept: true });
  await r.findByText("You're now linked as their family.");

  await fireEvent.press(r.getByRole('button', { name: 'Not now' }));
  expect(api.post).toHaveBeenCalledWith('/family/requests/in1/respond', { accept: false });
  await r.findByText('Request declined.');
});

test('cancel request DELETEs the link and toasts', async () => {
  stubGet(fullLinks, []);
  const r = await wrap(<FamilyHomePanel />);
  await r.findByText('margaret');
  await fireEvent.press(r.getByRole('tab', { name: 'Requests, 1 waiting' }));
  await r.findByText('Requests you sent');

  await fireEvent.press(r.getByRole('button', { name: 'Cancel request' }));
  expect(api.delete).toHaveBeenCalledWith('/family/links/out1');
  await r.findByText('Request cancelled.');
});

test('empty states carry the exact web sub-copy', async () => {
  stubGet(emptyLinks, []);
  const r = await wrap(<FamilyHomePanel />);

  await r.findByText('No parent linked yet');
  r.getByText("They must accept before you're linked.");
  // The empty state carries its own starter action now (rulebook pass).
  r.getByRole('button', { name: 'Add your parent' });

  await r.findByText('No alerts right now');
  r.getByText(
    "That's good news. You'll see it here if your parent asks for help, goes quiet for a while, or shares a first meeting with a friend."
  );
});

test('add form: no API call on a blank identifier; trimmed payload posts side elder', async () => {
  stubGet(emptyLinks, []);
  const r = await wrap(<FamilyHomePanel />);
  await r.findByText('No parent linked yet');

  await fireEvent.press(r.getByRole('button', { name: 'Add your parent' }));
  r.getByText(
    'Type their exact Towinly username, email or phone. They must say yes before you see anything.'
  );

  await fireEvent.press(r.getByRole('button', { name: 'Send request' }));
  expect(api.post).not.toHaveBeenCalled();
  r.getByText('Please enter a username, email, or phone number');

  await fireEvent.changeText(r.getByLabelText('Username, email or phone'), '  margaret ');
  await fireEvent.changeText(r.getByLabelText('Relationship (what you are to them)'), 'Daughter');
  await fireEvent.press(r.getByRole('button', { name: 'Send request' }));
  expect(api.post).toHaveBeenCalledWith('/family/requests', {
    identifier: 'margaret',
    relationship: 'Daughter',
    side: 'elder',
  });
  await r.findByText('Request sent. You become family here once they accept.');
});


// Owner call 2026-08-26, "do the same for the family": a linked parent is a
// name-only row; one touch opens the relationship, the Linked label, the
// status line and "See <name>". Requests never fold.
test('a linked parent shows the name alone until touched; requests stay open', async () => {
  stubGet(fullLinks, []);
  const r = await wrap(<FamilyHomePanel />);

  await r.findByText('margaret');
  expect(r.queryByText("You're their daughter")).toBeNull();
  expect(r.queryByText('Linked')).toBeNull();
  expect(r.queryByLabelText('See margaret')).toBeNull();
  // The sentence still reaches a screen reader through the row's label.
  r.getByRole('button', { name: "margaret. You're their daughter", expanded: false });
  // The incoming request keeps its choice in view without any touch, under
  // the Requests segment.
  await fireEvent.press(r.getByRole('tab', { name: 'Requests, 1 waiting' }));
  r.getByText("wants you as their family here (as their niece). It's your choice.");
  r.getByRole('button', { name: 'Accept' });
  await fireEvent.press(r.getByRole('tab', { name: 'Parents' }));

  await fireEvent.press(await r.findByText('margaret'));
  r.getByText("You're their daughter");
  r.getByText('Linked');
  r.getByLabelText('See margaret');
});

// The elder hub's skeleton on the family seat (owner call 2026-08-28, "keep
// elder as base"): the search field above the list narrows by name, a miss
// says so, and the Requests chip wears the people waiting on my yes.
test('the search narrows parents by name and a miss says so', async () => {
  stubGet(
    {
      activeLinks: [parentLink, { ...parentLink, id: 'a2', otherUserId: 'e5', otherUserName: 'arthur' }],
      incomingRequests: [],
      outgoingRequests: [],
    },
    []
  );
  const r = await wrap(<FamilyHomePanel />);
  await r.findByText('margaret');
  r.getByText('arthur');

  await fireEvent.changeText(r.getByLabelText('Search'), 'art');
  await waitFor(() => expect(r.queryByText('margaret')).toBeNull());
  r.getByText('arthur');

  await fireEvent.changeText(r.getByLabelText('Search'), 'zzz');
  await waitFor(() => expect(r.getByText('No matches for “zzz”.')).toBeTruthy());
  expect(r.queryByText('No parent linked yet')).toBeNull();
});

test('no search field with nobody yet; Requests wears no number when nothing waits on me', async () => {
  stubGet(emptyLinks, []);
  const r = await wrap(<FamilyHomePanel />);
  await r.findByText('No parent linked yet');
  expect(r.queryByLabelText('Search')).toBeNull();
  r.getByRole('tab', { name: 'Parents' });
  r.getByRole('tab', { name: 'Requests' });

  await fireEvent.press(r.getByRole('tab', { name: 'Requests' }));
  r.getByText(/No requests right now/);
});
