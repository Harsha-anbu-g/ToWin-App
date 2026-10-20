// AI step 7: the helper can only PROPOSE the daily check-in. The person
// confirms with the native dialog, and the app's own checkInToday (src/api/
// streaks.js) does the writing. No means nothing is sent.
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render } from '@testing-library/react-native';
import { ThemeProvider } from '../src/theme/ThemeContext';
import { ToastProvider } from '../src/context/ToastContext';
import { ConfirmProvider } from '../src/context/ConfirmContext';
import { AuthProvider } from '../src/context/AuthContext';
import AskAiAssistant from '../src/components/AskAiAssistant';
import { checkInToday } from '../src/api/streaks';

const mockRouter = { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: () => true };

jest.mock('expo-router', () => ({
  usePathname: () => '/home',
  useRouter: () => mockRouter,
}));

jest.mock('expo-speech', () => ({ speak: jest.fn(), stop: jest.fn() }));

jest.mock('../src/lib/aiConsent', () => ({
  hasAiConsent: jest.fn(async () => true),
  grantAiConsent: jest.fn(async () => {}),
}));

jest.mock('../src/api/client', () => ({
  __esModule: true,
  default: { post: jest.fn(async () => ({ data: {} })), get: jest.fn(async () => ({ data: [] })) },
  setTokenGetter: jest.fn(),
  setOnSessionExpired: jest.fn(),
}));

jest.mock('../src/api/ai', () => ({
  askAssistant: jest.fn(async () => ({
    reply: 'The app will ask you to confirm.',
    action: { name: 'check_in', arguments: {} },
  })),
}));

jest.mock('../src/api/streaks', () => ({
  checkInToday: jest.fn(async () => ({ currentStreak: 4, longestStreak: 9, alreadyCheckedIn: true })),
  getMyStreak: jest.fn(async () => ({ currentStreak: 3, longestStreak: 9, alreadyCheckedIn: false })),
}));

const wrap = () =>
  render(
    <ThemeProvider>
      <QueryClientProvider
        client={new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } })}
      >
        <AuthProvider>
          <ToastProvider>
            <ConfirmProvider>
              <AskAiAssistant />
            </ConfirmProvider>
          </ToastProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );

/** Opens the helper, asks to be checked in, and waits for the proposal to land. */
async function askToBeCheckedIn() {
  const view = await wrap();
  await act(async () => {
    fireEvent.press(view.getByLabelText('Ask AI, your Towinly helper'));
  });
  await act(async () => {
    fireEvent.changeText(view.getByLabelText('Your question'), 'Check me in please');
  });
  await act(async () => {
    fireEvent.press(view.getByLabelText('Send question'));
  });
  return view;
}

beforeEach(() => {
  checkInToday.mockClear();
});

test('a proposed check-in asks first, and a Yes calls the app\'s own checkInToday', async () => {
  const view = await askToBeCheckedIn();

  await view.findByText('Check in today?');
  expect(checkInToday).not.toHaveBeenCalled();

  await act(async () => {
    fireEvent.press(view.getByText('Yes, check in'));
  });

  expect(checkInToday).toHaveBeenCalledTimes(1);
  await view.findByText('Done. You are checked in for today.');
});

test('Not now sends nothing and shows no done bubble', async () => {
  const view = await askToBeCheckedIn();

  await view.findByText('Check in today?');
  await act(async () => {
    fireEvent.press(view.getByText('Not now'));
  });

  expect(checkInToday).not.toHaveBeenCalled();
  expect(view.queryByText('Done. You are checked in for today.')).toBeNull();
});
