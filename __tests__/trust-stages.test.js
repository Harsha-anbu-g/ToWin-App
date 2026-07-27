// Locks the trust-stage numbering for the whole app.
//
// The website ships two conventions at once (0-based stageIndex from the
// family APIs, 1-based TRUST_LEVEL_ORDER inside TrustJourney). If mobile ever
// drifts to the 1-based one, family chat unlocks a step early — a stranger
// reaching a family member before the parent actually reached Messaging.
// These assertions are the guard.
import {
  FIRST_MEET_STAGE,
  LEVEL_INDEX,
  MESSAGING_STAGE,
  SHORT_STAGES,
  STAGE_COUNT,
  TRUSTED_STAGE,
  isInheritable,
  stageIndexOf,
} from '../src/lib/trustStages';

describe('trust stage numbering', () => {
  test('is 0-based and matches the backend TrustLevel enum order', () => {
    expect(LEVEL_INDEX).toEqual({
      DISCOVERED: 0,
      MESSAGING: 1,
      PHONE_CALL: 2,
      VIDEO_CALL: 3,
      VERIFIED: 4,
      FIRST_MEET: 5,
      TRUSTED: 6,
    });
  });

  test('names the three boundaries the family features depend on', () => {
    expect(MESSAGING_STAGE).toBe(1);
    expect(FIRST_MEET_STAGE).toBe(5);
    expect(TRUSTED_STAGE).toBe(6);
  });

  test('has one short label per rung', () => {
    expect(SHORT_STAGES).toHaveLength(STAGE_COUNT);
    expect(SHORT_STAGES[MESSAGING_STAGE]).toBe('Messaging');
    expect(SHORT_STAGES[TRUSTED_STAGE]).toBe('Trusted');
  });
});

describe('stageIndexOf', () => {
  test('prefers an explicit numeric stageIndex', () => {
    expect(stageIndexOf({ stageIndex: 3, currentTrustLevel: 'MESSAGING' })).toBe(3);
  });

  test('falls back to the level name when stageIndex is absent', () => {
    expect(stageIndexOf({ currentTrustLevel: 'FIRST_MEET' })).toBe(5);
  });

  test('treats an unknown or missing level as just-connected, never as trusted', () => {
    expect(stageIndexOf({ currentTrustLevel: 'NOT_A_LEVEL' })).toBe(0);
    expect(stageIndexOf({})).toBe(0);
    expect(stageIndexOf(null)).toBe(0);
    expect(stageIndexOf(undefined)).toBe(0);
  });

  test('clamps a server value that runs off either end of the ladder', () => {
    expect(stageIndexOf({ stageIndex: 99 })).toBe(TRUSTED_STAGE);
    expect(stageIndexOf({ stageIndex: -4 })).toBe(0);
  });

  test('ignores a non-finite stageIndex rather than propagating NaN', () => {
    expect(stageIndexOf({ stageIndex: NaN, currentTrustLevel: 'PHONE_CALL' })).toBe(2);
  });
});

describe('isInheritable — when family can reach the helper', () => {
  test('is closed below Messaging', () => {
    expect(isInheritable({ currentTrustLevel: 'DISCOVERED' })).toBe(false);
    expect(isInheritable({ stageIndex: 0 })).toBe(false);
  });

  test('opens exactly at Messaging, not a step early', () => {
    expect(isInheritable({ stageIndex: MESSAGING_STAGE })).toBe(true);
    expect(isInheritable({ currentTrustLevel: 'MESSAGING' })).toBe(true);
  });

  test('stays open above Messaging', () => {
    expect(isInheritable({ currentTrustLevel: 'TRUSTED' })).toBe(true);
  });

  test('is closed when the server told us nothing', () => {
    expect(isInheritable({})).toBe(false);
  });
});
