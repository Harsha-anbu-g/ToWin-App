// Reunions as named tools (Rule 6): each function hits exactly one endpoint
// with the wire shape the server reads, and hands the axios error through.
import api from '../src/api/client';
import {
  listMyReunions,
  getReunion,
  postReunionWish,
  listReunionOrganisers,
  chooseReunionOrganiser,
  addReunionGuest,
  setReunionGuestState,
  removeReunionGuest,
  setReunionPlan,
  advanceReunion,
  checkInReunionGuest,
  confirmReunionGuestHome,
  closeReunion,
  stopReunion,
  stepDownFromReunion,
} from '../src/api/reunions';

jest.mock('../src/api/client', () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn(), put: jest.fn(), patch: jest.fn(), delete: jest.fn() },
  friendlyWriteError: (_e, fallback) => fallback,
  setTokenGetter: jest.fn(),
  setOnSessionExpired: jest.fn(),
}));

beforeEach(() => jest.clearAllMocks());

test('listMyReunions reads /reunions/mine', async () => {
  api.get.mockResolvedValue({ data: [{ id: 'r1' }] });
  expect(await listMyReunions()).toEqual([{ id: 'r1' }]);
  expect(api.get).toHaveBeenCalledWith('/reunions/mine');
});

test('getReunion reads one reunion and needs an id', async () => {
  api.get.mockResolvedValue({ data: { id: 'r1' } });
  expect(await getReunion('r1')).toEqual({ id: 'r1' });
  expect(api.get).toHaveBeenCalledWith('/reunions/r1');
  await expect(getReunion()).rejects.toThrow(/reunionId/);
});

test('postReunionWish posts the wish and refuses an empty institution', async () => {
  api.post.mockResolvedValue({ data: { id: 'r1', step: 'ORGANISER' } });
  const out = await postReunionWish({
    institution: 'B.Sc. batch, Presidency College',
    years: '1968 to 1971',
    city: 'Madras',
    note: 'Kumar, Leela',
  });
  expect(out.step).toBe('ORGANISER');
  expect(api.post).toHaveBeenCalledWith('/reunions', {
    institution: 'B.Sc. batch, Presidency College',
    years: '1968 to 1971',
    city: 'Madras',
    note: 'Kumar, Leela',
  });
  await expect(postReunionWish({ institution: '  ' })).rejects.toThrow(/institution/);
});

test('listReunionOrganisers reads the people allowed to plan', async () => {
  api.get.mockResolvedValue({ data: [{ userId: 'u1', kind: 'HELPER' }] });
  expect(await listReunionOrganisers('r1')).toEqual([{ userId: 'u1', kind: 'HELPER' }]);
  expect(api.get).toHaveBeenCalledWith('/reunions/r1/organisers');
});

test('chooseReunionOrganiser posts the chosen person', async () => {
  api.post.mockResolvedValue({ data: { step: 'FINDING' } });
  await chooseReunionOrganiser({ reunionId: 'r1', organiserId: 'u1' });
  expect(api.post).toHaveBeenCalledWith('/reunions/r1/organiser', { organiserId: 'u1' });
  await expect(chooseReunionOrganiser({ reunionId: 'r1' })).rejects.toThrow(/organiserId/);
});

test('addReunionGuest posts name, phone and note', async () => {
  api.post.mockResolvedValue({ data: { guests: [{ name: 'Kumar' }] } });
  await addReunionGuest({ reunionId: 'r1', name: 'Kumar', phone: '+91 98', note: 'Walks with a stick' });
  expect(api.post).toHaveBeenCalledWith('/reunions/r1/guests', {
    name: 'Kumar',
    phone: '+91 98',
    note: 'Walks with a stick',
  });
  await expect(addReunionGuest({ reunionId: 'r1', name: '' })).rejects.toThrow(/name/);
});

test('setReunionGuestState patches the state', async () => {
  api.patch.mockResolvedValue({ data: {} });
  await setReunionGuestState({ reunionId: 'r1', guestId: 'g1', state: 'COMING' });
  expect(api.patch).toHaveBeenCalledWith('/reunions/r1/guests/g1/state', { state: 'COMING' });
});

test('removeReunionGuest deletes one guest', async () => {
  api.delete.mockResolvedValue({ data: {} });
  await removeReunionGuest({ reunionId: 'r1', guestId: 'g1' });
  expect(api.delete).toHaveBeenCalledWith('/reunions/r1/guests/g1');
});

test('setReunionPlan puts the five plan fields', async () => {
  api.put.mockResolvedValue({ data: {} });
  await setReunionPlan({
    reunionId: 'r1',
    plannedOn: 'Sunday 14 December, 11 in the morning',
    venue: 'Hotel Savera garden',
    rides: 'Priya drives Kumar',
    food: 'Lunch, vegetarian',
    budget: 'Family covers lunch',
  });
  expect(api.put).toHaveBeenCalledWith('/reunions/r1/plan', {
    plannedOn: 'Sunday 14 December, 11 in the morning',
    venue: 'Hotel Savera garden',
    rides: 'Priya drives Kumar',
    food: 'Lunch, vegetarian',
    budget: 'Family covers lunch',
  });
});

test('advanceReunion, stopReunion and stepDownFromReunion post to their verbs', async () => {
  api.post.mockResolvedValue({ data: {} });
  await advanceReunion('r1');
  await stopReunion('r1');
  await stepDownFromReunion('r1');
  expect(api.post).toHaveBeenNthCalledWith(1, '/reunions/r1/advance');
  expect(api.post).toHaveBeenNthCalledWith(2, '/reunions/r1/stop');
  expect(api.post).toHaveBeenNthCalledWith(3, '/reunions/r1/step-down');
});

test('checkInReunionGuest and confirmReunionGuestHome post per guest', async () => {
  api.post.mockResolvedValue({ data: {} });
  await checkInReunionGuest({ reunionId: 'r1', guestId: 'g1' });
  await confirmReunionGuestHome({ reunionId: 'r1', guestId: 'g1' });
  expect(api.post).toHaveBeenNthCalledWith(1, '/reunions/r1/guests/g1/arrived');
  expect(api.post).toHaveBeenNthCalledWith(2, '/reunions/r1/guests/g1/home');
});

test('closeReunion posts the thank-you', async () => {
  api.post.mockResolvedValue({ data: { step: 'DONE' } });
  await closeReunion({ reunionId: 'r1', thankYou: 'Thank you all for coming' });
  expect(api.post).toHaveBeenCalledWith('/reunions/r1/close', { thankYou: 'Thank you all for coming' });
});

test('the axios error passes through untouched', async () => {
  const err = Object.assign(new Error('Bad'), { response: { status: 400 } });
  api.post.mockRejectedValue(err);
  await expect(advanceReunion('r1')).rejects.toBe(err);
});
