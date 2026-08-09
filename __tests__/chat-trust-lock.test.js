// Trust gate in the chat thread, locked by tests: below the Messaging step the
// composer is replaced by a plain explanation with the confirm-step action in
// place (HCI rules 3 + 9 — say so instead of letting the send 409), exactly
// like the PAUSED block above it. The elder starts each step; the helper only
// ever ACCEPTS and never sees a dead start button (backend TrustService rule,
// same guard as MyEldersPanel). The tap goes through the same askConfirm
// dialog as the trust panels. Family-type connections carry no gate, and their
// distinct "chat is closed" 409 (which also says "shared trust") must NOT be
// misread as the trust gate. Mirrors web Messages.jsx, adapted to app words.
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import React from 'react';
import ChatThread from '../app/chat/[connectionId]';
import { ConfirmProvider } from '../src/context/ConfirmContext';
import { ToastProvider } from '../src/context/ToastContext';
import { ThemeProvider } from '../src/theme/ThemeContext';

const mockPush = jest.fn();
let mockRole = 'ELDER';

jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: mockPush,
    back: jest.fn(),
    canGoBack: () => false,
    replace: jest.fn(),
  }),
  useFocusEffect: () => {},
  useLocalSearchParams: () => ({ connectionId: 'c1' }),
}));

jest.mock('../src/api/client', () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn(), delete: jest.fn() },
  setTokenGetter: jest.fn(),
  setOnSessionExpired: jest.fn(),
  friendlyWriteError: (_e, fallback) => fallback,
}));

jest.mock('../src/context/AuthContext', () => ({
  useAuth: () => ({ user: { role: mockRole, userId: 'me', emailVerified: true }, booted: true }),
}));

import api from '../src/api/client';

const conn = (over = {}) => ({
  id: 'c1',
  otherUserId: 'u1',
  otherUserName: 'Priya',
  otherUserRole: 'HELPER',
  type: 'HELP',
  status: 'ACTIVE',
  currentTrustLevel: 'DISCOVERED',
  confirmedByMe: false,
  confirmedByOther: false,
  sharedWithFamily: false,
  ...over,
});

