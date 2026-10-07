// Landing story copy — VERBATIM from the website's landingContent.jsx
// (Towinly/frontend/src/data/landingContent.jsx). Do not reword: the handoff
// locks this text. Rendering lives in app/(auth)/landing.jsx; this module is
// plain data so the copy is testable and the screen stays layout-only.
import { tr } from '../i18n';

export const CHAPTERS = [
  { n: 1, get label() { return tr('Welcome'); } },
  { n: 2, get label() { return tr("Who it's for"); } },
  { n: 3, get label() { return tr('The problem we solve'); } },
  { n: 4, get label() { return tr('The real problem is trust'); } },
  { n: 5, get label() { return tr('One step at a time'); } },
  { n: 6, get label() { return tr('Family stays close'); } },
  { n: 7, get label() { return tr('Why Towinly'); } },
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
    get lead() { return tr('Connecting generations, building trust.'); },
    get body() { return tr('A place where elders connect with younger people for company and daily help, with a trust score and trust ladder that keeps every connection safe.'); },
  },
  people: {
    get title() { return tr('Three kinds of people'); },
    get lead() { return tr('Everyone on Towinly is one of these three.'); },
    cards: [
      {
        get title() { return tr('Elder'); },
        get body() { return tr('An older person looking for friendship, company, or help with daily tasks.'); },
      },
      {
        get title() { return tr('Helper'); },
        get body() { return tr('A younger person who gives time, company, and a hand with everyday things.'); },
      },
      {
        get title() { return tr('Family'); },
        get body() { return tr("A relative who stays close, sees how their elder's friendships grow, and helps when needed."); },
      },
    ],
  },
  solves: {
    get title() { return tr('Help is hard to find alone for elder people'); },
    get lead() { return tr("Small daily things, like shopping, a ride, or someone to talk to, take energy that elders don't always have."); },
    chips: ['Shopping', 'A ride', 'Someone to talk to'],
    get body() { return tr('On Towinly, an elder simply asks. Helpers nearby see the request and come to help with whatever is needed.'); },
  },
  trust: {
    // Title renders as gold "Trust" + " is earned, not given"
    get lead() { return tr('Letting someone new into your life is a big step. So every member has a Trust Score, visible to elders before they ever say yes.'); },
    get note() { return tr('Each person you help can earn you a maximum of 15 points, so your score grows with every new connection.'); },
    cards: [
      { get title() { return tr('Profile'); }, badge: '+3', get body() { return tr('Full profile with ID, phone, and photo, all checked.'); } },
      {
        get title() { return tr('Trust Ladder'); },
        badge: '+7',
        get body() { return tr('With each new person you climb the same seven steps, points earned as that friendship grows.'); },
      },
      {
        get title() { return tr('Review'); },
        badge: '+5',
        stars: true,
        get body() { return tr('Star ratings from the people they have already helped.'); },
      },
    ],
    total: { formula: '3 + 7 + 5 =', score: '15', get caption() { return tr('points per connection'); } },
  },
  rooting: {
    // Title renders as "Rooting (Trust Ladder): how trust grows" with gold "Trust"
    get lead() { return tr('Like a tree growing roots, every friendship on Towinly grows slowly, through 7 simple stages.'); },
    get note() { return tr('Both people must agree to every step. Nothing personal, like a phone number, is shared until trust has grown.'); },
  },
  family: {
    get title() { return tr('Family can watch over'); },
    get lead() { return tr('An elder can invite up to five family members to stay close and step in if they are ever needed.'); },
    cards: [
      { get title() { return tr('See the journey'); }, get body() { return tr('Watch each friendship climb its seven steps.'); } },
      { get title() { return tr('Hear right away'); }, get body() { return tr('Alerts the moment something needs attention.'); } },
      { get title() { return tr('Help decide'); }, get body() { return tr('Look at a new helper and share their view.'); } },
    ],
    get note() { return tr('The elder is always in charge. One switch turns family sharing on or off, at any time.'); },
  },
  why: {
    get title() { return tr('Both sides win'); },
    get lead() { return tr("Today's elders use phones, shop online, and pay online. Tomorrow there will be many more. But the hardest parts of growing older haven't changed: feeling lonely, and not having enough energy for everyday things."); },
    exchange: [
      { role: 'Elders', get have() { return tr('Time, money, and life lessons to share'); }, get need() { return tr('Energy and company'); } },
      { role: 'Helpers', get have() { return tr('Energy, time, and good company'); }, get need() { return tr('Money, care, and life advice'); } },
    ],
    // Payoff renders with "both" italic: "Towinly is where they meet and share, and both win."
  },
};
