// Reunions as named tools (project Rule 6): one exported function per
// action, plain inputs, plain outputs, no UI knowledge. An elder wishes to
// see old classmates or colleagues again; a helper they fully trust, or a
// family member, organises it; the two walk seven steps from the wish to the
// send-off, where every guest who came is confirmed home.
import api from './client';

const needId = (value, name, fn) => {
  if (!value) throw new Error(`${fn} needs a ${name}`);
};

/**
 * Every reunion the signed-in person is part of, as the elder who wished for
 * it or as the organiser, newest first. Each row carries its step, the guest
 * counts and the guests.
 * @returns {Promise<Array<object>>} rejects with the axios error
 */
export async function listMyReunions() {
  const res = await api.get('/reunions/mine');
  return res?.data;
}

/**
 * One reunion with its guests and counts. Only the elder and the organiser
 * can read it; anyone else is refused.
 * @param {string} reunionId the reunion to read
 * @returns {Promise<object>} rejects with the axios error
 */
export async function getReunion(reunionId) {
  needId(reunionId, 'reunionId', 'getReunion');
  const res = await api.get(`/reunions/${reunionId}`);
  return res?.data;
}

/**
 * Step 1, the wish. The elder says who they want to see again. The reunion
 * opens on "Who plans", waiting for the elder to choose an organiser.
 * @param {object} params
 * @param {string} params.institution the college, school or workplace (required)
 * @param {string} [params.years] the years, in the elder's words
 * @param {string} [params.city] where it was
 * @param {string} [params.note] names remembered, anything that helps find them
 * @returns {Promise<object>} the new reunion; rejects with the axios error
 */
export async function postReunionWish({ institution, years, city, note } = {}) {
  if (!institution || !String(institution).trim()) throw new Error('postReunionWish needs an institution');
  const res = await api.post('/reunions', { institution, years, city, note });
  return res?.data;
}

/**
 * Step 2, who may plan: the elder's helpers who reached full trust, and family
 * members with an active link. Each row says why they are allowed.
 * @param {string} reunionId the reunion
 * @returns {Promise<Array<{userId: string, name: string, kind: 'HELPER'|'FAMILY', relationship: string|null}>>} rejects with the axios error
 */
export async function listReunionOrganisers(reunionId) {
  needId(reunionId, 'reunionId', 'listReunionOrganisers');
  const res = await api.get(`/reunions/${reunionId}/organisers`);
  return res?.data;
}

/**
 * Step 2, the elder chooses the organiser from the people allowed. The
 * reunion moves to "Finding" and the organiser is told.
 * @param {object} params
 * @param {string} params.reunionId the reunion
 * @param {string} params.organiserId the person chosen, from listReunionOrganisers
 * @returns {Promise<object>} the reunion; rejects with the axios error
 */
export async function chooseReunionOrganiser({ reunionId, organiserId } = {}) {
  needId(reunionId, 'reunionId', 'chooseReunionOrganiser');
  needId(organiserId, 'organiserId', 'chooseReunionOrganiser');
  const res = await api.post(`/reunions/${reunionId}/organiser`, { organiserId });
  return res?.data;
}

/**
 * Step 3, add a guest to the list. A name and, when known, a phone and a note
 * (mobility, hearing, diet, who has their number). Never money: a note that
 * asks for money is refused. The guest starts as Remembered.
 * @param {object} params
 * @param {string} params.reunionId the reunion
 * @param {string} params.name the guest's name (required)
 * @param {string} [params.phone] their phone, if known
 * @param {string} [params.note] what the organiser should know
 * @returns {Promise<object>} the reunion with its guests; rejects with the axios error
 */
export async function addReunionGuest({ reunionId, name, phone, note } = {}) {
  needId(reunionId, 'reunionId', 'addReunionGuest');
  if (!name || !String(name).trim()) throw new Error('addReunionGuest needs a name');
  const res = await api.post(`/reunions/${reunionId}/guests`, { name, phone, note });
  return res?.data;
}

/**
 * Step 3, where the organiser is with one guest.
 * @param {object} params
 * @param {string} params.reunionId the reunion
 * @param {string} params.guestId the guest
 * @param {'REMEMBERED'|'FOUND'|'REACHED'|'COMING'|'CANNOT_COME'} params.state the new state
 * @returns {Promise<object>} the reunion with its guests; rejects with the axios error
 */
export async function setReunionGuestState({ reunionId, guestId, state } = {}) {
  needId(reunionId, 'reunionId', 'setReunionGuestState');
  needId(guestId, 'guestId', 'setReunionGuestState');
  needId(state, 'state', 'setReunionGuestState');
  const res = await api.patch(`/reunions/${reunionId}/guests/${guestId}/state`, { state });
  return res?.data;
}

