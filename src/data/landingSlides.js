// Landing story copy — VERBATIM from the website's landingContent.jsx
// (Towinly/frontend/src/data/landingContent.jsx). Do not reword: the handoff
// locks this text. Rendering lives in app/(auth)/landing.jsx; this module is
// plain data so the copy is testable and the screen stays layout-only.

export const CHAPTERS = [
  { n: 1, label: 'Welcome' },
  { n: 2, label: "Who it's for" },
  { n: 3, label: 'The problem we solve' },
  { n: 4, label: 'The real problem is trust' },
  { n: 5, label: 'One step at a time' },
  { n: 6, label: 'Family stays close' },
  { n: 7, label: 'Why Towinly' },
];

// The 7 Rooting stages — each step is worth +1 trust score.
// The seven names are re-exported from src/lib/trustStages.js rather than
// retyped (HARD-110, 2026-08-22). The words are byte-identical to the ones
// this file carried before, so the handoff's verbatim lock still holds; what
// changed is that the landing story and the privacy policy can no longer
// drift apart.
export { FULL_STAGES as STAGES } from '../lib/trustStages';

export const COPY = {
  welcome: {
    // Tagline "It takes two To Win." renders in the screen with "two" italic.
    lead: 'Connecting generations, building trust.',
    body:
      'A place where elders connect with younger people for company and daily help, with a trust score and trust ladder that keeps every connection safe.',
  },
  people: {
    title: 'Three kinds of people',
    lead: 'Everyone on Towinly is one of these three.',
    cards: [
      {
        title: 'Elder',
        body: 'An older person looking for friendship, company, or help with daily tasks.',
      },
      {
        title: 'Helper',
        body: 'A younger person who gives time, company, and a hand with everyday things.',
      },
      {
        title: 'Family',
        body: "A relative who stays close, sees how their elder's friendships grow, and helps when needed.",
      },
    ],
  },
  solves: {
    title: 'Help is hard to find alone for elder people',
    lead:
      "Small daily things, like shopping, a ride, or someone to talk to, take energy that elders don't always have.",
    chips: ['Shopping', 'A ride', 'Someone to talk to'],
    body:
      'On Towinly, an elder simply asks. Helpers nearby see the request and come to help with whatever is needed.',
  },
  trust: {
    // Title renders as gold "Trust" + " is earned, not given"
    lead:
      'Letting someone new into your life is a big step. So every member has a Trust Score, visible to elders before they ever say yes.',
    note:
      'Each person you help can earn you a maximum of 15 points, so your score grows with every new connection.',
    cards: [
      { title: 'Profile', badge: '+3', body: 'Full profile with ID, phone, and photo, all checked.' },
      {
        title: 'Trust Ladder',
        badge: '+7',
        body: 'With each new person you climb the same seven steps, points earned as that friendship grows.',
      },
      {
        title: 'Review',
        badge: '+5',
        stars: true,
        body: 'Star ratings from the people they have already helped.',
      },
    ],
    total: { formula: '3 + 7 + 5 =', score: '15', caption: 'points per connection' },
  },
  rooting: {
    // Title renders as "Rooting (Trust Ladder): how trust grows" with gold "Trust"
    lead:
      'Like a tree growing roots, every friendship on Towinly grows slowly, through 7 simple stages.',
    note:
      'Both people must agree to every step. Nothing personal, like a phone number, is shared until trust has grown.',
  },
  family: {
    title: 'Family can watch over',
    lead:
      'An elder can invite up to five family members to stay close and step in if they are ever needed.',
    cards: [
      { title: 'See the journey', body: 'Watch each friendship climb its seven steps.' },
      { title: 'Hear right away', body: 'Alerts the moment something needs attention.' },
      { title: 'Help decide', body: 'Look at a new helper and share their view.' },
    ],
    note:
      'The elder is always in charge. One switch turns family sharing on or off, at any time.',
  },
  why: {
    title: 'Both sides win',
    lead:
      "Today's elders use phones, shop online, and pay online. Tomorrow there will be many more. But the hardest parts of growing older haven't changed: feeling lonely, and not having enough energy for everyday things.",
    exchange: [
      { role: 'Elders', have: 'Time, money, and life lessons to share', need: 'Energy and company' },
      { role: 'Helpers', have: 'Energy, time, and good company', need: 'Money, care, and life advice' },
    ],
    // Payoff renders with "both" italic: "Towinly is where they meet and share, and both win."
  },
};
