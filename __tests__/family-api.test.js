// src/api/family.js — the family calls as named tools (Rule 6). Each test
// pins the exact wire shape the inline calls used before the migration:
// method, path, and body must not drift.
import api from '../src/api/client';
import {
  askForPower,
  getFamilyJourney,
  getFamilyLinks,
  getFamilyStandings,
  openFamilyChat,
  openFamilyStandingChat,
  pauseFamilyStanding,
  resumeFamilyStanding,
  revokeFamilyStanding,
  setDelegatedPowers,
} from '../src/api/family';

jest.mock('../src/api/client', () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn(), put: jest.fn(), delete: jest.fn() },
  friendlyWriteError: (_e, fallback) => fallback,
  setTokenGetter: jest.fn(),
  setOnSessionExpired: jest.fn(),
}));

beforeEach(() => jest.clearAllMocks());

describe('family API module', () => {
  test('getFamilyLinks reads /family/links', async () => {
    // Arrange
    const body = { activeLinks: [{ id: 'l1', iAmElder: false }], pendingInvitations: [] };
    api.get.mockResolvedValue({ data: body });

    // Act
    const result = await getFamilyLinks();

    // Assert
    expect(api.get).toHaveBeenCalledWith('/family/links');
    expect(result).toEqual(body);
  });

  test('getFamilyJourney reads /family/journey', async () => {
    // Arrange
    const body = { elders: [{ elderId: 'e1', elderName: 'Rose' }] };
    api.get.mockResolvedValue({ data: body });

    // Act
    const result = await getFamilyJourney();

    // Assert
    expect(api.get).toHaveBeenCalledWith('/family/journey');
    expect(result).toEqual(body);
  });

  test('getFamilyStandings reads /family/standings', async () => {
    // Arrange
    const body = { standings: [{ standingConnectionId: 'c1', paused: false }] };
    api.get.mockResolvedValue({ data: body });

    // Act
    const result = await getFamilyStandings();

    // Assert
    expect(api.get).toHaveBeenCalledWith('/family/standings');
    expect(result).toEqual(body);
  });

  test('setDelegatedPowers PUTs the whole set and returns the fresh link', async () => {
    // Arrange
    const fresh = { id: 'l1', delegatedPowers: ['POST_REQUESTS'] };
    api.put.mockResolvedValue({ data: fresh });

    // Act
    const result = await setDelegatedPowers({ linkId: 'l1', powers: ['POST_REQUESTS'] });

    // Assert
    expect(api.put).toHaveBeenCalledWith('/family/links/l1/powers', {
      powers: ['POST_REQUESTS'],
    });
    expect(result).toEqual(fresh);
  });

  test('setDelegatedPowers refuses a missing linkId or non-array powers', async () => {
    await expect(setDelegatedPowers({ powers: [] })).rejects.toThrow('linkId');
    await expect(setDelegatedPowers({ linkId: 'l1', powers: 'POST_REQUESTS' })).rejects.toThrow(
      'array'
    );
    expect(api.put).not.toHaveBeenCalled();
  });

  test('askForPower posts one power key to the link', async () => {
    // Arrange
    api.post.mockResolvedValue({});

    // Act
    await askForPower({ linkId: 'l1', power: 'LEAVE_REVIEWS' });

    // Assert
    expect(api.post).toHaveBeenCalledWith('/family/links/l1/power-requests', {
      power: 'LEAVE_REVIEWS',
    });
  });

  test('askForPower refuses a missing linkId or power', async () => {
    await expect(askForPower({ power: 'LEAVE_REVIEWS' })).rejects.toThrow('linkId');
    await expect(askForPower({ linkId: 'l1' })).rejects.toThrow('power');
    expect(api.post).not.toHaveBeenCalled();
  });

  test.each([
    ['pauseFamilyStanding', pauseFamilyStanding, '/family/standings/c1/pause'],
    ['resumeFamilyStanding', resumeFamilyStanding, '/family/standings/c1/resume'],
    ['revokeFamilyStanding', revokeFamilyStanding, '/family/standings/c1/revoke'],
  ])('%s posts to its standing path', async (_name, fn, path) => {
    // Arrange
    api.post.mockResolvedValue({});

    // Act
    await fn('c1');

    // Assert
    expect(api.post).toHaveBeenCalledWith(path);
  });

  test.each([
    ['pauseFamilyStanding', pauseFamilyStanding],
    ['resumeFamilyStanding', resumeFamilyStanding],
    ['revokeFamilyStanding', revokeFamilyStanding],
  ])('%s refuses a missing connectionId', async (_name, fn) => {
    await expect(fn()).rejects.toThrow('connectionId');
    expect(api.post).not.toHaveBeenCalled();
  });

  test('openFamilyStandingChat returns the chat connection id', async () => {
    // Arrange
    api.post.mockResolvedValue({ data: 'chat-9' });

    // Act
    const result = await openFamilyStandingChat('c1');

    // Assert
    expect(api.post).toHaveBeenCalledWith('/family/standings/c1/chat');
    expect(result).toBe('chat-9');
  });

  test('openFamilyChat returns the chat connection id for one elder', async () => {
    // Arrange
    api.post.mockResolvedValue({ data: 'chat-3' });

    // Act
    const result = await openFamilyChat('elder-1');

    // Assert
    expect(api.post).toHaveBeenCalledWith('/family/chat/elder-1');
    expect(result).toBe('chat-3');
  });

  test('openFamilyStandingChat and openFamilyChat refuse a missing id', async () => {
    await expect(openFamilyStandingChat()).rejects.toThrow('standingConnectionId');
    // One openFamilyChat serves both seats, so its refusal names the
    // neutral "user id" rather than elderId.
    await expect(openFamilyChat()).rejects.toThrow('user id');
    expect(api.post).not.toHaveBeenCalled();
  });
});
