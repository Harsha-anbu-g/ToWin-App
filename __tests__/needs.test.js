import { catLabel, NEED_STATUS, sortNeeds } from '../src/lib/needs';

test('categories use plain everyday words (web parity)', () => {
  expect(catLabel('COMPANIONSHIP')).toBe('Company');
  expect(catLabel('TRANSPORTATION')).toBe('Rides');
  expect(catLabel('ERRANDS')).toBe('Shopping');
  expect(catLabel('CLEANING')).toBe('Cleaning');
  expect(catLabel('OTHER')).toBe('Other');
  expect(catLabel('SOMETHING_NEW')).toBe('SOMETHING_NEW'); // unknown passes through
});

test('status pills match web copy', () => {
  expect(NEED_STATUS.OPEN.label).toBe('Looking for Help');
  expect(NEED_STATUS.ASSIGNED.label).toBe('Helper Found');
  expect(NEED_STATUS.COMPLETED.label).toBe('Completed');
  expect(NEED_STATUS.CANCELLED.label).toBe('Cancelled');
});

test('needs sort: open first, urgent before normal within open', () => {
  const needs = [
    { id: 'c', status: 'COMPLETED' },
    { id: 'n', status: 'OPEN', urgency: 'NORMAL' },
    { id: 'a', status: 'ASSIGNED' },
    { id: 'u', status: 'OPEN', urgency: 'URGENT' },
  ];
  expect([...needs].sort(sortNeeds).map((n) => n.id)).toEqual(['u', 'n', 'a', 'c']);
});
