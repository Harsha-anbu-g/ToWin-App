// Landing story: entry routing + the locked verbatim copy (handoff 3o).
import { entryRouteFor } from '../src/lib/onboarding';
import { CHAPTERS, COPY, STAGES } from '../src/data/landingSlides';

test('first launch (logged out) opens the landing story', () => {
  expect(entryRouteFor({ user: null, onboarded: false })).toBe('/(auth)/landing');
});

test('after onboarding, logged out opens straight to Log In', () => {
  expect(entryRouteFor({ user: null, onboarded: true })).toBe('/(auth)/login');
});

test('logged-in users skip the story entirely', () => {
  expect(entryRouteFor({ user: { role: 'ELDER' }, onboarded: false })).toBe('/(tabs)/home');
  expect(entryRouteFor({ user: { role: 'ADMIN' }, onboarded: true })).toBe('/admin');
  expect(
    entryRouteFor({ user: { role: 'ELDER', emailVerified: false }, onboarded: true })
  ).toBe('/(auth)/verify-pending');
});

test('story is 7 chapters in the website order', () => {
  // Family joined the walk upstream (web 15046a5): chapter 6 before Why.
  expect(CHAPTERS.map((c) => c.label)).toEqual([
    'Welcome',
    "Who it's for",
    'The problem we solve',
    'The real problem is trust',
    'One step at a time',
    'Family stays close',
    'Why Towinly',
  ]);
});

test('rooting ladder is the 7 website stages, in order', () => {
  expect(STAGES).toEqual([
    'Just Connected',
    'Messaging',
    'Phone Ready',
    'Video Ready',
    'Social Media',
    'Ready to Meet',
    'Fully Trusted',
  ]);
});

test('copy is verbatim from landingContent.jsx (spot checks)', () => {
  expect(COPY.welcome.lead).toBe('Connecting generations, building trust.');
  expect(COPY.people.cards[0].body).toBe(
    'An older person looking for friendship, company, or help with daily tasks.'
  );
  expect(COPY.trust.note).toBe(
    'Each person you help can earn you a maximum of 15 points, so your score grows with every new connection.'
  );
  expect(COPY.trust.total).toEqual({
    formula: '3 + 7 + 5 =',
    score: '15',
    caption: 'points per connection',
  });
  expect(COPY.rooting.note).toBe(
    'Both people must agree to every step. Nothing personal, like a phone number, is shared until trust has grown.'
  );
  expect(COPY.why.exchange[1]).toEqual({
    role: 'Helpers',
    have: 'Energy, time, and good company',
    need: 'Money, care, and life advice',
  });
});
