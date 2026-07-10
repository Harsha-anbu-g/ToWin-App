import { centerActionFor } from '../src/lib/roles';

test('elders (and BOTH) get "Ask for help" — posting a need is their main job', () => {
  expect(centerActionFor('ELDER').label).toBe('Ask for help');
  expect(centerActionFor('BOTH').label).toBe('Ask for help');
});

test('helpers get "Find requests"', () => {
  expect(centerActionFor('HELPER').label).toBe('Find requests');
});

test('unknown/missing role falls back to the elder action (safe default)', () => {
  expect(centerActionFor(undefined).label).toBe('Ask for help');
});
