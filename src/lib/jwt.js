// JWT payload decoding without relying on atob (not guaranteed across RN
// runtimes). Handles base64url, missing padding, and UTF-8 payloads; returns
// null for anything malformed — callers treat null as "not logged in".
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

function base64Decode(input) {
  const clean = input.replace(/-/g, '+').replace(/_/g, '/').replace(/=+$/, '');
  let bytes = '';
  let buffer = 0;
  let bits = 0;
  for (const char of clean) {
    const value = ALPHABET.indexOf(char);
    if (value === -1) throw new Error('invalid base64 character');
    buffer = (buffer << 6) | value;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      bytes += String.fromCharCode((buffer >> bits) & 0xff);
    }
  }
  return bytes;
}

export function parseJwtPayload(token) {
  try {
    const part = String(token).split('.')[1];
    if (!part) return null;
    const bytes = base64Decode(part);
    let json;
    try {
      // Recover multi-byte UTF-8 characters (names etc.) from the byte string
      json = decodeURIComponent(escape(bytes));
    } catch {
      json = bytes;
    }
    return JSON.parse(json);
  } catch {
    return null;
  }
}
