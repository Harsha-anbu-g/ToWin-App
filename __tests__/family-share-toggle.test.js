// FamilyShareToggle (FAM-404), locked by tests: web-exact copy for the title
// and both status lines, switch semantics with checked state, the optimistic
// flip + rollback-with-toast contract, the exact POST payload, and the
// elder-only placement (every MyHelpersPanel card; MyEldersPanel never).
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render } from '@testing-library/react-native';
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

// Pin the reduced-motion path: AccessibilityInfo's real promise resolves
// outside act under Jest (same call as my-family.test.js); under reduce
// motion the knob SNAPS via setValue — the app convention (FAM-407).
jest.mock('../src/lib/useReducedMotion', () => ({ useReducedMotion: () => true }));

import api from '../src/api/client';
import FamilyShareToggle from '../src/components/family/FamilyShareToggle';
import MyEldersPanel from '../src/components/trust/MyEldersPanel';
import MyHelpersPanel from '../src/components/trust/MyHelpersPanel';

const wrap = (ui) =>
  render(
    <ThemeProvider>
      {/* gcTime: Infinity on queries AND mutations — the default 5-min gc
          timer is scheduled at unmount and keeps the Jest worker alive until
          force-exit (these tests run the visibility mutation). */}
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

// ConnectionResponse + trust-score fixtures (shapes from the API contract).
const conn = (over = {}) => ({
  id: 'c1',
  otherUserId: 'u1',
  otherUserName: 'Harsha',
  status: 'ACTIVE',
  currentTrustLevel: 'MESSAGING',
  confirmedByMe: false,
  confirmedByOther: false,
  sharedWithFamily: false,
  ...over,
});
const customer = (over = {}) => ({
  connectionId: 'c1',
  customerName: 'Harsha',
  customerPhotoUrl: null,
  stageIndex: 1,
  total: 5,
  totalMax: 15,
  ...over,
});

const stubGet = (connections, customers) =>
  api.get.mockImplementation(async (url) => {
    if (url === '/connections') return { data: connections };
    if (url === '/trust/my-score') return { data: { totalScore: 5, customers } };
    return { data: {} };
  });

afterEach(() => jest.clearAllMocks());

test('off state: switch role, unchecked, web-exact private copy', async () => {
  const r = await wrap(<FamilyShareToggle connectionId="c1" shared={false} />);
  r.getByRole('switch', { name: 'Let my family see this friendship', checked: false });
  r.getByText('Kept private from family. Only you can change this.');
});

test('on state: checked with the shared status line', async () => {
  const r = await wrap(<FamilyShareToggle connectionId="c1" shared />);
  r.getByRole('switch', { checked: true });
  r.getByText('Your family can see this friendship.');
});

test('tap flips optimistically before the POST resolves, with the exact payload', async () => {
  let resolvePost;
  api.post.mockImplementation(() => new Promise((resolve) => { resolvePost = resolve; }));
  const r = await wrap(<FamilyShareToggle connectionId="c1" shared={false} />);

  await fireEvent.press(r.getByRole('switch'));
  expect(api.post).toHaveBeenCalledWith('/connections/c1/family-visibility', { shared: true });
  // Optimistic: the on copy shows while the request is still in flight.
  r.getByText('Your family can see this friendship.');

  await act(async () => resolvePost({ data: conn({ sharedWithFamily: true }) }));
  r.getByRole('switch', { checked: true });
  r.getByText('Your family can see this friendship.');
});

test('failure rolls the flip back and toasts the web copy', async () => {
  api.post.mockRejectedValue(new Error('network down'));
  const r = await wrap(<FamilyShareToggle connectionId="c1" shared={false} />);

  await fireEvent.press(r.getByRole('switch'));
  await r.findByText("Couldn't save that change. Please try again.");
  r.getByRole('switch', { checked: false });
  r.getByText('Kept private from family. Only you can change this.');
});

// FAM-407: ['connections'] refetches while the card stays mounted (pull-to-
// refresh, panel invalidations) — a changed sharedWithFamily prop must reach
// the toggle without a remount.
test('server-truth re-sync: a changed prop updates the toggle in place', async () => {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity },
      mutations: { retry: false, gcTime: Infinity },
    },
  });
  const tree = (shared) => (
    <ThemeProvider>
      <QueryClientProvider client={client}>
        <ToastProvider>
          <FamilyShareToggle connectionId="c1" shared={shared} />
        </ToastProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );

  const r = await render(tree(false));
  r.getByRole('switch', { checked: false });

  // Elder flipped it on the website; a refetch re-rendered the card with the
  // fresh value — same component instance, new prop.
  await r.rerender(tree(true));
  r.getByRole('switch', { checked: true });
  r.getByText('Your family can see this friendship.');

  // And back off again — the sync tracks every change, not just the first.
  await r.rerender(tree(false));
  r.getByRole('switch', { checked: false });
  r.getByText('Kept private from family. Only you can change this.');
});

test('MyHelpersPanel renders the switch on every connection card', async () => {
  stubGet(
    [conn(), conn({ id: 'c2', otherUserId: 'u2', otherUserName: 'Priya', sharedWithFamily: true })],
    [customer(), customer({ connectionId: 'c2', customerName: 'Priya', stageIndex: 2 })]
  );
  const r = await wrap(<MyHelpersPanel />);
  await r.findByText('Harsha');
  expect(r.getAllByLabelText('Let my family see this friendship')).toHaveLength(2);
});

test('MyEldersPanel (helper side) never gets the switch', async () => {
  stubGet([conn({ otherUserName: 'Margaret' })], [customer({ customerName: 'Margaret' })]);
  const r = await wrap(<MyEldersPanel />);
  await r.findByText('Margaret');
  expect(r.queryByLabelText('Let my family see this friendship')).toBeNull();
});
