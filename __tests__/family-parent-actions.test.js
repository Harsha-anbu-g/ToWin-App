// Guardian mode on the per-parent screen (FAM-507/508/509), locked by tests:
// granted powers surface their act-in-parent's-name controls behind the
// right ladder gates, asking for a power posts one power per ask, the
// inherited standing offers message/pause, and every act carries the
// attribution line. The server re-checks every grant; these tests lock what
// the client sends and shows.
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render } from '@testing-library/react-native';
import React from 'react';
import FamilyParentScreen from '../app/family/parent/[elderId]';
import { ToastProvider } from '../src/context/ToastContext';
import { ConfirmProvider } from '../src/context/ConfirmContext';
import { ThemeProvider } from '../src/theme/ThemeContext';

const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
  useLocalSearchParams: () => ({ elderId: 'elder-margaret' }),
  useFocusEffect: () => {},
}));

jest.mock('../src/api/client', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(async () => ({ data: {} })),
    put: jest.fn(async () => ({ data: {} })),
    delete: jest.fn(async () => ({ data: {} })),
  },
  setTokenGetter: jest.fn(),
  setOnSessionExpired: jest.fn(),
  friendlyWriteError: (_e, fallback) => fallback,
}));

jest.mock('../src/context/AuthContext', () => ({
  useAuth: () => ({ user: { role: 'FAMILY', userId: 'fam-1', emailVerified: true }, booted: true }),
}));

import api from '../src/api/client';

const link = (over = {}) => ({
  id: 'link-1',
  elderId: 'elder-margaret',
  otherUserId: 'elder-margaret',
  otherUserName: 'Margaret',
  relationship: 'Mother',
  isPrimary: true,
  status: 'ACTIVE',
  initiatedByMe: false,
  iAmElder: false,
  delegatedPowers: [],
  pendingPowerRequests: [],
  ...over,
});

const helper = (over = {}) => ({
  connectionId: 'conn-1',
  helperUserId: 'helper-harsha',
  helperName: 'Harsha',
  stageIndex: 2,
  currentTrustLevel: 'PHONE_CALL',
  readyToMeet: false,
  ...over,
});

const journey = (helpers, needs = []) => ({
  elders: [
    {
      elderId: 'elder-margaret',
      elderName: 'Margaret',
      checkedInToday: true,
      openNeedsCount: needs.length,
      openNeeds: needs,
      sharedHelpers: helpers,
    },
  ],
});

const standing = (over = {}) => ({
  standingConnectionId: 'conn-1',
  chatConnectionId: null,
  paused: false,
  ...over,
});

function stubGet({ links = { activeLinks: [link()], incomingRequests: [], outgoingRequests: [] },
  journeyData = journey([helper()]), standings = [] } = {}) {
  api.get.mockImplementation((url) => {
    if (url === '/family/links') return Promise.resolve({ data: links });
    if (url === '/family/journey') return Promise.resolve({ data: journeyData });
    if (url === '/family/standings') return Promise.resolve({ data: { standings } });
    return Promise.resolve({ data: {} });
  });
}

