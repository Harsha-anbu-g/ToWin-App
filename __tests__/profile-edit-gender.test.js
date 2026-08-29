// Sex is an ENUM value, not the word on the chip.
//
// The backend Gender enum is MALE | FEMALE | OTHER (case-sensitive, no
// converter), and the website sends the uppercase value from
// <option value="MALE">Male</option>. The mobile screen used the display
// string as the value, so it sent 'Male' and the whole PUT was rejected 400:
// an elder who picked their Sex lost the entire form. Both directions are
// pinned here (D2-01, 2026-08-29).
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import ProfileEdit from '../app/profile-edit';
import api from '../src/api/client';
import { ThemeProvider } from '../src/theme/ThemeContext';
import { ToastProvider } from '../src/context/ToastContext';
import { ConfirmProvider } from '../src/context/ConfirmContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

jest.mock('react-native-reanimated', () => ({
  ...require('react-native-reanimated/mock'),
  useReducedMotion: () => true,
}));

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: () => true }),
}));

jest.mock('expo-image-picker', () => ({
  launchImageLibraryAsync: jest.fn(),
  requestMediaLibraryPermissionsAsync: jest.fn(() => Promise.resolve({ granted: true })),
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

const ELDER_ME = {
  name: 'Margaret',
  bio: 'Retired teacher.',
  interests: ['Chess', 'Gardening', 'Reading'],
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
};

async function wrap(overrides = {}) {
  api.get.mockResolvedValue({ data: { ...ELDER_ME, ...overrides } });
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

beforeEach(() => {
  jest.clearAllMocks();
  api.put.mockResolvedValue({ data: {} });
});

test('picking Male sends gender as the enum value MALE, not the label', async () => {
  const r = await wrap();
  await waitFor(() => expect(r.getByDisplayValue('Margaret')).toBeTruthy());
  await fireEvent.press(r.getByLabelText('Male'));
  await fireEvent.press(r.getByText('Save Changes'));
  await waitFor(() => expect(api.put).toHaveBeenCalled());
  const elderCall = api.put.mock.calls.find(([url]) => url === '/profile/elder');
  expect(elderCall).toBeTruthy();
  expect(elderCall[1].gender).toBe('MALE');
});

test('a stored uppercase gender shows the matching chip as selected', async () => {
  const r = await wrap({ gender: 'FEMALE' });
  await waitFor(() => expect(r.getByDisplayValue('Margaret')).toBeTruthy());
  expect(r.getByLabelText('Female').props.accessibilityState.selected).toBe(true);
  expect(r.getByLabelText('Male').props.accessibilityState.selected).toBe(false);
});
