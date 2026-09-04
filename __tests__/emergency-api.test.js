// src/api/emergency.js — the emergency-contact calls as named tools (Rule 6).
// Mirrors the website's EmergencyContacts.jsx wire shape exactly: the add body
// carries inactivityDays as a NUMBER (the site posts
// `{ ...form, inactivityDays: Number(form.inactivityDays) }`).
import api from '../src/api/client';
import {
  addEmergencyContact,
  listEmergencyContacts,
  removeEmergencyContact,
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

  test('removeEmergencyContact deletes by id', async () => {
    // Arrange
    api.delete.mockResolvedValue({});

    // Act
    await removeEmergencyContact('e1');

    // Assert
    expect(api.delete).toHaveBeenCalledWith('/emergency/contacts/e1');
  });
});
