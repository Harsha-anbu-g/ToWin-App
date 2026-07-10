// Role-aware center action for the tab bar (spec: Instagram's ➕ slot).
// Elders (and BOTH) post a request; helpers browse open requests.
export function centerActionFor(role) {
  if (role === 'HELPER') return { key: 'find', label: 'Find requests' };
  return { key: 'ask', label: 'Ask for help' };
}
