import { buildWeek, greeting } from '../src/lib/streaks';

// Wednesday 2026-07-08, streak of 3 ending today → Mon+Tue+Wed done
const wednesday = new Date('2026-07-08T15:00:00');

test('marks streak days inside the current week as done', () => {
  const week = buildWeek({ currentStreak: 3, lastCheckinDate: '2026-07-08' }, wednesday);
  expect(week.map((d) => d.done)).toEqual([true, true, true, false, false, false, false]);
  expect(week[3].future).toBe(true); // Thursday is after "today" (Wednesday)
});

test('today is highlighted when not yet checked in', () => {
  const week = buildWeek({ currentStreak: 2, lastCheckinDate: '2026-07-07' }, wednesday);
  expect(week[2].today).toBe(true); // Wednesday index 2, not covered by streak
  expect(week[1].done).toBe(true); // Tuesday
});

test('future days are flagged', () => {
  const week = buildWeek(null, wednesday);
  expect(week[6].future).toBe(true); // Sunday
  expect(week.every((d) => !d.done)).toBe(true);
});

test('greeting follows the clock', () => {
  expect(greeting(new Date('2026-07-08T08:00:00'))).toBe('Good morning');
  expect(greeting(new Date('2026-07-08T14:00:00'))).toBe('Good afternoon');
  expect(greeting(new Date('2026-07-08T20:00:00'))).toBe('Good evening');
});
