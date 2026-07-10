import { pwdStrength, sanitizeUsername } from '../src/lib/password';

test('strength grows with length, case, digits, symbols (web pwdStrength)', () => {
  expect(pwdStrength('')).toBe(0);
  expect(pwdStrength('abc')).toBe(0);
  expect(pwdStrength('abcdefgh')).toBe(1); // length only
  expect(pwdStrength('Abcdefgh')).toBe(2); // + uppercase
  expect(pwdStrength('Abcdefg1')).toBe(3); // + digit
  expect(pwdStrength('Abcdef1!')).toBe(4); // + symbol
});

test('username is sanitized like web: lowercase, a-z 0-9 _ only', () => {
  expect(sanitizeUsername('Margaret Hall!')).toBe('margarethall');
  expect(sanitizeUsername('user_42')).toBe('user_42');
  expect(sanitizeUsername('ÅBC-def')).toBe('bcdef');
});
