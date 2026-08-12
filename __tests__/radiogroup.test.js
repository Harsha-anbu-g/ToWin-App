// Single-choice chip rows: one question, one answer, said out loud.
//
// The app already speaks radio properly where it drew its own cards
// (RadioCards, PersonPicker, the signup role picker). The chip rows never
// caught up: "Kind of help", "How soon?", "Sex" and the Sealed box's kind
// chips are each a set of mutually-exclusive options rendered as a row of
// plain buttons. A screen reader met five buttons in a row with nothing
// saying they answer one question, nothing saying only one of them can be
// chosen, and — because `accessibilityState` is dropped by
// react-native-web (only TouchableWithoutFeedback reads it; every other
// export forwards aria-* and role, see forwardedProps/index.js) — nothing
// saying which one is chosen at all on the phone-web build.
//
// So the assertions here are behavioural (render, press, listen) and they
// pin the web spelling `aria-checked` on purpose: that is the one spelling
// both sides understand (RN 0.81 folds aria-checked into accessibilityState,
// react-native-web forwards it straight to the DOM), the same reasoning
// SHIP-606 settled on in a11y-roles-and-refresh.test.js.
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render } from '@testing-library/react-native';
import ActionScreen from '../app/(tabs)/action';
import ProfileEdit from '../app/profile-edit';
import FamilyReviewForParent from '../src/components/family/FamilyReviewForParent';
import RatingRow from '../src/components/feedback/RatingRow';
import SealedItemForm from '../src/components/passon/SealedItemForm';
import SegmentedControl from '../src/components/ui/SegmentedControl';
import { ConfirmProvider } from '../src/context/ConfirmContext';
import { ToastProvider } from '../src/context/ToastContext';
import { SEALED_ITEMS, SEALED_KINDS } from '../src/lib/passOnLocks';
import { ThemeProvider } from '../src/theme/ThemeContext';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: () => false, setParams: jest.fn() }),
  useFocusEffect: () => {},
  useLocalSearchParams: () => ({}),
  Redirect: () => null,
}));

jest.mock('../src/api/client', () => ({
  __esModule: true,
  default: { get: jest.fn(async () => ({ data: {} })), post: jest.fn(async () => ({ data: {} })), put: jest.fn(async () => ({ data: {} })), delete: jest.fn() },
  setTokenGetter: jest.fn(),
  setOnSessionExpired: jest.fn(),
  friendlyWriteError: (_e, fallback) => fallback,
}));

jest.mock('../src/context/AuthContext', () => ({
  __esModule: true,
  AuthProvider: ({ children }) => children,
  useAuth: () => ({ user: { role: 'ELDER', userId: 'me', emailVerified: true }, booted: true }),
}));

jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: jest.fn(async () => ({ granted: true })),
  launchImageLibraryAsync: jest.fn(async () => ({ canceled: true })),
  MediaTypeOptions: { Images: 'Images' },
}));

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

afterEach(() => jest.clearAllMocks());

// The group is a plain View, so it is deliberately not an accessibility
// element itself — making it one would swallow its own radios on iOS, and
// then nothing inside could be focused. It is found by its label instead,
// which is exactly the thing that was missing: the question the row answers.
function expectGroup(node) {
  expect(node.props.accessibilityRole).toBe('radiogroup');
}

// ---------- Post Help: the two choices an elder makes with her thumb ----------

test('post help: the kind-of-help chips are one group that says what it asks', async () => {
  const r = await wrap(<ActionScreen />);

  expectGroup(r.getByLabelText('Kind of help'));
  // COMPANIONSHIP is the form's opening value, so exactly one option starts
  // chosen and the other four must say they are not.
  r.getByRole('radio', { name: 'Company', checked: true });
  r.getByRole('radio', { name: 'Rides', checked: false });
  r.getByRole('radio', { name: 'Other', checked: false });
});

test('post help: how soon says which one is chosen, before and after a tap', async () => {
  const r = await wrap(<ActionScreen />);

  expectGroup(r.getByLabelText('How soon?'));
  const normal = r.getByRole('radio', { name: 'Normal', checked: true });
  // CHECKED, not selected: nothing in the chip sets accessibilityState.checked
  // by hand, so the only way this can be true under the native renderer is the
  // aria-checked prop being folded in by RN — the same prop the web build
  // forwards to the DOM. The spelling itself is pinned by the source scan at
  // the bottom of this file.
  expect(normal.props.accessibilityState.checked).toBe(true);

  await fireEvent.press(r.getByRole('radio', { name: 'Urgent' }));

  r.getByRole('radio', { name: 'Urgent', checked: true });
  r.getByRole('radio', { name: 'Normal', checked: false });
});

