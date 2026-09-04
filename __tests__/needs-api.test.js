// The help-request lifecycle calls as named tools (Rule 6): each function
// hits exactly one endpoint with the wire shape the inline queryFns and
// mutationFns used before the migration, and hands the axios error through
// untouched.
import api from '../src/api/client';
import {
  postHelpRequest,
  listOpenHelpRequests,
  listNearbyHelpRequests,
  listMyApplications,
  applyToHelpRequest,
  withdrawApplication,
  acceptHelper,
  completeHelpRequest,
  removeHelpRequest,
} from '../src/api/needs';

jest.mock('../src/api/client', () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn(), delete: jest.fn() },
  friendlyWriteError: (_e, fallback) => fallback,
  setTokenGetter: jest.fn(),
  setOnSessionExpired: jest.fn(),
}));

beforeEach(() => jest.clearAllMocks());

test('postHelpRequest posts the form body to /needs', async () => {
  api.post.mockResolvedValue({ data: { id: 'n1' } });

  const result = await postHelpRequest({
    title: 'Ride to the clinic',
    description: '',
    category: 'TRANSPORT',
    urgency: 'NORMAL',
  });

  expect(api.post).toHaveBeenCalledWith('/needs', {
    title: 'Ride to the clinic',
    description: '',
    category: 'TRANSPORT',
    urgency: 'NORMAL',
  });
  expect(result).toEqual({ id: 'n1' });
});

test('postHelpRequest carries onBehalfOfElderId only when it is given', async () => {
  api.post.mockResolvedValue({ data: {} });

  await postHelpRequest({
    title: 'Groceries',
    description: null,
    category: 'ERRANDS',
    urgency: 'URGENT',
    onBehalfOfElderId: 'e9',
  });

  expect(api.post).toHaveBeenCalledWith('/needs', {
    title: 'Groceries',
    description: null,
    category: 'ERRANDS',
    urgency: 'URGENT',
    onBehalfOfElderId: 'e9',
  });
});

test('postHelpRequest refuses a missing title before touching the wire', async () => {
  await expect(postHelpRequest({ title: '  ' })).rejects.toThrow('postHelpRequest needs a title');
  expect(api.post).not.toHaveBeenCalled();
});

test('the browse feeds read /needs/open and /needs/nearby with the same params', async () => {
  api.get.mockResolvedValue({ data: [] });

  await listOpenHelpRequests();
  await listNearbyHelpRequests({ lat: 45.5, lng: -73.56, radiusKm: 10 });
  await listMyApplications();

  expect(api.get).toHaveBeenCalledWith('/needs/open');
  expect(api.get).toHaveBeenCalledWith('/needs/nearby', {
    params: { lat: 45.5, lng: -73.56, radiusKm: 10 },
  });
  expect(api.get).toHaveBeenCalledWith('/needs/applications');
});

test('listNearbyHelpRequests refuses a missing position before touching the wire', async () => {
  await expect(listNearbyHelpRequests({ radiusKm: 10 })).rejects.toThrow(
    'listNearbyHelpRequests needs lat and lng'
  );
  expect(api.get).not.toHaveBeenCalled();
});

test('apply, accept and complete post to their need-scoped endpoints', async () => {
  api.post.mockResolvedValue({ data: {} });

  await applyToHelpRequest('n3');
  await acceptHelper({ needId: 'n3', helperId: 'h7' });
  await completeHelpRequest('n3');

  expect(api.post).toHaveBeenCalledWith('/needs/n3/apply');
  expect(api.post).toHaveBeenCalledWith('/needs/n3/accept/h7');
  expect(api.post).toHaveBeenCalledWith('/needs/n3/complete');
});

test('withdraw and remove delete their need-scoped endpoints', async () => {
  api.delete.mockResolvedValue({ data: {} });

  await withdrawApplication('n3');
  await removeHelpRequest('n3');

  expect(api.delete).toHaveBeenCalledWith('/needs/n3/apply');
  expect(api.delete).toHaveBeenCalledWith('/needs/n3');
});

test('the id-scoped calls refuse a missing id before touching the wire', async () => {
  await expect(applyToHelpRequest()).rejects.toThrow('applyToHelpRequest needs a needId');
  await expect(withdrawApplication()).rejects.toThrow('withdrawApplication needs a needId');
  await expect(acceptHelper({ needId: 'n3' })).rejects.toThrow(
    'acceptHelper needs a needId and a helperId'
  );
  await expect(completeHelpRequest()).rejects.toThrow('completeHelpRequest needs a needId');
  await expect(removeHelpRequest()).rejects.toThrow('removeHelpRequest needs a needId');
  expect(api.post).not.toHaveBeenCalled();
  expect(api.delete).not.toHaveBeenCalled();
});

test('a refused accept rejects with the axios error, untouched', async () => {
  const refusal = Object.assign(new Error('409'), { response: { status: 409 } });
  api.post.mockRejectedValue(refusal);

  await expect(acceptHelper({ needId: 'n3', helperId: 'h7' })).rejects.toBe(refusal);
});
