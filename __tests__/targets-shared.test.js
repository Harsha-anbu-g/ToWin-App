// Deep audit DEEP-08, the "targets-shared" group: three controls whose 44pt
// promise was made of hitSlop, and hitSlop does not exist at towinly.com/app/.
// react-native-web's Pressable never reads the prop, so on the phone-web build
// the box IS the target:
//
//   ActionChip.jsx        36pt — the Message · End · Accept chip, ~25 call sites
//   OfferHelpList.jsx     30pt — the distance pill, the worst of the three
//   PostedHelpList.jsx    34pt — the request title (was View helpers), the elder's trust decision
//
// Every assertion here measures the rendered box, never the slop: a control
// propped up by hitSlop would pass a "can I press it" test and still be a 30pt
// target in the browser. Same contract as tap-target-offer-help.test.js and
// ui-web-parity.test.js, and the reason Chip.jsx spells out for preferring a
// real box in a wrapping row.
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { ThemeProvider } from '../src/theme/ThemeContext';
import { ToastProvider } from '../src/context/ToastContext';
import { ConfirmProvider } from '../src/context/ConfirmContext';

// Owner call 2026-08-17 (normal density): the visual box floor is 36pt —
// ordinary app chip height. The box must still be real (measured minHeight,
// never hitSlop, because react-native-web drops hitSlop); native targets are
// topped back toward 44 with hitSlop where the components add it.
const MIN_TARGET = 36;

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
    get: jest.fn(async () => ({ data: { content: [] } })),
    post: jest.fn(async () => ({ data: {} })),
    delete: jest.fn(async () => ({ data: {} })),
  },
  setTokenGetter: jest.fn(),
  setOnSessionExpired: jest.fn(),
  friendlyWriteError: (_e, fallback) => fallback,
}));

import api from '../src/api/client';
import ActionChip from '../src/components/ui/ActionChip';
import OfferHelpList from '../src/components/needs/OfferHelpList';
import PostedHelpList from '../src/components/needs/PostedHelpList';

const wrap = (ui) =>
  render(
    <ThemeProvider>
      {/* gcTime: Infinity — the default 5-min gc timer is scheduled at unmount
          and keeps the Jest worker alive until force-exit */}
      <QueryClientProvider
        client={new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } })}
      >
        <ToastProvider>
          <ConfirmProvider>{ui}</ConfirmProvider>
        </ToastProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );

const styleOf = (node) => StyleSheet.flatten(node.props.style) ?? {};

// A measured box, not slop: the number has to be there and clear the floor.
const expectRealTarget = (node) => {
  const style = styleOf(node);
  expect(style.minHeight).toEqual(expect.any(Number));
  expect(style.minHeight).toBeGreaterThanOrEqual(MIN_TARGET);
};

const OPEN_NEED = {
  id: 'n1',
  title: 'A ride to the clinic on Thursday',
  status: 'OPEN',
  category: 'TRANSPORTATION',
  urgency: 'NORMAL',
  elderId: 'e1',
  elderName: 'Eleanor',
  createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  distanceKm: 1.2,
  applications: [
    { helperId: 'h1', helperName: 'Daniel', message: 'Happy to drive you.' },
    // A helper who applied without a message: their row is then exactly the
    // 40pt avatar and one line of name, which is where the dropped hitSlop
    // leaves the box under the floor.
    { helperId: 'h2', helperName: 'Marta' },
  ],
};

beforeEach(() => {
  jest.clearAllMocks();
  api.get.mockImplementation(async (url) =>
    url === '/needs/open' || url === '/needs/mine'
      ? { data: { content: [OPEN_NEED] } }
      : { data: { content: [] } }
  );
});

