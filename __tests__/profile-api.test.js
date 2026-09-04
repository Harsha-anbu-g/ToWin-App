// src/api/profile.js — the profile save calls as named tools (Rule 6). The
// location test pins the one shape that protects privacy: only the fields
// given reach the wire, because an explicit null would tell the backend to
// clear the stored position (a bad geocode must never wipe a good cell).
import api from '../src/api/client';
import {
  geocodePlace,
  getMyProfile,
  updateElderProfile,
  updateHelperProfile,
  updatePhoneNumber,
  updateProfileLocation,
  updateProfilePhoto,
} from '../src/api/profile';

jest.mock('../src/api/client', () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn(), put: jest.fn() },
  friendlyWriteError: (_e, fallback) => fallback,
  setTokenGetter: jest.fn(),
  setOnSessionExpired: jest.fn(),
}));

beforeEach(() => jest.clearAllMocks());

describe('profile API module', () => {
  test('getMyProfile reads /profile/me', async () => {
    // Arrange
    api.get.mockResolvedValue({ data: { name: 'Rose' } });

    // Act
    const result = await getMyProfile();

    // Assert
    expect(api.get).toHaveBeenCalledWith('/profile/me');
    expect(result).toEqual({ name: 'Rose' });
  });

  test('updateProfilePhoto puts the file as multipart form data', async () => {
    // Arrange
    api.put.mockResolvedValue({});
    const file = { uri: 'file:///me.jpg', name: 'me.jpg', type: 'image/jpeg' };

    // Act
    await updateProfilePhoto({ file });

    // Assert
    const [path, body, opts] = api.put.mock.calls[0];
    expect(path).toBe('/profile/photo');
    expect(body).toBeInstanceOf(FormData);
    expect(opts).toEqual({ headers: { 'Content-Type': 'multipart/form-data' } });
  });

  test('updateProfilePhoto refuses a missing file before the wire', async () => {
    await expect(updateProfilePhoto({})).rejects.toThrow(
      'file is required to update the profile photo.'
    );
    expect(api.put).not.toHaveBeenCalled();
  });

  test('updateHelperProfile puts the fields as given', async () => {
    // Arrange
    api.put.mockResolvedValue({});
    const fields = { name: 'Sam', skillsOffered: ['gardening'], hobbies: ['chess'] };

    // Act
    await updateHelperProfile(fields);

    // Assert
    expect(api.put).toHaveBeenCalledWith('/profile/helper', fields);
  });

  test('updateElderProfile puts the fields as given', async () => {
    // Arrange
    api.put.mockResolvedValue({});
    const fields = { name: 'Rose', interests: ['baking'], lookingFor: 'BOTH' };

    // Act
    await updateElderProfile(fields);

    // Assert
    expect(api.put).toHaveBeenCalledWith('/profile/elder', fields);
  });

  test('updatePhoneNumber puts the phone', async () => {
    // Arrange
    api.put.mockResolvedValue({});

    // Act
    await updatePhoneNumber({ phone: '+14165550123' });

    // Assert
    expect(api.put).toHaveBeenCalledWith('/profile/phone', { phone: '+14165550123' });
  });

  test('geocodePlace encodes the query and returns the match', async () => {
    // Arrange
    api.get.mockResolvedValue({ data: { lat: 45.5, lng: -73.6, city: 'Montreal' } });

    // Act
    const result = await geocodePlace({ query: 'Montréal, QC' });

    // Assert
    expect(api.get).toHaveBeenCalledWith('/geocode/search?q=Montr%C3%A9al%2C%20QC');
    expect(result).toEqual({ lat: 45.5, lng: -73.6, city: 'Montreal' });
  });

  test('updateProfileLocation sends ONLY the fields given', async () => {
    // Arrange - a town with no usable geocode must go alone: explicit nulls
    // would clear the stored coordinates on the backend.
    api.put.mockResolvedValue({});

    // Act
    await updateProfileLocation({ city: 'Montreal' });

    // Assert
    expect(api.put).toHaveBeenCalledWith('/profile/location', { city: 'Montreal' });
  });

  test('updateProfileLocation sends coordinates without a city untouched', async () => {
    // Arrange
    api.put.mockResolvedValue({});

    // Act - the phone path saves a rounded cell and no town.
    await updateProfileLocation({ locationLat: 45.52, locationLng: -73.58 });

    // Assert
    expect(api.put).toHaveBeenCalledWith('/profile/location', {
      locationLat: 45.52,
      locationLng: -73.58,
    });
  });

  test('updateProfileLocation refuses an empty call before the wire', async () => {
    await expect(updateProfileLocation({})).rejects.toThrow(
      'At least one of locationLat, locationLng, or city is required.'
    );
    expect(api.put).not.toHaveBeenCalled();
  });
});
