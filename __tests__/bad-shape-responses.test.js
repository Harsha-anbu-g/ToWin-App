// HARD-100, defects 1 and 2: two screens assumed a 200 carries a list.
//
// A captive portal, the sign-in page a hotel or a cafe puts in front of its
// wifi, answers any request with 200 and an HTML page. axios hands that back
// as a STRING. `contacts ?? []` and `keyholders || []` both catch null and
// undefined only, so the string sailed past the empty branch and reached .map
// and .filter, which threw mid-render. Elders on public wifi are exactly who
// this app serves, and with no error boundary the throw blanked the phone.
//
// Both screens now ask Array.isArray, the shape the codebase already uses at
// app/(tabs)/_layout.jsx:210 and in the pass-on sealed query. The test feeds
// each screen the real captive-portal body and asks for the empty state.
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { ThemeProvider } from '../src/theme/ThemeContext';
import { ToastProvider } from '../src/context/ToastContext';
import { ConfirmProvider } from '../src/context/ConfirmContext';
import api from '../src/api/client';
import EmergencyContacts from '../app/emergency-contacts';
import PassOnScreen from '../app/pass-on/index';

// What a hotel portal actually returns: 200, text/html, a sign-in page.
const CAPTIVE_PORTAL_BODY =
  '<!DOCTYPE html><html><head><title>Wi-Fi sign in</title></head>' +
  '<body><form action="/login"><input name="room" /></form></body></html>';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn(), setParams: jest.fn(), canGoBack: () => true }),
  useLocalSearchParams: () => ({}),
  useFocusEffect: (effect) => require('react').useEffect(effect, [effect]),
  Redirect: () => null,
}));

jest.mock('../src/api/client', () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn(async () => ({ data: {} })), delete: jest.fn() },
  friendlyWriteError: () => 'Something went wrong.',
  setTokenGetter: jest.fn(),
  setOnSessionExpired: jest.fn(),
}));

jest.mock('../src/context/AuthContext', () => ({
  __esModule: true,
  AuthProvider: ({ children }) => children,
  useAuth: () => ({
    user: { role: 'ELDER', userId: 'u1', emailVerified: true },
    booted: true,
    logout: jest.fn(),
  }),
}));

const wrap = (ui) =>
  render(
    <ThemeProvider>
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

test('emergency contacts shows its empty state when the wifi portal answers with a page', async () => {
  api.get.mockImplementation(async () => ({ data: CAPTIVE_PORTAL_BODY }));

  const r = await wrap(<EmergencyContacts />);

  await waitFor(() =>
    expect(r.getByText('Nobody yet. Add a family member or a trusted neighbor below.')).toBeTruthy()
  );
  // The heading is still there, which means the render pass finished rather
  // than throwing partway down the card.
  expect(r.getByText('My contacts')).toBeTruthy();
});

test('a real list still renders after the guard', async () => {
  api.get.mockImplementation(async () => ({
    data: [{ id: 'c1', name: 'Priya Nair', phone: '555 0101', relationship: 'Daughter' }],
  }));

  const r = await wrap(<EmergencyContacts />);

  await waitFor(() => expect(r.getByText('Priya Nair')).toBeTruthy());
  expect(r.queryByText('Nobody yet. Add a family member or a trusted neighbor below.')).toBeNull();
});

test('the pass-on page paints when the wifi portal answers with a page', async () => {
  api.get.mockImplementation(async () => ({ data: CAPTIVE_PORTAL_BODY }));

  const r = await wrap(<PassOnScreen />);

  // The page's own title and its empty state prove the render pass ran all the
  // way through the keyholder list rather than throwing inside it.
  await waitFor(() => expect(r.getByText('What I pass on')).toBeTruthy());
  // Its own waitFor: the title paints before the queries settle, so asserting
  // the empty state on the same tick is a race.
  await waitFor(() => expect(r.getByText(/Nothing here yet/)).toBeTruthy());
});

test('the keyholder tab shows its empty state rather than throwing on a page body', async () => {
  api.get.mockImplementation(async () => ({ data: CAPTIVE_PORTAL_BODY }));

  const r = await wrap(<PassOnScreen />);
  await waitFor(() => expect(r.getByText(/Nothing here yet/)).toBeTruthy());

  // The Sealed box is where `keys.filter(...)` runs. Reaching it at all is the
  // proof: before the guard, the string reached .filter and took the page down.
  await fireEvent.press(r.getByText('Sealed box'));
  await waitFor(() => expect(r.getByText('What I pass on')).toBeTruthy());
});
