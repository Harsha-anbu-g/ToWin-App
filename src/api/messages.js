// Messaging as named tools (project Rule 6): one exported function per
// action, plain inputs, plain outputs, no UI knowledge. Screens call these
// by name; an agent driving the app can call the same functions.
import api from './client';

// The shared family thread on a connection; anything else is the private MAIN chat.
const FAMILY_CHANNEL = 'FAMILY_UPDATES';

/**
 * The newest messages in one conversation, newest page first, exactly as
 * GET /messages/{connectionId} returns them (a page object with `content`).
 * @param {object} input
 * @param {string} input.connectionId the conversation to read
 * @param {'MAIN'|'FAMILY_UPDATES'} [input.channel] pass FAMILY_UPDATES for the
 *   shared family thread; anything else reads the private chat
 * @param {number} [input.size] how many messages, default 50
 * @returns {Promise<object>} rejects with the axios error
 */
export async function listMessages({ connectionId, channel, size = 50 }) {
  if (!connectionId) throw new Error('listMessages needs a connectionId');
  const channelQuery = channel === FAMILY_CHANNEL ? `&channel=${FAMILY_CHANNEL}` : '';
  const res = await api.get(`/messages/${connectionId}?size=${size}${channelQuery}`);
  return res?.data;
}

/**
 * Tell the server the signed-in person has read this conversation, so unread
 * counts and badges clear.
 * @param {string} connectionId the conversation just read
 * @returns {Promise<void>} rejects with the axios error
 */
export async function markMessagesSeen(connectionId) {
  if (!connectionId) throw new Error('markMessagesSeen needs a connectionId');
  await api.post(`/messages/${connectionId}/seen`);
}

/**
 * Send one message into a conversation. The backend enforces the trust gate
 * (below-Messaging chats are refused with a 409) and the paused state.
 * @param {object} input
 * @param {string} input.connectionId the conversation to write into
 * @param {string} input.content the message text
 * @param {'MAIN'|'FAMILY_UPDATES'} [input.channel] pass FAMILY_UPDATES to write
 *   into the shared family thread; anything else sends privately
 * @returns {Promise<object>} the created message; rejects with the axios error
 */
export async function sendMessage({ connectionId, content, channel }) {
  if (!connectionId) throw new Error('sendMessage needs a connectionId');
  if (!content) throw new Error('sendMessage needs content');
  const channelQuery = channel === FAMILY_CHANNEL ? `?channel=${FAMILY_CHANNEL}` : '';
  const res = await api.post(`/messages/${connectionId}/send${channelQuery}`, { content });
  return res?.data;
}
