// My Family (FAM-403), locked by tests: web-exact copy, the elder-seat
// (iAmElder) filter, the 5-seat cap that counts open requests, the danger
// remove confirm (DELETE only after "Remove from family"), main-contact
// promotion, and the elder-only MenuSheet entry.
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { ThemeProvider } from '../src/theme/ThemeContext';
import { ToastProvider } from '../src/context/ToastContext';

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

// Role always comes from the signed JWT in the real provider — the stub pins
// the elder seat; the MenuSheet test flips it to HELPER.
let mockRole = 'ELDER';
jest.mock('../src/context/AuthContext', () => ({
  __esModule: true,
  AuthProvider: ({ children }) => children,
  useAuth: () => ({ user: { role: mockRole, userId: 'eld-1', emailVerified: true }, booted: true }),
}));

// The MenuSheet test only checks row visibility — pin the reduced-motion
// path so the drawer renders in place (no Animated loops / AccessibilityInfo
// promises resolving outside act under Jest).
jest.mock('../src/lib/useReducedMotion', () => ({ useReducedMotion: () => true }));

// MenuSheet reads real safe-area insets; Jest has no native provider.
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
import MenuSheet from '../src/components/home/MenuSheet';

const wrap = (ui) =>
  render(
    <ThemeProvider>
      {/* gcTime: Infinity on queries AND mutations — the default gc timer is
          scheduled at unmount and keeps the Jest worker alive until force-exit
          (FAM-402 lesson: these tests actually run mutations). */}
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
        <ToastProvider>{ui}</ToastProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );

// FamilyLinkResponse fixtures (API contract: JSON key is exactly `iAmElder`;
// this screen keeps only iAmElder === true).
const link = (over) => ({
  id: 'm1', otherUserId: 'f1', otherUserName: 'sarah', relationship: 'Daughter',
  isPrimary: false, status: 'ACTIVE', initiatedByMe: true, iAmElder: true,
  createdAt: '2026-07-01T10:00:00', respondedAt: null,
  ...over,
});
const primaryMember = link({ id: 'm1', otherUserName: 'sarah', isPrimary: true });
const plainMember = link({ id: 'm2', otherUserId: 'f2', otherUserName: 'tom', relationship: null });
// The caller-as-FAMILY side of a BOTH user's links — never shows, never counts.
const familySideLink = link({ id: 'z1', otherUserId: 'x1', otherUserName: 'shadow', iAmElder: false });
const incomingReq = link({
  id: 'in1', otherUserId: 'f3', otherUserName: 'nina', relationship: 'Niece',
  status: 'PENDING', initiatedByMe: false,
});
const outgoingReq = link({
  id: 'out1', otherUserId: 'f4', otherUserName: 'raj', relationship: null,
  status: 'PENDING', initiatedByMe: true,
});

// 2 members + 1 incoming + 1 outgoing = 4 of 5 seats (shadow must not count).
const fullLinks = {
  activeLinks: [primaryMember, plainMember, familySideLink],
  incomingRequests: [incomingReq],
  outgoingRequests: [outgoingReq],
};
const emptyLinks = { activeLinks: [], incomingRequests: [], outgoingRequests: [] };
// 3 active + 1 incoming + 1 outgoing = 5: the cap counts OPEN REQUESTS too.
const atCapLinks = {
  activeLinks: [primaryMember, plainMember, link({ id: 'm3', otherUserId: 'f5', otherUserName: 'ana' })],
  incomingRequests: [incomingReq],
  outgoingRequests: [outgoingReq],
};

const stubGet = (links) =>
  api.get.mockImplementation(async (url) => {
    if (url === '/family/links') return { data: links };
    return { data: {} };
  });

beforeEach(() => {
  mockRole = 'ELDER';
});
afterEach(() => jest.clearAllMocks());

test('load: promises card, seat counter, and member rows render web-exact — family-side links never show or count', async () => {
  stubGet(fullLinks);
  const r = await wrap(<MyFamilyScreen />);

  // Promises card first: 4 bullets + the gold +1 line.
  r.getByText('How family works here');
  r.getByText("Your family can see you're safe.");
  r.getByText('They only see the friendships you choose to share.');
  r.getByText('They can never post or act for you.');
  r.getByText('You can remove anyone at any time.');
  r.getByText(
    'Family connected gives you +1 trust point — one point total, however many family members you add (up to 5 people).'
  );

  // Counter counts active + incoming + outgoing on the ELDER side only.
  await r.findByText('My Family (4/5)');

  await r.findByText('sarah');
  r.getByText('Daughter');
  r.getByText('Main contact'); // gold badge on the primary row
  r.getByText('tom');
  r.getByText('Family member'); // relationship fallback
  // Only the non-primary member offers promotion.
  expect(r.getAllByRole('button', { name: 'Make main contact' })).toHaveLength(1);

  r.getByText('They want to join your family');
  r.getByText("Niece · wants to join as your family. It's your choice.");
  r.getByText('Requests you sent');
  r.getByText('Waiting for raj to accept — only they can say yes. You can cancel any time.');

  expect(r.queryByText('shadow')).toBeNull();
});

