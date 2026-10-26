// The seven reunion steps as the app reads them, mirroring the server's rules
// so a button never appears that the server would refuse (HCI rule 5).
import {
  STEPS,
  STEP_NAMES,
  GUEST_STATES,
  stepIndex,
  nextAction,
  guestLine,
} from '../src/lib/reunionSteps';

test('seven steps, in order, with elder words', () => {
  expect(STEPS).toEqual(['WISH', 'ORGANISER', 'FINDING', 'PLAN', 'DAY', 'SEND_OFF', 'DONE']);
  expect(STEP_NAMES).toEqual(['Wish', 'Who plans', 'Finding', 'The plan', 'The day', 'Send-off', 'After']);
  expect(GUEST_STATES.map((s) => s.key)).toEqual(['REMEMBERED', 'FOUND', 'REACHED', 'COMING', 'CANNOT_COME']);
});

test('stepIndex counts like the server and parks STOPPED at the start', () => {
  expect(stepIndex('WISH')).toBe(0);
  expect(stepIndex('PLAN')).toBe(3);
  expect(stepIndex('DONE')).toBe(6);
  expect(stepIndex('STOPPED')).toBe(0);
  expect(stepIndex(undefined)).toBe(0);
});

test('finding moves on only by the elder, and only with someone coming', () => {
  const noOne = { step: 'FINDING', comingCount: 0 };
  expect(nextAction(noOne, 'ORGANISER').show).toBe(false);
  const elderWaits = nextAction(noOne, 'ELDER');
  expect(elderWaits.show).toBe(true);
  expect(elderWaits.enabled).toBe(false);
  expect(elderWaits.reason).toMatch(/coming/);

  const ready = nextAction({ step: 'FINDING', comingCount: 2 }, 'ELDER');
  expect(ready.enabled).toBe(true);
  expect(ready.label).toBe('Approve the guest list');
});

test('the plan moves on only by the elder, once a day and a place are set', () => {
  expect(nextAction({ step: 'PLAN', plannedOn: 'Sunday', venue: '' }, 'ELDER').enabled).toBe(false);
  const ready = nextAction({ step: 'PLAN', plannedOn: 'Sunday', venue: 'The park' }, 'ELDER');
  expect(ready.enabled).toBe(true);
  expect(ready.label).toBe('Approve the plan');
  expect(nextAction({ step: 'PLAN', plannedOn: 'Sunday', venue: 'The park' }, 'ORGANISER').show).toBe(false);
});

test('the day ends by either side; the send-off closes only when everyone who came is home', () => {
  expect(nextAction({ step: 'DAY' }, 'ORGANISER').enabled).toBe(true);
  expect(nextAction({ step: 'DAY' }, 'ELDER').label).toBe('The day is over');
  const someoneOut = nextAction({ step: 'SEND_OFF', arrivedCount: 3, homeCount: 2 }, 'ORGANISER');
  expect(someoneOut.enabled).toBe(false);
  expect(someoneOut.reason).toMatch(/home/);
  const allHome = nextAction({ step: 'SEND_OFF', arrivedCount: 3, homeCount: 3 }, 'ELDER');
  expect(allHome.enabled).toBe(true);
  expect(allHome.label).toBe('Close the reunion');
  expect(nextAction({ step: 'DONE' }, 'ELDER').show).toBe(false);
  expect(nextAction({ step: 'ORGANISER' }, 'ELDER').show).toBe(false);
});

test('guestLine reads at a glance', () => {
  expect(guestLine({ guestCount: 0 })).toBe('No guests yet');
  expect(guestLine({ guestCount: 6, foundCount: 1, reachedCount: 1, comingCount: 3, cannotComeCount: 1 })).toBe(
    '6 remembered · 3 coming'
  );
  expect(guestLine({ guestCount: 2, comingCount: 0 })).toBe('2 remembered · 0 coming');
});
