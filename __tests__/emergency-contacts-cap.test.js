// The website's EmergencyContacts.jsx caps the list at 3: the heading counts
// "My Contacts (N/3)" and the add affordance disappears at 3 contacts. The
// app used to show the add form always and leave the 4th add to a server
// refusal; this ports the cap.
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { ThemeProvider } from '../src/theme/ThemeContext';
import { ToastProvider } from '../src/context/ToastContext';
import api from '../src/api/client';
import EmergencyContacts from '../app/emergency-contacts';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: () => true }),
  useFocusEffect: () => {},
}));

jest.mock('../src/api/client', () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn(async () => ({ data: {} })), delete: jest.fn() },
  friendlyWriteError: (_e, fallback) => fallback,
  setTokenGetter: jest.fn(),
  setOnSessionExpired: jest.fn(),
}));

const { QueryClient, QueryClientProvider } = require('@tanstack/react-query');

const contact = (id, name) => ({
  id,
  name,
  phone: '+15145550123',
  relationship: 'Daughter',
  inactivityDays: 5,
});

const wrap = () =>
  render(
    <ThemeProvider>
      <QueryClientProvider
        client={new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } })}
      >
        <ToastProvider>
          <EmergencyContacts />
        </ToastProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );

beforeEach(() => jest.clearAllMocks());

test('the heading counts contacts out of 3, like the website', async () => {
  api.get.mockResolvedValue({ data: [contact('e1', 'Sarah'), contact('e2', 'Raj')] });

  const r = await wrap();

  // Wait for the count itself: the heading is already there while the list
  // loads, and the count only joins it once the read settles.
  await waitFor(() => expect(r.getByText('(2/3)')).toBeTruthy());
});

test('under 3 contacts the add form is there', async () => {
  api.get.mockResolvedValue({ data: [contact('e1', 'Sarah')] });

  const r = await wrap();

  await waitFor(() => expect(r.getByText('Add a contact')).toBeTruthy());
  expect(r.getByText('Add contact')).toBeTruthy();
});

test('at 3 contacts the add form is gone', async () => {
  api.get.mockResolvedValue({
    data: [contact('e1', 'Sarah'), contact('e2', 'Raj'), contact('e3', 'Mei')],
  });

  const r = await wrap();

  await waitFor(() => expect(r.getByText('(3/3)')).toBeTruthy());
  expect(r.queryByText('Add a contact')).toBeNull();
  expect(r.queryByText('Add contact')).toBeNull();
});
