// The daily check-in prompt appears once per local day, never after check-in.
import { localDay, shouldPromptCheckin } from '../src/lib/checkinGate';

const NOW = new Date('2026-07-12T10:00:00');

test('prompts when not checked in and not yet prompted today', () => {
  expect(shouldPromptCheckin({ alreadyCheckedIn: false }, null, NOW)).toBe(true);
  expect(shouldPromptCheckin({ alreadyCheckedIn: false }, '2026-07-11', NOW)).toBe(true);
});

test('never prompts twice in the same day', () => {
  expect(shouldPromptCheckin({ alreadyCheckedIn: false }, '2026-07-12', NOW)).toBe(false);
});

test('never prompts once checked in, and never before the streak loads', () => {
  expect(shouldPromptCheckin({ alreadyCheckedIn: true }, null, NOW)).toBe(false);
  expect(shouldPromptCheckin(undefined, null, NOW)).toBe(false);
});

test('localDay is the device-local calendar date', () => {
  expect(localDay(NOW)).toBe('2026-07-12');
  expect(localDay(new Date('2026-01-05T23:30:00'))).toBe('2026-01-05');
});
