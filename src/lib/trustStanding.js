// Where I stand with a person on the trust ladder, in a word and a stage
// (owner call 2026-08-26: In Progress rows carry "<name> · Building trust").
// Read from the friendship in /connections, the same source My Helpers and
// My Elders draw their ladders from; null until it lands, so a row never
// guesses. Shared by Posted Help (elder seat) and My Jobs (helper seat).
import { LEVEL_INDEX, SHORT_STAGES, TRUSTED_STAGE } from './trustStages';

/**
 * Standing with `otherUserId`: { word, stageNo, stageName } or null.
 * `trustedWord` is the seat's own word for the top rung — "Trusted friend"
 * on the elder's side, "Trusted elder" on the helper's.
 */
export function trustStandingFor(otherUserId, connections, { trustedWord = 'Trusted friend' } = {}) {
  const conn = (Array.isArray(connections) ? connections : []).find(
    (c) => c.otherUserId === otherUserId && c.status !== 'PENDING' && c.type !== 'FAMILY'
  );
  if (!conn) return null;
  const stageIndex = LEVEL_INDEX[conn.currentTrustLevel] ?? 0;
  return {
    word: stageIndex >= TRUSTED_STAGE ? trustedWord : 'Building trust',
    stageNo: Math.min(stageIndex + 1, 7),
    stageName: SHORT_STAGES[Math.min(stageIndex, TRUSTED_STAGE)],
    connectionId: conn.id,
  };
}