// ---------- Profile edit ----------

test('profile edit: the sex chips are a labelled single choice', async () => {
  const r = await wrap(<ProfileEdit />);

  expectGroup(await r.findByLabelText('Sex (optional)'));
  r.getByRole('radio', { name: 'Male', checked: false });
  r.getByRole('radio', { name: 'Female', checked: false });
});

// ---------- Sealed box ----------

test('sealed box: the kind chips inside the group are radios, not buttons', async () => {
  const r = await wrap(<SealedItemForm saving={false} onSave={() => {}} onCancel={() => {}} />);

  const firstKind = Object.keys(SEALED_KINDS)[0];
  expectGroup(r.getByLabelText(SEALED_ITEMS.kindPrompt));
  const chip = r.getByRole('radio', { name: SEALED_KINDS[firstKind], checked: false });

  await fireEvent.press(chip);
  r.getByRole('radio', { name: SEALED_KINDS[firstKind], checked: true });
});

// ---------- Star rows: one rating, not three "selected" stars ----------
//
// The stars carried `selected: value >= n`, which is the FILL rule, not the
// answer: at three stars a screen reader met five buttons and heard three of
// them say "selected". Nothing in that says the row holds one rating, and
// nothing points at the one star that is the rating.

test('feedback: a star row is one rating, and only the rating is checked', async () => {
  const r = await wrap(<RatingRow label="Ease of use" value={3} onChange={() => {}} />);

  expectGroup(r.getByLabelText('Ease of use'));
  r.getByRole('radio', { name: 'Ease of use: 3 stars', checked: true });
  r.getByRole('radio', { name: 'Ease of use: 2 stars', checked: false });
  r.getByRole('radio', { name: 'Ease of use: 5 stars', checked: false });
});

test('family review: the star picker is the same single choice, said the same way', async () => {
  const helper = { helperUserId: 'h1', helperName: 'Anna Marsh', stageIndex: 6 };
  const r = await wrap(<FamilyReviewForParent helper={helper} elderId="e1" elderName="Mum" />);

  await fireEvent.press(r.getByLabelText('Leave a review for Mum'));

  expectGroup(r.getByLabelText('How has Anna been for Mum?'));
  // The card opens on five stars, so five is the answer and four is not.
  r.getByRole('radio', { name: '5 stars', checked: true });
  r.getByRole('radio', { name: '4 stars', checked: false });
});

// ---------- The filter switcher on 8+ screens ----------

const SEGMENTS = [
  { key: 'open', label: 'Looking for Help', count: 1 },
  { key: 'done', label: 'Completed', count: 0 },
];

test('segmented control: the active filter says so on the web build too', async () => {
  const r = await wrap(<SegmentedControl segments={SEGMENTS} value="open" onChange={() => {}} />);

  const active = r.getByRole('tab', { name: /Looking for Help/ });
  expect(active.props.accessibilityState.selected).toBe(true);
  expect(r.getByRole('tab', { name: /Completed/ }).props.accessibilityState.selected).toBe(false);
});

// ---------- the web spelling, read off the source ----------
//
// Jest runs the native renderer, which folds aria-checked/aria-selected into
// accessibilityState — so a render can prove the state is announced but never
// which spelling carried it there. The phone-web build is the other way round:
// react-native-web forwards aria-* and role and drops accessibilityState on
// everything except TouchableWithoutFeedback (dist/modules/forwardedProps).
// These two controls are shared by every screen, so the spelling is pinned
// here rather than left to the next person to rediscover at towinly.com/app.
test('the two shared choice controls hand their state to the web as aria-*', () => {
  const fs = require('fs');
  const path = require('path');
  const read = (p) => fs.readFileSync(path.join(__dirname, '..', p), 'utf8');

  expect(read('src/components/ui/Chip.jsx')).toMatch(/aria-checked=\{ariaChecked\}/);
  expect(read('src/components/ui/SegmentedControl.jsx')).toMatch(/aria-selected=\{active\}/);
});