function stubGet(connection) {
  api.get.mockImplementation((url) => {
    if (url === '/connections') return Promise.resolve({ data: [connection] });
    if (url.startsWith('/messages/c1')) return Promise.resolve({ data: { content: [] } });
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

beforeEach(() => {
  mockRole = 'ELDER';
});
afterEach(() => jest.clearAllMocks());

test('below Messaging the composer is replaced by the lock notice and the start-step action', async () => {
  stubGet(conn());
  const r = await wrap(<ChatThread />);

  expect(
    await r.findByText("You're connected. Messages unlock at the next trust step.")
  ).toBeTruthy();
  expect(await r.findByText('Start the next step')).toBeTruthy();
  expect(r.queryByLabelText('Message')).toBeNull();
  // The lock explains the empty thread — never "Say hello" (web parity).
  expect(r.queryByText('Say hello. Every friendship starts with one message.')).toBeNull();
});

test('the start-step action asks first, then confirms the trust step on this connection', async () => {
  stubGet(conn());
  api.post.mockResolvedValue({ data: {} });
  const r = await wrap(<ChatThread />);

  await r.findByText('Start the next step');
  // NOT awaited: the handler's promise only settles when a dialog button is
  // pressed (same pattern as confirm.test.js).
  fireEvent.press(r.getByLabelText('Start the next step'));
  // Same dialog + words as the trust panels (HCI rule 4).
  expect(await r.findByText('Start the next step?')).toBeTruthy();
  expect(
    r.getByText('Trust grows only when BOTH of you agree. Priya will get a tap to accept.')
  ).toBeTruthy();
  fireEvent.press(r.getByText('Start'));
  await waitFor(() => expect(api.post).toHaveBeenCalledWith('/trust/c1/confirm'));
});

test('"Not yet" closes the dialog without confirming anything', async () => {
  stubGet(conn());
  api.post.mockResolvedValue({ data: {} });
  const r = await wrap(<ChatThread />);

  await r.findByText('Start the next step');
  fireEvent.press(r.getByLabelText('Start the next step'));
  fireEvent.press(await r.findByText('Not yet'));
  await waitFor(() => expect(r.queryByText('Start the next step?')).toBeNull());
  expect(api.post).not.toHaveBeenCalledWith('/trust/c1/confirm');
});

test('when the other side already confirmed, the action reads as accepting', async () => {
  stubGet(conn({ confirmedByOther: true }));
  const r = await wrap(<ChatThread />);

  expect(await r.findByText('Accept the next step')).toBeTruthy();
});

test('a helper never sees a dead start button — the elder starts each step', async () => {
  mockRole = 'HELPER';
  stubGet(conn({ otherUserRole: 'ELDER' }));
  const r = await wrap(<ChatThread />);

  expect(
    await r.findByText("Priya starts each trust step. You'll get a tap here to accept.")
  ).toBeTruthy();
  expect(r.queryByText('Start the next step')).toBeNull();
});

test('a helper can accept once the elder has started the step', async () => {
  mockRole = 'HELPER';
  stubGet(conn({ otherUserRole: 'ELDER', confirmedByOther: true }));
  api.post.mockResolvedValue({ data: {} });
  const r = await wrap(<ChatThread />);

  await r.findByText('Accept the next step');
  fireEvent.press(r.getByLabelText('Accept the next step'));
  expect(await r.findByText('Accept the next step?')).toBeTruthy();
  expect(
    r.getByText('Priya has asked to move one step up. Accepting climbs the ladder for both of you.')
  ).toBeTruthy();
  fireEvent.press(r.getByText('Accept'));
  await waitFor(() => expect(api.post).toHaveBeenCalledWith('/trust/c1/confirm'));
});

test('after I confirm, the lock explains it is waiting on the other side', async () => {
  stubGet(conn({ confirmedByMe: true }));
  const r = await wrap(<ChatThread />);

  expect(
    await r.findByText("You've started the next step. Waiting for Priya to accept.")
  ).toBeTruthy();
  expect(r.queryByText('Start the next step')).toBeNull();
});

test('at Messaging and above the composer renders with no lock notice', async () => {
  stubGet(conn({ currentTrustLevel: 'MESSAGING' }));
  const r = await wrap(<ChatThread />);

  expect(await r.findByLabelText('Message')).toBeTruthy();
  expect(
    r.queryByText("You're connected. Messages unlock at the next trust step.")
  ).toBeNull();
});

test('family-type connections are never trust-locked', async () => {
  stubGet(conn({ type: 'FAMILY', currentTrustLevel: 'DISCOVERED' }));
  const r = await wrap(<ChatThread />);

  expect(await r.findByLabelText('Message')).toBeTruthy();
});

test('a send refused by the server trust gate names the real reason, not the generic retry line', async () => {
  stubGet(conn({ currentTrustLevel: 'MESSAGING' }));
  api.post.mockRejectedValue({
    response: { status: 409, data: { message: 'Trust level too low to message' } },
  });
  const r = await wrap(<ChatThread />);

  await fireEvent.changeText(await r.findByLabelText('Message'), 'hello there');
  await fireEvent.press(r.getByLabelText('Send message'));

  expect(
    await r.findByText(
      'Your trust level is too low to message yet. Take the next trust step together first.'
    )
  ).toBeTruthy();
  expect(r.queryByText("Message didn't send. Tap the message to try again.")).toBeNull();
});

test("the family chat-closed 409 also says 'shared trust' but must NOT show the trust-step words", async () => {
  stubGet(conn({ type: 'FAMILY', currentTrustLevel: 'DISCOVERED' }));
  api.post.mockRejectedValue({
    response: {
      status: 409,
      data: {
        message:
          'This chat is closed right now. It opens through the shared trust or family link behind it.',
      },
    },
  });
  const r = await wrap(<ChatThread />);

  await fireEvent.changeText(await r.findByLabelText('Message'), 'hello there');
  await fireEvent.press(r.getByLabelText('Send message'));

  expect(await r.findByText("Message didn't send. Tap the message to try again.")).toBeTruthy();
  expect(
    r.queryByText(
      'Your trust level is too low to message yet. Take the next trust step together first.'
    )
  ).toBeNull();
});
