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
 * before this person is alerted; it is coerced to a number like the website.
 * @param {{name: string, phone: string, relationship: string, inactivityDays: number|string}} contact
 * @returns {Promise<{id: string, name: string, phone: string, relationship: string, inactivityDays: number}>}
 */
export async function addEmergencyContact({ name, phone, relationship, inactivityDays }) {
  const res = await api.post('/emergency/contacts', {
    name,
    phone,
    relationship,
    inactivityDays: Number(inactivityDays),
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
