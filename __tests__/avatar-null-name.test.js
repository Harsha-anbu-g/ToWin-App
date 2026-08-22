// HARD-099, bug 1: a null name threw during render and blanked the app.
//
// `function initialsOf(name = '')` looks safe and is not. A JavaScript default
// parameter fires on undefined and NOT on null, so a null name walked straight
// into .trim() and threw a TypeError inside a render pass.
//
// The API really does send it. Registration on the backend never sets
// fullName, the column is nullable, and ProfileResponse carries no
// @JsonInclude(NON_NULL), so `"name": null` is a normal payload. Twelve-plus
// screens hand a server field to <Avatar name={...}> straight, and
// `profile?.name` does not help: the optional chain guards a missing OBJECT,
// never a null FIELD.
//
// So this file pins two things. The component survives every shape a name can
// arrive in, and the two screens that show somebody's face still paint when
// the name is null.
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, waitFor } from '@testing-library/react-native';
import { ThemeProvider } from '../src/theme/ThemeContext';
import { ToastProvider } from '../src/context/ToastContext';
import { ConfirmProvider } from '../src/context/ConfirmContext';
import api from '../src/api/client';
import Avatar from '../src/components/ui/Avatar';
import ProfileScreen from '../app/(tabs)/profile';
import UserProfileScreen from '../app/user/[id]';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: () => true }),
  useLocalSearchParams: () => ({ id: 'u2' }),
  useFocusEffect: (effect) => require('react').useEffect(effect, [effect]),
  Redirect: () => null,
}));

jest.mock('../src/api/client', () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn(async () => ({ data: {} })), delete: jest.fn() },
  friendlyWriteError: () => 'Something went wrong.',
  setTokenGetter: jest.fn(),
  setOnSessionExpired: jest.fn(),
}));

jest.mock('../src/context/AuthContext', () => ({
  __esModule: true,
  AuthProvider: ({ children }) => children,
  useAuth: () => ({
    user: { role: 'ELDER', userId: 'u1', emailVerified: true },
    booted: true,
    logout: jest.fn(),
  }),
}));

const wrap = (ui) =>
  render(
    <ThemeProvider>
      {/* gcTime: Infinity: the default 5-min gc timer is scheduled at unmount
          and keeps the Jest worker alive until force-exit. */}
      <QueryClientProvider
        client={new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } })}
      >
        <ToastProvider>
          <ConfirmProvider>{ui}</ConfirmProvider>
        </ToastProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );

afterEach(() => jest.clearAllMocks());

// ---------- the component, one shape at a time ----------

// Rendering rather than calling initialsOf directly: the function is private
// and the crash happened in a render pass, so the render IS the subject. The
// avatar's JSON tree is read for the initials because an empty string cannot
// be found by a text query, and empty is exactly the case that used to throw.
const avatarTree = async (name) => (await render(
  <ThemeProvider>
    <Avatar name={name} />
  </ThemeProvider>
)).toJSON();

const initialsIn = (tree) => {
  const initialsNode = tree.children?.[0];
  const kids = initialsNode?.children;
  return Array.isArray(kids) ? kids.join('') : (kids ?? '');
};

const initialsShown = async (name) => initialsIn(await avatarTree(name));

test('a null name renders instead of throwing', async () => {
  await expect(avatarTree(null)).resolves.toBeTruthy();
  expect(await initialsShown(null)).toBe('');
});

test('undefined, empty and blank names all render empty initials', async () => {
  expect(await initialsShown(undefined)).toBe('');
  expect(await initialsShown('')).toBe('');
  expect(await initialsShown('   ')).toBe('');
});

test('a normal name gives two initials and a single word gives one', async () => {
  expect(await initialsShown('Jane Doe')).toBe('JD');
  expect(await initialsShown('Jane')).toBe('J');
  // Three words still stop at two, the behaviour that was already there.
  expect(await initialsShown('Mary Anne Smith')).toBe('MA');
});

test('a number and an object return a string rather than throwing', async () => {
  expect(await initialsShown(42)).toBe('4');
  // Deliberately empty: "[O", from "[object Object]", would be worse than
  // nothing on somebody's profile.
  expect(await initialsShown({ name: 'Jane' })).toBe('');
  expect(await initialsShown(['Jane'])).toBe('');
  expect(await initialsShown(true)).toBe('');
});

test('a null name leaves no accessibility label for the screen reader to read out', async () => {
  const tree = await avatarTree(null);
  expect(tree.props.accessibilityRole).toBe('image');
  expect(tree.props.accessibilityLabel).toBeUndefined();
});

test('a real name is still announced by name', async () => {
  const r = await render(
    <ThemeProvider>
      <Avatar name="Jane Doe" />
    </ThemeProvider>
  );
  expect(r.getByLabelText('Jane Doe')).toBeTruthy();
});

// ---------- the screens, with the payload the server actually sends ----------

test('the Profile tab paints when the server sends a null name', async () => {
  api.get.mockImplementation(async (url) => {
    if (url === '/profile/me') return { data: { name: null, photoUrl: null, city: null } };
    if (url === '/trust/my-score') return { data: { totalScore: 3 } };
    if (url === '/streaks/me') return { data: { currentStreak: 0 } };
    return { data: [] };
  });
  const r = await wrap(<ProfileScreen />);
  // The identity card is what carries the avatar, so its arrival is the proof
  // that the render pass ran all the way through the null name.
  await waitFor(() => expect(r.getAllByRole('image').length).toBeGreaterThan(0));
  expect(r.getByText('Profile')).toBeTruthy();
});

test('a user profile paints when that person has a null name', async () => {
  api.get.mockImplementation(async (url) => {
    if (url === '/profile/u2') {
      return { data: { id: 'u2', name: null, role: 'HELPER', trustScore: 5 } };
    }
    return { data: [] };
  });
  const r = await wrap(<UserProfileScreen />);
  await waitFor(() => expect(r.getAllByRole('image').length).toBeGreaterThan(0));
});
