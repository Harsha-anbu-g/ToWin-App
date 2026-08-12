// Elder "what I'm looking for" is an ENUM, not a tag list.
//
// The backend's LookingForType is FRIENDSHIP | HELP | BOTH and /profile/me
// returns it as a bare string ("BOTH"). The screen treated it like the
// helper's `hobbies` array and called .join(', ') on it, so Edit Profile
// threw "join is not a function" and rendered a white screen for EVERY
// elder. Saving had the mirror bug: it sent an array where the enum was
// expected. Both directions are pinned here.
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

// Exactly what the live API returns for the demo elder: lookingFor is a
// STRING, the neighbouring list fields are arrays.
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

async function wrap() {
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
  api.get.mockResolvedValue({ data: ELDER_ME });
  api.put.mockResolvedValue({ data: {} });
});

test('an elder can open Edit Profile when lookingFor is a plain enum string', async () => {
  const r = await wrap();
  // The crash rendered nothing at all, so the presence of the name field is
  // the real signal that the screen survived its prefill.
  await waitFor(() => expect(r.getByDisplayValue('Margaret')).toBeTruthy());
});

test('the stored choice shows as selected, not as typed text', async () => {
  const r = await wrap();
  await waitFor(() => expect(r.getByDisplayValue('Margaret')).toBeTruthy());
  const both = r.getByLabelText('Both');
  expect(both.props.accessibilityState.selected).toBe(true);
  expect(r.getByLabelText('Friendship').props.accessibilityState.selected).toBe(false);
});

test('saving sends lookingFor as the enum string the backend accepts', async () => {
  const r = await wrap();
  await waitFor(() => expect(r.getByDisplayValue('Margaret')).toBeTruthy());
  await fireEvent.press(r.getByLabelText('Help with things'));
  await fireEvent.press(r.getByText('Save Changes'));
  await waitFor(() => expect(api.put).toHaveBeenCalled());
  const elderCall = api.put.mock.calls.find(([url]) => url === '/profile/elder');
  expect(elderCall).toBeTruthy();
  expect(elderCall[1].lookingFor).toBe('HELP');
  // The interests list stays a real array: only lookingFor changed shape.
  expect(Array.isArray(elderCall[1].interests)).toBe(true);
});

test('the choice is a single-choice group for screen readers', async () => {
  const r = await wrap();
  await waitFor(() => expect(r.getByDisplayValue('Margaret')).toBeTruthy());
  const group = r.getByLabelText("What I'm looking for");
  expect(group.props.accessibilityRole).toBe('radiogroup');
  expect(r.getByLabelText('Both').props.accessibilityRole).toBe('radio');
});
