// The batch-3 named tools (Rule 6): discovery, friend-request actions,
// family visibility, the public profile/review reads, my offers and the
// family-behind-me read. Each function hits exactly one endpoint with the
// wire shape the inline calls used before the migration, and hands the
// axios error through untouched.
import api from '../src/api/client';
import {
  discoverElders,
  discoverHelpers,
  sendConnectionRequest,
  respondToConnectionRequest,
  endConnection,
  setFamilyVisibility,
} from '../src/api/connections';
import { getUserProfile } from '../src/api/profile';
import { listUserReviews } from '../src/api/reviews';
import { getFamilyBehindMe } from '../src/api/family';
import { listMyApplications } from '../src/api/needs';

jest.mock('../src/api/client', () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn(), delete: jest.fn() },
  friendlyWriteError: (_e, fallback) => fallback,
  setTokenGetter: jest.fn(),
  setOnSessionExpired: jest.fn(),
}));

beforeEach(() => jest.clearAllMocks());

test('discoverElders and discoverHelpers put radiusKm on the wire', async () => {
  api.get.mockResolvedValue({ data: [{ userId: 'u1' }] });

  const elders = await discoverElders(25);
  const helpers = await discoverHelpers(50);

  expect(api.get).toHaveBeenCalledWith('/discover/elders', { params: { radiusKm: 25 } });
  expect(api.get).toHaveBeenCalledWith('/discover/helpers', { params: { radiusKm: 50 } });
  expect(elders).toEqual([{ userId: 'u1' }]);
  expect(helpers).toEqual([{ userId: 'u1' }]);
});

test('sendConnectionRequest posts the target and refuses a missing id', async () => {
  api.post.mockResolvedValue({ data: { id: 'c1', status: 'PENDING' } });

  const created = await sendConnectionRequest('u9');

  expect(api.post).toHaveBeenCalledWith('/connections/request', { targetUserId: 'u9' });
  expect(created).toEqual({ id: 'c1', status: 'PENDING' });
  await expect(sendConnectionRequest()).rejects.toThrow('targetUserId is required.');
  expect(api.post).toHaveBeenCalledTimes(1);
});

test('respondToConnectionRequest posts accept or decline to the connection', async () => {
  api.post.mockResolvedValue({ data: { id: 'c2', status: 'ACTIVE' } });

  await respondToConnectionRequest({ connectionId: 'c2', accept: true });
  await respondToConnectionRequest({ connectionId: 'c2', accept: false });

  expect(api.post).toHaveBeenCalledWith('/connections/c2/respond', { accept: true });
  expect(api.post).toHaveBeenCalledWith('/connections/c2/respond', { accept: false });
  await expect(respondToConnectionRequest({ accept: true })).rejects.toThrow(
    'connectionId is required.'
  );
});

test('endConnection deletes the connection and rejects with the axios error', async () => {
  api.delete.mockResolvedValue({});
  await endConnection('c3');
  expect(api.delete).toHaveBeenCalledWith('/connections/c3');

  const refusal = Object.assign(new Error('409'), { response: { status: 409 } });
  api.delete.mockRejectedValue(refusal);
  await expect(endConnection('c3')).rejects.toBe(refusal);
});

test('setFamilyVisibility posts the choice and returns the fresh connection', async () => {
  const fresh = { id: 'c4', sharedWithFamily: true };
  api.post.mockResolvedValue({ data: fresh });

  const result = await setFamilyVisibility({ connectionId: 'c4', shared: true });

  expect(api.post).toHaveBeenCalledWith('/connections/c4/family-visibility', { shared: true });
  expect(result).toEqual(fresh);
});

test('getUserProfile and listUserReviews read their id-scoped endpoints', async () => {
  api.get.mockResolvedValue({ data: { name: 'Priya' } });

  const profile = await getUserProfile('u5');
  await listUserReviews('u5');

  expect(api.get).toHaveBeenCalledWith('/profile/u5');
  expect(api.get).toHaveBeenCalledWith('/reviews/user/u5');
  expect(profile).toEqual({ name: 'Priya' });
  await expect(getUserProfile()).rejects.toThrow('userId is required.');
  await expect(listUserReviews()).rejects.toThrow('userId is required.');
});

test('getFamilyBehindMe reads /family/behind-me and keeps the entries shape', async () => {
  const body = { entries: [{ connectionId: 'c1', familyMemberName: 'Anu' }] };
  api.get.mockResolvedValue({ data: body });

  const result = await getFamilyBehindMe();

  expect(api.get).toHaveBeenCalledWith('/family/behind-me');
  expect(result).toEqual(body);
});

test('listMyApplications reads /needs/applications untouched', async () => {
  const page = { content: [{ id: 'a1' }] };
  api.get.mockResolvedValue({ data: page });

  const result = await listMyApplications();

  expect(api.get).toHaveBeenCalledWith('/needs/applications');
  expect(result).toEqual(page);
});
