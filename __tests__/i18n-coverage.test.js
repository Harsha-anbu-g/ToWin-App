// Every sentence the app can show has a French and a Tamil line, and each line
// keeps the English placeholders and *highlight* marks. Add English copy, add
// its translations in src/i18n/fr.js and src/i18n/ta.js in the same change.
import { extractKeys } from '../scripts/i18n-keys';
import fr from '../src/i18n/fr';
import ta from '../src/i18n/ta';

const keys = extractKeys();
const placeholders = (s) => (s.match(/\{\w+\}/g) || []).sort().join(',');
const stars = (s) => (s.match(/\*/g) || []).length;

describe.each([
  ['French', fr],
  ['Tamil', ta],
])('%s', (_name, dict) => {
  test('has a line for every sentence the app shows', () => {
    const missing = keys.filter((k) => !Object.prototype.hasOwnProperty.call(dict, k));
    expect(missing).toEqual([]);
  });

  test('keeps every placeholder and highlight mark', () => {
    const broken = Object.entries(dict)
      .filter(([en, line]) => placeholders(en) !== placeholders(line) || stars(en) !== stars(line))
      .map(([en]) => en);
    expect(broken).toEqual([]);
  });

  test('carries no lines for sentences the app no longer shows', () => {
    const all = new Set(keys);
    expect(Object.keys(dict).filter((k) => !all.has(k))).toEqual([]);
  });
});
