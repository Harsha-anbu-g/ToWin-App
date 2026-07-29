// Locks the guardian-mode vocabulary to the website's (FAM-501).
//
// Both sides of every consent screen — the elder's switches and approval
// cards, the family side's "what I can do" list and ask buttons — read from
// these two modules, so a power is asked for in the exact words it is granted
// in. The keys must match the backend DelegatedPower enum; MESSAGE_HELPERS
// was removed upstream (V48) and must never come back.
import { POWERS } from '../src/lib/familyPowers';
import { SHARING_GIVES } from '../src/lib/sharingGives';

describe('familyPowers', () => {
  test('has exactly the three backend DelegatedPower keys, in order', () => {
    expect(POWERS.map((p) => p.key)).toEqual([
      'MANAGE_HELP_REQUESTS',
      'ADVANCE_TRUST',
      'LEAVE_REVIEWS',
    ]);
  });

  test('never reintroduces the removed MESSAGE_HELPERS power', () => {
    expect(POWERS.some((p) => p.key === 'MESSAGE_HELPERS')).toBe(false);
  });

  test('each power carries a title and both sides of the wording', () => {
    for (const p of POWERS) {
      expect(typeof p.title).toBe('string');
      expect(p.title.length).toBeGreaterThan(0);
      // on/off take the family member's name so the promise is personal.
      expect(p.on('Sarah')).toContain('Sarah');
      expect(p.off('Sarah')).toMatch(/^Off\./);
    }
  });

  test('attribution is in the words: acting is never silent', () => {
    // Every "on" description must say the action carries the family
    // member's name — that promise is the heart of guardian mode.
    expect(POWERS.find((p) => p.key === 'MANAGE_HELP_REQUESTS').on('Sarah'))
      .toContain('Sarah asked for you');
    expect(POWERS.find((p) => p.key === 'ADVANCE_TRUST').on('Sarah'))
      .toContain('took it for you');
    expect(POWERS.find((p) => p.key === 'LEAVE_REVIEWS').on('Sarah'))
      .toContain("Sarah's name on it");
  });
});

describe('sharingGives', () => {
  test('lists the four things sharing gives, in order', () => {
    expect(SHARING_GIVES.map((g) => g.key)).toEqual([
      'SEE',
      'UPDATES',
      'TALK',
      'POWERS',
    ]);
  });

  test('speaks to both seats: the elder and the family member', () => {
    for (const g of SHARING_GIVES) {
      expect(typeof g.elder()).toBe('string');
      expect(g.elder().length).toBeGreaterThan(0);
      expect(typeof g.family('Margaret')).toBe('string');
    }
    // The family wording is personal where the website's is.
    expect(SHARING_GIVES.find((g) => g.key === 'UPDATES').family('Margaret'))
      .toContain('Margaret');
    expect(SHARING_GIVES.find((g) => g.key === 'TALK').family('Margaret'))
      .toContain('Margaret');
    expect(SHARING_GIVES.find((g) => g.key === 'POWERS').family('Margaret'))
      .toContain('Margaret');
  });
});
