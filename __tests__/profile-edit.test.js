// Deep audit, Edit Profile group: DEEP-11 (picker failures die silently),
// DEEP-34 ("Change photo" clips its label at large OS text) and DEEP-38 (two
// fields defeat the memo that keeps typing smooth).
//
// All three are about the same screen an elder uses to put her face and her
// story on the platform, so they share one render tree and one set of mocks.
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import * as ImagePicker from 'expo-image-picker';
import { StyleSheet } from 'react-native';
import ProfileEdit from '../app/profile-edit';
import api from '../src/api/client';
import { ConfirmProvider } from '../src/context/ConfirmContext';
import { ToastProvider } from '../src/context/ToastContext';
import { ThemeProvider } from '../src/theme/ThemeContext';
import { fontScaleCaps } from '../src/theme/tokens';

const MIN_PILL_HEIGHT = 34;

jest.mock('react-native-reanimated', () => ({
  ...require('react-native-reanimated/mock'),
  useReducedMotion: () => true,
}));

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: () => true }),
}));

jest.mock('expo-image-picker', () => ({
  launchImageLibraryAsync: jest.fn(),
  requestMediaLibraryPermissionsAsync: jest.fn(),
  MediaTypeOptions: { Images: 'Images' },
}));

jest.mock('../src/api/client', () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn(), put: jest.fn(), delete: jest.fn() },
  friendlyWriteError: (_e, fallback) => fallback,
}));

jest.mock('../src/context/AuthContext', () => ({
  useAuth: () => ({ user: { role: 'ELDER', userId: 'me', emailVerified: true }, booted: true }),
}));

// DEEP-38 probe. Input is memo'd because every Paper field animates a floating
// label, so a field that re-renders on a keystroke somewhere else is the lag
// the memo exists to prevent. The wrapper is memo'd exactly like the real
// Input, so a count that climbs means the screen handed that field new props.
const mockInputRenders = {};
jest.mock('../src/components/ui/Input', () => {
  const React = require('react');
  const RealInput = jest.requireActual('../src/components/ui/Input').default;
  const CountingInput = (props) => {
    mockInputRenders[props.label] = (mockInputRenders[props.label] ?? 0) + 1;
    return React.createElement(RealInput, props);
  };
  return { __esModule: true, default: React.memo(CountingInput) };
});

const ELDER_ME = {
  name: 'Margaret',
  bio: 'Retired teacher.',
  interests: ['Chess', 'Gardening'],
  languages: ['English'],
  lookingFor: 'BOTH',
  hobbies: null,
  skillsOffered: null,
  city: 'Montreal',
  phone: '',
  dateOfBirth: '1953-05-14',
  occupation: '',
  gender: '',
  facebookUrl: '',
  instagramUrl: '',
  idVerified: false,
};

