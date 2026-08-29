// Blocks as named tools (project Rule 6): one exported function per action,
// plain inputs, plain outputs, no UI knowledge. src/lib/blockList.js is the
// only caller; screens read the list through it so the phone cache and the
// server stay one thing.
import api from './client';

/**
 * The people the signed-in account has blocked, newest first.
 * @returns {Promise<Array<{userId: string, name: string, createdAt: string}>>}
 */
export async function listBlockedPeople() {
  const res = await api.get('/blocks');
  return res?.data;
}

/**
 * Block one person. Idempotent on the server: blocking twice is one block.
 * @param {string} userId the person to block
 * @returns {Promise<{userId: string, name: string, createdAt: string}>}
 */
export async function blockPerson(userId) {
  const res = await api.post('/blocks', { blockedUserId: userId });
  return res?.data;
}

/**
 * Unblock one person. Never an error when they were not blocked.
 * @param {string} userId the person to unblock
 * @returns {Promise<void>}
 */
export async function unblockPerson(userId) {
  await api.delete(`/blocks/${userId}`);
}

/**
 * Hand the server a list this phone already held (from before blocks lived on
 * the server) so none of those blocks is lost. Returns the whole list after.
 * @param {string[]} userIds
 * @returns {Promise<Array<{userId: string, name: string, createdAt: string}>>}
 */
export async function syncBlockedPeople(userIds) {
  const res = await api.post('/blocks/sync', { blockedUserIds: userIds });
  return res?.data;
}
