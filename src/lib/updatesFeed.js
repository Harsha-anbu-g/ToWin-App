// The Updates feed — every notification in one place (owner call 2026-08-19:
// "all the notifications in one place, like Instagram"), opened from the
// bell in the top right corner.
//
// There is no stored notification list on the server: the backend only keeps
// push tokens. But the app already fetches everything a notification list
// needs — friend requests, new friends, offers on posted help, where my own
// offers stand, family alerts, keyholder asks, new reviews, unread chats —
// so the feed is assembled client-side from those queries, and the phone
// remembers what has been read the same way the red tab badges do
// (src/lib/seenIds, web b37420d). Builders are pure so tests can hold them.
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { listMyConnections } from '../api/connections';
import { listMyHelpRequests, listMyApplications } from '../api/needs';
import { listFamilyAlerts } from '../api/family';
import { listKeyholderAsksOfMe } from '../api/passon';
import { listMyReviews } from '../api/reviews';
import { useUnseenBadge, markSeen } from './seenIds';
import { seenKey } from './storageKeys';

/** The seen-state category the bell owns. Clears when Updates opens. */
export const UPDATES_CATEGORY = 'updates';

/** How often the feed's queries refresh while a screen watches them. */
const POLL_MS = 60_000;

const at = (iso) => (iso ? new Date(iso).getTime() : 0);

