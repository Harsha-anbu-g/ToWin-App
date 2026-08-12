// Deep audit DEEP-04: on the Offer Help cards, the elder's name is the only way
// a helper can open the poster's profile — trust level, bio, reviews — before
// offering to help. That is the platform's core vetting step, and it was a Text
// nested inside the 14pt meta line. A nested Text takes neither minHeight nor
// hitSlop, so the tappable area was the glyph box of a 14pt string, roughly
// 17pt tall against a 44pt floor.
//
// The pin is the same contract ai-answer-controls.test.js writes for the AI
// row: a real box, measured off the resolved style. hitSlop cannot stand in for
// it — react-native-web drops hitSlop, so a target that exists only as slop
// does not exist at all on towinly.com/app/.
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { ThemeProvider } from '../src/theme/ThemeContext';
import { ToastProvider } from '../src/context/ToastContext';
import { ConfirmProvider } from '../src/context/ConfirmContext';

const MIN_TARGET = 44;

const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn(), back: jest.fn(), canGoBack: () => true }),
  useFocusEffect: () => {},
}));

jest.mock('../src/context/AuthContext', () => ({
  useAuth: () => ({ user: { role: 'HELPER', userId: 'me', emailVerified: true }, booted: true }),
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
import OfferHelpList from '../src/components/needs/OfferHelpList';

const NEED = {
  id: 'n1',
  title: 'A ride to the clinic on Thursday',
  description: 'It is a short drive, and I can be ready any time in the morning.',
  category: 'TRANSPORTATION',
  urgency: 'NORMAL',
  elderId: 'e1',
  elderName: 'Eleanor',
  createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  distanceKm: 1.2,
};

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

beforeEach(() => {
  jest.clearAllMocks();
  api.get.mockImplementation(async (url) =>
    url === '/needs/open' ? { data: { content: [NEED] } } : { data: { content: [] } }
  );
});

describe("the poster's name on an open request", () => {
  test('is a real 44pt box a helper can hit, not a nested line of text', async () => {
    // Arrange / Act
    const { getByRole } = await wrap(<OfferHelpList />);
    const name = await waitFor(() => getByRole('button', { name: 'Eleanor' }));
    const style = styleOf(name);

    // Assert — a measured box, so the target survives on the web build too.
    expect({ minHeight: style.minHeight, minWidth: style.minWidth }).toEqual({
      minHeight: expect.any(Number),
      minWidth: expect.any(Number),
    });
    expect(style.minHeight).toBeGreaterThanOrEqual(MIN_TARGET);
    expect(style.minWidth).toBeGreaterThanOrEqual(MIN_TARGET);
    expect(style.justifyContent).toBe('center');
  }, 30_000);

  test('still opens that elder profile when tapped', async () => {
    // Arrange
    const { getByRole } = await wrap(<OfferHelpList />);
    const name = await waitFor(() => getByRole('button', { name: 'Eleanor' }));

    // Act
    await fireEvent.press(name);

    // Assert — same destination, announced as a button because the route
    // change stays inside the app.
    expect(mockPush).toHaveBeenCalledWith('/user/e1');
  }, 30_000);
});
