// "These are the people to reach quickly if something ever happens" was written
// on a screen where nothing could reach anybody: the numbers were plain text,
// the SOS button has been hidden app-wide since 2026-07-17 (app/(tabs)/home.jsx
// :160), and the only thing that ever reaches a contact by itself is the
// first-meet text message (ToWin/backend TrustService.java:123 calling
// SosService.notifyFirstMeet, which sends one SMS per contact).
//
// So the screen now does what its own sentence promises: each contact is one
// tap from a call, and the sentence says both what the tap does and what
// Towinly sends on its own. HARD-112.
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { Linking } from 'react-native';
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

const CONTACTS = [
  { id: 'e1', name: 'Sarah', phone: '+15145550123', relationship: 'Daughter' },
  { id: 'e2', name: 'Raj', phone: '5145550188', relationship: '' },
];

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

beforeEach(() => {
  jest.clearAllMocks();
  api.get.mockResolvedValue({ data: CONTACTS });
});

describe('an emergency contact is one tap from a call', () => {
  test('each contact carries a call control naming the person', async () => {
    // Arrange / Act
    const r = await wrap();

    // Assert - the name is in the label because a screen reader user picking
    // between two contacts hears the name, not a run of digits first.
    await waitFor(() => expect(r.getByLabelText(/Call Sarah/)).toBeTruthy());
    expect(r.getByLabelText(/Call Raj/)).toBeTruthy();
  });

  test('pressing it dials that contact', async () => {
    // Arrange
    const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    const r = await wrap();
    await waitFor(() => expect(r.getByLabelText(/Call Sarah/)).toBeTruthy());

    // Act
    await fireEvent.press(r.getByLabelText(/Call Sarah/));

    // Assert - the stored number, untouched.
    await waitFor(() => expect(openURL).toHaveBeenCalledWith('tel:+15145550123'));
    openURL.mockRestore();
  });

  test('a phone that cannot dial hands the number back instead of doing nothing', async () => {
    // Arrange - a tablet, a desktop browser, or a device with no dialer. The
    // press must never be a dead tap: the person is trying to reach somebody.
    const openURL = jest.spyOn(Linking, 'openURL').mockRejectedValue(new Error('no handler'));
    const r = await wrap();
    await waitFor(() => expect(r.getByLabelText(/Call Raj/)).toBeTruthy());

    // Act
    await fireEvent.press(r.getByLabelText(/Call Raj/));

    // Assert - the toast carries the number so it can be dialled by hand.
    await waitFor(() => expect(r.getAllByText(/5145550188/).length).toBeGreaterThan(1));
    openURL.mockRestore();
  });

  test('the screen promises only what it and the backend actually do', async () => {
    // Arrange / Act
    const r = await wrap();

    // Assert - the tap is named, and the one thing Towinly sends on its own is
    // named. No SOS button is promised: it is not mounted anywhere.
    await waitFor(() => expect(r.getByText(/Tap a name to call/)).toBeTruthy());
    expect(r.getByText(/in person for the first time/)).toBeTruthy();
    expect(r.queryByText(/SOS/)).toBeNull();
  });
});
