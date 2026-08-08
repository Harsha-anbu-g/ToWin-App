// "Send me a copy of my data", pressed for real (audit finding V2).
//
// The defect this pins: profile.jsx awaited GET /account/export, DISCARDED the
// response body, and toasted "check your email" when nothing anywhere sends an
// email. A person asked for her information and nothing ever arrived.
//
// So this test does not read the source and hope. It renders the screen, opens
// "Account and data", presses the button, and asserts that what left the app
// carries a value that only the server's response body could have supplied.
// Delete the `const { data } =` and this suite fails: the copy either never
// gets made (myDataAsText refuses an empty body) or goes out without her email
// in it.
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { Share } from 'react-native';
import { AuthProvider } from '../src/context/AuthContext';
import { ConfirmProvider } from '../src/context/ConfirmContext';
import { ToastProvider } from '../src/context/ToastContext';
import { ThemeProvider } from '../src/theme/ThemeContext';
import { MY_DATA } from '../src/lib/myDataCopy';
import api from '../src/api/client';
import ProfileScreen from '../app/(tabs)/profile';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: () => true }),
  useFocusEffect: (effect) => require('react').useEffect(effect, [effect]),
  Redirect: () => null,
}));

jest.mock('../src/api/client', () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn(async () => ({ data: {} })), delete: jest.fn() },
  setTokenGetter: jest.fn(),
  setOnSessionExpired: jest.fn(),
}));

/** A real /account/export shape, trimmed. Every value here is a marker. */
const EXPORT_BODY = {
  account: { username: 'margaret', email: 'margaret@example.com', trustScore: 15 },
  passOnItems: [{ kind: 'LETTER', title: 'For Sarah', body: 'The day you were born it rained.' }],
  sealedBoxItems: [{ kind: 'MONEY', byteSize: 2048 }],
};

const FEEDS = {
  '/profile/me': { name: 'Margaret', city: 'Montreal' },
  '/trust/my-score': { total: 15 },
  '/connections': [],
  '/streaks/me': {},
  '/reviews/mine': [],
  '/account/export': EXPORT_BODY,
};

const wrap = (ui) =>
  render(
    <ThemeProvider>
      {/* gcTime: Infinity, matching screens.test.js. The default gc timer is
          scheduled at unmount and holds the Jest worker open. */}
      <QueryClientProvider
        client={new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } })}
      >
        <AuthProvider>
          <ToastProvider>
            <ConfirmProvider>{ui}</ConfirmProvider>
          </ToastProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );

/** Opens the folded account card and presses the export row. */
async function pressSendMeACopy() {
  const screen = await wrap(<ProfileScreen />);
  await act(async () => {
    fireEvent.press(screen.getByLabelText('Account and data'));
  });
  await act(async () => {
    fireEvent.press(screen.getByText('Send me a copy of my data'));
  });
  return screen;
}

let share;

beforeEach(() => {
  api.get.mockImplementation(async (url) => ({ data: FEEDS[url] ?? [] }));
  share = jest.spyOn(Share, 'share').mockResolvedValue({ action: Share.sharedAction });
});

afterEach(() => jest.restoreAllMocks());

test('the response body is what leaves the app, not a promise about email', async () => {
  // Arrange / Act
  await pressSendMeACopy();

  // Assert - the copy exists at all, and it is built from the server's answer.
  await waitFor(() => expect(share).toHaveBeenCalledTimes(1));
  const { message } = share.mock.calls[0][0];
  expect(message).toContain('margaret@example.com');
  expect(message).toContain('The day you were born it rained.');
  expect(message).toContain('Trust score: 15');
});

test('the file is named so she can find it again', async () => {
  await pressSendMeACopy();
  await waitFor(() => expect(share).toHaveBeenCalledTimes(1));
  expect(share.mock.calls[0][0].title).toBe(MY_DATA.fileName);
});

test('the Sealed box note travels with the copy, so the file does not overpromise', async () => {
  await pressSendMeACopy();
  await waitFor(() => expect(share).toHaveBeenCalledTimes(1));
  expect(share.mock.calls[0][0].message).toContain(MY_DATA.sealedBoxNote);
});

test('she is told what actually happened, and never told to check her email', async () => {
  const { findByText, queryByText } = await pressSendMeACopy();

  await findByText(MY_DATA.shared);
  expect(queryByText(/check your email/i)).toBeNull();
});

test('closing the share sheet claims nothing', async () => {
  share.mockResolvedValue({ action: Share.dismissedAction });

  const { queryByText } = await pressSendMeACopy();

  await waitFor(() => expect(share).toHaveBeenCalledTimes(1));
  expect(queryByText(MY_DATA.shared)).toBeNull();
  expect(queryByText(MY_DATA.saved)).toBeNull();
});

test('a failed export says so instead of celebrating', async () => {
  api.get.mockImplementation(async (url) => {
    if (url === '/account/export') throw new Error('offline');
    return { data: FEEDS[url] ?? [] };
  });

  const { findByText } = await pressSendMeACopy();

  await findByText(MY_DATA.failed);
  expect(share).not.toHaveBeenCalled();
});

test('an export that comes back empty is refused, never handed over as a blank file', async () => {
  api.get.mockImplementation(async (url) => ({ data: url === '/account/export' ? {} : FEEDS[url] ?? [] }));

  const { findByText } = await pressSendMeACopy();

  await findByText(MY_DATA.failed);
  expect(share).not.toHaveBeenCalled();
});
