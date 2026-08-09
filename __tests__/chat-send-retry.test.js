// UX-710 — chat feels like a real messenger. The promises under test:
// (1) a send shows the message immediately as a "Sending…" bubble; (2) a
// failed send keeps the bubble on screen marked "Didn't send" with retry in
// place, the composer stays clear, and tapping the bubble re-sends the same
// words with the light impact; (3) leaving the chat with unsent text folds it
// into the draft, so typed text is never eaten (HCI rule 9, the main-branch
// promise); (4) the trust-gate 409 keeps its own path: the text goes back to
// the composer because the lock panel is about to replace it, so a retry
// bubble would only re-refuse.
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import * as Haptics from 'expo-haptics';
import React from 'react';
import ChatThread from '../app/chat/[connectionId]';
import { ConfirmProvider } from '../src/context/ConfirmContext';
import { ToastProvider } from '../src/context/ToastContext';
import { ThemeProvider } from '../src/theme/ThemeContext';
import { clearDrafts, getDraft } from '../src/lib/chatDrafts';

jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
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
  useAuth: () => ({ user: { role: 'ELDER', userId: 'me', emailVerified: true }, booted: true }),
}));

import api from '../src/api/client';

const conn = {
  id: 'c1',
  otherUserId: 'u1',
  otherUserName: 'Priya',
  otherUserRole: 'HELPER',
  type: 'HELP',
  status: 'ACTIVE',
  currentTrustLevel: 'MESSAGING',
  confirmedByMe: false,
  confirmedByOther: false,
  sharedWithFamily: false,
};

function stubGet() {
  api.get.mockImplementation((url) => {
    if (url === '/connections') return Promise.resolve({ data: [conn] });
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

beforeEach(() => clearDrafts());
afterEach(() => jest.clearAllMocks());

test('sending shows the message immediately as a pending bubble and clears the composer', async () => {
  stubGet();
  api.post.mockReturnValue(new Promise(() => {})); // never settles — hold the pending state
  const r = await wrap(<ChatThread />);

  await fireEvent.changeText(await r.findByLabelText('Message'), 'hello there');
  await fireEvent.press(r.getByLabelText('Send message'));

  expect(await r.findByText('Sending…')).toBeTruthy();
  expect(r.getByText('hello there')).toBeTruthy();
  expect(r.getByLabelText('Message').props.value).toBe('');
});

test("a failed send keeps the bubble marked Didn't send with retry, composer stays clear", async () => {
  stubGet();
  api.post.mockRejectedValue({ response: { status: 500 } });
  const r = await wrap(<ChatThread />);

  await fireEvent.changeText(await r.findByLabelText('Message'), 'hello there');
  await fireEvent.press(r.getByLabelText('Send message'));

  // The bubble survives the failure, marked in place.
  expect(await r.findByText("Didn't send. Tap to try again.")).toBeTruthy();
  expect(r.getByText('hello there')).toBeTruthy();
  // The words live in the bubble now — never dumped back into the composer.
  expect(r.getByLabelText('Message').props.value).toBe('');
  // The toast still announces the failure and points at the bubble.
  expect(await r.findByText("Message didn't send. Tap the message to try again.")).toBeTruthy();
});

test('tapping the failed bubble re-sends the same words with the light impact', async () => {
  stubGet();
  api.post.mockRejectedValue({ response: { status: 500 } });
  const r = await wrap(<ChatThread />);

  await fireEvent.changeText(await r.findByLabelText('Message'), 'hello there');
  await fireEvent.press(r.getByLabelText('Send message'));
  await r.findByText("Didn't send. Tap to try again.");

  jest.clearAllMocks();
  stubGet();
  api.post.mockResolvedValue({ data: {} });
  fireEvent.press(r.getByLabelText("Didn't send: hello there. Tap to try again."));

  await waitFor(() =>
    expect(api.post).toHaveBeenCalledWith('/messages/c1/send', { content: 'hello there' })
  );
  expect(Haptics.impactAsync).toHaveBeenCalled();
  // The failed marking resolves — one bubble, no stale "Didn't send" copy.
  await waitFor(() => expect(r.queryByText("Didn't send. Tap to try again.")).toBeNull());
});

test('leaving the chat folds unsent words into the draft — typed text is never eaten', async () => {
  stubGet();
  api.post.mockRejectedValue({ response: { status: 500 } });
  const r = await wrap(<ChatThread />);

  await fireEvent.changeText(await r.findByLabelText('Message'), 'hello there');
  await fireEvent.press(r.getByLabelText('Send message'));
  await r.findByText("Didn't send. Tap to try again.");

  r.unmount();
  // React defers the passive-effect cleanup past unmount()'s return — poll.
  await waitFor(() => expect(getDraft('c1')).toBe('hello there'));
});

test('the trust-gate 409 keeps its composer path: text restored, no retry bubble', async () => {
  stubGet();
  api.post.mockRejectedValue({
    response: { status: 409, data: { message: 'Trust level too low to message' } },
  });
  const r = await wrap(<ChatThread />);

  await fireEvent.changeText(await r.findByLabelText('Message'), 'hello there');
  await fireEvent.press(r.getByLabelText('Send message'));

  await r.findByText(
    'Your trust level is too low to message yet. Take the next trust step together first.'
  );
  // The lock panel is about to replace the composer — the draft keeps the
  // words, not a retry bubble that would only re-refuse.
  expect(r.getByLabelText('Message').props.value).toBe('hello there');
  expect(r.queryByText("Didn't send. Tap to try again.")).toBeNull();
});
