// Deep audit DEEP-08, the "targets-screens" group: three controls on two
// screens whose 44pt promise was made entirely of hitSlop.
//
//   app/profile-edit.jsx  "Change photo"        34pt box + 6pt slop
//   app/friends/index.jsx  Connect / Requested  34pt box + 6pt slop
//   app/friends/index.jsx  the km distance pills 36pt box + 4pt slop
//
// react-native-web never implements hitSlop, so at towinly.com/app/ each of
// these is its raw box and the design law's 44pt floor silently fails. The pin
// is therefore a measured box, the same contract tap-target-offer-help.test.js
// and ui-web-parity.test.js write: a hitSlop prop would read as a pass here and
// then vanish in the browser.
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import * as ImagePicker from 'expo-image-picker';
import { StyleSheet } from 'react-native';
import { ThemeProvider } from '../src/theme/ThemeContext';
import { ToastProvider } from '../src/context/ToastContext';
import { ConfirmProvider } from '../src/context/ConfirmContext';

// Owner call 2026-08-17 (normal density): the visual box floor is 36pt —
// ordinary app chip height. The box must still be real (measured minHeight,
// never hitSlop, because react-native-web drops hitSlop).
const MIN_TARGET = 36;

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: () => true }),
  useFocusEffect: () => {},
  Redirect: () => null,
}));

jest.mock('expo-image-picker', () => ({
  launchImageLibraryAsync: jest.fn(),
  requestMediaLibraryPermissionsAsync: jest.fn(),
  MediaTypeOptions: { Images: 'Images' },
}));

jest.mock('../src/api/client', () => ({
  __esModule: true,
  default: {
    get: jest.fn(async () => ({ data: [] })),
    post: jest.fn(async () => ({ data: {} })),
    put: jest.fn(async () => ({ data: {} })),
    delete: jest.fn(async () => ({ data: {} })),
  },
  friendlyWriteError: (_e, fallback) => fallback,
  setTokenGetter: jest.fn(),
  setOnSessionExpired: jest.fn(),
}));

jest.mock('../src/context/AuthContext', () => ({
  __esModule: true,
  AuthProvider: ({ children }) => children,
  useAuth: () => ({ user: { role: 'ELDER', userId: 'me', emailVerified: true }, booted: true }),
}));

// The avatar is what sets the height of a person row, so the Connect chip only
// grows that row if it outgrows the avatar. The stub records the size the row
// asks for and draws nothing, so the name it would echo cannot collide with the
// row's own name text.
const mockAvatar = { size: 0 };
jest.mock('../src/components/ui/Avatar', () => {
  return function AvatarStub(props) {
    mockAvatar.size = props.size ?? 0;
    return null;
  };
});

import api from '../src/api/client';
import FriendsScreen from '../app/friends/index';
import ProfileEdit from '../app/profile-edit';

const ELDER_ME = {
  name: 'Margaret',
  bio: 'Retired teacher.',
  interests: ['Chess'],
  languages: ['English'],
  lookingFor: 'BOTH',
  city: 'Montreal',
  phone: '',
  dateOfBirth: '1953-05-14',
  occupation: '',
  gender: '',
  facebookUrl: '',
  instagramUrl: '',
  idVerified: false,
};

// An elder discovers helpers; nobody is connected yet, so the trailing chip on
// each row is the Connect one.
const HELPERS = [{ userId: 'p1', name: 'Arun', trustScore: 12, distanceKm: 2 }];

const FEEDS = {
  '/profile/me': ELDER_ME,
  '/discover/helpers': HELPERS,
  '/connections': [],
};

