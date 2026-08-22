// Role-aware tab bar slots (user decision 2026-07-12: the first tab IS the
// relationship hub — no separate "Home" label).
// Elder (and BOTH): My Helpers · Posted Help · [Need Help FAB] · Messages · Profile
// Helper:           My Elders  ·             [Offer Help FAB]  · Messages · Profile
// Family (family-in-trust 2026-07-19): watching over a parent, never posting
// or offering — no center FAB at all, so their bar is Home · Messages · Profile.
// HARD-110, 2026-08-22: the elder's centre button used to read "Post Help",
// sitting one tab away from "Posted Help" — two characters apart, side by side,
// for the audience least able to absorb that distinction. "Need Help" pairs
// with the helper's "Offer Help" (one asks, one offers) and is the same width
// as the old label, so the raised button's single line still fits a 5-slot bar
// on a 320pt phone at the 1.2 chrome text cap. The route key stays 'ask'.
export function centerActionFor(role) {
  if (role === 'FAMILY') return null;
  if (role === 'HELPER') return { key: 'find', label: 'Offer Help' };
  return { key: 'ask', label: 'Need Help' };
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
