// src/api/passon.js — the pass-on calls as named tools (Rule 6). Wire shapes
// mirror the website's pass-on pages exactly.
import api from '../src/api/client';
import {
  getPassOnSetup,
  getPassedOnFrom,
  listKeyholderAsksOfMe,
  listMyPassOnItems,
  respondToKeyholderAsk,
} from '../src/api/passon';

jest.mock('../src/api/client', () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn(), delete: jest.fn() },
  friendlyWriteError: (_e, fallback) => fallback,
  setTokenGetter: jest.fn(),
  setOnSessionExpired: jest.fn(),
}));

beforeEach(() => jest.clearAllMocks());

describe('pass-on API module', () => {
  test('listMyPassOnItems reads /passon/mine', async () => {
    // Arrange
    const mine = { stories: [{ id: 's1' }], letters: [] };
    api.get.mockResolvedValue({ data: mine });

    // Act
    const result = await listMyPassOnItems();

    // Assert
    expect(api.get).toHaveBeenCalledWith('/passon/mine');
    expect(result).toEqual(mine);
  });

  test('getPassOnSetup reads /passon/setup', async () => {
    // Arrange
    api.get.mockResolvedValue({ data: { armed: true } });

    // Act
    const result = await getPassOnSetup();

    // Assert
    expect(api.get).toHaveBeenCalledWith('/passon/setup');
    expect(result).toEqual({ armed: true });
  });

  test('listKeyholderAsksOfMe reads /passon/keyholders/asked-of-me', async () => {
    // Arrange
    const asks = [{ id: 'a1', ownerName: 'Margaret' }];
    api.get.mockResolvedValue({ data: asks });

    // Act
    const result = await listKeyholderAsksOfMe();

    // Assert
    expect(api.get).toHaveBeenCalledWith('/passon/keyholders/asked-of-me');
    expect(result).toEqual(asks);
  });

  test('respondToKeyholderAsk posts the answer to the ask', async () => {
    // Arrange
    api.post.mockResolvedValue({});

    // Act
    await respondToKeyholderAsk({ askId: 'a1', accept: true });

    // Assert
    expect(api.post).toHaveBeenCalledWith('/passon/keyholders/a1/respond', { accept: true });
  });

  test('respondToKeyholderAsk refuses a missing askId before the wire', async () => {
    // Act / Assert
    await expect(respondToKeyholderAsk({ accept: false })).rejects.toThrow('askId is required.');
    expect(api.post).not.toHaveBeenCalled();
  });

  test('getPassedOnFrom reads /passon/from/{ownerId}', async () => {
    // Arrange
    const page = { ownerName: 'Margaret', items: [] };
    api.get.mockResolvedValue({ data: page });

    // Act
    const result = await getPassedOnFrom('u7');

    // Assert
    expect(api.get).toHaveBeenCalledWith('/passon/from/u7');
    expect(result).toEqual(page);
  });

  test('getPassedOnFrom refuses a missing ownerId before the wire', async () => {
    // Act / Assert
    await expect(getPassedOnFrom()).rejects.toThrow('ownerId is required.');
    expect(api.get).not.toHaveBeenCalled();
  });
});
