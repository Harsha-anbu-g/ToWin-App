// Forgiving DOB input (rulebook §16, Postel's Law), locked by tests: every
// unambiguous reasonable format normalizes to YYYY-MM-DD; the genuinely
// ambiguous is refused with a plain-language error, never guessed.
import { parseFlexibleDate } from '../src/lib/flexibleDate';

test('empty input is simply empty — not an error', () => {
  expect(parseFlexibleDate('')).toBeNull();
  expect(parseFlexibleDate('   ')).toBeNull();
});

test('ISO and ISO-like forms normalize', () => {
  expect(parseFlexibleDate('1953-05-14')).toEqual({ value: '1953-05-14' });
  expect(parseFlexibleDate('1953/5/4')).toEqual({ value: '1953-05-04' });
});

test('written months work in either order', () => {
  expect(parseFlexibleDate('14 May 1953')).toEqual({ value: '1953-05-14' });
  expect(parseFlexibleDate('May 14, 1953')).toEqual({ value: '1953-05-14' });
  expect(parseFlexibleDate('4 September 1950')).toEqual({ value: '1950-09-04' });
});

test('numeric forms are accepted only when unambiguous', () => {
  expect(parseFlexibleDate('14/05/1953')).toEqual({ value: '1953-05-14' }); // day first
  expect(parseFlexibleDate('05/14/1953')).toEqual({ value: '1953-05-14' }); // month first
  // 04/05 reads two ways — refuse rather than guess a birthday.
  expect(parseFlexibleDate('04/05/1953').error).toMatch(/reads two ways/);
});

test('impossible dates are named, not accepted', () => {
  expect(parseFlexibleDate('1953-02-30').error).toMatch(/does not exist/);
  expect(parseFlexibleDate('31 April 1953').error).toMatch(/does not exist/);
});

test('unreadable input gets the plain-language fix', () => {
  expect(parseFlexibleDate('yesterday').error).toMatch(/couldn't read that date/);
});