const wrap = (ui) =>
  render(
    <ThemeProvider>
      {/* gcTime: Infinity — the default 5-min gc timer is scheduled at unmount
          and keeps the Jest worker alive until force-exit. */}
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

const styleOf = (node) => StyleSheet.flatten(node.props.style) ?? {};

beforeEach(() => {
  jest.clearAllMocks();
  mockAvatar.size = 0;
  api.get.mockImplementation(async (url) => ({ data: FEEDS[url] ?? [] }));
});

// ---------------------------------------------------------------------------
// profile-edit.jsx — "Change photo"
//
// The pill sits alone under the 72pt avatar in a centered column, so its box is
// free to grow: nothing sits beside it to crowd.
// ---------------------------------------------------------------------------
describe('DEEP-08: the Change photo pill on Edit Profile', () => {
  const loaded = async (r) => waitFor(() => expect(r.getByDisplayValue('Margaret')).toBeTruthy());

  test('is a real 44pt box, not 34pt propped up by slop the browser drops', async () => {
    // Arrange / Act
    const r = await wrap(<ProfileEdit />);
    await loaded(r);
    const style = styleOf(r.getByLabelText('Change photo'));

    // Assert — measured, and still a minimum so 200% OS text can grow it.
    expect(style.minHeight).toBeGreaterThanOrEqual(MIN_TARGET);
    expect(style.height).toBeUndefined();
    r.unmount();
  }, 30_000);

  test('still opens the photo library when tapped', async () => {
    // Arrange
    ImagePicker.requestMediaLibraryPermissionsAsync.mockResolvedValue({ granted: true });
    ImagePicker.launchImageLibraryAsync.mockResolvedValue({ canceled: true });
    const r = await wrap(<ProfileEdit />);
    await loaded(r);

    // Act
    await fireEvent.press(r.getByLabelText('Change photo'));

    // Assert
    await waitFor(() => expect(ImagePicker.launchImageLibraryAsync).toHaveBeenCalledTimes(1));
    r.unmount();
  }, 30_000);
});

// ---------------------------------------------------------------------------
// friends/index.jsx — the Connect / Requested chip
//
// It is the trailing slot of a person row whose height comes from the 48pt
// avatar beside it, so a 44pt chip changes nothing about the row.
// ---------------------------------------------------------------------------
describe('DEEP-08: the Connect chip on Add Friends', () => {
  const shown = async (r) => waitFor(() => expect(r.getByRole('button', { name: 'Connect' })).toBeTruthy());

  test('is a real 44pt box, not 34pt propped up by slop the browser drops', async () => {
    // Arrange / Act
    const r = await wrap(<FriendsScreen />);
    await shown(r);
    const style = styleOf(r.getByRole('button', { name: 'Connect' }));

    // Assert
    expect(style.minHeight).toBeGreaterThanOrEqual(MIN_TARGET);
    expect(style.height).toBeUndefined();
    r.unmount();
  }, 30_000);

  test('still fits inside the avatar that sets the row height, so no row grows', async () => {
    // Arrange / Act
    const r = await wrap(<FriendsScreen />);
    await shown(r);
    const style = styleOf(r.getByRole('button', { name: 'Connect' }));

    // Assert — 44pt avatar, 36pt chip (normal density): the row keeps the
    // height the avatar draws.
    expect(mockAvatar.size).toBe(44);
    expect(style.minHeight).toBeLessThanOrEqual(mockAvatar.size);
    r.unmount();
  }, 30_000);

  test('still asks before sending a request that cannot be withdrawn', async () => {
    // Arrange
    const r = await wrap(<FriendsScreen />);
    await shown(r);

    // Act — not awaited: the handler's promise settles only when the dialog is
    // answered, so awaiting the press here would wait for the tap it is about
    // to check for (the confirm.test.js pattern).
    fireEvent.press(r.getByRole('button', { name: 'Connect' }));

    // Assert
    await r.findByText('Send a friend request?');
    r.unmount();
  }, 30_000);
});

// ---------------------------------------------------------------------------
// friends/index.jsx — the km distance pills
//
// Five pills wrap in a row with an 8pt gap, which is exactly why the target has
// to be the box: horizontal slop would swallow that gap and let a tap land on
// the wrong distance. Height is free — the row is a FlatList header.
// ---------------------------------------------------------------------------
describe('DEEP-08: the distance pills on Add Friends', () => {
  const KM = [5, 10, 25, 50, 100];

  const shown = async (r) => waitFor(() => expect(r.getByLabelText('25 kilometers')).toBeTruthy());

  test('every pill is a real 44pt box, not 36pt propped up by slop', async () => {
    // Arrange / Act
    const r = await wrap(<FriendsScreen />);
    await shown(r);

    // Assert
    for (const km of KM) {
      const style = styleOf(r.getByLabelText(`${km} kilometers`));
      expect(style.minHeight).toBeGreaterThanOrEqual(MIN_TARGET);
      expect(style.height).toBeUndefined();
      // Still fully round at the taller size, or the row reads as a strip of
      // boxes instead of the pill row it has always been.
      expect(style.borderRadius * 2).toBeGreaterThanOrEqual(style.minHeight);
    }
    r.unmount();
  }, 30_000);

  test('tapping a pill still picks that distance', async () => {
    // Arrange
    const r = await wrap(<FriendsScreen />);
    await shown(r);

    // Act
    await fireEvent.press(r.getByLabelText('50 kilometers'));

    // Assert — CHECKED, not selected. Nothing here sets accessibilityState by
    // hand, so under the native renderer this can only be true because RN 0.81
    // folded the source's aria-checked in: the same prop the web build forwards
    // to the DOM (SHIP-606, the radiogroup.test.js reading).
    await waitFor(() =>
      expect(r.getByLabelText('50 kilometers').props.accessibilityState.checked).toBe(true)
    );
    expect(r.getByLabelText('25 kilometers').props.accessibilityState.checked).toBe(false);
    r.unmount();
  }, 30_000);
});
