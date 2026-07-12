import { centerActionFor, secondTabFor } from '../src/lib/roles';

// Redesign handoff nav: elder FAB posts help, helper FAB browses needs.
test('elders (and BOTH) get "Post Help" — posting a need is their main job', () => {
  expect(centerActionFor('ELDER').label).toBe('Post Help');
  expect(centerActionFor('BOTH').label).toBe('Post Help');
});

test('helpers get "Offer Help"', () => {
  expect(centerActionFor('HELPER').label).toBe('Offer Help');
});

test('unknown/missing role falls back to the elder action (safe default)', () => {
  expect(centerActionFor(undefined).label).toBe('Post Help');
});

test('second tab is Posted Help for elders, My Elders for helpers', () => {
  expect(secondTabFor('ELDER')).toEqual({ name: 'posted-help', label: 'Posted Help' });
  expect(secondTabFor('BOTH')).toEqual({ name: 'posted-help', label: 'Posted Help' });
  expect(secondTabFor('HELPER')).toEqual({ name: 'my-elders', label: 'My Elders' });
  expect(secondTabFor(undefined)).toEqual({ name: 'posted-help', label: 'Posted Help' });
});
