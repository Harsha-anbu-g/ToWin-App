// Role-aware tab bar slots (user decision 2026-07-12: the first tab IS the
// relationship hub — no separate "Home" label).
// Elder (and BOTH): My Helpers · Posted Help · [Ask Help FAB] · Messages · Profile
// Helper:           My Elders  ·             [Offer Help FAB]  · Messages · Profile
// Family (family-in-trust 2026-07-19): watching over a parent, never posting
// or offering — no center FAB at all, so their bar is Home · Messages · Profile.
// HARD-110, 2026-08-22: the elder's centre button used to read "Post Help",
// sitting one tab away from "Posted Help" — two characters apart, side by side,
// for the audience least able to absorb that distinction. "Need Help" took
// its place, then went too (owner call 2026-08-28: "need help is in general",
// it reads as a plea rather than a button; "Post Help" was rejected the same
// minute for sitting next to "Posted Help"; "Add Help" lasted an hour). "Ask
// Help" is the final call (owner, 2026-08-28): one asks, the helper's button
// offers, and it is no wider than the labels it replaces, so the raised
// button's single line still fits a 5-slot bar on a 320pt phone at the 1.2
// chrome text cap.
// The route key stays 'ask'.
export function centerActionFor(role) {
  if (role === 'FAMILY') return null;
  if (role === 'HELPER') return { key: 'find', label: 'Offer Help' };
  return { key: 'ask', label: 'Ask Help' };
}

// The first tab's identity (route stays "home"; the label is the hub's name).
export function homeTabFor(role) {
  if (role === 'FAMILY') return { label: 'My Parents' };
  if (role === 'HELPER') return { label: 'My Elders' };
  return { label: 'My Helpers' };
}

// Second tab: elders track their requests; helpers and family have no second
// tab (their hub already fills the first slot).
export function secondTabFor(role) {
  if (role === 'HELPER' || role === 'FAMILY') return null;
  return { name: 'posted-help', label: 'Posted Help' };
}
