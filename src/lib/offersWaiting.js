// The Posted Help tab badge: how many helpers are waiting for the elder's
// answer. Every offer on a still-OPEN request is pending (accepting one makes
// the request ASSIGNED), so the count is exactly who is waiting, and it stays
// until the elder accepts or removes the request — it never clears because
// the tab was opened (owner call 2026-08-28: "in bottom bar posted help should
// show a notification"). Same grammar as the Messages badge (people waiting)
// and Updates (clears per row, never on arrival).

/**
 * Count the offers still waiting for an answer across an elder's requests.
 * @param {Array<{ status?: string, applications?: Array<object> }>} needs  the /needs/mine content
 * @returns {number} offers on OPEN requests; 0 for nothing, null, or a bad shape
 */
export function offersWaitingCount(needs) {
  if (!Array.isArray(needs)) return 0;
  return needs
    .filter((n) => n?.status === 'OPEN')
    .reduce((count, n) => count + (Array.isArray(n.applications) ? n.applications.length : 0), 0);
}
