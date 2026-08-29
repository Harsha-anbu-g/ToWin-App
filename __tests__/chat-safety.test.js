/**
 * Apple guideline 1.2 expects the abuse path to sit with the content. The chat
 * thread had neither control on it: the only way out was the header row, which
 * pushes the profile screen, so a person being harassed had to leave the
 * conversation to do anything about it. APS-06.
 *
 * The thread runs the same handlers the profile screen runs
 * (src/lib/useSafetyActions.js), so these tests check the two things a second
 * screen can still get wrong: that the controls are reachable from inside the
 * thread, and that they fire the real writes rather than a copy of them.
 *
 * Both platform branches are exercised. Under jest Platform.OS is ios, which
 * is the ActionSheetIOS path, so the in-screen path is driven by a test that
 * re-mocks the platform.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { ActionSheetIOS } from 'react-native';
import ChatThread from '../app/chat/[connectionId]';
import { ConfirmProvider } from '../src/context/ConfirmContext';
import { ToastProvider } from '../src/context/ToastContext';
import { ThemeProvider } from '../src/theme/ThemeContext';
import {
  BLOCK_ACTION,
  NEVER_MIND,
  REPORT_ACTION,
  REPORT_REASONS,
} from '../src/lib/useSafetyActions';
import { clearDrafts } from '../src/lib/chatDrafts';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: () => false }),
  useFocusEffect: () => {},
  useLocalSearchParams: () => ({ connectionId: 'c1' }),
}));

jest.mock('../src/api/client', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(async () => ({ data: {} })),
    delete: jest.fn(async () => ({ data: {} })),
  },
  setTokenGetter: jest.fn(),
  setOnSessionExpired: jest.fn(),
  friendlyWriteError: (_e, fallback) => fallback,
}));

jest.mock('../src/context/AuthContext', () => ({
  __esModule: true,
  AuthProvider: ({ children }) => children,
  useAuth: () => ({ user: { role: 'ELDER', userId: 'me', emailVerified: true }, booted: true }),
}));

// The block writes through the shared list; the thread must call the real one,
// not a second copy of the same idea.
jest.mock('../src/lib/blockList', () => ({
  __esModule: true,
  blockUser: jest.fn(async () => {}),
  unblockUser: jest.fn(async () => {}),
  getBlocked: jest.fn(async () => []),
  isBlocked: () => false,
}));

import api from '../src/api/client';
import { blockUser } from '../src/lib/blockList';

const conn = {
  id: 'c1',
  otherUserId: 'u1',
  otherUserName: 'Priya',
  otherUserRole: 'HELPER',
  type: 'HELP',
  status: 'ACTIVE',
  currentTrustLevel: 'MESSAGING',
  confirmedByMe: false,
  confirmedByOther: false,
  sharedWithFamily: false,
};

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

const openThread = async () => {
  api.get.mockImplementation((url) => {
    if (url === '/connections') return Promise.resolve({ data: [conn] });
    if (String(url).startsWith('/messages/c1')) return Promise.resolve({ data: { content: [] } });
    return Promise.resolve({ data: {} });
  });
  const r = await wrap(<ChatThread />);
  await r.findByLabelText('Report or block Priya');
  return r;
};

/** The last set of options ActionSheetIOS was shown, and its callback. */
const lastSheet = () => {
  const calls = ActionSheetIOS.showActionSheetWithOptions.mock.calls;
  return calls[calls.length - 1];
};

const reports = () => api.post.mock.calls.filter(([url]) => url === '/reports');

beforeEach(() => {
  clearDrafts();
  jest.clearAllMocks();
  jest.spyOn(ActionSheetIOS, 'showActionSheetWithOptions').mockImplementation(() => {});
});

afterEach(() => jest.restoreAllMocks());

describe('the safety control in the chat header', () => {
  test('is reachable by a screen reader and names both actions', async () => {
    // Arrange + Act
    const r = await openThread();

    // Assert - one control, spoken, saying what it does.
    const control = r.getByLabelText('Report or block Priya');
    expect(control.props.accessibilityRole).toBe('button');
  });

  test('is at least 44pt, so a shaking hand can hit it', async () => {
    // Arrange
    const r = await openThread();

    // Act
    const style = r.getByLabelText('Report or block Priya').props.style;
    const flat = Array.isArray(style) ? Object.assign({}, ...style) : style;

    // Assert
    expect(flat.minWidth).toBeGreaterThanOrEqual(44);
    expect(flat.minHeight).toBeGreaterThanOrEqual(44);
  });

  test('offers Report and Block without leaving the thread', async () => {
    // Arrange
    const r = await openThread();

    // Act
    await fireEvent.press(r.getByLabelText('Report or block Priya'));

    // Assert - the menu is the platform sheet, carrying the profile screen words.
    const [options] = lastSheet();
    expect(options.options).toEqual([REPORT_ACTION, BLOCK_ACTION, NEVER_MIND]);
  });

  test('Report asks what went wrong and sends the reason', async () => {
    // Arrange
    const r = await openThread();
    await fireEvent.press(r.getByLabelText('Report or block Priya'));

    // Act - pick Report, then pick the first reason from the sheet it opens.
    const [, onMenu] = lastSheet();
    await onMenu(0);
    await waitFor(() => expect(lastSheet()[0].options).toContain(REPORT_REASONS[0]));
    const [, onReason] = lastSheet();
    await onReason(0);

    // Assert - the same call the profile screen makes, same body.
    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith('/reports', {
        reportedUserId: 'u1',
        reason: REPORT_REASONS[0],
        description: REPORT_REASONS[0],
      })
    );
  });

  test('Block asks first, and blocks through the shared list', async () => {
    // Arrange
    const r = await openThread();
    await fireEvent.press(r.getByLabelText('Report or block Priya'));

    // Act
    const [, onMenu] = lastSheet();
    await onMenu(1);
    await waitFor(() => expect(r.getByText(`Block Priya?`)).toBeTruthy());
    await fireEvent.press(r.getByText('Block'));

    // Assert - the account's list, not the phone's, and the friendship ends.
    await waitFor(() => expect(blockUser).toHaveBeenCalledWith('me', { id: 'u1', name: 'Priya' }));
    await waitFor(() => expect(api.delete).toHaveBeenCalledWith('/connections/c1'));
    expect(reports()).toHaveLength(0);
  });

  test('Never mind does nothing at all', async () => {
    // Arrange
    const r = await openThread();
    await fireEvent.press(r.getByLabelText('Report or block Priya'));

    // Act
    const [, onMenu] = lastSheet();
    await onMenu(2);

    // Assert
    expect(blockUser).not.toHaveBeenCalled();
    expect(reports()).toHaveLength(0);
  });
});
