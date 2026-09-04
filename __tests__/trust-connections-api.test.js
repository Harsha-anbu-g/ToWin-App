// The trust, connections, needs and family-links calls as named tools
// (Rule 6): each function hits exactly one endpoint with the wire shape the
// inline queryFns used before the migration, and hands the axios error
// through untouched.
import api from '../src/api/client';
import { getMyTrustScore, confirmTrustStep, pauseTrustSteps, resumeTrustSteps } from '../src/api/trust';
import { listMyConnections } from '../src/api/connections';
import { listMyHelpRequests } from '../src/api/needs';
import { getFamilyLinks } from '../src/api/family';

jest.mock('../src/api/client', () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn(), delete: jest.fn() },
  friendlyWriteError: (_e, fallback) => fallback,
  setTokenGetter: jest.fn(),
  setOnSessionExpired: jest.fn(),
}));

beforeEach(() => jest.clearAllMocks());

test('getMyTrustScore reads /trust/my-score', async () => {
  const breakdown = { totalScore: 8, customers: [{ connectionId: 'c1' }] };
  api.get.mockResolvedValue({ data: breakdown });

  const result = await getMyTrustScore();

  expect(api.get).toHaveBeenCalledWith('/trust/my-score');
  expect(result).toEqual(breakdown);
});

test('confirm, pause and resume post to their connection-scoped endpoints', async () => {
  api.post.mockResolvedValue({ data: {} });

  await confirmTrustStep('c7');
  await pauseTrustSteps('c7');
  await resumeTrustSteps('c7');

  expect(api.post).toHaveBeenCalledWith('/trust/c7/confirm');
  expect(api.post).toHaveBeenCalledWith('/trust/c7/pause');
  expect(api.post).toHaveBeenCalledWith('/trust/c7/resume');
});

test('a refused confirm rejects with the axios error, untouched', async () => {
  const refusal = Object.assign(new Error('409'), { response: { status: 409 } });
  api.post.mockRejectedValue(refusal);

  await expect(confirmTrustStep('c7')).rejects.toBe(refusal);
});

test('listMyConnections reads /connections', async () => {
  const rows = [{ id: 'c1', otherUserName: 'Priya' }];
  api.get.mockResolvedValue({ data: rows });

  const result = await listMyConnections();

  expect(api.get).toHaveBeenCalledWith('/connections');
  expect(result).toEqual(rows);
});

test('listMyHelpRequests reads /needs/mine and keeps the page shape', async () => {
  const page = { content: [{ id: 'n1', title: 'Groceries' }] };
  api.get.mockResolvedValue({ data: page });

  const result = await listMyHelpRequests();

  expect(api.get).toHaveBeenCalledWith('/needs/mine');
  expect(result).toEqual(page);
});

test('getFamilyLinks reads /family/links', async () => {
  const links = { activeLinks: [{ iAmElder: true, otherUserName: 'Anna' }] };
  api.get.mockResolvedValue({ data: links });

  const result = await getFamilyLinks();

  expect(api.get).toHaveBeenCalledWith('/family/links');
  expect(result).toEqual(links);
});
