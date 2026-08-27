// Why a trust ladder exists with this person, in one line (owner call
// 2026-08-26: "in Building Trust show why we are building — just for friends,
// or for a posted help; if for a posted help, tell what help, and the date
// they started the trust ladder").
//
// The reason is read from the elder's own posted requests, not from the
// connection's type: accepting a helper on a request reuses an existing
// friendship (NeedService.acceptHelper), and the demo seed types Priya's
// connection SOCIAL while her offer on the grocery run is accepted. The
// request the helper is on IS the reason, whatever the connection is called.
// Pure, so tests can hold it; the panel hands it `conn` from /connections and
// `needs` from /needs/mine (elder) or /needs/applications (helper, seat:
// 'helper' — the same line on My Elders, owner call 2026-08-26 "do the same
// for the helper").

/** The day the ladder started, the way a person would say it ("25 Aug 2026"). */
export function formatSince(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

/**
 * Which requests bind me to this person, in progress first. Elder seat: my
 * posted requests (/needs/mine) where they were accepted. Helper seat: my
 * offers (/needs/applications) accepted on their requests.
 */
function acceptedNeedsFor(otherUserId, needs, seat) {
  const list = Array.isArray(needs) ? needs : [];
  const binds =
    seat === 'helper'
      ? (n) => n.elderId === otherUserId && n.myApplicationStatus === 'ACCEPTED'
      : (n) => (n.applications ?? []).some((a) => a.helperId === otherUserId && a.status === 'ACCEPTED');
  const inProgress = list.filter((n) => n.status === 'ASSIGNED' && binds(n));
  const finished = list.filter((n) => n.status === 'COMPLETED' && binds(n));
  return { inProgress, finished };
}

/**
 * Why this ladder exists: { kind, title, since }.
 * kind is 'helping' (a request in progress), 'helped' (a finished request),
 * 'request' (came from a help request I no longer have on my list) or
 * 'friends' (a plain friendship).
 */
export function trustOrigin(conn, needs, { seat = 'elder' } = {}) {
  const since = formatSince(conn?.createdAt);
  const { inProgress, finished } = acceptedNeedsFor(conn?.otherUserId, needs, seat);
  if (inProgress.length) return { kind: 'helping', title: inProgress[0].title, since };
  if (finished.length) return { kind: 'helped', title: finished[0].title, since };
  if (conn?.type === 'SERVICE') return { kind: 'request', title: null, since };
  return { kind: 'friends', title: null, since };
}

/** The line the row shows: "Helping with "Groceries" · since 25 Aug 2026". */
export function trustOriginLine(conn, needs, options) {
  const { kind, title, since } = trustOrigin(conn, needs, options);
  const why =
    kind === 'helping'
      ? `Helping with “${title}”`
      : kind === 'helped'
        ? `Helped with “${title}”`
        : kind === 'request'
          ? 'Started from a help request'
          : 'Friends';
  return since ? `${why} · since ${since}` : why;
}