async function wrap() {
  // gcTime: Infinity — the default 5-min gc timer is scheduled at unmount and
  // keeps the Jest worker alive until force-exit.
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
  return await render(
    <ThemeProvider>
      <QueryClientProvider client={qc}>
        <ToastProvider>
          <ConfirmProvider>
            <ProfileEdit />
          </ConfirmProvider>
        </ToastProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

const styleOf = (node) => StyleSheet.flatten(node.props.style) ?? {};

// The form only exists once /profile/me lands.
const loaded = async (r) => waitFor(() => expect(r.getByDisplayValue('Margaret')).toBeTruthy());

beforeEach(() => {
  jest.clearAllMocks();
  for (const key of Object.keys(mockInputRenders)) delete mockInputRenders[key];
  api.get.mockResolvedValue({ data: ELDER_ME });
  api.put.mockResolvedValue({ data: {} });
  api.post.mockResolvedValue({ data: {} });
  ImagePicker.requestMediaLibraryPermissionsAsync.mockResolvedValue({ granted: true });
  ImagePicker.launchImageLibraryAsync.mockResolvedValue({ canceled: true });
});

describe('DEEP-11: a picker that will not open says so', () => {
  test('Change photo explains itself when the photo permission call rejects', async () => {
    // Arrange
    ImagePicker.requestMediaLibraryPermissionsAsync.mockRejectedValue(new Error('picker busy'));
    const r = await wrap();
    await loaded(r);

    // Act
    await fireEvent.press(r.getByLabelText('Change photo'));

    // Assert — the tap used to die here with no picker and no message.
    await waitFor(() =>
      expect(r.getByText('Could not open your photos. Please try again.')).toBeTruthy()
    );
    r.unmount();
  }, 30_000);

  test('the ID upload explains itself when the photo library rejects', async () => {
    // Arrange — the Android double-tap case: "Different ImagePicker is already in use".
    ImagePicker.launchImageLibraryAsync.mockRejectedValue(new Error('already in use'));
    const r = await wrap();
    await loaded(r);

    // Act
    await fireEvent.press(r.getByText('Upload an ID photo'));

    // Assert — ID verification is worth trust points, so a dead tap here reads
    // as "verification is impossible".
    await waitFor(() =>
      expect(r.getByText('Could not open your photos. Please try again.')).toBeTruthy()
    );
    r.unmount();
  }, 30_000);

  // The screen also ignores a second tap while the first picker is opening
  // (pickingRef), which is what raises Android's "already in use" in the first
  // place. That one is not pinned here: holding a picker open across a press
  // means two overlapping act() scopes, which this harness cannot express.
});

describe('DEEP-34: the Change photo pill survives large OS text', () => {
  test('its box can grow with the label instead of clipping it', async () => {
    // Arrange / Act
    const r = await wrap();
    await loaded(r);
    const style = styleOf(r.getByLabelText('Change photo'));

    // Assert — minHeight, not height: at 150% text the label is taller than
    // the pill was ever allowed to be.
    expect(style.height).toBeUndefined();
    expect(style.minHeight).toBeGreaterThanOrEqual(MIN_PILL_HEIGHT);
  }, 30_000);

  test('its label is capped like every other control label', async () => {
    // Arrange / Act
    const r = await wrap();
    await loaded(r);

    // Assert
    expect(r.getByText('Change photo').props.maxFontSizeMultiplier).toBe(fontScaleCaps.body);
  }, 30_000);
});

describe('DEEP-38: typing in one field leaves the other fields alone', () => {
  test('date of birth and the bio do not re-render on every keystroke elsewhere', async () => {
    // Arrange
    const r = await wrap();
    await loaded(r);
    const before = { ...mockInputRenders };

    // Act — two keystrokes in the name field.
    await fireEvent.changeText(r.getByLabelText('Full name'), 'Margaret H');
    await fireEvent.changeText(r.getByLabelText('Full name'), 'Margaret Ha');

    // Assert — the typed field re-renders (the probe is real), its neighbours
    // do not. Occupation already had a stable handler; these two did not.
    expect(mockInputRenders['Full name']).toBeGreaterThan(before['Full name']);
    expect(mockInputRenders.Occupation).toBe(before.Occupation);
    expect(mockInputRenders['Date of birth']).toBe(before['Date of birth']);
    expect(mockInputRenders['About you']).toBe(before['About you']);
  }, 30_000);

  test('the stable handlers still type and still clear their own error', async () => {
    // Arrange — a date nobody can read two ways is refused inline.
    const r = await wrap();
    await loaded(r);
    await fireEvent.changeText(r.getByLabelText('Date of birth'), '04/05/1953');
    await fireEvent.press(r.getByText('Save Changes'));
    await waitFor(() => expect(r.getByText(/reads two ways/i)).toBeTruthy());

    // Act — she corrects it.
    await fireEvent.changeText(r.getByLabelText('Date of birth'), '1953-05-14');

    // Assert — typing clears the error, and the value lands.
    await waitFor(() => expect(r.queryByText(/reads two ways/i)).toBeNull());
    expect(r.getByDisplayValue('1953-05-14')).toBeTruthy();
  }, 30_000);
});