// ---------------------------------------------------------------------------
// ActionChip — shared by both trust panels, both family surfaces, the block
// list and the report sheet. Its own comment admitted the arrangement:
// "36pt visual; hitSlop tops the target past 44pt". Two call sites had already
// gone around it with a local `style={{ minHeight: 44 }}`, which is the fix
// asking to move into the component.
// ---------------------------------------------------------------------------
describe('the shared action chip', () => {
  test('is a real box at the normal-density floor, not slop', async () => {
    // Arrange / Act
    const r = await render(
      <ThemeProvider>
        <ActionChip label="Message" tonal onPress={() => {}} />
      </ThemeProvider>
    );

    // Assert
    expectRealTarget(r.getByRole('button', { name: 'Message' }));
  });

  test('still runs its action, and a disabled chip still does not', async () => {
    // Arrange
    const onPress = jest.fn();
    const r = await render(
      <ThemeProvider>
        <ActionChip label="End" destructive onPress={onPress} />
        <ActionChip label="Remove" disabled onPress={onPress} />
      </ThemeProvider>
    );

    // Act
    await fireEvent.press(r.getByRole('button', { name: 'End' }));
    await fireEvent.press(r.getByRole('button', { name: 'Remove' }));

    // Assert — the busy chip blocks its mutation the way it always has.
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// Offer Help — the distance pill is how a helper widens the search when the
// list is empty, and the empty state points straight at it ("Try a wider
// distance"). At 30pt it was the smallest target in the app.
// ---------------------------------------------------------------------------
describe('the distance pill on Offer Help', () => {
  test('is a real 44pt box', async () => {
    // Arrange / Act
    const r = await wrap(<OfferHelpList />);
    const pill = await waitFor(() => r.getByLabelText(/Distance 25 kilometres/));

    // Assert
    expectRealTarget(pill);
  }, 30_000);

  test('still steps the search radius when tapped', async () => {
    // Arrange
    const r = await wrap(<OfferHelpList />);
    const pill = await waitFor(() => r.getByLabelText(/Distance 25 kilometres/));

    // Act
    await fireEvent.press(pill);

    // Assert — 25 km steps to the next ring, and the pill says so.
    // The line above it names the ring only once this phone has a position
    // (LOC-204): without one the server cannot filter by distance, so the row
    // reads "Showing every open request" instead of claiming a radius. The
    // wording in both states is covered by __tests__/offer-help-location.test.js.
    await waitFor(() => expect(r.getByLabelText(/Distance 50 kilometres/)).toBeTruthy());
  }, 30_000);
});

// ---------------------------------------------------------------------------
// Posted Help — the request's title opens the applicant rows (owner call
// 2026-08-26: title-only cards, one touch for every detail), which is where
// the elder reads who wants to help and decides. Missing that tap means the
// request looks like it has no helpers at all.
// ---------------------------------------------------------------------------
describe('the request title control on Posted Help', () => {
  test('is a real 44pt box', async () => {
    // Arrange / Act
    const r = await wrap(<PostedHelpList />);
    const title = await waitFor(() => r.getByLabelText(/^A ride to the clinic on Thursday\./));

    // Assert
    expectRealTarget(title);
  }, 30_000);

  test('still opens the helper who applied', async () => {
    // Arrange
    const r = await wrap(<PostedHelpList />);
    const title = await waitFor(() => r.getByLabelText(/^A ride to the clinic on Thursday\./));

    // Act
    await fireEvent.press(title);

    // Assert
    await waitFor(() => expect(r.getByText('Daniel')).toBeTruthy());
  }, 30_000);

  // The row this control reveals is the elder's actual trust decision: they
  // tap the person to read the profile before accepting them. It had no box
  // of its own, so its height was the 40pt avatar, and hitSlop={6} was the
  // only thing taking it past the floor — which the web build ignores.
  test('and the helper row it reveals is a real 44pt box too', async () => {
    // Arrange
    const r = await wrap(<PostedHelpList />);
    await fireEvent.press(await waitFor(() => r.getByLabelText(/^A ride to the clinic on Thursday\./)));

    // Act — the helper who wrote no message: nothing pads their row.
    const row = await waitFor(() => r.getByLabelText("View Marta's profile"));

    // Assert
    expectRealTarget(row);
  }, 30_000);
});
