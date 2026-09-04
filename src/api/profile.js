// Profile reads as named tools (project Rule 6): one exported function per
// action, plain inputs, plain outputs, no UI knowledge. Screens call these by
// name; an agent driving the app can call the same functions.
import api from './client';

/**
 * The signed-in person's own profile record (name, bio, date of birth, ...),
 * exactly as GET /profile/me returns it. Includes hasPassword, which is false
 * for a Google-signup account that has never set a password.
 * @returns {Promise<object>} the profile fields; rejects with the axios error
 */
export async function getMyProfile() {
  const res = await api.get('/profile/me');
  return res?.data;
}

/**
 * Replace the signed-in person's profile photo.
 * @param {object} input
 * @param {object} input.file  the upload part (uri/name/type on native, Blob on web)
 * @returns {Promise<void>} resolves once stored; rejects with the axios error
 */
export async function updateProfilePhoto({ file }) {
  if (!file) throw new Error('file is required to update the profile photo.');
  const fd = new FormData();
  fd.append('file', file);
  await api.put('/profile/photo', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
}

/**
 * Save a helper's profile fields (name, age, bio, languages, occupation,
 * gender, social links, dateOfBirth, skillsOffered, hobbies). The body is
 * sent exactly as given — PUT /profile/helper replaces those fields.
 * @param {object} fields  the helper profile fields to save
 * @returns {Promise<void>} resolves once saved; rejects with the axios error
 */
export async function updateHelperProfile(fields) {
  if (!fields || typeof fields !== 'object') {
    throw new Error('fields object is required to update a helper profile.');
  }
  await api.put('/profile/helper', fields);
}

/**
 * Save an elder's profile fields (name, age, bio, languages, occupation,
 * gender, social links, dateOfBirth, interests, lookingFor). The body is
 * sent exactly as given — PUT /profile/elder replaces those fields.
 * @param {object} fields  the elder profile fields to save
 * @returns {Promise<void>} resolves once saved; rejects with the axios error
 */
export async function updateElderProfile(fields) {
  if (!fields || typeof fields !== 'object') {
    throw new Error('fields object is required to update an elder profile.');
  }
  await api.put('/profile/elder', fields);
}

/**
 * Save the signed-in person's phone number. Only shared with a friend after
 * both people reach the phone trust stage.
 * @param {object} input
 * @param {string} input.phone  the phone number as typed
 * @returns {Promise<void>} resolves once saved; rejects with the axios error
 */
export async function updatePhoneNumber({ phone }) {
  if (!phone) throw new Error('phone is required to update the phone number.');
  await api.put('/profile/phone', { phone });
}

/**
 * Look up a typed town or city and get its coordinates, the same lookup the
 * website uses before saving a location.
 * @param {object} input
 * @param {string} input.query  the place as typed, e.g. "Montreal"
 * @returns {Promise<object>} { lat, lng, city } for the best match; rejects
 *   with the axios error
 */
export async function geocodePlace({ query }) {
  if (!query) throw new Error('query is required to look up a place.');
  const res = await api.get(`/geocode/search?q=${encodeURIComponent(query)}`);
  return res?.data;
}

/**
 * Save a position and/or town against the account (PUT /profile/location,
 * every field optional). Only the fields given are sent: the backend sets its
 * columns from whatever the body carries, so an absent coordinate leaves the
 * stored one alone while an explicit null would clear it. Coordinates must
 * already be coarsened (src/lib/coarseLocation) — this module never rounds.
 * @param {object} input
 * @param {number} [input.locationLat]  rounded latitude
 * @param {number} [input.locationLng]  rounded longitude
 * @param {string} [input.city]         town name to store
 * @returns {Promise<void>} resolves once saved; rejects with the axios error
 */
export async function updateProfileLocation({ locationLat, locationLng, city } = {}) {
  const body = {};
  if (locationLat !== undefined) body.locationLat = locationLat;
  if (locationLng !== undefined) body.locationLng = locationLng;
  if (city !== undefined) body.city = city;
  if (!Object.keys(body).length) {
    throw new Error('At least one of locationLat, locationLng, or city is required.');
  }
  await api.put('/profile/location', body);
}

/**
 * Another person's public profile (name, bio, interests, trust level), as
 * GET /profile/{id} returns it.
 * @param {string} userId whose profile to read
 * @returns {Promise<object>} the profile fields; rejects with the axios error
 */
export async function getUserProfile(userId) {
  if (!userId) throw new Error('userId is required.');
  const res = await api.get(`/profile/${userId}`);
  return res?.data;
}
