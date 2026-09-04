// src/api/passon.js — What I Pass On as named tools (Rule 6). Each test pins
// the exact wire shape the inline calls used before the migration: method,
// path, and body must not drift. The reveal password rides in the body,
// never in the address.
import api from '../src/api/client';
import {
  addSealedItem,
  armPassOn,
  createPassOnItem,
  deletePassOnItem,
  getMyPassOnItems,
  getPassOnSetup,
  getPassOnSheet,
  listKeyholders,
  listSealedItems,
  recordPassOnSheetSaved,
  removeSealedItem,
  revealSealedItem,
  undoPassOnArming,
  updatePassOnItem,
} from '../src/api/passon';

jest.mock('../src/api/client', () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn(), put: jest.fn(), delete: jest.fn() },
  friendlyWriteError: (_e, fallback) => fallback,
  setTokenGetter: jest.fn(),
  setOnSessionExpired: jest.fn(),
}));

beforeEach(() => jest.clearAllMocks());

describe('pass-on API module', () => {
  test.each([
    ['getMyPassOnItems', getMyPassOnItems, '/passon/mine', { stories: [], letters: [] }],
    ['getPassOnSetup', getPassOnSetup, '/passon/setup', { armed: false }],
    ['listKeyholders', listKeyholders, '/passon/keyholders', [{ id: 'k1' }]],
    ['listSealedItems', listSealedItems, '/passon/sealed', [{ id: 's1' }]],
    ['getPassOnSheet', getPassOnSheet, '/passon/sheet', { ownerName: 'Rose' }],
  ])('%s reads %s', async (_name, fn, path, body) => {
    // Arrange
    api.get.mockResolvedValue({ data: body });

    // Act
    const result = await fn();

    // Assert
    expect(api.get).toHaveBeenCalledWith(path);
    expect(result).toEqual(body);
  });

  test('listKeyholders hands back a non-list body as-is for the caller to guard', async () => {
    // Arrange - a captive portal answers 200 with an HTML page.
    api.get.mockResolvedValue({ data: '<html>hotel wifi</html>' });

    // Act
    const result = await listKeyholders();

    // Assert - the module mirrors the wire; the screen keeps its shape guard.
    expect(result).toBe('<html>hotel wifi</html>');
  });

  test('createPassOnItem posts the item fields', async () => {
    // Arrange
    api.post.mockResolvedValue({});
    const item = { kind: 'LETTER', title: 'To Sam', body: 'Dear Sam', audience: 'ONE_PERSON' };

    // Act
    await createPassOnItem(item);

    // Assert
    expect(api.post).toHaveBeenCalledWith('/passon/items', item);
  });

  test('updatePassOnItem PUTs the changes to the item path', async () => {
    // Arrange
    api.put.mockResolvedValue({});
    const changes = { kind: 'STORY', title: 'The farm', body: 'We had a farm', audience: 'FAMILY' };

    // Act
    await updatePassOnItem({ itemId: 'i7', changes });

    // Assert
    expect(api.put).toHaveBeenCalledWith('/passon/items/i7', changes);
  });

  test('deletePassOnItem deletes the item path', async () => {
    // Arrange
    api.delete.mockResolvedValue({});

    // Act
    await deletePassOnItem('i7');

    // Assert
    expect(api.delete).toHaveBeenCalledWith('/passon/items/i7');
  });

  test('armPassOn posts the setup choices', async () => {
    // Arrange
    api.post.mockResolvedValue({});
    const choices = { personIds: ['p1', 'p2'], approvalsNeeded: 2, notAWillAck: true, keyTruthAck: true };

    // Act
    await armPassOn(choices);

    // Assert
    expect(api.post).toHaveBeenCalledWith('/passon/arm', choices);
  });

  test('undoPassOnArming posts /passon/undo with no body', async () => {
    // Arrange
    api.post.mockResolvedValue({});

    // Act
    await undoPassOnArming();

    // Assert
    expect(api.post).toHaveBeenCalledWith('/passon/undo');
  });

  test('addSealedItem posts the sealed item fields', async () => {
    // Arrange
    api.post.mockResolvedValue({});
    const item = { label: 'Bank note', body: 'Box 44', kindHint: 'NOTE' };

    // Act
    await addSealedItem(item);

    // Assert
    expect(api.post).toHaveBeenCalledWith('/passon/sealed', item);
  });

  test('removeSealedItem deletes the sealed item path', async () => {
    // Arrange
    api.delete.mockResolvedValue({});

    // Act
    await removeSealedItem('s3');

    // Assert
    expect(api.delete).toHaveBeenCalledWith('/passon/sealed/s3');
  });

  test('revealSealedItem sends the password in the body and returns the content', async () => {
    // Arrange
    api.post.mockResolvedValue({ data: { body: 'Box 44' } });

    // Act
    const result = await revealSealedItem({ itemId: 's3', password: 'hushnow' });

    // Assert
    expect(api.post).toHaveBeenCalledWith('/passon/sealed/s3/reveal', { password: 'hushnow' });
    expect(result).toEqual({ body: 'Box 44' });
  });

  test('recordPassOnSheetSaved posts /passon/sheet/saved', async () => {
    // Arrange
    api.post.mockResolvedValue({});

    // Act
    await recordPassOnSheetSaved();

    // Assert
    expect(api.post).toHaveBeenCalledWith('/passon/sheet/saved');
  });

  test.each([
    ['createPassOnItem', () => createPassOnItem(), 'item fields'],
    ['updatePassOnItem without itemId', () => updatePassOnItem({ changes: {} }), 'itemId'],
    ['updatePassOnItem without changes', () => updatePassOnItem({ itemId: 'i7' }), 'changed fields'],
    ['deletePassOnItem', () => deletePassOnItem(), 'itemId'],
    ['armPassOn', () => armPassOn(), 'setup choices'],
    ['addSealedItem', () => addSealedItem(), 'item fields'],
    ['removeSealedItem', () => removeSealedItem(), 'itemId'],
    ['revealSealedItem without itemId', () => revealSealedItem({ password: 'x' }), 'itemId'],
    ['revealSealedItem without password', () => revealSealedItem({ itemId: 's3' }), 'password'],
  ])('%s fails fast with a clear message', async (_name, act, phrase) => {
    await expect(act()).rejects.toThrow(phrase);
    expect(api.get).not.toHaveBeenCalled();
    expect(api.post).not.toHaveBeenCalled();
    expect(api.put).not.toHaveBeenCalled();
    expect(api.delete).not.toHaveBeenCalled();
  });
});
