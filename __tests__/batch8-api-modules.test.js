// The assistant, account, reviews, feedback, applications, family-alerts,
// pass-on and messages calls as named tools (Rule 6): each function hits
// exactly one endpoint with the wire shape the inline calls used before the
// migration, and hands the axios error through untouched.
import api from '../src/api/client';
import { askAssistant } from '../src/api/ai';
import { deleteMyAccount, exportMyData } from '../src/api/account';
import { listMyReviews } from '../src/api/reviews';
import { sendFeedback } from '../src/api/feedback';
import { listMyApplications } from '../src/api/needs';
import { listFamilyAlerts } from '../src/api/family';
import { listKeyholderAsksOfMe } from '../src/api/passon';
import { getUnreadMessageCount } from '../src/api/messages';

jest.mock('../src/api/client', () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn(), delete: jest.fn() },
  friendlyWriteError: (_e, fallback) => fallback,
  setTokenGetter: jest.fn(),
  setOnSessionExpired: jest.fn(),
}));

beforeEach(() => jest.clearAllMocks());

test('askAssistant posts the question and history to /assistant/chat with the 30s timeout', async () => {
  api.post.mockResolvedValue({ data: { reply: 'Hello.' } });

  const history = [{ role: 'user', content: 'Hi' }];
  const result = await askAssistant({ message: 'How do trust steps work?', history });

  expect(api.post).toHaveBeenCalledWith(
    '/assistant/chat',
    { message: 'How do trust steps work?', history },
    { timeout: 30_000 }
  );
  expect(result).toEqual({ reply: 'Hello.' });
});

test('askAssistant refuses an empty question before touching the network', async () => {
  await expect(askAssistant({ message: '  ' })).rejects.toThrow('non-empty message');
  expect(api.post).not.toHaveBeenCalled();
});

test('deleteMyAccount deletes /account', async () => {
  api.delete.mockResolvedValue({});

  await deleteMyAccount();

  expect(api.delete).toHaveBeenCalledWith('/account');
});

test('exportMyData reads /account/export and returns the body', async () => {
  const copy = { profile: { name: 'Anna' }, messages: [] };
  api.get.mockResolvedValue({ data: copy });

  const result = await exportMyData();

  expect(api.get).toHaveBeenCalledWith('/account/export');
  expect(result).toEqual(copy);
});

test('listMyReviews reads /reviews/mine', async () => {
  const rows = [{ id: 'r1', stars: 5 }];
  api.get.mockResolvedValue({ data: rows });

  const result = await listMyReviews();

  expect(api.get).toHaveBeenCalledWith('/reviews/mine');
  expect(result).toEqual(rows);
});

test('sendFeedback posts the body verbatim to /feedback', async () => {
  api.post.mockResolvedValue({});

  const body = { name: null, email: null, phone: null, message: 'Lovely app', easeRating: 5 };
  await sendFeedback(body);

  expect(api.post).toHaveBeenCalledWith('/feedback', body);
});

test('sendFeedback refuses an empty message before touching the network', async () => {
  await expect(sendFeedback({ message: '' })).rejects.toThrow('non-empty message');
  expect(api.post).not.toHaveBeenCalled();
});

test('listMyApplications reads /needs/applications', async () => {
  const rows = [{ id: 'a1', status: 'PENDING' }];
  api.get.mockResolvedValue({ data: rows });

  const result = await listMyApplications();

  expect(api.get).toHaveBeenCalledWith('/needs/applications');
  expect(result).toEqual(rows);
});

test('listFamilyAlerts unwraps the alerts array from /family/alerts', async () => {
  const body = { alerts: [{ id: 'f1' }] };
  api.get.mockResolvedValue({ data: body });

  const result = await listFamilyAlerts();

  expect(api.get).toHaveBeenCalledWith('/family/alerts');
  expect(result).toEqual(body.alerts);
});

test('listKeyholderAsksOfMe reads /passon/keyholders/asked-of-me', async () => {
  const rows = [{ id: 'k1' }];
  api.get.mockResolvedValue({ data: rows });

  const result = await listKeyholderAsksOfMe();

  expect(api.get).toHaveBeenCalledWith('/passon/keyholders/asked-of-me');
  expect(result).toEqual(rows);
});

test('getUnreadMessageCount reads /messages/unread-count and keeps the plain integer', async () => {
  api.get.mockResolvedValue({ data: 3 });

  const result = await getUnreadMessageCount();

  expect(api.get).toHaveBeenCalledWith('/messages/unread-count');
  expect(result).toBe(3);
});

test('a failed read rejects with the axios error, untouched', async () => {
  const refusal = Object.assign(new Error('500'), { response: { status: 500 } });
  api.get.mockRejectedValue(refusal);

  await expect(listMyReviews()).rejects.toBe(refusal);
  await expect(getUnreadMessageCount()).rejects.toBe(refusal);
});
