// Emergency contacts as named tools (project Rule 6): one exported function
// per action, plain inputs, plain outputs, no UI knowledge. Wire shapes match
// the website's EmergencyContacts.jsx exactly, including inactivityDays going
// out as a number.
import api from './client';

/**
 * The signed-in account's emergency contacts (at most 3).
 * @returns {Promise<Array<{id: string, name: string, phone: string, relationship: string, inactivityDays: number}>>}
 */
export async function listEmergencyContacts() {
  const res = await api.get('/emergency/contacts');
  return res?.data;
}

/**
 * Add one emergency contact. inactivityDays is how many quiet days pass
 * before this person is alerted; it is coerced to a number like the website
 * and must be a whole number from 1 to 30 — this function is the tool
 * boundary (Rule 6), so it refuses bad input itself instead of forwarding
 * NaN or an out-of-range number for the server to reject.
 * @param {{name: string, phone: string, relationship: string, inactivityDays: number|string}} contact
 * @returns {Promise<{id: string, name: string, phone: string, relationship: string, inactivityDays: number}>}
 *   rejects with an Error naming the rule when inactivityDays is not 1-30
 */
export async function addEmergencyContact({ name, phone, relationship, inactivityDays }) {
  const days = Number(inactivityDays);
  if (!Number.isInteger(days) || days < 1 || days > 30) {
    throw new Error('inactivityDays must be a whole number between 1 and 30.');
  }
  const res = await api.post('/emergency/contacts', {
    name,
    phone,
    relationship,
    inactivityDays: days,
  });
  return res?.data;
}

/**
 * Remove one emergency contact by its id.
 * @param {string} contactId
 * @returns {Promise<void>}
 */
export async function removeEmergencyContact(contactId) {
  await api.delete(`/emergency/contacts/${contactId}`);
}