test('cap: at 5 seats counting open requests, the add button is replaced by the notice', async () => {
  stubGet(atCapLinks);
  const r = await wrap(<MyFamilyScreen />);

  await r.findByText('My Family (5/5)');
  r.getByText(
    "You've reached the limit of 5 family members, counting open requests. Remove someone or cancel a request to add another person."
  );
  expect(r.queryByRole('button', { name: '+ Add a family member' })).toBeNull();
});

test('remove: confirm quotes the web danger message; DELETE fires only on confirm', async () => {
  const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  stubGet(fullLinks);
  const r = await wrap(<MyFamilyScreen />);
  await r.findByText('sarah');

  // Members render sarah (primary) then tom — press sarah's Remove.
  await fireEvent.press(r.getAllByRole('button', { name: 'Remove' })[0]);
  expect(api.delete).not.toHaveBeenCalled();
  expect(alertSpy).toHaveBeenCalledWith(
    'Remove sarah from your family?',
    "They will no longer see that you're safe or any friendship you shared. If they're your last family member here, your family trust point goes too. You can add them again later — they would need to accept again.",
    expect.any(Array)
  );

  const buttons = alertSpy.mock.calls[0][2];
  expect(buttons[0]).toMatchObject({ text: 'Keep', style: 'cancel' });
  expect(buttons[1]).toMatchObject({ text: 'Remove from family', style: 'destructive' });

  // The native dialog button is invoked directly, wrapped in act by hand —
  // there is no fireEvent to do it (Alert renders natively, not in the tree).
  await act(async () => buttons[1].onPress());
  expect(api.delete).toHaveBeenCalledWith('/family/links/m1');
  await r.findByText('Removed from your family.');
});

test('make main contact POSTs primary and toasts', async () => {
  stubGet(fullLinks);
  const r = await wrap(<MyFamilyScreen />);
  await r.findByText('tom');

  await fireEvent.press(r.getByRole('button', { name: 'Make main contact' }));
  expect(api.post).toHaveBeenCalledWith('/family/links/m2/primary');
  await r.findByText('Main contact updated.');
});

test('accept and decline post the respond payloads and toast the elder-side web copy', async () => {
  stubGet(fullLinks);
  const r = await wrap(<MyFamilyScreen />);
  await r.findByText('They want to join your family');

  await fireEvent.press(r.getByRole('button', { name: 'Accept' }));
  expect(api.post).toHaveBeenCalledWith('/family/requests/in1/respond', { accept: true });
  await r.findByText('They are now part of your family here.');
});

test('add form: elder-side copy, no API call on blank identifier, payload posts side family', async () => {
  stubGet(emptyLinks);
  const r = await wrap(<MyFamilyScreen />);

  await r.findByText('No family linked yet');
  r.getByText("Add up to 5 people. Each one must accept before they're linked to you.");

  await fireEvent.press(r.getByRole('button', { name: '+ Add a family member' }));
  r.getByText('Add a family member');
  r.getByText(
    'Type their exact ToWin username, email or phone. They must say yes before anything is shared.'
  );

  await fireEvent.press(r.getByRole('button', { name: 'Send request' }));
  expect(api.post).not.toHaveBeenCalled();
  r.getByText('Please enter a username, email, or phone number');

  await fireEvent.changeText(r.getByLabelText('Username, email or phone'), '  sarah ');
  await fireEvent.changeText(r.getByLabelText('Relationship'), 'Daughter');
  await fireEvent.press(r.getByRole('button', { name: 'Send request' }));
  expect(api.post).toHaveBeenCalledWith('/family/requests', {
    identifier: 'sarah',
    relationship: 'Daughter',
    side: 'family',
  });
  await r.findByText('Request sent. It becomes a family link when they accept.');
});

test('MenuSheet: My Family row shows for elders only', async () => {
  const elder = await wrap(<MenuSheet visible onClose={jest.fn()} />);
  elder.getByLabelText('My Family');
  // RNTL 14: unmount is async — leaving it dangling overlaps the next
  // render's act scope (the "overlapping act() calls" console noise).
  await elder.unmount();

  mockRole = 'HELPER';
  const helper = await wrap(<MenuSheet visible onClose={jest.fn()} />);
  expect(helper.queryByLabelText('My Family')).toBeNull();
});

// FAM-407: FAMILY must never see the elder menu — no needs, streaks, or
// discovery surfaces (web NavBar parity; Post Help would even crash, since
// centerActionFor('FAMILY') is null).
test('MenuSheet: FAMILY gets the parents hub only — no elder or discovery rows', async () => {
  mockRole = 'FAMILY';
  const r = await wrap(<MenuSheet visible onClose={jest.fn()} />);

  // Their real surfaces: hub, trust, game, guide.
  r.getByLabelText('My Parents');
  r.getByLabelText('Trust Score');
  r.getByLabelText('Peekaboo');
  r.getByLabelText('Guide');

  // Elder/discovery rows must not leak (each is a wrong or crashing target).
  expect(r.queryByLabelText('Post Help')).toBeNull();
  expect(r.queryByLabelText('Posted Help')).toBeNull();
  expect(r.queryByLabelText('My Helpers')).toBeNull();
  expect(r.queryByLabelText('Add Friends')).toBeNull();
  expect(r.queryByLabelText('Daily check-in')).toBeNull();
  expect(r.queryByLabelText('My Family')).toBeNull();
  expect(r.queryByLabelText('Emergency contacts')).toBeNull();
});
