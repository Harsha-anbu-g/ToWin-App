// i18n exports a hook for screens. The server never renders, so the import
// only has to resolve.
export function useSyncExternalStore() {
  throw new Error('React hooks do not run inside the MCP server');
}
export default { useSyncExternalStore };
