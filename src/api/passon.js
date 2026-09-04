// What I Pass On as named tools (project Rule 6): one exported function per
// user action, plain inputs, plain outputs, no UI knowledge. Screens call
// these by name; an agent driving the app can call the same functions.
import api from './client';

/**
 * The signed-in elder's own stories and letters, unlocked and readable to
 * her, as GET /passon/mine returns them.
 * @returns {Promise<{stories: Array<object>, letters: Array<object>}>}
 *   rejects with the axios error
 */
export async function getMyPassOnItems() {
  const res = await api.get('/passon/mine');
  return res?.data;
}

/**
 * The sealed-box setup state: whether the box is armed, email/password
 * prerequisites, and the arming record.
 * @returns {Promise<object>} rejects with the axios error
 */
export async function getPassOnSetup() {
  const res = await api.get('/passon/setup');
  return res?.data;
}

/**
 * The Keyholders on the signed-in elder's sealed box and where each stands.
 * Returns the body as-is; callers guard the shape (a captive portal can
 * answer 200 with HTML).
 * @returns {Promise<Array<{id: string, personName: string, status: string, respondedAt: string|null}>>}
 *   rejects with the axios error
 */
export async function listKeyholders() {
  const res = await api.get('/passon/keyholders');
  return res?.data;
}

/**
 * The items in the signed-in elder's sealed box, by name only — the server
 * never decrypts a body for this list. Returns the body as-is; callers
 * guard the shape.
 * @returns {Promise<Array<object>>} rejects with the axios error
 */
export async function listSealedItems() {
  const res = await api.get('/passon/sealed');
  return res?.data;
}

/**
 * Save a new story or letter.
 * @param {object} item what the writer form collected
 * @param {'STORY'|'LETTER'} item.kind
 * @param {string} item.title
 * @param {string} item.body
 * @param {string} item.audience who may read it (e.g. EVERYONE, FAMILY, ONE_PERSON)
 * @param {string} [item.audienceUserId] the one person, when audience is one person
 * @param {string} [item.releaseWhen] when it unlocks
 * @returns {Promise<void>} rejects with the axios error when refused
 */
export async function createPassOnItem(item) {
  if (!item || typeof item !== 'object') throw new Error('createPassOnItem needs the item fields.');
  await api.post('/passon/items', item);
}

/**
 * Rewrite an existing story or letter in place.
 * @param {object} input
 * @param {string} input.itemId which story or letter to change
 * @param {object} input.changes the full item fields, same shape createPassOnItem takes
 * @returns {Promise<void>} rejects with the axios error when refused
 */
export async function updatePassOnItem({ itemId, changes }) {
  if (!itemId) throw new Error('updatePassOnItem needs an itemId.');
  if (!changes || typeof changes !== 'object') throw new Error('updatePassOnItem needs the changed fields.');
  await api.put(`/passon/items/${itemId}`, changes);
}

/**
 * Take a story or letter down for good.
 * @param {string} itemId which story or letter to remove
 * @returns {Promise<void>} rejects with the axios error when refused
 */
export async function deletePassOnItem(itemId) {
  if (!itemId) throw new Error('deletePassOnItem needs an itemId.');
  await api.delete(`/passon/items/${itemId}`);
}

/**
 * Arm the sealed box — the last step of setup, one call; the chosen
 * Keyholders are only asked anything from this moment.
 * @param {object} input the setup choices
 * @param {string[]} input.personIds the Keyholders, from her family list
 * @param {number} input.approvalsNeeded how many must agree before opening
 * @param {boolean} input.notAWillAck she read that this is not a will
 * @param {boolean} input.keyTruthAck she read what the key does and does not do
 * @returns {Promise<void>} rejects with the axios error when refused
 */
export async function armPassOn(input) {
  if (!input || typeof input !== 'object') throw new Error('armPassOn needs the setup choices.');
  await api.post('/passon/arm', input);
}

/**
 * Undo the arming quietly — "if this was not your idea, undo it." Nothing
 * is said to anybody about it.
 * @returns {Promise<void>} rejects with the axios error when refused
 */
export async function undoPassOnArming() {
  await api.post('/passon/undo');
}

/**
 * Put one item into the sealed box.
 * @param {object} item what the sealed-item form collected
 * @param {string} item.label the name shown in the box list (never encrypted)
 * @param {string} item.body the content that gets sealed
 * @param {string} [item.kindHint] what kind of thing this is
 * @returns {Promise<void>} rejects with the axios error when refused
 */
export async function addSealedItem(item) {
  if (!item || typeof item !== 'object') throw new Error('addSealedItem needs the item fields.');
  await api.post('/passon/sealed', item);
}

/**
 * Take one item out of the sealed box. The one delete in this feature
 * nobody can reverse — not support, not the operator, nobody.
 * @param {string} itemId which sealed item to remove
 * @returns {Promise<void>} rejects with the axios error when refused
 */
export async function removeSealedItem(itemId) {
  if (!itemId) throw new Error('removeSealedItem needs an itemId.');
  await api.delete(`/passon/sealed/${itemId}`);
}

/**
 * Open one sealed item with the owner's password. The password travels in
 * the body, never in the address; the answer goes straight back to the
 * caller and is kept nowhere else.
 * @param {object} input
 * @param {string} input.itemId which sealed item to open
 * @param {string} input.password the sealed-box password
 * @returns {Promise<object>} the revealed content; rejects with the axios error
 */
export async function revealSealedItem({ itemId, password }) {
  if (!itemId) throw new Error('revealSealedItem needs an itemId.');
  if (!password) throw new Error('revealSealedItem needs the password.');
  const res = await api.post(`/passon/sealed/${itemId}/reveal`, { password });
  return res?.data;
}

/**
 * The one-page copy the server builds from her box list — names only, no
 * decrypted bodies — plus when she last saved a copy.
 * @returns {Promise<object>} rejects with the axios error
 */
export async function getPassOnSheet() {
  const res = await api.get('/passon/sheet');
  return res?.data;
}

/**
 * Record that she kept a copy of her one-page sheet. A courtesy note for
 * the "last saved" line, nothing more.
 * @returns {Promise<void>} rejects with the axios error
 */
export async function recordPassOnSheetSaved() {
  await api.post('/passon/sheet/saved');
}
