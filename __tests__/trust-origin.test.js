// Why a trust ladder exists (owner call 2026-08-26): friends, or one of my
// posted requests by name, plus the day it started.
import { formatSince, trustOrigin, trustOriginLine } from '../src/lib/trustOrigin';

const since = formatSince('2026-08-25T13:01:16');
const conn = (over = {}) => ({ otherUserId: 'h1', type: 'SOCIAL', createdAt: '2026-08-25T13:01:16', ...over });
const need = (over = {}) => ({
  id: 'n1',
  title: 'Weekly grocery run',
  status: 'ASSIGNED',
  applications: [{ helperId: 'h1', status: 'ACCEPTED' }],
  ...over,
});

test('a helper accepted on a request in progress: helping with it, since the date', () => {
  expect(trustOriginLine(conn(), [need()])).toBe(`Helping with “Weekly grocery run” · since ${since}`);
});

test('the request wins over the connection type — the seed types Priya SOCIAL', () => {
  expect(trustOrigin(conn({ type: 'SOCIAL' }), [need()]).kind).toBe('helping');
});

test('in progress beats finished; finished still names the request', () => {
  const done = need({ id: 'n0', title: 'Fix the porch light', status: 'COMPLETED' });
  expect(trustOrigin(conn(), [done, need()]).title).toBe('Weekly grocery run');
  expect(trustOriginLine(conn(), [done])).toBe(`Helped with “Fix the porch light” · since ${since}`);
});

test('only an ACCEPTED offer counts — a pending one is not a reason', () => {
  const pending = need({ applications: [{ helperId: 'h1', status: 'PENDING' }] });
  expect(trustOrigin(conn(), [pending]).kind).toBe('friends');
});

test('another helper’s request is not mine to name', () => {
  expect(trustOrigin(conn({ otherUserId: 'h2' }), [need()]).kind).toBe('friends');
});

test('a service connection with no request left on my list still says where it came from', () => {
  expect(trustOriginLine(conn({ type: 'SERVICE' }), [])).toBe(`Started from a help request · since ${since}`);
});

test('a plain friendship reads as friends, and a missing date drops the since', () => {
  expect(trustOriginLine(conn(), [])).toBe(`Friends · since ${since}`);
  expect(trustOriginLine(conn({ createdAt: null }), undefined)).toBe('Friends');
  expect(formatSince('not a date')).toBeNull();
});

// The helper seat (owner call 2026-08-26, "do the same for the helper"): my
// offers, accepted on the elder's requests.
const offer = (over = {}) => ({
  id: 'n5',
  title: 'Weekly grocery run',
  status: 'ASSIGNED',
  elderId: 'elder-1',
  myApplicationStatus: 'ACCEPTED',
  ...over,
});

test('helper seat: an accepted offer on the elder’s request is the reason', () => {
  expect(trustOriginLine(conn({ otherUserId: 'elder-1' }), [offer()], { seat: 'helper' })).toBe(
    `Helping with “Weekly grocery run” · since ${since}`
  );
});

test('helper seat: a pending or someone else’s offer is not a reason', () => {
  expect(trustOrigin(conn({ otherUserId: 'elder-1' }), [offer({ myApplicationStatus: 'PENDING' })], { seat: 'helper' }).kind).toBe('friends');
  expect(trustOrigin(conn({ otherUserId: 'elder-2' }), [offer()], { seat: 'helper' }).kind).toBe('friends');
});
