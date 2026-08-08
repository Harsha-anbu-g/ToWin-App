// Write-time filtering of objectionable text, Apple guideline 1.2 item one.
// See docs/audit/2026-08-07-presubmission-audit.md finding R7.
import { findObjectionable, objectionableError, objectionableMessage } from '../src/lib/contentFilter';

describe('content filter', () => {
  test.each([
    ['plain help request', 'Could someone give me a lift to the shops on Tuesday?'],
    ['a bio', 'Retired teacher. I like gardening, crosswords and strong tea.'],
    ['empty', ''],
    ['whitespace only', '   \n  '],
  ])('lets through %s', (_label, text) => {
    expect(findObjectionable(text)).toBeNull();
    expect(objectionableError(text)).toBe('');
  });

  // The Scunthorpe problem: a substring match here would insult ordinary words.
  // Every one of these contains a blocked word as a substring and must pass.
  test.each([
    ['Scunthorpe'],
    ['I need help getting to my class on Thursday'],
    ['Please assess whether the ramp is safe'],
    ['My late husband was called Cockburn'],
    ['I grew up in Essex and the coast was lovely'],
    ['Can you help me analyse these bills?'],
    ['The therapist said to walk daily'],
  ])('does not false-positive on %s', (text) => {
    expect(findObjectionable(text)).toBeNull();
  });

  test('catches a slur as a whole word', () => {
    expect(findObjectionable('you are a retard')).toBe('retard');
  });

  test('catches it regardless of case or surrounding punctuation', () => {
    expect(findObjectionable('Go away, CUNT!')).toBe('cunt');
  });

  test('sees through common character swaps', () => {
    // 4 -> a, 0 -> o, 3 -> e, 1 -> i
    expect(findObjectionable('r3t4rd')).toBe('retard');
    expect(findObjectionable('wh0re')).toBe('whore');
  });

  test('catches a multi-word threat', () => {
    expect(findObjectionable('just kill yourself')).toBe('kill yourself');
  });

  test('the message names the word so the person knows what to change', () => {
    const msg = objectionableMessage('retard');
    expect(msg).toContain('"retard"');
    expect(objectionableError('you are a retard')).toBe(msg);
  });

  test('handles null and undefined without throwing', () => {
    expect(findObjectionable(null)).toBeNull();
    expect(findObjectionable(undefined)).toBeNull();
  });
});
