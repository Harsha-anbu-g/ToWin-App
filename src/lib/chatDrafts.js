// In-memory chat drafts, keyed per conversation — they survive navigation for
// the app session but must NOT survive logout: an unsent draft is one
// account's private text (AuthContext clears them alongside the query cache).
const drafts = new Map();

export const getDraft = (connectionId) => drafts.get(connectionId);

export const setDraft = (connectionId, text) => {
  // Empty drafts are deleted (not stored as '') so the Map doesn't grow one
  // stale entry per conversation for the life of the app session.
  if (text) drafts.set(connectionId, text);
  else drafts.delete(connectionId);
};

export const clearDrafts = () => drafts.clear();