/** Relative timestamp, glanceable (same voice as the Messages inbox). */
export const timeAgo = (ms) => {
  if (!ms) return '';
  const mins = Math.floor((Date.now() - ms) / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return new Date(ms).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

// ---- Builders: API payload -> feed items -------------------------------
// An item: { token, kind, title, body?, at, href, name? }. `token` is the
// seen-state identity — it changes exactly when the item becomes news again.

/** Friend requests waiting on me, and friendships that became real. */
export function connectionItems(connections) {
  const items = [];
  for (const c of Array.isArray(connections) ? connections : []) {
    if (c.type === 'FAMILY') continue; // family links have their own alerts
    if (c.status === 'PENDING' && !c.initiatedByMe) {
      items.push({
        token: `conn:${c.id}:PENDING`,
        kind: 'friend-request',
        name: c.otherUserName,
        title: `${c.otherUserName} wants to be your friend`,
        body: c.requestMessage || null,
        at: at(c.createdAt),
        href: '/friends',
      });
    }
    if (c.status === 'ACTIVE') {
      items.push({
        token: `conn:${c.id}:ACTIVE`,
        kind: 'friend-new',
        name: c.otherUserName,
        title: `You and ${c.otherUserName} are now friends`,
        at: at(c.updatedAt || c.createdAt),
        href: '/home',
      });
    }
  }
  return items;
}

/** Unread chats, one row per conversation (the tab badge counts the same). */
export function messageItems(connections) {
  const items = [];
  for (const c of Array.isArray(connections) ? connections : []) {
    if (c.status !== 'ACTIVE' || !c.unreadCount) continue;
    items.push({
      token: `msg:${c.id}:${c.lastMessageAt ?? c.unreadCount}`,
      kind: 'message',
      name: c.otherUserName,
      title:
        c.unreadCount === 1
          ? `New message from ${c.otherUserName}`
          : `${c.unreadCount} new messages from ${c.otherUserName}`,
      body: c.lastMessagePreview || null,
      at: at(c.lastMessageAt || c.updatedAt),
      href: `/chat/${c.id}`,
    });
  }
  return items;
}

/** Helpers offering on MY posted help (elder seat). */
export function applicantItems(needsMine) {
  const items = [];
  for (const n of needsMine?.content ?? []) {
    for (const a of n.applications ?? []) {
      items.push({
        token: `app:${n.id}:${a.helperId}`,
        kind: 'applicant',
        name: a.helperName,
        title: `${a.helperName} offered to help with "${n.title}"`,
        body: a.message || null,
        at: at(n.createdAt), // applications carry no time of their own
        href: '/posted-help',
      });
    }
  }
  return items;
}

/** Where MY offers stand (helper seat): only decided ones are news. */
export function myOfferItems(applications) {
  const items = [];
  for (const n of applications?.content ?? []) {
    if (n.myApplicationStatus === 'ACCEPTED') {
      items.push({
        token: `offer:${n.id}:ACCEPTED`,
        kind: 'offer-accepted',
        name: n.elderName,
        title: `${n.elderName} said yes to your offer on "${n.title}"`,
        at: at(n.createdAt),
        href: '/my-jobs',
      });
    } else if (n.myApplicationStatus === 'DECLINED') {
      items.push({
        token: `offer:${n.id}:DECLINED`,
        kind: 'offer-declined',
        name: n.elderName,
        title: `"${n.title}" went to someone else this time`,
        at: at(n.createdAt),
        href: '/my-jobs',
      });
    }
  }
  return items;
}

/** Family alerts (FAMILY seat): SOS, first meetings, quiet spells. */
export function familyAlertItems(alertsData) {
  const alerts = alertsData?.alerts ?? (Array.isArray(alertsData) ? alertsData : []);
  return alerts.map((a) => ({
    token: `fam:${a.id}`,
    kind: a.type === 'SOS' ? 'family-sos' : 'family-alert',
    name: a.elderName,
    title: a.body || `${a.elderName} needs your attention`,
    at: at(a.createdAt),
    href: '/home',
  }));
}

/** Someone asked me to hold a key to their sealed box. */
export function keyholderAskItems(asks) {
  return (Array.isArray(asks) ? asks : []).map((k) => ({
    token: `key:${k.id}`,
    kind: 'keyholder-ask',
    name: k.ownerName,
    title: `${k.ownerName} asked you to hold a key`,
    at: 0, // the ask carries no timestamp; it sorts last until acted on
    href: '/home',
  }));
}

/** Reviews written about me. */
export function reviewItems(reviews) {
  return (Array.isArray(reviews) ? reviews : []).map((r) => ({
    token: `rev:${r.id}`,
    kind: 'review',
    name: r.reviewerName,
    title: `${r.reviewerName} wrote you a review`,
    body: r.comment || null,
    at: at(r.createdAt),
    href: '/profile',
  }));
}

/** Everything, newest first. */
export function buildFeed({ connections, needsMine, applications, familyAlerts, keyholderAsks, reviews }) {
  return [
    ...connectionItems(connections),
    ...messageItems(connections),
    ...applicantItems(needsMine),
    ...myOfferItems(applications),
    ...familyAlertItems(familyAlerts),
    ...keyholderAskItems(keyholderAsks),
    ...reviewItems(reviews),
  ].sort((a, b) => b.at - a.at);
}

// ---- The hook: one shared source for the bell badge and the screen ------

export function useUpdatesFeed(user) {
  const userId = user?.userId;
  const isElderSeat = user?.role === 'ELDER' || user?.role === 'BOTH';
  const isHelperSeat = user?.role === 'HELPER' || user?.role === 'BOTH';
  const isFamily = user?.role === 'FAMILY';

  // Query keys match the screens that already fetch these — react-query
  // dedupes, so the bell rides the same cache instead of doubling traffic.
  const connectionsQuery = useQuery({
    queryKey: ['connections'],
    queryFn: listMyConnections,
    refetchInterval: POLL_MS,
    enabled: !!user,
  });
  const needsMineQuery = useQuery({
    queryKey: ['needs-mine'],
    queryFn: listMyHelpRequests,
    refetchInterval: POLL_MS,
    enabled: !!user && isElderSeat,
  });
  const applicationsQuery = useQuery({
    queryKey: ['needs-applications'],
    queryFn: listMyApplications,
    refetchInterval: POLL_MS,
    enabled: !!user && isHelperSeat,
  });
  const familyAlertsQuery = useQuery({
    queryKey: ['family-alerts'],
    // Unwrapped, exactly like FamilyAlertsFeed: two observers of one key
    // must put the same shape in the cache or one of them breaks. The
    // module already unwraps to the alerts array.
    queryFn: listFamilyAlerts,
    refetchInterval: POLL_MS,
    enabled: !!user && isFamily,
  });
  const keyholderAsksQuery = useQuery({
    queryKey: ['passon-asked-of-me'],
    // Array-guarded, exactly like KeyholderAsk (shared cache key, one shape).
    queryFn: async () => {
      const rows = await listKeyholderAsksOfMe();
      return Array.isArray(rows) ? rows : [];
    },
    refetchInterval: POLL_MS,
    enabled: !!user,
  });
  const reviewsQuery = useQuery({
    queryKey: ['reviews-mine'],
    queryFn: listMyReviews,
    refetchInterval: POLL_MS,
    enabled: !!user && !isFamily,
  });

  // Each query is enabled for some roles and not others, so the aggregate must
  // fold in ONLY the ones this role actually runs. A disabled query never
  // fetches and never errors, and counting it would be harmless today and
  // wrong the moment react-query changes what a disabled query reports.
  const enabledQueries = [
    [true, connectionsQuery],
    [isElderSeat, needsMineQuery],
    [isHelperSeat, applicationsQuery],
    [isFamily, familyAlertsQuery],
    [true, keyholderAsksQuery],
    [!isFamily, reviewsQuery],
  ]
    .filter(([runs]) => !!user && runs)
    .map(([, query]) => query);

  // `some`, not `every`: the screen must never dress a dropped request up as
  // "Nothing new right now". One source failing means the feed is incomplete,
  // and the person is told so rather than told there is nothing.
  const isLoading = enabledQueries.some((query) => query.isLoading);
  const isError = enabledQueries.some((query) => query.isError);

  const connections = connectionsQuery.data;
  const needsMine = needsMineQuery.data;
  const applications = applicationsQuery.data;
  const familyAlerts = familyAlertsQuery.data;
  const keyholderAsks = keyholderAsksQuery.data;
  const reviews = reviewsQuery.data;

  // Memoized on the six query results, never rebuilt on a bare re-render.
  // An unmemoized buildFeed handed the Updates screen a new `items` array on
  // every render, which changed the identity of the useCallback it feeds to
  // useFocusEffect (app/updates.jsx), so that effect re-ran on every render
  // rather than once per focus. React Query keeps these references stable
  // while the data is unchanged, so this is stable too.
  const items = useMemo(
    () => buildFeed({ connections, needsMine, applications, familyAlerts, keyholderAsks, reviews }),
    [connections, needsMine, applications, familyAlerts, keyholderAsks, reviews]
  );
  const unseen = useUnseenBadge(userId, UPDATES_CATEGORY, items.map((i) => i.token));

  return { items, unseen, isLoading, isError };
}

/**
 * Mark every update in `items` as seen at once. No screen calls this since
 * 2026-08-28 (rows clear one at a time, on tap — see markUpdateSeen); it
 * stays as the named "clear all" action for an agent or a future control.
 * @param {string} userId
 * @param {{ token: string }[]} items
 * @returns {Promise<void>}
 */
export function markUpdatesSeen(userId, items) {
  if (!items.length) return Promise.resolve();
  return markSeen(seenKey(userId, UPDATES_CATEGORY), items.map((i) => i.token));
}

/**
 * Mark ONE update as seen: its row drops the "new" wash and the bell's count
 * falls by one. Called when the person taps that row (owner call 2026-08-28:
 * "it should only disappear if they click that update, not just by opening
 * the updates"). Persists like every other seen mark.
 * @param {string} userId
 * @param {{ token: string }} item  the update row that was tapped
 * @returns {Promise<void>}
 */
export function markUpdateSeen(userId, item) {
  return markSeen(seenKey(userId, UPDATES_CATEGORY), [item.token]);
}
