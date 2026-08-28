// Owner call 2026-08-28: "in bottom bar posted help should show a
// notification". The Posted Help badge used to count UNSEEN applicant tokens
// and cleared itself the moment the tab was opened, so after one look it was
// gone while helpers were still waiting. It now counts offers still waiting
// for an answer (every offer on an OPEN request) and only an accept or a
// removal changes it — the Messages grammar, people waiting.
const fs = require('fs');
const path = require('path');
const { offersWaitingCount } = require('../src/lib/offersWaiting');

const ROOT = path.join(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

describe('offersWaitingCount', () => {
  test('counts every offer on an OPEN request', () => {
    const needs = [
      { id: 'n1', status: 'OPEN', applications: [{ helperId: 'h1' }, { helperId: 'h2' }] },
      { id: 'n2', status: 'OPEN', applications: [{ helperId: 'h3' }] },
    ];
    expect(offersWaitingCount(needs)).toBe(3);
  });

  test('an accepted request is ASSIGNED and its helper is no longer waiting', () => {
    const needs = [
      { id: 'n1', status: 'ASSIGNED', applications: [{ helperId: 'h1', status: 'ACCEPTED' }] },
      { id: 'n2', status: 'COMPLETED', applications: [{ helperId: 'h2', status: 'ACCEPTED' }] },
      { id: 'n3', status: 'CANCELLED', applications: [{ helperId: 'h3' }] },
    ];
    expect(offersWaitingCount(needs)).toBe(0);
  });

  test('folds to zero on nothing, a bad shape, or a request with no offers', () => {
    expect(offersWaitingCount(undefined)).toBe(0);
    expect(offersWaitingCount(null)).toBe(0);
    expect(offersWaitingCount('nope')).toBe(0);
    expect(offersWaitingCount([{ id: 'n1', status: 'OPEN' }, null])).toBe(0);
  });
});

describe('the badge cannot be cleared by looking', () => {
  test('the tab shell counts offers waiting, not unseen tokens', () => {
    const layout = read('app/(tabs)/_layout.jsx');
    expect(layout).toMatch(/offersWaitingCount\(needsData\?\.content\)/);
    expect(layout).not.toMatch(/useUnseenBadge\([^)]*'applicants'/);
    // The spoken label says what the number is.
    expect(layout).toMatch(/tabA11yLabel\('Posted Help', applicantsBadge, 'waiting'\)/);
  });

  test('opening Posted Help marks nothing seen', () => {
    const list = read('src/components/needs/PostedHelpList.jsx');
    expect(list).not.toMatch(/markSeen\(/);
    expect(list).not.toMatch(/'applicants'/);
  });
});
