// The assistant as a named tool (project Rule 6): one exported function per
// action, plain inputs, plain outputs, no UI knowledge. The Ask AI sheet is
// the only caller today; an agent driving the app can call the same function.
import api from './client';

/**
 * Ask the Towinly assistant one question, with the recent turns for context.
 * Waits up to 30s, not the client default 15s: a thoughtful Groq answer can
 * outrun 15s under load, and a timeout reads as "the AI is broken" (owner
 * report from the first TestFlight build, 2026-08-17).
 * @param {object} params
 * @param {string} params.message the question, already trimmed and non-empty
 * @param {Array<{role: string, content: string}>} [params.history] recent turns, oldest first
 * @returns {Promise<{reply: string}>} rejects with the axios error
 */
export async function askAssistant({ message, history = [] } = {}) {
  if (!message || !String(message).trim()) {
    throw new Error('askAssistant needs a non-empty message.');
  }
  const res = await api.post('/assistant/chat', { message, history }, { timeout: 30_000 });
  return res?.data;
}
