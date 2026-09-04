// The messaging and family calls as named tools (Rule 6): each function hits
// exactly one endpoint with the wire shape the inline queryFns used before
// the migration, and hands the axios error through untouched.
import api from '../src/api/client';
import { listMessages, markMessagesSeen, sendMessage } from '../src/api/messages';
import { endConnection } from '../src/api/connections';
import {
  getFamilyJourney,
  listFamilyAlerts,
  sendFamilyRequest,
  respondToFamilyRequest,
  respondToPowerRequest,
  removeFamilyLink,
  makePrimaryFamilyContact,
  openFamilyChat,
} from '../src/api/family';

jest.mock('../src/api/client', () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn(), delete: jest.fn() },
  friendlyWriteError: (_e, fallback) => fallback,
  setTokenGetter: jest.fn(),
  setOnSessionExpired: jest.fn(),
}));

beforeEach(() => jest.clearAllMocks());

test('listMessages reads the thread page, MAIN by default', async () => {
  const page = { content: [{ id: 'm1', content: 'Hello' }] };
  api.get.mockResolvedValue({ data: page });

  const result = await listMessages({ connectionId: 'c1' });

  expect(api.get).toHaveBeenCalledWith('/messages/c1?size=50');
  expect(result).toEqual(page);
});

test('listMessages appends the family channel when asked', async () => {
  api.get.mockResolvedValue({ data: { content: [] } });

  await listMessages({ connectionId: 'c1', channel: 'FAMILY_UPDATES' });

  expect(api.get).toHaveBeenCalledWith('/messages/c1?size=50&channel=FAMILY_UPDATES');
});

test('markMessagesSeen posts to the seen endpoint', async () => {
  api.post.mockResolvedValue({ data: {} });

  await markMessagesSeen('c1');

  expect(api.post).toHaveBeenCalledWith('/messages/c1/seen');
});

test('sendMessage posts the content, family channel only when asked', async () => {
  api.post.mockResolvedValue({ data: { id: 'm2' } });

  await sendMessage({ connectionId: 'c1', content: 'Hi there' });
  await sendMessage({ connectionId: 'c1', content: 'For everyone', channel: 'FAMILY_UPDATES' });

  expect(api.post).toHaveBeenCalledWith('/messages/c1/send', { content: 'Hi there' });
  expect(api.post).toHaveBeenCalledWith('/messages/c1/send?channel=FAMILY_UPDATES', {
    content: 'For everyone',
  });
});

test('a refused send rejects with the axios error, untouched', async () => {
  const refusal = Object.assign(new Error('409'), { response: { status: 409 } });
  api.post.mockRejectedValue(refusal);

  await expect(sendMessage({ connectionId: 'c1', content: 'Hi' })).rejects.toBe(refusal);
});

test('endConnection deletes the connection', async () => {
  api.delete.mockResolvedValue({ data: {} });

  await endConnection('c9');

  expect(api.delete).toHaveBeenCalledWith('/connections/c9');
});

test('getFamilyJourney reads /family/journey', async () => {
  const journey = { elders: [{ elderId: 'e1' }] };
  api.get.mockResolvedValue({ data: journey });

  const result = await getFamilyJourney();

  expect(api.get).toHaveBeenCalledWith('/family/journey');
  expect(result).toEqual(journey);
});

test('listFamilyAlerts unwraps the alerts array, empty when missing', async () => {
  api.get.mockResolvedValue({ data: { alerts: [{ id: 'a1', kind: 'SOS' }] } });
  expect(await listFamilyAlerts()).toEqual([{ id: 'a1', kind: 'SOS' }]);
  expect(api.get).toHaveBeenCalledWith('/family/alerts');

  api.get.mockResolvedValue({ data: {} });
  expect(await listFamilyAlerts()).toEqual([]);
});

test('sendFamilyRequest posts identifier, relationship and side', async () => {
  api.post.mockResolvedValue({ data: {} });

  await sendFamilyRequest({ identifier: 'mom@example.com', relationship: 'Mother', side: 'elder' });

  expect(api.post).toHaveBeenCalledWith('/family/requests', {
    identifier: 'mom@example.com',
    relationship: 'Mother',
    side: 'elder',
  });
});

test('respondToFamilyRequest and respondToPowerRequest post the answer', async () => {
  api.post.mockResolvedValue({ data: {} });

  await respondToFamilyRequest({ requestId: 'r1', accept: true });
  await respondToPowerRequest({ requestId: 'p1', accept: false });

  expect(api.post).toHaveBeenCalledWith('/family/requests/r1/respond', { accept: true });
  expect(api.post).toHaveBeenCalledWith('/family/power-requests/p1/respond', { accept: false });
});

test('removeFamilyLink deletes and makePrimaryFamilyContact posts', async () => {
  api.post.mockResolvedValue({ data: {} });
  api.delete.mockResolvedValue({ data: {} });

  await removeFamilyLink('l1');
  await makePrimaryFamilyContact('l2');

  expect(api.delete).toHaveBeenCalledWith('/family/links/l1');
  expect(api.post).toHaveBeenCalledWith('/family/links/l2/primary');
});

test('openFamilyChat returns the connection id to open', async () => {
  api.post.mockResolvedValue({ data: 'conn-42' });

  const result = await openFamilyChat('u7');

  expect(api.post).toHaveBeenCalledWith('/family/chat/u7');
  expect(result).toBe('conn-42');
});

test('missing inputs fail fast with a clear message', async () => {
  await expect(listMessages({})).rejects.toThrow('connectionId');
  await expect(sendMessage({ connectionId: 'c1' })).rejects.toThrow('content');
  await expect(markMessagesSeen()).rejects.toThrow('connectionId');
  await expect(endConnection()).rejects.toThrow('connectionId');
  await expect(sendFamilyRequest({})).rejects.toThrow('identifier');
  await expect(respondToFamilyRequest({})).rejects.toThrow('requestId');
  await expect(respondToPowerRequest({})).rejects.toThrow('requestId');
  await expect(removeFamilyLink()).rejects.toThrow('linkId');
  await expect(makePrimaryFamilyContact()).rejects.toThrow('linkId');
  await expect(openFamilyChat()).rejects.toThrow('user id');
  expect(api.get).not.toHaveBeenCalled();
  expect(api.post).not.toHaveBeenCalled();
  expect(api.delete).not.toHaveBeenCalled();
});
