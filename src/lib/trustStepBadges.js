// Trust-step badges, both seats (owner calls 2026-08-28):
//
// - Helper: "when the elder pushes the ladder the helper should get a
//   notification in the My Elders tab badge so they can accept, and also the
//   badge in the elder's name". The elder starts every step (TrustService);
//   a step the elder started and the helper has not accepted is waiting on
//   the helper, and it stays on the badge until they accept, the way Posted
//   Help counts offers waiting (src/lib/offersWaiting.js): an action, not
//   news, so looking cannot clear it.
// - Elder: "same in elders: when the helper accepts, a badge in My Helpers
//   and near the helper's name", and "until I accept, the badge should be
//   there". Accepting moves the ladder up a level, so the friendship's level
//   is the token: a level the elder has not dealt with yet is news, worn on
//   the row and counted on the tab until the elder makes their move, which
//   is starting the next step (the elder starts every step). At the top of
//   the ladder there is nothing left to start, so that one clears when the
//   row is opened. Seen-state lives in src/lib/seenIds.js under
//   TRUST_STEPS_CATEGORY, seeded on first run so an old ladder never arrives
//   as news.
//
// Badges count people (owner call 2026-08-26), so the tab wears one number:
// distinct friendships with something for me, of either kind.

import { LEVEL_INDEX, TRUSTED_STAGE } from './trustStages';

export const TRUST_STEPS_CATEGORY = 'trust-steps';

// Paused links carry no live ladder; family links never have one.
const isLadder = (c) => !!c && c.status === 'ACTIVE' && c.type !== 'FAMILY';

/**
 * The token that changes each time this friendship's ladder moves up a
 * level: marked seen once, it stays seen until the level changes again.
 * @param {{ id: string, currentTrustLevel?: string }} conn  one /connections row
 * @returns {string}
 */
export function stepNewsToken(conn) {
  return `${conn.id}:${conn.currentTrustLevel ?? ''}`;
}

/**
 * Level tokens for every live ladder in a /connections list.
 * @param {Array<object> | undefined} connections  the /connections response
 * @returns {string[]} one token per ACTIVE non-family connection; [] on a bad shape
 */
export function stepNewsTokens(connections) {
  if (!Array.isArray(connections)) return [];
  return connections.filter(isLadder).map(stepNewsToken);
}

/**
 * Whether the other person started the next step and I have not accepted it.
 * @param {object | undefined} conn  one /connections row
 * @returns {boolean}
 */
export function isStepAwaitingMe(conn) {
  return isLadder(conn) && !!conn.confirmedByOther && !conn.confirmedByMe;
}

/**
 * Whether this ladder has reached the top: nothing left for anyone to start.
 * @param {object | undefined} conn  one /connections row
 * @returns {boolean}
 */
export function isLadderComplete(conn) {
  return (LEVEL_INDEX[conn?.currentTrustLevel] ?? 0) >= TRUSTED_STAGE;
}

/**
 * Whether a ladder's news is still pending for the elder: its level token is
 * one the elder has not dealt with, and the elder has not started the next
 * step since (owner call 2026-08-28: "until I accept, the badge should be
 * there"). At the top there is no next step, so the token alone decides and
 * the row's open marks it.
 * @param {object | undefined} conn  one /connections row
 * @param {string[]} unseenTokens  the unseen tokens of TRUST_STEPS_CATEGORY
 * @returns {boolean}
 */
export function isStepNewsPending(conn, unseenTokens = []) {
  if (!isLadder(conn) || !unseenTokens.includes(stepNewsToken(conn))) return false;
  return isLadderComplete(conn) || !conn.confirmedByMe;
}

/**
 * The ladders waiting on my accept, in list order.
 * @param {Array<object> | undefined} connections  the /connections response
 * @returns {object[]} [] on nothing or a bad shape
 */
export function stepsAwaitingMe(connections) {
  if (!Array.isArray(connections)) return [];
  return connections.filter(isStepAwaitingMe);
}

/**
 * How many distinct people have something for me: unseen tokens (`${id}:…`)
 * from any seen-state category, plus connection ids waiting on an action.
 * A person with news of two kinds counts once.
 * @param {string[]} tokens  unseen tokens, each beginning with a connection id
 * @param {string[]} ids  connection ids waiting on me
 * @returns {number}
 */
export function peopleWithNews(tokens = [], ids = []) {
  const people = new Set();
  for (const token of tokens) {
    const id = String(token ?? '').split(':')[0];
    if (id) people.add(id);
  }
  for (const id of ids) if (id) people.add(String(id));
  return people.size;
}
