// A family member on their own page (owner call 2026-09-25: a name opens a page
// like WhatsApp, not a dropdown — the elder's My Family list is name-only now).
// Locks what used to live under the row: the relationship and Main contact
// label, Message (private family chat), Make main contact, and the danger
// remove confirm (DELETE only after "Remove from family"), which lands the
// elder back on the list once done.
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { ThemeProvider } from '../src/theme/ThemeContext';
import { ToastProvider } from '../src/context/ToastContext';
import { ConfirmProvider } from '../src/context/ConfirmContext';

const mockPush = jest.fn();
const mockBack = jest.fn();
let mockLinkId = 'm1';
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn(), back: mockBack, canGoBack: () => true }),
  useLocalSearchParams: () => ({ linkId: mockLinkId }),
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

jest.mock('../src/context/AuthContext', () => ({
  __esModule: true,
  AuthProvider: ({ children }) => children,
  useAuth: () => ({ user: { role: 'ELDER', userId: 'eld-1', emailVerified: true }, booted: true }),
}));

jest.mock('../src/lib/useReducedMotion', () => ({ useReducedMotion: () => true }));

import api from '../src/api/client';
import FamilyMemberPage from '../app/family/member/[linkId]';

const wrap = (ui) =>
  render(
    <ThemeProvider>
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
        <ToastProvider>
          <ConfirmProvider>{ui}</ConfirmProvider>
        </ToastProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );

const link = (over) => ({
  id: 'm1', otherUserId: 'f1', otherUserName: 'sarah', relationship: 'Daughter',
  isPrimary: false, status: 'ACTIVE', initiatedByMe: true, iAmElder: true,
  createdAt: '2026-07-01T10:00:00', respondedAt: null,
  ...over,
});
const links = {
  activeLinks: [
    link({ id: 'm1', isPrimary: true }),
    link({ id: 'm2', otherUserId: 'f2', otherUserName: 'tom', relationship: null }),
    // The caller-as-FAMILY side of a BOTH user's links — never shows here.
    link({ id: 'z1', otherUserId: 'x1', otherUserName: 'shadow', iAmElder: false }),
  ],
  incomingRequests: [],
  outgoingRequests: [],
};

beforeEach(() => {
  mockLinkId = 'm1';
  api.get.mockImplementation(async (url) => (url === '/family/links' ? { data: links } : { data: {} }));
});
afterEach(() => jest.clearAllMocks());

test('the primary member: name in the header, relationship, Main contact label, no promotion', async () => {
  const r = await wrap(<FamilyMemberPage />);

  await r.findByText('Daughter');
  r.getByText('sarah');
  r.getByText('Main contact');
  expect(r.queryByRole('button', { name: 'Make main contact' })).toBeNull();
  r.getByRole('button', { name: 'Message' });
});

test('another member: relationship falls back, and can be made the main contact', async () => {
  mockLinkId = 'm2';
  const r = await wrap(<FamilyMemberPage />);

  await r.findByText('Family member');
  expect(r.queryByText('Main contact')).toBeNull();

  await fireEvent.press(r.getByRole('button', { name: 'Make main contact' }));
  expect(api.post).toHaveBeenCalledWith('/family/links/m2/primary');
  await r.findByText('Main contact updated.');
});

test('Message opens the family chat through the server', async () => {
  api.post.mockResolvedValue({ data: 'chat-77' });
  const r = await wrap(<FamilyMemberPage />);

  await fireEvent.press(await r.findByRole('button', { name: 'Message' }));

  expect(api.post).toHaveBeenCalledWith('/family/chat/f1');
  await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/chat/chat-77'));
});

test('remove: confirm quotes the web danger message; DELETE fires only on confirm, then back to the list', async () => {
  const r = await wrap(<FamilyMemberPage />);

  await fireEvent.press(await r.findByRole('button', { name: 'Remove' }));

  await r.findByText('Remove sarah from your family?');
  r.getByText(
    "They will no longer see that you're safe or any friendship you shared. If they're your last family member here, your family trust point goes too. You can add them again later. They would need to accept again."
  );
  r.getByLabelText('Keep');
  // Opening the dialog must not delete anything on its own.
  expect(api.delete).not.toHaveBeenCalled();

  await fireEvent.press(r.getByLabelText('Remove from family'));
  expect(api.delete).toHaveBeenCalledWith('/family/links/m1');
  await r.findByText('Removed from your family.');
  await waitFor(() => expect(mockBack).toHaveBeenCalled());
});

test('remove: keeping the family member fires no DELETE and stays on the page', async () => {
  const r = await wrap(<FamilyMemberPage />);

  await fireEvent.press(await r.findByRole('button', { name: 'Remove' }));
  await r.findByText('Remove sarah from your family?');
  await fireEvent.press(r.getByLabelText('Keep'));

  await waitFor(() => expect(r.queryByText('Remove sarah from your family?')).toBeNull());
  expect(api.delete).not.toHaveBeenCalled();
  expect(mockBack).not.toHaveBeenCalled();
});

test('a member that is gone, or the family-side link, says so instead of an empty page', async () => {
  mockLinkId = 'z1';
  const shadow = await wrap(<FamilyMemberPage />);
  await shadow.findByText('This family member is not here any more.');
  expect(shadow.queryByText('shadow')).toBeNull();
  await shadow.unmount();

  mockLinkId = 'nope';
  const missing = await wrap(<FamilyMemberPage />);
  await missing.findByText('This family member is not here any more.');
});

test('the page has a visible back arrow', async () => {
  const r = await wrap(<FamilyMemberPage />);

  await fireEvent.press(await r.findByLabelText('Back'));
  expect(mockBack).toHaveBeenCalled();
});
