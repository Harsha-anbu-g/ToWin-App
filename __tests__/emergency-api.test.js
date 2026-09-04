// src/api/emergency.js — the emergency-contact calls as named tools (Rule 6).
// Mirrors the website's EmergencyContacts.jsx wire shape exactly: the add body
// carries inactivityDays as a NUMBER (the site posts
// `{ ...form, inactivityDays: Number(form.inactivityDays) }`).
import api from '../src/api/client';
import {
  addEmergencyContact,
  listEmergencyContacts,
  removeEmergencyContact,
  sendSos,
} from '../src/api/emergency';

jest.mock('../src/api/client', () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn(), delete: jest.fn() },
  friendlyWriteError: (_e, fallback) => fallback,
  setTokenGetter: jest.fn(),
  setOnSessionExpired: jest.fn(),
}));

beforeEach(() => jest.clearAllMocks());

describe('emergency contact API module', () => {
  test('listEmergencyContacts reads /emergency/contacts', async () => {
    // Arrange
    const rows = [{ id: 'e1', name: 'Sarah', phone: '+15145550123', inactivityDays: 5 }];
    api.get.mockResolvedValue({ data: rows });

    // Act
    const result = await listEmergencyContacts();

    // Assert
    expect(api.get).toHaveBeenCalledWith('/emergency/contacts');
    expect(result).toEqual(rows);
  });

  test('addEmergencyContact posts the contact with inactivityDays as a number', async () => {
    // Arrange
    api.post.mockResolvedValue({ data: { id: 'e9' } });

    // Act - a string comes in (text field), a number goes out, like the site.
    await addEmergencyContact({
      name: 'Sarah',
      phone: '+15145550123',
      relationship: 'Daughter',
      inactivityDays: '7',
    });

    // Assert
    expect(api.post).toHaveBeenCalledWith('/emergency/contacts', {
      name: 'Sarah',
      phone: '+15145550123',
      relationship: 'Daughter',
      inactivityDays: 7,
    });
  });

  test.each([
    ['a non-number', 'five'],
    ['zero', 0],
    ['above the cap', 31],
    ['an empty string', ''],
  ])('addEmergencyContact refuses %s inactivityDays before the wire', async (_label, bad) => {
    // Act / Assert - the named tool is the boundary (Rule 6): an agent
    // calling it directly gets a clear refusal, never a NaN or an
    // out-of-range number forwarded to the server.
    await expect(
      addEmergencyContact({ name: 'Sarah', phone: '+15145550123', relationship: 'Daughter', inactivityDays: bad })
    ).rejects.toThrow('inactivityDays must be a whole number between 1 and 30.');
    expect(api.post).not.toHaveBeenCalled();
  });

  test('sendSos posts to /emergency/sos with no body', async () => {
    // Arrange
    api.post.mockResolvedValue({});

    // Act
    await sendSos();

    // Assert
    expect(api.post).toHaveBeenCalledWith('/emergency/sos');
  });

  test('removeEmergencyContact deletes by id', async () => {
    // Arrange
    api.delete.mockResolvedValue({});

    // Act
    await removeEmergencyContact('e1');

    // Assert
    expect(api.delete).toHaveBeenCalledWith('/emergency/contacts/e1');
  });
});