function wrap(ui) {
  const qc = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity },
      mutations: { retry: false, gcTime: Infinity },
    },
  });
  return render(
    <ThemeProvider>
      <QueryClientProvider client={qc}>
        <ToastProvider>
          <ConfirmProvider>{ui}</ConfirmProvider>
        </ToastProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

afterEach(() => jest.clearAllMocks());

// ── FAM-508: asking for a power ─────────────────────────────────────────────
test('asking for a power posts that ONE power and toasts who decides', async () => {
  stubGet();
  const r = await wrap(<FamilyParentScreen />);
  await r.findByText('What I can do for Margaret');

  const askButtons = r.getAllByRole('button', { name: 'Ask Margaret' });
  expect(askButtons).toHaveLength(3); // one per power, none granted
  await fireEvent.press(askButtons[0]);
  expect(api.post).toHaveBeenCalledWith('/family/links/link-1/power-requests', {
    power: 'MANAGE_HELP_REQUESTS',
  });
  await r.findByText('Asked. Margaret decides on their My Family page.');
});

test('a pending ask renders Waiting, not another Ask button', async () => {
  stubGet({
    links: {
      activeLinks: [link({ pendingPowerRequests: [{ id: 'pr1', power: 'ADVANCE_TRUST' }] })],
      incomingRequests: [],
      outgoingRequests: [],
    },
  });
  const r = await wrap(<FamilyParentScreen />);
  await r.findByText('What I can do for Margaret');

  r.getByText('Waiting');
  r.getByText(
    'You asked. Waiting for Margaret to decide — they answer on their My Family page.'
  );
  expect(r.getAllByRole('button', { name: 'Ask Margaret' })).toHaveLength(2);
});

test('a granted power shows On and drops its Ask button', async () => {
  stubGet({
    links: {
      activeLinks: [link({ delegatedPowers: ['MANAGE_HELP_REQUESTS'] })],
      incomingRequests: [],
      outgoingRequests: [],
    },
  });
  const r = await wrap(<FamilyParentScreen />);
  await r.findByText('What I can do for Margaret');

  r.getByText('On');
  r.getByText('Margaret lets you do this.');
  expect(r.getAllByRole('button', { name: 'Ask Margaret' })).toHaveLength(2);
});

// ── FAM-509: acting in the parent's name, behind the ladder gates ───────────
test('ADVANCE_TRUST below Trusted: the advance control posts the confirm', async () => {
  stubGet({
    links: {
      activeLinks: [link({ delegatedPowers: ['ADVANCE_TRUST'] })],
      incomingRequests: [],
      outgoingRequests: [],
    },
  });
  const r = await wrap(<FamilyParentScreen />);
  await r.findByText(/Anything you do here is in Margaret/);

  // Two-step now (rulebook): acting in someone else's name gets an inline
  // confirm before anything fires.
  await fireEvent.press(r.getByRole('button', { name: 'Move the next step forward for Margaret' }));
  expect(api.post).not.toHaveBeenCalledWith('/trust/conn-1/confirm');
  await fireEvent.press(r.getByRole('button', { name: 'Yes, move it for Margaret' }));
  expect(api.post).toHaveBeenCalledWith('/trust/conn-1/confirm');
  await r.findByText('Step taken for Margaret. Harsha will see you moved it.');
});

test('LEAVE_REVIEWS only opens on a fully trusted friendship, and posts on behalf', async () => {
  stubGet({
    links: {
      activeLinks: [link({ delegatedPowers: ['LEAVE_REVIEWS'] })],
      incomingRequests: [],
      outgoingRequests: [],
    },
    journeyData: journey([helper({ stageIndex: 6, currentTrustLevel: 'TRUSTED' })]),
  });
  const r = await wrap(<FamilyParentScreen />);
  await r.findByText(/Anything you do here is in Margaret/);

  // No advance control at the top of the ladder — only the review.
  expect(r.queryByText('Move the next step forward for Margaret')).toBeNull();
  await fireEvent.press(r.getByRole('button', { name: 'Leave a review for Margaret' }));
  await fireEvent.press(r.getByRole('button', { name: 'Save for Margaret' }));
  expect(api.post).toHaveBeenCalledWith('/reviews', {
    revieweeId: 'helper-harsha',
    rating: 5,
    comment: null,
    onBehalfOfElderId: 'elder-margaret',
  });
});

test('LEAVE_REVIEWS granted but friendship below Trusted: no act section at all', async () => {
  stubGet({
    links: {
      activeLinks: [link({ delegatedPowers: ['LEAVE_REVIEWS'] })],
      incomingRequests: [],
      outgoingRequests: [],
    },
  });
  const r = await wrap(<FamilyParentScreen />);
  await r.findByText('Harsha');
  expect(r.queryByText(/Anything you do here is in Margaret/)).toBeNull();
});

test('MANAGE_HELP_REQUESTS: the ask-for-help form posts on behalf of the parent', async () => {
  stubGet({
    links: {
      activeLinks: [link({ delegatedPowers: ['MANAGE_HELP_REQUESTS'] })],
      incomingRequests: [],
      outgoingRequests: [],
    },
  });
  const r = await wrap(<FamilyParentScreen />);
  await r.findByText("Margaret's open help requests");

  await fireEvent.press(r.getByRole('button', { name: 'Ask for help for Margaret' }));
  await fireEvent.changeText(
    r.getByLabelText('What does Margaret need help with?'),
    '  A ride to the clinic '
  );
  await fireEvent.press(r.getByRole('button', { name: 'Send for Margaret' }));
  expect(api.post).toHaveBeenCalledWith('/needs', {
    title: 'A ride to the clinic',
    description: null,
    category: 'COMPANIONSHIP',
    urgency: 'NORMAL',
    onBehalfOfElderId: 'elder-margaret',
  });
  await r.findByText('Asked for help for Margaret. Helpers will see you asked for them.');
});

// ── FAM-507: the inherited standing ─────────────────────────────────────────
test('below Messaging there is nothing to inherit — the unlock is explained', async () => {
  stubGet({ journeyData: journey([helper({ stageIndex: 0, currentTrustLevel: 'DISCOVERED' })]) });
  const r = await wrap(<FamilyParentScreen />);
  await r.findByText(
    "Family chat opens when Margaret and Harsha reach Messaging — they're still at the first step."
  );
});

test('an active standing offers message and pause; pause posts the standing id', async () => {
  stubGet({ standings: [standing()] });
  const r = await wrap(<FamilyParentScreen />);
  await r.findByText("You hold Margaret's trust with Harsha — you can message them directly.");

  await fireEvent.press(r.getByRole('button', { name: 'Pause' }));
  expect(api.post).toHaveBeenCalledWith('/family/standings/conn-1/pause');
  await r.findByText('Chat paused.');
});

test('a paused standing explains itself and resumes', async () => {
  stubGet({ standings: [standing({ paused: true })] });
  const r = await wrap(<FamilyParentScreen />);
  await r.findByText(
    'You paused this chat — neither of you can send messages until you resume it.'
  );
  await fireEvent.press(r.getByRole('button', { name: 'Resume' }));
  expect(api.post).toHaveBeenCalledWith('/family/standings/conn-1/resume');
});

// ── FAM-510 (family side): the private chat with the parent ────────────────
test('Message Margaret opens the parent chat through the server', async () => {
  stubGet();
  api.post.mockResolvedValue({ data: 'chat-42' });
  const r = await wrap(<FamilyParentScreen />);
  await r.findByText('What I can do for Margaret');

  await fireEvent.press(r.getByRole('button', { name: 'Message Margaret' }));
  expect(api.post).toHaveBeenCalledWith('/family/chat/elder-margaret');
});
