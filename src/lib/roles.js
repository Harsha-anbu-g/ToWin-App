// Role-aware tab bar slots (user decision 2026-07-12: the first tab IS the
// relationship hub — no separate "Home" label).
// Elder (and BOTH): My Helpers · Posted Help · [Post Help FAB] · Messages · Profile
// Helper:           My Elders  ·             [Offer Help FAB]  · Messages · Profile
export function centerActionFor(role) {
  if (role === 'HELPER') return { key: 'find', label: 'Offer Help' };
  return { key: 'ask', label: 'Post Help' };
}

// The first tab's identity (route stays "home"; the label is the hub's name).
export function homeTabFor(role) {
  if (role === 'HELPER') return { label: 'My Elders' };
  return { label: 'My Helpers' };
}

// Second tab: elders track their requests; helpers have no second tab (their
// hub already fills the first slot).
export function secondTabFor(role) {
  if (role === 'HELPER') return null;
  return { name: 'posted-help', label: 'Posted Help' };
}
