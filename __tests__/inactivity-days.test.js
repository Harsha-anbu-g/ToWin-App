// inactivityDays ported from the website's EmergencyContacts.jsx: the add form
// carries "Alert after (days)" (default 5, 1 to 30), the POST body sends it as
// a number, and every contact card says "Alerts after N inactive days"
// (pluralized here: the website's own card says "1 inactive days", and the
// grammar mistake is not part of the parity contract).
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

const CONTACTS = [
  { id: 'e1', name: 'Sarah', phone: '+15145550123', relationship: 'Daughter', inactivityDays: 5 },
  { id: 'e2', name: 'Raj', phone: '5145550188', relationship: '', inactivityDays: 10 },
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

// Let the contacts query settle before touching the form: firing events while
// the load is still resolving overlaps act() scopes and corrupts the render.
const settle = (r) => waitFor(() => expect(r.getByLabelText(/Call Sarah/)).toBeTruthy());

const fillRequired = async (r) => {
  await fireEvent.changeText(r.getByLabelText('Name'), 'Sarah');
  await fireEvent.changeText(r.getByLabelText('Phone number'), '+15145550123');
};

describe('inactivity days on the add form', () => {
  test('the field carries the website label, help text, and default of 5', async () => {
    // Arrange / Act
    const r = await wrap();
    await settle(r);

    // Assert - exact website label and the page's own help sentence.
    const field = r.getByLabelText('Alert after (days)');
    expect(field.props.value).toBe('5');
    expect(
      r.getByText("We'll alert this person after this many quiet days.")
    ).toBeTruthy();
  });

  test('adding a contact posts inactivityDays as a number', async () => {
    // Arrange
    const r = await wrap();
    await settle(r);
    await fillRequired(r);
    await fireEvent.changeText(r.getByLabelText('Alert after (days)'), '7');

    // Act
    await fireEvent.press(r.getByText('Add contact'));

    // Assert
    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith('/emergency/contacts', {
        name: 'Sarah',
        phone: '+15145550123',
        relationship: 'Contact',
        inactivityDays: 7,
      })
    );
  });

  test('a value outside 1 to 30 blocks the add', async () => {
    // Arrange - the website input is capped min={1} max={30}.
    const r = await wrap();
    await settle(r);
    await fillRequired(r);
    await fireEvent.changeText(r.getByLabelText('Alert after (days)'), '45');

    // Act
    await fireEvent.press(r.getByText('Add contact'));

    // Assert
    await waitFor(() => expect(r.getByText('Enter between 1 and 30 days.')).toBeTruthy());
    expect(api.post).not.toHaveBeenCalled();
  });
});

describe('inactivity days on the contact list', () => {
  test('each card says when it alerts, in the website words', async () => {
    // Arrange / Act
    const r = await wrap();

    // Assert - "Alerts after {n} inactive days".
    await waitFor(() => expect(r.getByText('Alerts after 5 inactive days')).toBeTruthy());
    expect(r.getByText('Alerts after 10 inactive days')).toBeTruthy();
  });

  test('one day reads as a day, not days', async () => {
    // Arrange - the reachable minimum of the 1-30 range.
    api.get.mockResolvedValue({ data: [{ ...CONTACTS[0], inactivityDays: 1 }] });

    // Act
    const r = await wrap();

    // Assert
    await waitFor(() => expect(r.getByText('Alerts after 1 inactive day')).toBeTruthy());
  });

  test('undo after a remove re-adds the contact with its inactivityDays', async () => {
    // Arrange
    api.delete.mockResolvedValue({});
    const r = await wrap();
    await waitFor(() => expect(r.getByLabelText('Remove Raj')).toBeTruthy());

    // Act - remove, then undo from the toast.
    await fireEvent.press(r.getByLabelText('Remove Raj'));
    await waitFor(() => expect(r.getByText('Undo')).toBeTruthy());
    await fireEvent.press(r.getByText('Undo'));

    // Assert - the re-add keeps Raj's own 10, not the default 5.
    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith(
        '/emergency/contacts',
        expect.objectContaining({ name: 'Raj', phone: '5145550188', inactivityDays: 10 })
      )
    );
  });
});
