// Role-aware tab bar slots (redesign handoff §Navigation).
// Elder (and BOTH): Home · Posted Help · [Post Help FAB] · Messages · Profile
// Helper:           Home · My Elders  · [Offer Help FAB] · Messages · Profile
export function centerActionFor(role) {
  if (role === 'HELPER') return { key: 'find', label: 'Offer Help' };
  return { key: 'ask', label: 'Post Help' };
}

export function secondTabFor(role) {
  if (role === 'HELPER') return { name: 'my-elders', label: 'My Elders' };
  return { name: 'posted-help', label: 'Posted Help' };
}
