// The privacy policy once told every reader that account deletion and data export
// did not exist in the app. Both have shipped since 2026-07-12 (profile.jsx
// "Account and data"), and the stale sentence was a store-review blocker: it also
// renders inside the signup consent modal, so a reviewer reads it before they have
// an account. These tests pin the corrected claim in BOTH branches so it cannot
// silently regress. See docs/audit/2026-08-07-presubmission-audit.md finding B1.
import { privacySections } from '../src/data/legalContent';

const dataRequestSection = (email) =>
  privacySections(email).find((s) => s.h === 'Asking for a copy of your information');

describe('privacy policy: how to delete your account or get your data', () => {
  test.each([
    ['with a contact address configured', 'help@towinly.com'],
    ['with no contact address configured', null],
  ])('names the real in-app path %s', (_label, email) => {
    // Arrange / Act
    const section = dataRequestSection(email);

    // Assert — the exact labels a person taps, from app/(tabs)/profile.jsx:392-405.
    expect(section).toBeDefined();
    expect(section.p).toContain('Account and data');
    expect(section.p).toContain('Send me a copy of my data');
    expect(section.p).toContain('Delete my account');
  });

  test.each([
    ['with a contact address configured', 'help@towinly.com'],
    ['with no contact address configured', null],
  ])('never claims the buttons are missing %s', (_label, email) => {
    // Arrange / Act
    const { p } = dataRequestSection(email);

    // Assert
    expect(p).not.toMatch(/no button/i);
    expect(p).not.toMatch(/no way to ask/i);
  });

  test('points to the written address only when one is configured', () => {
    // Arrange / Act
    const configured = dataRequestSection('help@towinly.com').p;
    const unset = dataRequestSection(null).p;

    // Assert
    expect(configured).toContain('write to us');
    expect(unset).not.toContain('write to us');
    expect(unset).toContain('has not set an address');
  });
});
