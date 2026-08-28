import { centerActionFor, homeTabFor, secondTabFor } from '../src/lib/roles';

// Redesign nav: elder FAB posts help, helper FAB browses needs.
// HARD-110 renamed the elder's from "Post Help", which sat two characters from
// the "Posted Help" tab beside it. The pair is Ask Help / Offer Help now.
test('elders (and BOTH) get "Ask Help" — asking for a hand is their main job', () => {
  expect(centerActionFor('ELDER').label).toBe('Ask Help');
  expect(centerActionFor('BOTH').label).toBe('Ask Help');
});

test('helpers get "Offer Help"', () => {
  expect(centerActionFor('HELPER').label).toBe('Offer Help');
});

test('unknown/missing role falls back to the elder action (safe default)', () => {
  expect(centerActionFor(undefined).label).toBe('Ask Help');
});

// 2026-07-12: the first tab IS the relationship hub — no "Home" label.
test('first tab is My Helpers for elders, My Elders for helpers', () => {
  expect(homeTabFor('ELDER').label).toBe('My Helpers');
  expect(homeTabFor('BOTH').label).toBe('My Helpers');
  expect(homeTabFor('HELPER').label).toBe('My Elders');
  expect(homeTabFor(undefined).label).toBe('My Helpers');
});

test('second tab is Posted Help for elders; helpers have none', () => {
  expect(secondTabFor('ELDER')).toEqual({ name: 'posted-help', label: 'Posted Help' });
  expect(secondTabFor('BOTH')).toEqual({ name: 'posted-help', label: 'Posted Help' });
  expect(secondTabFor('HELPER')).toBeNull();
  expect(secondTabFor(undefined)).toEqual({ name: 'posted-help', label: 'Posted Help' });
});

// family-in-trust (2026-07-19): FAMILY watches over a parent — no posting,
// no offering, no second tab. Their first tab is the parents hub.
test('FAMILY gets no center action, no second tab, and a My Parents hub', () => {
  expect(centerActionFor('FAMILY')).toBeNull();
  expect(secondTabFor('FAMILY')).toBeNull();
  expect(homeTabFor('FAMILY').label).toBe('My Parents');
});
