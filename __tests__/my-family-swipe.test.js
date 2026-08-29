// Owner call 2026-08-17 (iOS feel): swiping the content steps the segments,
// like flicking between pages. My Family was the last segmented screen without
// it: guide, pass-on, messages, posted help and the trust panels all swipe.
// The gesture is simulated the way PanResponder reads it, through the
// responder props on the host View and a touchHistory it can do the maths on.
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, waitFor } from '@testing-library/react-native';
import { ThemeProvider } from '../src/theme/ThemeContext';
import { ToastProvider } from '../src/context/ToastContext';
import { ConfirmProvider } from '../src/context/ConfirmContext';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: () => true }),
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
jest.mock('react-native-safe-area-context', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
    SafeAreaView: ({ children, ...props }) => React.createElement(View, props, children),
  };
});

import api from '../src/api/client';
import MyFamilyScreen from '../app/family/index';

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

const member = {
  id: 'm1', otherUserId: 'f1', otherUserName: 'sarah', relationship: 'Daughter',
  isPrimary: true, status: 'ACTIVE', initiatedByMe: true, iAmElder: true,
  createdAt: '2026-07-01T10:00:00', respondedAt: null,
};

// One finger, moving from x=200 to x=80: PanResponder reads dx off the
// touchHistory (current minus previous page X), so both are spelled out.
const touch = (pageX, ts, previousPageX) => ({
  nativeEvent: { touches: [{ pageX, pageY: 100 }], pageX, pageY: 100, timestamp: ts },
  touchHistory: {
    numberActiveTouches: 1,
    indexOfSingleActiveTouch: 0,
    mostRecentTimeStamp: ts,
    touchBank: [
      {
        touchActive: true,
        startPageX: 200, startPageY: 100, startTimeStamp: 1,
        currentPageX: pageX, currentPageY: 100, currentTimeStamp: ts,
        previousPageX, previousPageY: 100, previousTimeStamp: ts - 1,
      },
    ],
  },
});

const firstSwipeHost = (el) => {
  if (el?.props?.onResponderRelease && el?.props?.onMoveShouldSetResponder) return el;
  for (const child of el?.children ?? []) {
    if (typeof child === 'string') continue;
    const hit = firstSwipeHost(child);
    if (hit) return hit;
  }
  return null;
};

const swipeLeft = async (host) => {
  await act(async () => {
    host.props.onResponderGrant(touch(200, 2, 200));
    host.props.onResponderMove(touch(80, 3, 200));
    host.props.onResponderRelease(touch(80, 4, 80));
  });
};

beforeEach(() => {
  jest.clearAllMocks();
  api.get.mockImplementation(async (url) => {
    if (url === '/family/links') {
      return { data: { activeLinks: [member], incomingRequests: [], outgoingRequests: [] } };
    }
    if (url === '/connections') return { data: [] };
    return { data: {} };
  });
});

test('a swipe to the left on Controls opens My family', async () => {
  const r = await wrap(<MyFamilyScreen />);
  // Controls is the landing pane; its intro line proves it rendered.
  await waitFor(() => expect(r.getByText(/Sharing is what your family can see/)).toBeTruthy());
  expect(r.queryByText('sarah')).toBeNull();

  const host = firstSwipeHost(r.root);
  expect(host).not.toBeNull();
  await swipeLeft(host);

  // The member list is the My family pane.
  await waitFor(() => expect(r.getByText('sarah')).toBeTruthy());
});

test('a short drag is not a swipe', async () => {
  const r = await wrap(<MyFamilyScreen />);
  await waitFor(() => expect(r.getByText(/Sharing is what your family can see/)).toBeTruthy());
  const host = firstSwipeHost(r.root);
  await act(async () => {
    host.props.onResponderGrant(touch(200, 2, 200));
    host.props.onResponderMove(touch(180, 3, 200));
    host.props.onResponderRelease(touch(180, 4, 180));
  });
  expect(r.queryByText('sarah')).toBeNull();
  expect(r.getByText(/Sharing is what your family can see/)).toBeTruthy();
});