/**
 * Step 3, take a guest off the list.
 * @param {object} params
 * @param {string} params.reunionId the reunion
 * @param {string} params.guestId the guest to remove
 * @returns {Promise<object>} the reunion without that guest; rejects with the axios error
 */
export async function removeReunionGuest({ reunionId, guestId } = {}) {
  needId(reunionId, 'reunionId', 'removeReunionGuest');
  needId(guestId, 'guestId', 'removeReunionGuest');
  const res = await api.delete(`/reunions/${reunionId}/guests/${guestId}`);
  return res?.data;
}

/**
 * Step 4, the plan, in words the elder reads: the day, the place, a ride for
 * each guest, the food, the budget. Any field that asks for money is refused.
 * @param {object} params
 * @param {string} params.reunionId the reunion
 * @param {string} [params.plannedOn] the day and time, e.g. "Sunday 14 December, 11 in the morning"
 * @param {string} [params.venue] the place: a public place or a family home
 * @param {string} [params.rides] who brings whom
 * @param {string} [params.food] what is served
 * @param {string} [params.budget] who covers what
 * @returns {Promise<object>} the reunion; rejects with the axios error
 */
export async function setReunionPlan({ reunionId, plannedOn, venue, rides, food, budget } = {}) {
  needId(reunionId, 'reunionId', 'setReunionPlan');
  const res = await api.put(`/reunions/${reunionId}/plan`, { plannedOn, venue, rides, food, budget });
  return res?.data;
}

/**
 * One step forward. Finding to the plan and the plan to the day are the
 * elder's alone, each with its condition (someone coming; a day and a place).
 * The day to the send-off is either side's.
 * @param {string} reunionId the reunion
 * @returns {Promise<object>} the reunion on its next step; rejects with the axios error
 */
export async function advanceReunion(reunionId) {
  needId(reunionId, 'reunionId', 'advanceReunion');
  const res = await api.post(`/reunions/${reunionId}/advance`);
  return res?.data;
}

/**
 * Step 5, the day: check a guest in as they arrive. Only a guest who said
 * they are coming can be checked in.
 * @param {object} params
 * @param {string} params.reunionId the reunion
 * @param {string} params.guestId the guest who arrived
 * @returns {Promise<object>} the reunion; rejects with the axios error
 */
export async function checkInReunionGuest({ reunionId, guestId } = {}) {
  needId(reunionId, 'reunionId', 'checkInReunionGuest');
  needId(guestId, 'guestId', 'checkInReunionGuest');
  const res = await api.post(`/reunions/${reunionId}/guests/${guestId}/arrived`);
  return res?.data;
}

/**
 * Step 6, the send-off: confirm a guest who came is home.
 * @param {object} params
 * @param {string} params.reunionId the reunion
 * @param {string} params.guestId the guest now home
 * @returns {Promise<object>} the reunion; rejects with the axios error
 */
export async function confirmReunionGuestHome({ reunionId, guestId } = {}) {
  needId(reunionId, 'reunionId', 'confirmReunionGuestHome');
  needId(guestId, 'guestId', 'confirmReunionGuestHome');
  const res = await api.post(`/reunions/${reunionId}/guests/${guestId}/home`);
  return res?.data;
}

/**
 * Step 6, close the reunion once every guest who came is home, with the
 * thank-you that goes to each of them. Refused while anyone is still out.
 * @param {object} params
 * @param {string} params.reunionId the reunion
 * @param {string} [params.thankYou] the thank-you, in the elder's or organiser's words
 * @returns {Promise<object>} the reunion, now done; rejects with the axios error
 */
export async function closeReunion({ reunionId, thankYou } = {}) {
  needId(reunionId, 'reunionId', 'closeReunion');
  const res = await api.post(`/reunions/${reunionId}/close`, { thankYou });
  return res?.data;
}

/**
 * The elder stops the reunion at any step before it is done. The organiser
 * is told. Nothing else is deleted.
 * @param {string} reunionId the reunion to stop
 * @returns {Promise<object>} the reunion, now stopped; rejects with the axios error
 */
export async function stopReunion(reunionId) {
  needId(reunionId, 'reunionId', 'stopReunion');
  const res = await api.post(`/reunions/${reunionId}/stop`);
  return res?.data;
}

/**
 * The organiser steps down before the day. The reunion goes back to "Who
 * plans" and keeps its guest list; the elder is told.
 * @param {string} reunionId the reunion to leave
 * @returns {Promise<object>} the reunion, back on "Who plans"; rejects with the axios error
 */
export async function stepDownFromReunion(reunionId) {
  needId(reunionId, 'reunionId', 'stepDownFromReunion');
  const res = await api.post(`/reunions/${reunionId}/step-down`);
  return res?.data;
}
